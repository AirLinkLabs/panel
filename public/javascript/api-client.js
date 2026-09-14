/* V2 API Client — typed wrapper around fetch for /api/v2 endpoints.

   Returns parsed JSON on success, or null after showing a toast.
   CSRF is injected globally by csrf.js. */
(function () {
  if (window.Api) return;

  var BASE = "/api/v2";

  function api(url, opts) {
    opts = opts || {};
    var isForm =
      typeof FormData !== "undefined" && opts.body instanceof FormData;
    var headers = isForm
      ? Object.assign({}, opts.headers || {})
      : Object.assign(
          { "Content-Type": "application/json" },
          opts.headers || {},
        );
    return fetch(url, {
      method: opts.method || "GET",
      headers: headers,
      credentials: "same-origin",
      signal: opts.signal || undefined,
      body: opts.body ? opts.body : undefined,
    })
      .then(function (res) {
        return res
          .json()
          .catch(function () {
            return {};
          })
          .then(function (data) {
            if (!res.ok) {
              var e = new Error(data.error || data.message || "Request failed");
              e.status = res.status;
              throw e;
            }
            return data;
          });
      })
      .catch(function (err) {
        if (err && err.name === "AbortError") throw err;
        var message =
          err && err.status ? err.message : "Request failed. Try again?";
        if (window.showToast) showToast(message, "error");
        return null;
      });
  }

  function qs(params) {
    return params ? "?" + new URLSearchParams(params).toString() : "";
  }

  function post(url, data) {
    return api(url, { method: "POST", body: JSON.stringify(data) });
  }

  function postForm(url, formData) {
    return api(url, { method: "POST", body: formData });
  }

  function patch(url, data) {
    return api(url, { method: "PATCH", body: JSON.stringify(data) });
  }

  function del(url) {
    return api(url, { method: "DELETE" });
  }

  window.Api = {
    // ── System ──────────────────────────────────────────────────────────────
    system: {
      search: function (params) {
        return api(BASE + "/system/search" + qs(params));
      },
    },

    // ── Admin ───────────────────────────────────────────────────────────────
    admin: {
      // ── Admin: Servers ──────────────────────────────────────────────────
      servers: {
        delete: function (id) {
          return del(BASE + "/admin/servers/" + encodeURIComponent(id));
        },
      },

      // ── Admin: Settings ─────────────────────────────────────────────────
      settings: {
        banIp: function (data) {
          return post(BASE + "/admin/settings/ban-ip", data);
        },
        unbanIp: function (data) {
          return post(BASE + "/admin/settings/unban-ip", data);
        },
        testSmtp: function () {
          return post(BASE + "/admin/settings/smtp/test");
        },
        testS3: function () {
          return post(BASE + "/admin/settings/s3/test");
        },
        updateGeneral: function (data) {
          return postForm(BASE + "/admin/settings/general", data);
        },
        updateServerPolicy: function (data) {
          return patch(BASE + "/admin/settings/server-policy", data);
        },
        updateSecurity: function (data) {
          return patch(BASE + "/admin/settings/security", data);
        },
        updateSmtp: function (data) {
          return patch(BASE + "/admin/settings/smtp", data);
        },
        updateS3: function (data) {
          return patch(BASE + "/admin/settings/s3", data);
        },
        updateFeatures: function (data) {
          return patch(BASE + "/admin/settings/features", data);
        },
        updateAirlinkCloud: function (data) {
          return post(BASE + "/admin/settings/airlink-cloud", data);
        },
      },

      // ── Admin: Activity Logs ────────────────────────────────────────────
      activityLogs: {
        summary: function () {
          return api(BASE + "/admin/activity-logs/summary");
        },
        list: function (params) {
          return api(BASE + "/admin/activity-logs" + qs(params));
        },
      },

      // ── Admin: System Logs ──────────────────────────────────────────────
      systemLogs: {
        summary: function () {
          return api(BASE + "/admin/system-logs/summary");
        },
        list: function (params) {
          return api(BASE + "/admin/system-logs" + qs(params));
        },
      },

      // ── Admin: Analytics ────────────────────────────────────────────────
      analytics: {
        summary: function () {
          return api(BASE + "/admin/analytics/summary");
        },
      },
    },
  };
})();
