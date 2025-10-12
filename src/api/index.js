// src/api/index.js
import axios from "axios";

/* ---------- Base URL ---------- */
const fromVite =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE)) ||
  "";

const fromNode =
  (typeof globalThis !== "undefined" &&
    globalThis.process &&
    globalThis.process.env &&
    (globalThis.process.env.REACT_APP_API_BASE_URL ||
      globalThis.process.env.REACT_APP_API_URL)) ||
  "";

const origin =
  (typeof window !== "undefined" && window.location && window.location.origin) ||
  "http://localhost:10000";

const rawBase = String(fromVite || fromNode || origin).replace(/\/+$/, "");
const baseURL = /\/api$/i.test(rawBase) ? rawBase : `${rawBase}/api`;

/* ---------- Knobs ---------- */
const WITH_CREDENTIALS = String(
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_API_WITH_CREDENTIALS) ?? "0"
) === "1";

const TIMEOUT =
  Number(
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_API_TIMEOUT) ?? 30000
  ) || 30000;

const MAX_GET_RETRIES =
  Number(
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_API_RETRIES) ?? 0
  ) || 0;

/* ---------- Axios instance ---------- */
const api = axios.create({
  baseURL,
  withCredentials: WITH_CREDENTIALS,
  timeout: TIMEOUT,
  headers: { Accept: "application/json" },
});

/* ---------- Helpers ---------- */
const BASE_HAS_API = /\/api$/i.test(baseURL);

function normalizePath(url) {
  if (!url) return "/";
  if (/^https?:\/\//i.test(url)) return url;
  let u = String(url).trim();
  if (!u.startsWith("/")) u = `/${u}`;
  if (BASE_HAS_API && u.startsWith("/api/")) u = u.slice(4); // avoid /api/api
  return u.replace(/\/{2,}/g, "/");
}

function isFormData(v) {
  return typeof FormData !== "undefined" && v instanceof FormData;
}

function reqId() {
  try {
    if (globalThis?.crypto?.randomUUID) return crypto.randomUUID();
  } catch {}
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

let tenantOverride = null;

/* ---------- Request interceptor ---------- */
api.interceptors.request.use((config) => {
  if (config.url && !/^https?:\/\//i.test(config.url)) {
    config.url = normalizePath(config.url);
  }

  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${String(token).replace(/^Bearer\s+/i, "")}`;

  const tenantId =
    tenantOverride ||
    localStorage.getItem("tenantId") ||
    localStorage.getItem("activeTenantId") ||
    (() => {
      try {
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        return u?.tenantId || u?.tenant?.id || u?.activeMembership?.tenant_id || null;
      } catch {
        return null;
      }
    })();
  if (tenantId) config.headers["x-tenant-id"] = tenantId;

  const branchId = localStorage.getItem("activeBranchId");
  if (branchId) config.headers["x-branch-id"] = branchId;

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) config.headers["x-timezone"] = tz;
  } catch {}
  try {
    config.headers["x-tz-offset"] = String(new Date().getTimezoneOffset());
  } catch {}

  if (isFormData(config.data)) {
    if (config.headers && "Content-Type" in config.headers) {
      delete config.headers["Content-Type"];
    }
  } else {
    config.headers["x-request-id"] ||= reqId();
    config.headers["Content-Type"] ||= "application/json";
  }

  return config;
});

/* ---------- Response interceptor ---------- */
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err?.response?.status;
    const cfg = err?.config || {};

    err.normalizedMessage = !status
      ? err?.message === "Network Error"
        ? "Network error: server unreachable."
        : err?.code === "ECONNABORTED"
        ? "Request timeout. Please try again."
        : err?.message || "Request failed."
      : err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        `Request failed (${status})`;

    if (status === 401) {
      [
        "token",
        "jwt",
        "authToken",
        "accessToken",
        "access_token",
        "user",
        "tenantId",
        "activeTenantId",
        "activeBranchId",
      ].forEach((k) => {
        try {
          localStorage.removeItem(k);
          sessionStorage.removeItem(k);
        } catch {}
      });
      delete api.defaults.headers.common.Authorization;
      delete api.defaults.headers.common["x-tenant-id"];
      delete api.defaults.headers.common["x-branch-id"];
      if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        window.location.replace("/login");
      }
      return Promise.reject(err);
    }

    const transient = status && [429, 502, 503, 504].includes(status);
    const isGet = (cfg.method || "get").toLowerCase() === "get";
    cfg.__retryCount = cfg.__retryCount || 0;
    if (MAX_GET_RETRIES > 0 && isGet && transient && cfg.__retryCount < MAX_GET_RETRIES) {
      cfg.__retryCount += 1;
      const backoff = Math.min(1000 * 2 ** (cfg.__retryCount - 1), 4000);
      await new Promise((r) => setTimeout(r, backoff));
      return api.request(cfg);
    }

    if (import.meta?.env?.MODE !== "production") {
      console.error("API error:", err.normalizedMessage, err?.response || err);
    }
    return Promise.reject(err);
  }
);

/* ---------- JSON helpers ---------- */
api.getJSON = async (url, config) => (await api.get(normalizePath(url), config)).data;
api.postJSON = async (url, data, config) => (await api.post(normalizePath(url), data, config)).data;
api.putJSON = async (url, data, config) => (await api.put(normalizePath(url), data, config)).data;
api.patchJSON = async (url, data, config) => (await api.patch(normalizePath(url), data, config)).data;
api.deleteJSON = async (url, config) => (await api.delete(normalizePath(url), config)).data;

/* ---------- Expose ---------- */
api.setTenantId = (id) => { tenantOverride = id || null; };
api.clearTenantId = () => { tenantOverride = null; };
api.path = normalizePath;

export default api;
export { api };
