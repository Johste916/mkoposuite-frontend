import axios from "axios";

// Prefer explicit env, fallback to current origin + /api
const baseURL =
  (import.meta.env?.VITE_API_BASE_URL || process.env.REACT_APP_API_URL || `${window.location.origin}/api`)
    .toString()
    .replace(/\/+$/, "");

const client = axios.create({
  baseURL,
  withCredentials: false,
  headers: { "Content-Type": "application/json" },
});

// Common localStorage keys
const TOKEN_KEYS = ["token", "authToken", "accessToken", "access_token", "jwt"];
const TENANT_KEYS = ["tenantId", "tenant"]; // tenant can be a JSON string with {id,name}

/**
 * Request interceptor:
 *  - Attach Authorization token
 *  - Attach x-tenant-id and x-branch-id (fallback from localStorage)
 *  - Attach timezone hints (nice-to-have)
 */
client.interceptors.request.use((config) => {
  // Token
  for (const k of TOKEN_KEYS) {
    const v = localStorage.getItem(k);
    if (v) {
      config.headers.Authorization = `Bearer ${String(v).replace(/^Bearer\s+/i, "")}`;
      break;
    }
  }

  // Tenant id
  let tenantId = localStorage.getItem("x-tenant-id") || localStorage.getItem("tenantId");
  if (!tenantId) {
    try {
      const t = JSON.parse(localStorage.getItem("tenant") || "null");
      if (t && t.id) tenantId = t.id;
    } catch {}
  }
  if (tenantId) config.headers["x-tenant-id"] = tenantId;

  // Branch id (if any)
  const branchId = localStorage.getItem("activeBranchId");
  if (branchId) config.headers["x-branch-id"] = branchId;

  // Timezone hints
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) config.headers["x-timezone"] = tz;
  } catch {}
  try {
    config.headers["x-tz-offset"] = String(new Date().getTimezoneOffset() * -1); // minutes east of UTC
  } catch {}

  return config;
});

// Standard response handler
client.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      err?.response?.data?.error ||
      err?.response?.data?.message ||
      err?.message ||
      "Request failed";
    console.error("API error:", msg, err?.response || err);
    return Promise.reject(err);
  }
);

// Compatibility shim for older imports
export { default } from "./index";
export * from "./index";
