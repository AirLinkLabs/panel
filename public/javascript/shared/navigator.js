/**
 * Navigator — client-side SPA navigation for the Airlink Panel.
 *
 * Replaces full-page reloads with fetch-and-swap while keeping the
 * application shell (sidebar, bottom bar, toasts, modals) alive.
 *
 * Architecture:
 *   1. Intercept <a> clicks and form submissions
 *   2. Fade out current page-content
 *   3. Show contextual loading state
 *   4. Fetch target page HTML
 *   5. Parse with DOMParser, extract #page-content
 *   6. Swap content (cleanup old Alpine, insert new, re-execute scripts)
 *   7. Fade in new content
 *   8. Update URL via pushState
 *   9. Reinitialize nav highlights
 *
 * Shell components (sidebar, bottom bar, toasts, modals) are NEVER touched.
 *
 * Exposed: window.Alnav
 */
(function () {
  "use strict";

  if (window.Alnav) return;

  // ── Constants ────────────────────────────────────────────────────────────
  var FADE_OUT_MS = 120;
  var FADE_IN_MS = 150;
  var STAGGER_MS = 30;
  var LOADING_DELAY_MS = 300;
  var EASE_OUT = "cubic-bezier(0.16,1,0.3,1)";
  var EASE_IN = "cubic-bezier(0.4,0,1,1)";
  var CONTENT_ID = "page-content";
  var SERVER_CONTENT_ID = "server-page-body";
  var NAV_FLAG = "al_nav";

  // ── State ────────────────────────────────────────────────────────────────
  var transitioning = false;
  var currentAbort = null;
  var loadingTimer = null;
  var cleanupFns = [];

  // ── Utilities ────────────────────────────────────────────────────────────

  function el(id) {
    return document.getElementById(id);
  }

  function normalizePath(p) {
    try {
      return (
        new URL(p, window.location.origin).pathname.replace(/\/+$/, "") || "/"
      );
    } catch {
      return p;
    }
  }

  function isLocalLink(a) {
    var href = a && a.getAttribute("href");
    if (!href || href === "#" || href.startsWith("#")) return false;
    if (href.startsWith("mailto:") || href.startsWith("tel:")) return false;
    if (a.hasAttribute("download") || a.target === "_blank") return false;
    if (a.getAttribute("rel") === "external") return false;
    if (a.hasAttribute("data-alnav-skip")) return false;
    if (href.startsWith("http") && !href.startsWith(window.location.origin))
      return false;
    // Skip hx-get / hx-post links — let HTMX handle those
    if (
      a.hasAttribute("hx-get") ||
      a.hasAttribute("hx-post") ||
      a.hasAttribute("hx-put") ||
      a.hasAttribute("hx-patch") ||
      a.hasAttribute("hx-delete")
    )
      return false;
    return true;
  }

  function isMutationLink(a) {
    return (
      a.hasAttribute("hx-get") ||
      a.hasAttribute("hx-post") ||
      a.hasAttribute("hx-put") ||
      a.hasAttribute("hx-patch") ||
      a.hasAttribute("hx-delete")
    );
  }

  function getContentEl() {
    return el(CONTENT_ID) || el(SERVER_CONTENT_ID) || null;
  }

  function getAnimatableChildren(container) {
    if (!container) return [];
    return Array.from(container.children).filter(function (child) {
      if (child.classList && child.classList.contains("mobile-top-bar"))
        return false;
      if (child.classList && child.classList.contains("mobile-bottom-nav"))
        return false;
      if (child.classList && child.classList.contains("mobile-more-sheet"))
        return false;
      if (child.classList && child.classList.contains("mobile-server-chrome"))
        return false;
      var pos = window.getComputedStyle(child).position;
      if (pos === "fixed") return false;
      return true;
    });
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────

  /**
   * Register a cleanup function that runs before content is swapped.
   * Used by pages to clean up timers, event listeners, etc.
   */
  function onCleanup(fn) {
    if (typeof fn === "function") cleanupFns.push(fn);
  }

  /**
   * Run all registered cleanup functions and clear the list.
   */
  function runCleanup() {
    for (var i = 0; i < cleanupFns.length; i++) {
      try {
        cleanupFns[i]();
      } catch (e) {
        /* cleanup isolation */
      }
    }
    cleanupFns = [];
  }

  // ── Alpine lifecycle ─────────────────────────────────────────────────────

  /**
   * Destroy Alpine components inside a DOM tree.
   * Walks all x-data elements and removes Alpine's internal data.
   */
  function destroyAlpineIn(container) {
    if (!window.Alpine) return;
    // Alpine 3.x: walk x-data elements and clean up
    var elements = container.querySelectorAll("[x-data]");
    elements.forEach(function (el) {
      // Remove Alpine's __x property
      if (el._x_dataStack) {
        el._x_dataStack = null;
      }
      if (el._x_effects) {
        el._x_effects.forEach(function (stop) {
          try {
            stop();
          } catch (e) {}
        });
        el._x_effects = null;
      }
      if (el._x_cleanups) {
        el._x_cleanups.forEach(function (cleanup) {
          try {
            cleanup();
          } catch (e) {}
        });
        el._x_cleanups = null;
      }
    });
  }

  /**
   * Initialize Alpine components inside a DOM tree.
   * Uses Alpine's internal initTree if available, otherwise falls back
   * to dispatching alpine:init.
   */
  function initAlpineIn(container) {
    if (!window.Alpine) return;
    // Alpine 3.x: use initTree to initialize new DOM
    if (typeof Alpine.initTree === "function") {
      Alpine.initTree(container);
    } else if (typeof Alpine.morph !== "function") {
      // Fallback: dispatch alpine:init to trigger re-registration
      // This works for Alpine.data() factories registered in alpine:init
      document.dispatchEvent(new CustomEvent("alpine:init"));
    }
  }

  // ── Script re-execution ──────────────────────────────────────────────────

  /**
   * Re-execute inline scripts from parsed content.
   * DOMParser doesn't execute scripts, so we need to manually create
   * and append them.
   */
  function reexecScripts(container) {
    var scripts = container.querySelectorAll("script");
    var chain = Promise.resolve();

    scripts.forEach(function (old) {
      // Skip analytics, GTM, etc.
      if (old.src && /google|analytics|gtag|gtm|facebook|pixel/i.test(old.src))
        return;

      chain = chain.then(function () {
        return new Promise(function (resolve) {
          var s = document.createElement("script");
          if (old.src) {
            s.src = old.src;
            s.onload = resolve;
            s.onerror = resolve;
          } else {
            s.textContent = old.textContent;
            resolve();
          }
          // Preserve nonce for CSP
          if (old.nonce) s.nonce = old.nonce;
          document.head.appendChild(s);
          // Remove the script tag from head after execution
          if (!old.src) {
            document.head.removeChild(s);
          }
        });
      });
    });

    return chain;
  }

  /**
   * Re-execute page-specific inline scripts that live outside #page-content.
   * These typically define Alpine x-data functions (e.g. adminOverview).
   * Each script is executed sequentially to respect definition order.
   */
  function reexecPageScripts(scriptTexts) {
    var chain = Promise.resolve();
    for (var i = 0; i < scriptTexts.length; i++) {
      (function (text) {
        chain = chain.then(function () {
          return new Promise(function (resolve) {
            var s = document.createElement("script");
            s.textContent = text;
            document.head.appendChild(s);
            document.head.removeChild(s);
            resolve();
          });
        });
      })(scriptTexts[i]);
    }
    return chain;
  }

  // ── Content swap ─────────────────────────────────────────────────────────

  /**
   * Parse HTML string and extract the page-content element.
   * Also extracts page-specific inline scripts that live OUTSIDE #page-content
   * (e.g. after </main>) so they can be re-executed after swap.
   *
   * Shell scripts (external src, in <head>, known library paths) are excluded.
   *
   * Returns { content: HTMLElement, title: string, pageScripts: string[] }
   */
  function parseResponse(html) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    var content =
      doc.getElementById(CONTENT_ID) || doc.getElementById(SERVER_CONTENT_ID);
    var title = doc.querySelector("title");

    // Collect page-specific inline scripts from the full document body.
    // These are scripts that define Alpine components, page-local helpers, etc.
    // They typically live after </main> and outside #page-content.
    var pageScripts = [];
    var allScripts = doc.querySelectorAll("body script:not([src])");
    for (var i = 0; i < allScripts.length; i++) {
      var s = allScripts[i];
      // Skip external scripts (already loaded by shell)
      if (s.src) continue;
      // Skip scripts inside #page-content (handled by content swap)
      if (content && content.contains(s)) continue;
      // Skip shell/bootstrap scripts in <head>
      if (s.closest("head")) continue;
      // Skip analytics, GTM, etc.
      if (s.src && /google|analytics|gtag|gtm|facebook|pixel/i.test(s.src))
        continue;
      // Only inline scripts with actual content
      var text = s.textContent || "";
      if (text.trim().length > 0) {
        pageScripts.push(text);
      }
    }

    return {
      content: content,
      title: title ? title.textContent : document.title,
      pageScripts: pageScripts,
    };
  }

  /**
   * Swap page content: cleanup old, insert new, reinit.
   * @param {HTMLElement} newContent - The new page-content element
   * @param {string[]} [pageScripts] - Inline script texts from outside #page-content
   */
  function swapContent(newContent, pageScripts) {
    var oldContent = getContentEl();
    if (!oldContent || !newContent) return;

    // 1. Run page-local cleanup
    runCleanup();

    // 2. Destroy Alpine components in old content
    destroyAlpineIn(oldContent);

    // 3. Save scroll position of any inner scrollable containers
    var scrollData = [];
    var innerScrollables = oldContent.querySelectorAll(
      "[class*='overflow-y-auto'], [class*='overflow-auto']",
    );
    innerScrollables.forEach(function (el) {
      scrollData.push({ el: el, top: el.scrollTop });
    });

    // 4. Replace content
    oldContent.innerHTML = newContent.innerHTML;

    // 5. Copy attributes from new content element
    Array.from(newContent.attributes).forEach(function (attr) {
      oldContent.setAttribute(attr.name, attr.value);
    });

    // 6. Restore inner scroll positions
    scrollData.forEach(function (d) {
      var newEl = oldContent.querySelector(
        "[class*='overflow-y-auto'], [class*='overflow-auto']",
      );
      if (newEl) newEl.scrollTop = d.top;
    });

    // 7. Re-execute scripts inside content, then page scripts outside content
    reexecScripts(oldContent)
      .then(function () {
        return reexecPageScripts(pageScripts || []);
      })
      .then(function () {
        // 8. Initialize Alpine on new content
        initAlpineIn(oldContent);

        // 9. Dispatch al:navigated event
        document.dispatchEvent(
          new CustomEvent("al:navigated", {
            detail: { path: normalizePath(window.location.pathname) },
          }),
        );
      });
  }

  // ── Animations ───────────────────────────────────────────────────────────

  function fadeOut(container) {
    return new Promise(function (resolve) {
      if (!container) {
        resolve();
        return;
      }
      var children = getAnimatableChildren(container);
      var targets = children.length ? children : [container];
      var completed = 0;
      var total = targets.length;

      if (total === 0) {
        resolve();
        return;
      }

      targets.forEach(function (t, i) {
        t.style.transition =
          "opacity " +
          FADE_OUT_MS +
          "ms " +
          EASE_OUT +
          " " +
          i * STAGGER_MS +
          "ms";
        t.style.opacity = "0";
      });

      // Wait for the last stagger + fade duration
      var maxDelay = (total - 1) * STAGGER_MS + FADE_OUT_MS;
      setTimeout(resolve, maxDelay + 10);
    });
  }

  function fadeIn(container) {
    return new Promise(function (resolve) {
      if (!container) {
        resolve();
        return;
      }
      container.style.opacity = "1";
      var children = getAnimatableChildren(container);

      if (!children.length) {
        resolve();
        return;
      }

      children.forEach(function (child, i) {
        child.style.opacity = "0";
        child.style.transform = "translateY(4px)";
        child.style.transition =
          "opacity " +
          FADE_IN_MS +
          "ms " +
          EASE_IN +
          " " +
          i * STAGGER_MS +
          "ms, " +
          "transform " +
          FADE_IN_MS +
          "ms " +
          EASE_IN +
          " " +
          i * STAGGER_MS +
          "ms";

        // Force reflow
        void child.offsetWidth;

        child.style.opacity = "1";
        child.style.transform = "translateY(0)";
      });

      var maxDelay = (children.length - 1) * STAGGER_MS + FADE_IN_MS;
      setTimeout(resolve, maxDelay + 10);
    });
  }

  // ── Loading state ────────────────────────────────────────────────────────

  function getLoadingMessage(path) {
    if (path === "/" || path === "/admin" || path === "/admin/overview")
      return {
        main: "Loading dashboard...",
        detail: "Fetching overview data and system status.",
      };
    if (path === "/account")
      return {
        main: "Loading account settings...",
        detail: "Retrieving your profile and preferences.",
      };
    if (path.startsWith("/admin/users"))
      return {
        main: "Loading users...",
        detail: "Fetching user accounts and permissions.",
      };
    if (path.startsWith("/admin/servers"))
      return {
        main: "Loading servers...",
        detail: "Retrieving server list and configurations.",
      };
    if (path.startsWith("/admin/nodes"))
      return {
        main: "Loading nodes...",
        detail: "Fetching node status and resource usage.",
      };
    if (path.startsWith("/admin/databases"))
      return {
        main: "Loading databases...",
        detail: "Retrieving database hosts and connections.",
      };
    if (path.startsWith("/admin/images"))
      return {
        main: "Loading images...",
        detail: "Fetching image catalog and configurations.",
      };
    if (path.startsWith("/admin/settings"))
      return {
        main: "Loading settings...",
        detail: "Retrieving panel configuration.",
      };
    if (path.startsWith("/admin/mounts"))
      return {
        main: "Loading mounts...",
        detail: "Fetching mount configurations.",
      };
    if (path.startsWith("/admin/apikeys"))
      return {
        main: "Loading API keys...",
        detail: "Retrieving API key inventory.",
      };
    if (path.startsWith("/admin/addons"))
      return {
        main: "Loading addons...",
        detail: "Fetching installed addons and status.",
      };
    if (path.startsWith("/server/") && path.includes("/files"))
      return {
        main: "Loading files...",
        detail: "Fetching current directory contents.",
      };
    if (path.startsWith("/server/") && path.includes("/databases"))
      return {
        main: "Loading databases...",
        detail: "Retrieving database credentials and status.",
      };
    if (path.startsWith("/server/") && path.includes("/backups"))
      return {
        main: "Loading backups...",
        detail: "Fetching backup list and restore points.",
      };
    if (path.startsWith("/server/") && path.includes("/schedules"))
      return {
        main: "Loading schedules...",
        detail: "Retrieving scheduled tasks and crons.",
      };
    if (path.startsWith("/server/") && path.includes("/subusers"))
      return {
        main: "Loading sub-users...",
        detail: "Fetching sub-user permissions and access.",
      };
    if (path.startsWith("/server/") && path.includes("/logs"))
      return {
        main: "Loading logs...",
        detail: "Fetching server log history.",
      };
    if (path.startsWith("/server/"))
      return {
        main: "Loading server...",
        detail: "Retrieving server details and status.",
      };
    return { main: "Loading...", detail: "Fetching page content." };
  }

  function showLoading(path) {
    var content = getContentEl();
    if (!content) return;

    var msg = getLoadingMessage(path);
    content.innerHTML =
      '<div class="flex flex-col items-center justify-center py-24 gap-4" aria-live="polite">' +
      '<div class="animate-spin h-8 w-8 border-2 border-current border-t-transparent rounded-full opacity-60"></div>' +
      '<div class="text-lg font-medium" style="color: var(--theme-text)">' +
      escapeHtml(msg.main) +
      "</div>" +
      '<div class="text-sm" style="color: var(--theme-text-muted)">' +
      escapeHtml(msg.detail) +
      "</div>" +
      "</div>";
    content.style.opacity = "1";
  }

  function hideLoading() {
    if (loadingTimer) {
      clearTimeout(loadingTimer);
      loadingTimer = null;
    }
  }

  function showError(path, error) {
    var content = getContentEl();
    if (!content) return;

    var msg =
      error && error.message ? escapeHtml(error.message) : "Unknown error";
    content.innerHTML =
      '<div class="flex flex-col items-center justify-center py-24 gap-4">' +
      '<div class="text-lg font-medium" style="color: var(--theme-text)">Unable to load page</div>' +
      '<div class="text-sm max-w-md text-center" style="color: var(--theme-text-muted)">' +
      msg +
      "</div>" +
      "<button onclick=\"Alnav.load('" +
      escapeHtml(path) +
      '\')" class="mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors" style="background: var(--theme-accent); color: var(--theme-bg)">Retry</button>' +
      "</div>";
    content.style.opacity = "1";
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ── Page metadata ────────────────────────────────────────────────────────

  function updateTitle(title) {
    if (title && title !== document.title) {
      document.title = title;
    }
  }

  function pushURL(url) {
    var path = normalizePath(url);
    var current = normalizePath(window.location.pathname);
    if (path !== current) {
      history.pushState({ alnav: true }, "", url);
    }
  }

  // ── Core navigation ──────────────────────────────────────────────────────

  /**
   * Navigate to a URL. Fetches the page, swaps content, updates history.
   * This is the main entry point.
   */
  function load(url, opts) {
    opts = opts || {};
    if (transitioning) return Promise.resolve();
    transitioning = true;

    var path = normalizePath(url);

    // Abort any in-flight request
    if (currentAbort) {
      currentAbort.abort();
      currentAbort = null;
    }

    var content = getContentEl();
    if (!content) {
      // No content element — fall back to full page load
      window.location.href = url;
      return Promise.resolve();
    }

    // Start top loading bar (page-loader.js owns this)
    if (window.ALPageActivity) window.ALPageActivity.start();

    // Show in-content loading state (delayed)
    loadingTimer = setTimeout(function () {
      showLoading(path);
    }, LOADING_DELAY_MS);

    // Fade out existing content
    return fadeOut(content)
      .then(function () {
        // Fetch new page
        currentAbort = new AbortController();
        return fetch(url, {
          headers: {
            "X-Alnav-Request": "1",
            Accept: "text/html",
          },
          signal: currentAbort.signal,
        });
      })
      .then(function (response) {
        if (!response.ok) {
          throw new Error(
            "HTTP " + response.status + ": " + response.statusText,
          );
        }
        return response.text();
      })
      .then(function (html) {
        var parsed = parseResponse(html);
        if (!parsed.content) {
          throw new Error("Page content not found in response.");
        }

        // Update title
        updateTitle(parsed.title);

        // Push URL to history
        if (!opts.replaceState) {
          pushURL(url);
        } else {
          history.replaceState({ alnav: true }, "", url);
        }

        // Swap content
        swapContent(parsed.content, parsed.pageScripts);

        // Fade in
        return fadeIn(content);
      })
      .then(function () {
        hideLoading();
        if (window.ALPageActivity) window.ALPageActivity.stop();
        transitioning = false;
        currentAbort = null;

        // Dispatch navigation complete event
        document.dispatchEvent(
          new CustomEvent("al:navigate-complete", {
            detail: { path: path },
          }),
        );
      })
      .catch(function (err) {
        hideLoading();
        if (window.ALPageActivity) window.ALPageActivity.stop();
        transitioning = false;
        currentAbort = null;

        if (err.name === "AbortError") return; // User navigated away

        console.error("[Alnav] Navigation failed:", err);
        showError(path, err);
      });
  }

  /**
   * Reload the current page content without a full browser reload.
   */
  function reload() {
    return load(window.location.href, { replaceState: true });
  }

  // ── Event handling ───────────────────────────────────────────────────────

  // Click interception — capture phase to intercept before page-loader
  document.addEventListener(
    "click",
    function (e) {
      if (e.defaultPrevented) return;
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;

      var a = e.target && e.target.closest && e.target.closest("a[href]");
      if (!a) return;

      // Let HTMX handle its own links
      if (isMutationLink(a)) return;

      if (!isLocalLink(a)) return;

      e.preventDefault();

      load(a.href);
    },
    true,
  );

  // Form submission interception
  document.addEventListener(
    "submit",
    function (e) {
      var form = e.target;
      if (!form || form.tagName !== "FORM") return;

      // Let HTMX handle hx-* forms
      if (
        form.matches("[hx-get], [hx-post], [hx-put], [hx-patch], [hx-delete]")
      )
        return;

      // Only intercept GET forms (navigation)
      if (form.method && form.method.toUpperCase() !== "GET") return;

      e.preventDefault();

      var formData = new FormData(form);
      var params = new URLSearchParams(formData).toString();
      var url = form.action || window.location.pathname;
      if (params) url += "?" + params;

      load(url);
    },
    true,
  );

  // Back/forward navigation
  window.addEventListener("popstate", function (e) {
    // Only handle our own history entries
    if (e.state && e.state.alnav) {
      load(window.location.href, { replaceState: true });
    } else if (!e.state) {
      // First visit or external navigation — let the browser handle it
      // This is a full page load for non-Alnav entries
      load(window.location.href, { replaceState: true });
    }
  });

  // ── Initialization ───────────────────────────────────────────────────────

  // Mark initial state
  if (history && !history.state) {
    history.replaceState({ alnav: true }, "", window.location.href);
  }

  // ── Public API ───────────────────────────────────────────────────────────

  window.Alnav = {
    load: load,
    reload: reload,
    onCleanup: onCleanup,
    isNavigating: function () {
      return transitioning;
    },
  };
})();
