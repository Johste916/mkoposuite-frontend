import axios from "axios";

// Prefer env var, fall back to origin + /api (works on Render/Netlify proxy setups)
const baseURL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") ||
  `${window.location.origin}/api`;

const api = axios.create({
  baseURL,
  withCredentials: false, // set true only if you use cookie-based auth
});

const TOKEN_KEYS = ["token", "authToken", "accessToken", "jwt"];

function decodeJwtTenantId(token) {
  try {
    const parts = String(token).split(".");
    if (parts.length < 2) return null;
    const json = JSON.parse(atob(parts[1]));
    return (
      json.tenantId ||
      json.tenant_id ||
      json.tid ||
      json.tenant ||
      null
    );
  } catch {
    return null;
  }
}

api.interceptors.request.use((config) => {
  let token = null;
  for (const k of TOKEN_KEYS) {
    token = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (token) break;
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token.replace(/^Bearer /i, "")}`;
  }

  // Ensure every call carries the tenant id expected by the backend guards
  if (!config.headers["x-tenant-id"]) {
    const storedTid =
      localStorage.getItem("tenantId") ||
      sessionStorage.getItem("tenantId") ||
      import.meta.env.VITE_TENANT_ID ||
      decodeJwtTenantId(token);
    if (storedTid) config.headers["x-tenant-id"] = storedTid;
  }

  // Optional: pass a branch id if you store one client-side
  const bid = localStorage.getItem("branchId") || sessionStorage.getItem("branchId");
  if (bid && !config.headers["x-branch-id"]) {
    config.headers["x-branch-id"] = bid;
  }

  return config;
});

api.interceptors.response.use(
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

export default api;
