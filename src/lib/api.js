// Centralized Axios instance with auth/tenant/branch headers, safe 401 handling,
// light retries for timeouts/5xx, normalized errors, and per-request cancellation.

import axios from "axios";

// Resolve base URL (env or /api fallback)
const resolveBaseURL = () => {
  // Allow a global override (useful when hosting frontend separate from API)
  if (typeof window !== "undefined" && window.__API_BASE__) {
    return String(window.__API_BASE__).replace(/\/+$/, "");
  }

  // Vite (common)
  if (typeof import.meta !== "undefined" && import.meta.env) {
    const cand =
      import.meta.env.VITE_API_BASE_URL ||
      import.meta.env.VITE_API_BASE ||                  // support your .env key
      import.meta.env.VITE_BACKEND_URL ||
      import.meta.env.VITE_API_URL;
    if (cand) return String(cand).replace(/\/+$/, "");
  }

  // CRA-style
  if (typeof process !== "undefined" && process.env) {
    const cand =
      process.env.REACT_APP_API_BASE_URL ||
      process.env.REACT_APP_API_BASE ||                 // CRA equivalent
      process.env.REACT_APP_BACKEND_URL ||
      process.env.REACT_APP_API_URL;
    if (cand) return String(cand).replace(/\/+$/, "");
  }

  // Fallback to same-origin /api
  const origin = (typeof window !== "undefined" && window.location?.origin) || "";
  return `${origin}/api`;
};

const baseURL = resolveBaseURL();

const api = axios.create({
  baseURL,
  timeout: 30000,
  withCredentials: false,
  headers: {
    Accept: "application/json",
  },
});

// Helpers to pull tokens/tenant/branch from storage
const TOKEN_KEYS = ["token", "jwt", "authToken", "accessToken", "access_token"];
const TENANT_KEYS = ["tenant", "tenantId", "x-tenant-id", "tenantID"];

const getToken = () => {
  for (const k of TOKEN_KEYS) {
    const v = (typeof localStorage !== "undefined" && localStorage.getItem(k)) ||
              (typeof sessionStorage !== "undefined" && sessionStorage.getItem(k));
    if (v) return String(v).replace(/^Bearer\s+/i, "");
  }
  return null;
};

const getTenantId = () => {
  try {
    const raw =
      (typeof localStorage !== "undefined" && localStorage.getItem("tenant")) ||
      (typeof sessionStorage !== "undefined" && sessionStorage.getItem("tenant"));
    if (raw) {
      const t = JSON.parse(raw);
      if (t?.id) return t.id;
    }
  } catch {}
  for (const k of TENANT_KEYS) {
    const v =
      (typeof localStorage !== "undefined" && localStorage.getItem(k)) ||
      (typeof sessionStorage !== "undefined" && sessionStorage.getItem(k));
    if (v) return v;
  }
  const envDefault =
    (typeof import.meta !== "undefined" &&
      import.meta.env?.VITE_DEFAULT_TENANT_ID) ||
    (typeof process !== "undefined" &&
      process.env?.REACT_APP_DEFAULT_TENANT_ID);
  return envDefault || null;
};

const getBranchId = () =>
  (typeof localStorage !== "undefined" && localStorage.getItem("activeBranchId")) ||
  (typeof sessionStorage !== "undefined" && sessionStorage.getItem("activeBranchId")) ||
  null;

const randomId = () =>
  (globalThis?.crypto?.randomUUID?.() ||
    `req_${Date.now()}_${Math.random().toString(36).slice(2)}`);

// Attach headers before each request
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const tenantId = getTenantId();
  if (tenantId) config.headers["x-tenant-id"] = tenantId;

  const branchId = getBranchId();
  if (branchId) config.headers["x-branch-id"] = branchId;

  try {
    const tz =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    if (!config.headers["x-timezone"]) config.headers["x-timezone"] = tz;
  } catch {}
  if (!config.headers["x-tz-offset"]) {
    try {
      const offsetMin = new Date().getTimezoneOffset(); // minutes
      config.headers["x-tz-offset"] = String(offsetMin);
    } catch {}
  }

  config.headers["x-request-id"] ||= randomId();
  config.headers["Content-Type"] ||= "application/json";

  return config;
});

// One-way signout to avoid redirect loops
const signOut = () => {
  try {
    [
      ...TOKEN_KEYS,
      "user",
      "tenant",
      "tenantId",
      "tenantName",
      "activeBranchId",
    ].forEach((k) => {
      try { typeof localStorage !== "undefined" && localStorage.removeItem(k); } catch {}
      try { typeof sessionStorage !== "undefined" && sessionStorage.removeItem(k); } catch {}
    });
    delete api.defaults.headers.common.Authorization;
    delete api.defaults.headers.common["x-tenant-id"];
    delete api.defaults.headers.common["x-branch-id"];
  } catch {}
  if (
    typeof window !== "undefined" &&
    !/^\/(login|auth)/.test(window.location?.pathname || "")
  ) {
    window.location.replace("/login");
  }
};

// Normalize & retry policy
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") {
      return Promise.reject(err);
    }

    const status = err?.response?.status;
    const code = err?.code;

    try {
      const rid =
        err?.response?.headers?.["x-request-id"] ||
        err?.response?.data?.requestId;
      if (rid) err.requestId = rid;
    } catch {}

    err.normalizedMessage =
      code === "ECONNABORTED"
        ? "Request timeout. Please try again."
        : status === 401
        ? "Unauthorized. Please sign in again."
        : status >= 500
        ? "Server error. Please try again."
        : err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Request failed";

    if (status === 401) {
      signOut();
      return Promise.reject(err);
    }

    const cfg = err.config || {};
    const shouldRetry =
      code === "ECONNABORTED" || (status >= 500 && status < 600);
    if (shouldRetry && (cfg._retry || 0) < 2) {
      cfg._retry = (cfg._retry || 0) + 1;
      const delay = 300 * Math.pow(2, cfg._retry - 1);
      await new Promise((r) => setTimeout(r, delay));
      return api(cfg);
    }

    if (process.env.NODE_ENV !== "production") {
      console.error("API error:", err.normalizedMessage, err?.response || err);
    }
    return Promise.reject(err);
  }
);

export default api;
