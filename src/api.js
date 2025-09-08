// src/api.js
import axios from "axios";

/**
 * Base URL rules
 * - Prefer VITE_API_BASE_URL or VITE_API_BASE (full origin, may include /api)
 * - Fallback to same-origin + /api for local dev
 */
const envBaseRaw =
  (import.meta.env?.VITE_API_BASE_URL ||
    import.meta.env?.VITE_API_BASE ||
    ""
  ).toString();

const envBase = envBaseRaw.replace(/\/+$/, ""); // trim trailing /
const fallbackBase =
  typeof window !== "undefined" ? `${window.location.origin}/api` : "/api";
const baseURL = envBase || fallbackBase;

/** Axios instance */
const api = axios.create({
  baseURL, // ends WITHOUT trailing slash
  withCredentials:
    (import.meta.env?.VITE_API_WITH_CREDENTIALS ?? "0").toString() === "1",
  headers: {
    Accept: "application/json",
  },
});

/** Normalize paths so consumers can pass 'users', '/users', or '/api/users' */
function normalizePath(input) {
  if (!input) return "/";
  if (/^https?:\/\//i.test(input)) return input;

  const baseHasApi = /\/api$/i.test(api.defaults.baseURL || "");
  let url = String(input).trim();

  if (!url.startsWith("/")) url = `/${url}`;
  if (baseHasApi && url.startsWith("/api/")) url = url.slice(4); // drop duplicate /api
  url = url.replace(/\/{2,}/g, "/");
  return url;
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

api.interceptors.request.use((config) => {
  // Normalize relative URL
  if (config.url && !/^https?:\/\//i.test(config.url)) {
    config.url = normalizePath(config.url);
  }

  // Auth header
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;

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

  // X-Request-Id
  if (!config.headers["x-request-id"]) {
    config.headers["x-request-id"] = makeReqId();
  }

  return config;
});

/** Consistent error normalization + 401 handler */
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;

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
      if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

/** Convenience helpers that return data directly */
api.getJSON = async (url, config) => (await api.get(normalizePath(url), config)).data;
api.postJSON = async (url, data, config) => (await api.post(normalizePath(url), data, config)).data;
api.putJSON = async (url, data, config) => (await api.put(normalizePath(url), data, config)).data;
api.patchJSON = async (url, data, config) => (await api.patch(normalizePath(url), data, config)).data;
api.deleteJSON = async (url, config) => (await api.delete(normalizePath(url), config)).data;

/**
 * Try a list of endpoints (first that works).
 * Example: await api.getFirst(['/api/support/tickets','/api/admin/tickets'])
 */
async function firstOk(method, paths, payload, config) {
  let lastErr;
  for (const p of paths) {
    try {
      const url = normalizePath(p);
      const res =
        method === "get" || method === "delete"
          ? await api[method](url, config)
          : await api[method](url, payload, config);
      return res.data;
    } catch (e) {
      lastErr = e;
      // Try next on common API mismatches
      const status = e?.response?.status;
      if (![400, 401, 403, 404, 409, 422, 500].includes(status)) {
        // unknown — still attempt next
      }
    }
  }
  throw lastErr;
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

export default api;
