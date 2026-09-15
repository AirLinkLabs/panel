/**
 * Browser-side API client — thin fetch wrapper for /api/v2 endpoints.
 * Used by islands and genuinely-dynamic widgets. Not a generic framework.
 *
 * Usage:
 *   import { api, post, patch, del } from './shared/api-client.js';
 *   const data = await api('/api/v2/admin/settings/smtp/test');
 */
const BASE = "/api/v2";

async function apiFetch(url, opts = {}) {
  const isForm =
    typeof FormData !== "undefined" && opts.body instanceof FormData;
  const headers = isForm
    ? { ...opts.headers }
    : { "Content-Type": "application/json", ...opts.headers };

  const res = await fetch(url, {
    method: opts.method || "GET",
    headers,
    credentials: "same-origin",
    signal: opts.signal || undefined,
    body: opts.body ? opts.body : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const e = new Error(data.error || data.message || "Request failed");
    e.status = res.status;
    throw e;
  }

  return data;
}

function qs(params) {
  return params ? "?" + new URLSearchParams(params).toString() : "";
}

export function api(url, params) {
  return apiFetch(url + qs(params)).catch(handleError);
}

export function post(url, data) {
  return apiFetch(url, { method: "POST", body: JSON.stringify(data) }).catch(
    handleError,
  );
}

export function postForm(url, formData) {
  return apiFetch(url, { method: "POST", body: formData }).catch(handleError);
}

export function patch(url, data) {
  return apiFetch(url, { method: "PATCH", body: JSON.stringify(data) }).catch(
    handleError,
  );
}

export function del(url) {
  return apiFetch(url, { method: "DELETE" }).catch(handleError);
}

function handleError(err) {
  if (err && err.name === "AbortError") throw err;
  const message =
    err && err.status ? err.message : "Request failed. Try again?";
  if (window.showToast) showToast(message, "error");
  return null;
}
