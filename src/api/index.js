// Centralized Axios instance with auth/tenant/branch headers, safe 401 handling,
// light retries for timeouts/5xx, normalized errors, and per-request cancellation.

import axios from "axios";

// Resolve base URL (env or /api fallback)
const baseURL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL?.replace(/\/+$/, "")) ||
  (typeof process !== "undefined" && process.env?.REACT_APP_API_BASE_URL?.replace(/\/+$/, "")) ||
  `${(typeof window !== "undefined" && window.location?.origin) || ""}/api`;

const api = axios.create({
  baseURL,
  timeout: 30000,
  withCredentials: false,
});

// Helpers to pull tokens/tenant/branch from storage
const TOKEN_KEYS = ["token", "jwt", "authToken", "accessToken", "access_token"];
const TENANT_KEYS = ["tenant", "tenantId", "x-tenant-id", "tenantID"];
const getToken = () => {
  for (const k of TOKEN_KEYS) {
    const v = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (v) return String(v).replace(/^Bearer\s+/i, "");
  }
  return null;
};
const getTenantId = () => {
  // Prefer full tenant object if present
  try {
    const raw = localStorage.getItem("tenant") || sessionStorage.getItem("tenant");
    if (raw) {
      const t = JSON.parse(raw);
      if (t?.id) return t.id;
    }
  } catch {}
  for (const k of TENANT_KEYS) {
    const v = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (v) return v;
  }
  // env default (optional)
  const envDefault =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_DEFAULT_TENANT_ID) ||
    (typeof process !== "undefined" && process.env?.REACT_APP_DEFAULT_TENANT_ID);
  return envDefault || null;
};
const getBranchId = () => localStorage.getItem("activeBranchId") || sessionStorage.getItem("activeBranchId") || null;
const randomId = () => (crypto?.randomUUID?.() || `req_${Date.now()}_${Math.random().toString(36).slice(2)}`);

// Attach headers before each request
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const tenantId = getTenantId();
  if (tenantId) config.headers["x-tenant-id"] = tenantId;

  const branchId = getBranchId();
  if (branchId) config.headers["x-branch-id"] = branchId;

  config.headers["x-request-id"] ||= randomId();
  return config;
});

// One-way signout to avoid redirect loops
const signOut = () => {
  try {
    [
      ...TOKEN_KEYS,
      "user", "tenant", "tenantId", "tenantName", "activeBranchId",
    ].forEach((k) => {
      try { localStorage.removeItem(k); } catch {}
      try { sessionStorage.removeItem(k); } catch {}
    });
    delete api.defaults.headers.common.Authorization;
    delete api.defaults.headers.common["x-tenant-id"];
    delete api.defaults.headers.common["x-branch-id"];
  } catch {}
  if (typeof window !== "undefined" && window.location?.pathname !== "/login") {
    window.location.replace("/login");
  }
};

// Normalize & retry policy
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    // Canceled by AbortController
    if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") {
      return Promise.reject(err);
    }

    const status = err?.response?.status;
    const code = err?.code;

    // Normalized message for UI
    err.normalizedMessage =
      code === "ECONNABORTED" ? "Request timeout. Please try again." :
      status === 401        ? "Unauthorized. Please sign in again." :
      status >= 500         ? "Server error. Please try again." :
      (err?.response?.data?.message || err?.response?.data?.error || err?.message || "Request failed");

    // Hard 401: purge and redirect
    if (status === 401) {
      signOut();
      return Promise.reject(err);
    }

    // Light retries for ECONNABORTED / 5xx
    const cfg = err.config || {};
    const shouldRetry = code === "ECONNABORTED" || (status >= 500 && status < 600);
    if (shouldRetry && (cfg._retry || 0) < 2) {
      cfg._retry = (cfg._retry || 0) + 1;
      const delay = 300 * Math.pow(2, cfg._retry - 1); // 300ms, 600ms
      await new Promise((r) => setTimeout(r, delay));
      return api(cfg);
    }

    // Bubble up
    if (process.env.NODE_ENV !== "production") {
      console.error("API error:", err.normalizedMessage, err?.response || err);
    }
    return Promise.reject(err);
  }
);

export default api;
