// src/api/index.js
import axios from "axios";

/* ---------------------------------------------------------------------------
 * Base URL resolution (Vite dev, production, or runtime-injected)
 * ------------------------------------------------------------------------- */
const IME = (typeof import.meta !== "undefined" && import.meta.env) || {};
const RUNTIME_BASE =
  (typeof window !== "undefined" && window.__API_BASE_URL__) || "";

const envBaseRaw = String(
  IME.VITE_API_BASE_URL || IME.VITE_API_BASE || RUNTIME_BASE || ""
);

// trim right slashes, but DO NOT strip path like /api
const trimmed = envBaseRaw.replace(/\/+$/, "");
const fallbackOrigin =
  typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:10000";

// prefer env; else same-origin; then ensure trailing /api exactly once
const rawBase = trimmed || fallbackOrigin;
const base = rawBase.replace(/\/+$/, "");
const baseURL = /\/api(?:\/v\d+)?$/i.test(base) ? base : `${base}/api`;

/* ---------------------------------------------------------------------------
 * Toggles (sane defaults)
 * ------------------------------------------------------------------------- */
const WITH_CREDENTIALS = String(IME.VITE_API_WITH_CREDENTIALS ?? "0") === "1";
const TIMEOUT_MS = Number(IME.VITE_API_TIMEOUT ?? 30000) || 30000;
const MAX_GET_RETRIES = Number(IME.VITE_API_RETRIES ?? 0) || 0;
const SEND_TZ_HEADERS = String(IME.VITE_SEND_TZ_HEADERS ?? "1") !== "0";

/* ---------------------------------------------------------------------------
 * Axios instance
 * ------------------------------------------------------------------------- */
const api = axios.create({
  baseURL, // no trailing slash
  withCredentials: WITH_CREDENTIALS,
  timeout: TIMEOUT_MS,
  headers: { Accept: "application/json" },
});

/* ---------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------- */
const TOKEN_KEYS = ["access_token", "accessToken", "token", "authToken", "jwt"];
const BASE_HAS_API = /\/api/i.test(baseURL);

