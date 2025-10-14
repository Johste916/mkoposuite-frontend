import axios from "axios";

/**
 * Base URL rules
 * - Prefer VITE_API_BASE_URL or VITE_API_BASE (full origin, may include /api)
 * - Fallback to same-origin + /api for local dev
 * - Ensure final baseURL ends WITH /api (but avoid /api/api)
 */
const envBaseRaw = (
  import.meta.env?.VITE_API_BASE_URL ||
  import.meta.env?.VITE_API_BASE ||
  ""
).toString();

const trimmed = envBaseRaw.replace(/\/+$/, "");
const fallbackOrigin =
  typeof window !== "undefined" ? window.location.origin : "http://localhost:10000";

// If no env provided, use same-origin; then ensure /api
const rawBase = trimmed || fallbackOrigin;
const base = rawBase.replace(/\/+$/, "");
const baseURL = /\/api$/i.test(base) ? base : `${base}/api`; // <- canonical

// Optional knobs (safe defaults)
const WITH_CREDENTIALS =
  (import.meta.env?.VITE_API_WITH_CREDENTIALS ?? "0").toString() === "1";
const TIMEOUT_MS = Number(import.meta.env?.VITE_API_TIMEOUT ?? 30000); // 30s
const MAX_GET_RETRIES = Number(import.meta.env?.VITE_API_RETRIES ?? 0); // off by default

/** Axios instance */
const api = axios.create({
  baseURL, // ends WITHOUT trailing slash
  withCredentials: WITH_CREDENTIALS,
  timeout: TIMEOUT_MS,
  headers: {
    Accept: "application/json",
  },
});

/** Normalize paths so consumers can pass 'users', '/users', or '/api/users' */
const BASE_HAS_API = /\/api$/i.test(baseURL);
function normalizePath(input) {
  if (!input) return "/";
  if (/^https?:\/\//i.test(input)) return input; // absolute pass-through

  let url = String(input).trim();
  if (!url.startsWith("/")) url = `/${url}`;
  if (BASE_HAS_API && url.startsWith("/api/")) url = url.slice(4); // drop duplicate /api
  url = url.replace(/\/{2,}/g, "/");
  return url;
}

/** Create /api and non-/api variants for a path and dedupe */
function variantsFor(p) {
  const clean = normalizePath(p);
  const noApi = clean.replace(/^\/api\//, "/");
  const withApi = noApi.startsWith("/api/") ? noApi : `/api${noApi}`;
  return Array.from(new Set([noApi, withApi]));
}

/** Optional request-id */
function makeReqId() {
  try {
    const c = globalThis?.crypto;
    if (c?.randomUUID) return c.randomUUID();
  } catch {}
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

let overrideTenantId = null;
const SEND_TZ_HEADERS =
  (import.meta.env?.VITE_SEND_TZ_HEADERS ?? "1").toString() !== "0";

/** Detect FormData without importing DOM types in SSR builds */
function isFormData(v) {
  return typeof FormData !== "undefined" && v instanceof FormData;
}

/* ----------------------------- Request interceptor ---------------------------- */
api.interceptors.request.use((config) => {
  // Normalize relative URL
  if (config.url && !/^https?:\/\//i.test(config.url)) {
    config.url = normalizePath(config.url);
  }

  // Auth header
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Adopt ?tenantId=... from URL if no override yet (so FIRST request has tenant)
  try {
    if (typeof window !== "undefined" && !overrideTenantId) {
      const u = new URL(window.location.href);
      const t = u.searchParams.get("tenantId");
      if (t) overrideTenantId = t;
    }
  } catch {}

  // Tenant header (override > activeTenantId > user.tenantId-ish)
  let tenantId = overrideTenantId;
  if (!tenantId) {
    tenantId =
      localStorage.getItem("activeTenantId") ||
      (() => {
        try {
          const user = JSON.parse(localStorage.getItem("user") || "{}");
          return (
            user?.tenantId ||
            user?.tenant?.id ||
            user?.orgId ||
            user?.companyId ||
            null
          );
        } catch {
          return null;
        }
      })();
  }
  if (tenantId) config.headers["x-tenant-id"] = tenantId;

  // Branch header
  const activeBranchId = localStorage.getItem("activeBranchId");
  if (activeBranchId) config.headers["x-branch-id"] = activeBranchId;

  // Timezone headers
  if (SEND_TZ_HEADERS) {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) config.headers["x-timezone"] = tz;
    } catch {}
    config.headers["x-tz-offset"] = String(new Date().getTimezoneOffset());
  }

  // If sending FormData, let the browser set the boundary automatically
  if (isFormData(config.data)) {
    if (config.headers && "Content-Type" in config.headers) {
      delete config.headers["Content-Type"];
    }
  } else {
    if (!config.headers["x-request-id"]) {
      config.headers["x-request-id"] = makeReqId();
    }
  }

  return config;
});

/* ----------------------------- Response interceptor ----------------------------- */
/** Consistent error normalization + 401 handler + optional safe GET retries */
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err?.response?.status;
    const cfg = err?.config || {};

    // Normalize message
    if (!status) {
      err.normalizedMessage =
        err?.message === "Network Error"
          ? "Network error: server unreachable."
          : err?.code === "ECONNABORTED"
          ? "Request timeout. Please try again."
          : err?.message || "Request failed.";
    } else {
      err.normalizedMessage =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        `Request failed (${status})`;
    }

    // Auto-logout on 401 (token auth)
    if (status === 401) {
      console.warn("401 Unauthorized. Redirecting to login…");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.includes("/login")
      ) {
        window.location.href = "/login";
      }
      return Promise.reject(err);
    }

    // Optional: retry **GET** on transient errors (disabled unless VITE_API_RETRIES>0)
    const transient = status && [429, 502, 503, 504].includes(status);
    const isGet = (cfg.method || "get").toLowerCase() === "get";
    cfg.__retryCount = cfg.__retryCount || 0;

    if (
      MAX_GET_RETRIES > 0 &&
      isGet &&
      transient &&
      cfg.__retryCount < MAX_GET_RETRIES
    ) {
      cfg.__retryCount += 1;
      const backoff = Math.min(1000 * 2 ** (cfg.__retryCount - 1), 4000); // 1s, 2s, 4s cap
      await new Promise((r) => setTimeout(r, backoff));
      return api.request(cfg);
    }

    return Promise.reject(err);
  }
);

