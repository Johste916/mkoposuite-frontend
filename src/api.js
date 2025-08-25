// src/api.js
import axios from "axios";

/**
 * Base URL rules
 * - Prefer VITE_API_BASE_URL (e.g. https://your-host.com/api)
 * - Fallback to same-origin + /api for local dev
 */
const envBase = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
const fallbackBase =
  typeof window !== "undefined" ? `${window.location.origin}/api` : "/api";
const baseURL = envBase || fallbackBase;

const api = axios.create({
  baseURL, // ends WITHOUT trailing slash
  withCredentials: false,
  headers: {
    Accept: "application/json",
  },
});

/** Normalize a path against baseURL
 * - If baseURL already ends with /api and path starts with /api, strip that leading /api
 * - Always ensure a single leading slash
 * - Leave absolute URLs untouched
 */
function normalizePath(input) {
  if (!input) return "/";
  if (/^https?:\/\//i.test(input)) return input; // absolute URL → pass-through

  const baseHasApi = /\/api$/i.test(api.defaults.baseURL || "");
  let url = String(input).trim();

  if (!url.startsWith("/")) url = `/${url}`;
  if (baseHasApi && url.startsWith("/api/")) url = url.slice(4); // drop leading /api

  // collapse duplicate slashes (but keep the protocol part in absolute URLs)
  url = url.replace(/\/{2,}/g, "/");
  return url;
}

/** Runtime tenant override (optional).
 * If set, this ID takes precedence over anything in localStorage.
 */
let overrideTenantId = null;

/** Inject auth + multitenant headers; normalize URL */
api.interceptors.request.use((config) => {
  // Normalize path
  if (config.url && !/^https?:\/\//i.test(config.url)) {
    config.url = normalizePath(config.url);
  }

  // Auth
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Tenant (override > activeTenantId > token user.tenantId)
  let tenantId = overrideTenantId;
  if (!tenantId) {
    tenantId =
      localStorage.getItem("activeTenantId") ||
      (() => {
        try {
          const user = JSON.parse(localStorage.getItem("user") || "{}");
          return user?.tenantId || user?.tenant?.id || user?.orgId || user?.companyId || null;
        } catch {
          return null;
        }
      })();
  }
  if (tenantId) config.headers["x-tenant-id"] = tenantId;

  // Branch context (optional)
  const activeBranchId = localStorage.getItem("activeBranchId");
  if (activeBranchId) config.headers["x-branch-id"] = activeBranchId;

  // Timezone context (handy for server-side date handling)
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) config.headers["x-timezone"] = tz;
  } catch {
    // noop
  }
  config.headers["x-tz-offset"] = String(new Date().getTimezoneOffset());

  return config;
});

/** Only log out on 401; keep user on 403 and let pages show a friendly message */
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;

    // Normalize message for network/timeout cases so UI can show something intelligible
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

    if (status === 401) {
      console.warn("401 Unauthorized. Redirecting to login…");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    // 403 will bubble up so your pages/components can render a friendly error
    return Promise.reject(err);
  }
);

// Convenience helpers that auto-normalize paths
api.path = normalizePath;
["get", "post", "put", "patch", "delete"].forEach((m) => {
  api[`_${m}`] = (url, ...rest) => api[m](normalizePath(url), ...rest);
});

/** Tenant helpers (optional) */
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
      return user?.tenantId || user?.tenant?.id || user?.orgId || user?.companyId || null;
    } catch {
      return null;
    }
  })();

export default api;
