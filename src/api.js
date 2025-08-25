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

function normalizePath(input) {
  if (!input) return "/";
  if (/^https?:\/\//i.test(input)) return input;

  const baseHasApi = /\/api$/i.test(api.defaults.baseURL || "");
  let url = String(input).trim();

  if (!url.startsWith("/")) url = `/${url}`;
  if (baseHasApi && url.startsWith("/api/")) url = url.slice(4);
  url = url.replace(/\/{2,}/g, "/");
  return url;
}

let overrideTenantId = null;
const SEND_TZ_HEADERS =
  (import.meta.env.VITE_SEND_TZ_HEADERS ?? "1").toString() !== "0";

api.interceptors.request.use((config) => {
  if (config.url && !/^https?:\/\//i.test(config.url)) {
    config.url = normalizePath(config.url);
  }

  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;

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

  const activeBranchId = localStorage.getItem("activeBranchId");
  if (activeBranchId) config.headers["x-branch-id"] = activeBranchId;

  if (SEND_TZ_HEADERS) {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) config.headers["x-timezone"] = tz;
    } catch {}
    config.headers["x-tz-offset"] = String(new Date().getTimezoneOffset());
  }

  return config;
});

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

    if (status === 401) {
      console.warn("401 Unauthorized. Redirecting to login…");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

api.path = normalizePath;
["get", "post", "put", "patch", "delete"].forEach((m) => {
  api[`_${m}`] = (url, ...rest) => api[m](normalizePath(url), ...rest);
});

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