/** Convenience helpers that return data directly */
api.getJSON = async (url, config) =>
  (await api.get(normalizePath(url), config)).data;
api.postJSON = async (url, data, config) =>
  (await api.post(normalizePath(url), data, config)).data;
api.putJSON = async (url, data, config) =>
  (await api.put(normalizePath(url), data, config)).data;
api.patchJSON = async (url, data, config) =>
  (await api.patch(normalizePath(url), data, config)).data;
api.deleteJSON = async (url, config) =>
  (await api.delete(normalizePath(url), config)).data;

/** Form helpers (for photo/KYC uploads, etc.) */
api.postForm = async (url, formData, config = {}) =>
  (await api.post(normalizePath(url), formData, config)).data;
api.putForm = async (url, formData, config = {}) =>
  (await api.put(normalizePath(url), formData, config)).data;
api.patchForm = async (url, formData, config = {}) =>
  (await api.patch(normalizePath(url), formData, config)).data;

/**
 * Try a list of endpoints (first that works).
 * Accepts a string or array; for each path we auto-try both non-/api and /api variants.
 * Example: await api.postFirst('admin/communications', payload)
 */
async function firstOk(method, paths, payload, config) {
  const inputList = Array.isArray(paths) ? paths : [paths];
  // Build flattened list of variant candidates and dedupe
  const candidates = Array.from(
    new Set(inputList.flatMap((p) => variantsFor(p)))
  );

  let lastErr;
  for (const p of candidates) {
    try {
      const url = normalizePath(p);
      const res =
        method === "get" || method === "delete"
          ? await api[method](url, config)
          : await api[method](url, payload, config);
      return res.data;
    } catch (e) {
      lastErr = e;
      // continue to the next candidate
    }
  }
  throw lastErr || new Error("No endpoint succeeded");
}

api.getFirst = (paths, config) => firstOk("get", paths, undefined, config);
api.postFirst = (paths, data, config) => firstOk("post", paths, data, config);
api.patchFirst = (paths, data, config) => firstOk("patch", paths, data, config);
api.putFirst = (paths, data, config) => firstOk("put", paths, data, config);
api.deleteFirst = (paths, config) => firstOk("delete", paths, undefined, config);

/** Path utility + sugar methods mirroring axios verbs with normalization */
api.path = normalizePath;
["get", "post", "put", "patch", "delete"].forEach((m) => {
  api[`_${m}`] = (url, ...rest) => api[m](normalizePath(url), ...rest);
});

/** Tenant override helpers */
api.setTenantId = (id) => {
  overrideTenantId = id || null;
};
api.clearTenantId = () => {
  overrideTenantId = null;
};
api.getTenantId = () =>
  overrideTenantId ||
  localStorage.getItem("activeTenantId") ||
  (() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return (
        user?.tenantId ||
        user?.tenant?.id ||
        user?.orgId ||
        user?.companyId ||
        null
      );
    } catch {
      return null;
    }
  })();

/** Optional: create an AbortController for cancellations */
api.withAbort = () => {
  const ac = new AbortController();
  return { signal: ac.signal, cancel: () => ac.abort() };
};

export default api;
export { api };