function normalizePath(input) {
  if (!input) return "/";
  if (/^https?:\/\//i.test(input)) return input; // absolute URL
  let url = String(input).trim();

  // keep query/hash intact
  const [pathOnly, qsHash = ""] = url.split(/(?=[?#])/);
  let path = pathOnly;
  if (!path.startsWith("/")) path = `/${path}`;
  if (BASE_HAS_API && path.startsWith("/api/")) path = path.slice(4); // avoid /api/api
  path = path.replace(/\/{2,}/g, "/");
  return `${path}${qsHash}`;
}

function variantsFor(p) {
  const clean = normalizePath(p);
  const noApi = clean.replace(/^\/api\//, "/");
  const withApi = noApi.startsWith("/api/") ? noApi : `/api${noApi}`;
  return Array.from(new Set([noApi, withApi]));
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

/* ---------------------------------------------------------------------------
 * Request interceptor
 * ------------------------------------------------------------------------- */
api.interceptors.request.use((config) => {
  if (config.url && !/^https?:\/\//i.test(config.url)) {
    config.url = normalizePath(config.url);
  }

  // Bearer token (support multiple keys)
  let token = null;
  for (const k of TOKEN_KEYS) {
    try {
      const v =
        typeof localStorage !== "undefined" ? localStorage.getItem(k) : null;
      if (v) {
        token = String(v).replace(/^Bearer\s+/i, "");
        break;
      }
    } catch {}
  }
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Capture ?tenantId= from URL on first run
  try {
    if (typeof window !== "undefined" && !tenantOverride) {
      const u = new URL(window.location.href);
      const t = u.searchParams.get("tenantId");
      if (t) tenantOverride = t;
    }
  } catch {}

  // Tenant header
  let tenantId =
    tenantOverride ||
    (typeof localStorage !== "undefined" &&
      (localStorage.getItem("activeTenantId") ||
        localStorage.getItem("x-tenant-id")));

  if (!tenantId && typeof localStorage !== "undefined") {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      tenantId = u?.tenantId || u?.tenant?.id || u?.orgId || u?.companyId || null;
    } catch {}
  }
  if (tenantId) config.headers["x-tenant-id"] = tenantId;

  // Branch header
  try {
    const branchId =
      typeof localStorage !== "undefined"
        ? localStorage.getItem("activeBranchId")
        : null;
    if (branchId) config.headers["x-branch-id"] = branchId;
  } catch {}

  // Timezone hints
  if (SEND_TZ_HEADERS) {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) config.headers["x-timezone"] = tz;
    } catch {}
    try {
      config.headers["x-tz-offset"] = String(new Date().getTimezoneOffset());
    } catch {}
  }

  // Content-Type + x-request-id (skip for FormData)
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

/* ---------------------------------------------------------------------------
 * Response interceptor
 * ------------------------------------------------------------------------- */
let redirectingOn401 = false;

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err?.response?.status;
    const cfg = err?.config || {};

    // Normalize message
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

    // 401: clear auth & go to /login once
    if (status === 401) {
      try {
        [
          ...TOKEN_KEYS,
          "user",
          "tenant",
          "tenantId",
          "tenantName",
          "activeTenantId",
          "activeBranchId",
          "x-tenant-id",
        ].forEach((k) => {
          try {
            if (typeof localStorage !== "undefined") localStorage.removeItem(k);
            if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(k);
          } catch {}
        });
        delete api.defaults.headers.common.Authorization;
        delete api.defaults.headers.common["x-tenant-id"];
        delete api.defaults.headers.common["x-branch-id"];
      } catch {}

      if (!redirectingOn401 && typeof window !== "undefined") {
        redirectingOn401 = true;
        if (!/\/login$/.test(window.location.pathname)) {
          window.location.replace("/login");
        }
      }
      return Promise.reject(err);
    }

    // Retry safe GETs on transient upstream errors (optional)
    const transient = status && [429, 502, 503, 504].includes(status);
    const isGet = (cfg.method || "get").toLowerCase() === "get";
    cfg.__retryCount = cfg.__retryCount || 0;

    if (MAX_GET_RETRIES > 0 && isGet && transient && cfg.__retryCount < MAX_GET_RETRIES) {
      cfg.__retryCount += 1;
      const backoff = Math.min(1000 * 2 ** (cfg.__retryCount - 1), 4000);
      await new Promise((r) => setTimeout(r, backoff));
      return api.request(cfg);
    }

    if (IME.MODE !== "production") {
      // eslint-disable-next-line no-console
      console.error("API error:", err.normalizedMessage, err?.response || err);
    }
    return Promise.reject(err);
  }
);

/* ---------------------------------------------------------------------------
 * Convenience helpers
 * ------------------------------------------------------------------------- */
api.getJSON    = async (url, config)       => (await api.get   (normalizePath(url), config)).data;
api.postJSON   = async (url, data, config) => (await api.post  (normalizePath(url), data, config)).data;
api.putJSON    = async (url, data, config) => (await api.put   (normalizePath(url), data, config)).data;
api.patchJSON  = async (url, data, config) => (await api.patch (normalizePath(url), data, config)).data;
api.deleteJSON = async (url, config)       => (await api.delete(normalizePath(url), config)).data;

api.postForm   = async (u, f, c) => (await api.post (normalizePath(u), f, c)).data;
api.putForm    = async (u, f, c) => (await api.put  (normalizePath(u), f, c)).data;
api.patchForm  = async (u, f, c) => (await api.patch(normalizePath(u), f, c)).data;

async function __firstOk(method, paths, payload, config) {
  const list = Array.isArray(paths) ? paths : [paths];
  const candidates = Array.from(new Set(list.flatMap((p) => variantsFor(p))));
  let lastErr;
  for (const p of candidates) {
    try {
      const url = normalizePath(p);
      const res =
        method === "get" || method === "delete"
          ? await api[method](url, config)
          : await api[method](url, payload, config);
      return res.data;
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("No endpoint succeeded");
}

api.getFirst    = (paths, config)       => __firstOk("get",    paths, undefined, config);
api.postFirst   = (paths, data, config) => __firstOk("post",   paths, data,     config);
api.putFirst    = (paths, data, config) => __firstOk("put",    paths, data,     config);
api.patchFirst  = (paths, data, config) => __firstOk("patch",  paths, data,     config);
api.deleteFirst = (paths, config)       => __firstOk("delete", paths, undefined, config);

api.setTenantId = (id) => { tenantOverride = id || null; };
api.clearTenantId = () => { tenantOverride = null; };
api.getTenantId = () =>
  tenantOverride ||
  (typeof localStorage !== "undefined" ? localStorage.getItem("activeTenantId") : null) ||
  null;

api.path = normalizePath;
api.withAbort = () => { const ac = new AbortController(); return { signal: ac.signal, cancel: () => ac.abort() }; };
["get", "post", "put", "patch", "delete"].forEach((m) => {
  api[`_${m}`] = (url, ...rest) => api[m](normalizePath(url), ...rest);
});

export default api;
export { api };
