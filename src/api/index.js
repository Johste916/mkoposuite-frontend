import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") ||
  `${window.location.origin}/api`;

const api = axios.create({
  baseURL,
  withCredentials: false,
});

const TOKEN_KEYS = ["token", "authToken", "accessToken", "jwt"];
const TENANT_KEYS = ["tenantId", "x-tenant-id", "tenantID"];

api.interceptors.request.use((config) => {
  // bearer
  let token = null;
  for (const k of TOKEN_KEYS) {
    token = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (token) break;
  }
  if (token) config.headers.Authorization = `Bearer ${token.replace(/^Bearer /i, "")}`;

  // x-tenant-id
  let tenantId = null;
  for (const k of TENANT_KEYS) {
    tenantId = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (tenantId) break;
  }
  tenantId ||= import.meta.env.VITE_DEFAULT_TENANT_ID || null;
  if (tenantId) config.headers["x-tenant-id"] = tenantId;

  // request id (helps tracing)
  config.headers["x-request-id"] ||= (crypto?.randomUUID?.() || String(Date.now()));
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
