/**
 * al-tabs — lightweight tab switching, no dependencies.
 *
 * Works with:  [data-al-tabs]         container
 *              [data-tab]             buttons
 *              [data-tab-panel]       panels
 *              data-tabs-default      initial active tab
 *              data-tabs-hash         sync with URL hash
 */
(function () {
  "use strict";

  function activate(container, tabName) {
    var buttons = container.querySelectorAll("[data-tab]");
    var panels = container.querySelectorAll("[data-tab-panel]");

    buttons.forEach(function (btn) {
      var isActive = btn.getAttribute("data-tab") === tabName;
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
      btn.setAttribute("tabindex", isActive ? "0" : "-1");
      btn.classList.toggle("active", isActive);
    });

    panels.forEach(function (panel) {
      var show = panel.getAttribute("data-tab-panel") === tabName;
      if (show) {
        panel.removeAttribute("hidden");
      } else {
        panel.setAttribute("hidden", "");
      }
    });

    // Fire custom event
    container.dispatchEvent(
      new CustomEvent("al:tabs-change", {
        bubbles: true,
        detail: { name: tabName, tab: tabName },
      }),
    );
  }

  function getDefault(container) {
    // Check URL hash first if data-tabs-hash is present
    if (container.hasAttribute("data-tabs-hash") && window.location.hash) {
      var hash = window.location.hash.slice(1);
      var match = container.querySelector('[data-tab="' + hash + '"]');
      if (match) return hash;
    }
    return container.getAttribute("data-tabs-default") || null;
  }

  function initContainer(container) {
    var buttons = container.querySelectorAll("[data-tab]");
    var hashSync = container.hasAttribute("data-tabs-hash");

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var tab = btn.getAttribute("data-tab");
        activate(container, tab);
        if (hashSync) {
          history.replaceState(null, "", "#" + tab);
        }
      });
    });

    var initial = getDefault(container);
    if (initial) activate(container, initial);

    // Listen for back/forward navigation
    if (hashSync) {
      window.addEventListener("hashchange", function () {
        var hash = window.location.hash.slice(1);
        if (hash && container.querySelector('[data-tab="' + hash + '"]')) {
          activate(container, hash);
        }
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-al-tabs]").forEach(initContainer);
  });
})();
