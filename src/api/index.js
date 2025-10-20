// src/api/index.js
import axios from "axios";

/* ----------------------------- Base URL resolution ---------------------------- */
/** Grab Vite env safely; never touch bare `process` in the browser */
const IME = (typeof import.meta !== "undefined" && import.meta.env) || {};

const envBaseRaw = String(
  // Prefer explicit vite vars
  IME.VITE_API_BASE_URL ||
  IME.VITE_API_BASE ||
  // optional: allow a runtime global override (handy in docker/nginx)
  (typeof window !== "undefined" && window.__API_BASE_URL__) ||
  // last resort: empty string -> will fall back to origin below
  ""
);

const trimmed = envBaseRaw.replace(/\/+$/, "");
const fallbackOrigin =
  typeof window !== "undefined" ? window.location.origin : "http://localhost:10000";

const rawBase = trimmed || fallbackOrigin;
const base = rawBase.replace(/\/+$/, "");
// canonical: ensure it ends with /api, but avoid /api/api
const baseURL = /\/api$/i.test(base) ? base : `${base}/api`;

/* ----------------------------- Optional switches ----------------------------- */
const WITH_CREDENTIALS = String(IME.VITE_API_WITH_CREDENTIALS ?? "0") === "1";
const TIMEOUT_MS = Number(IME.VITE_API_TIMEOUT ?? 30000) || 30000;
const MAX_GET_RETRIES = Number(IME.VITE_API_RETRIES ?? 0) || 0;
const SEND_TZ_HEADERS = String(IME.VITE_SEND_TZ_HEADERS ?? "1") !== "0";

/* --------------------------------- Instance --------------------------------- */
const api = axios.create({
  baseURL,
  withCredentials: WITH_CREDENTIALS,
  timeout: TIMEOUT_MS,
  headers: { Accept: "application/json" },
});

/* --------------------------------- Helpers ---------------------------------- */
const TOKEN_KEYS = ["access_token", "accessToken", "token", "authToken", "jwt"];
const BASE_HAS_API = /\/api$/i.test(baseURL);

function normalizePath(input) {
  if (!input) return "/";
  if (/^https?:\/\//i.test(input)) return input;
  let url = String(input).trim();
  if (!url.startsWith("/")) url = `/${url}`;
  if (BASE_HAS_API && url.startsWith("/api/")) url = url.slice(4); // avoid /api/api
  url = url.replace(/\/{2,}/g, "/");
  return url;
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

/* ----------------------------- Request interceptor --------------------------- */
api.interceptors.request.use((config) => {
  // Normalize relative URL
  if (config.url && !/^https?:\/\//i.test(config.url)) {
    config.url = normalizePath(config.url);
  }

  // Authorization
  let token = null;
  for (const k of TOKEN_KEYS) {
    const v = typeof localStorage !== "undefined" ? localStorage.getItem(k) : null;
    if (v) {
      token = String(v).replace(/^Bearer\s+/i, "");
      break;
    }
  }
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Capture tenantId from URL once (first request) if not set
  try {
    if (typeof window !== "undefined" && !tenantOverride) {
      const u = new URL(window.location.href);
      const t = u.searchParams.get("tenantId");
      if (t) tenantOverride = t;
    }
  } catch {}

  // Tenant header (override > activeTenantId > user.tenantId)
  let tenantId =
    tenantOverride ||
    (typeof localStorage !== "undefined" && (localStorage.getItem("activeTenantId") || localStorage.getItem("x-tenant-id")));
  if (!tenantId && typeof localStorage !== "undefined") {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      tenantId = u?.tenantId || u?.tenant?.id || u?.orgId || u?.companyId || null;
    } catch {}
  }
  if (tenantId) config.headers["x-tenant-id"] = tenantId;

  // Branch header
  const branchId = typeof localStorage !== "undefined" ? localStorage.getItem("activeBranchId") : null;
  if (branchId) config.headers["x-branch-id"] = branchId;

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

  // Content headers + request id
  if (isFormData(config.data)) {
    if (config.headers && "Content-Type" in config.headers) {
      delete config.headers["Content-Type"]; // let browser set boundary
    }
  } else {
    config.headers["x-request-id"] ||= reqId();
    config.headers["Content-Type"] ||= "application/json";
  }

  return config;
});

/* ----------------------------- Response interceptor -------------------------- */
let redirectingOn401 = false;

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err?.response?.status;
    const cfg = err?.config || {};

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

    // 401: purge & one-time redirect
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

    // Optional: safe GET retries on transient errors
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

/* ------------------------------- Sugar methods ------------------------------- */
api.getJSON = async (url, config) => (await api.get(normalizePath(url), config)).data;
api.postJSON = async (url, data, config) => (await api.post(normalizePath(url), data, config)).data;
api.putJSON = async (url, data, config) => (await api.put(normalizePath(url), data, config)).data;
api.patchJSON = async (url, data, config) => (await api.patch(normalizePath(url), data, config)).data;
api.deleteJSON = async (url, config) => (await api.delete(normalizePath(url), config)).data;

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
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("No endpoint succeeded");
}

api.getFirst    = (paths, config)       => __firstOk("get", paths, undefined, config);
api.postFirst   = (paths, data, config) => __firstOk("post", paths, data, config);
api.putFirst    = (paths, data, config) => __firstOk("put", paths, data, config);
api.patchFirst  = (paths, data, config) => __firstOk("patch", paths, data, config);
api.deleteFirst = (paths, config)       => __firstOk("delete", paths, undefined, config);

api.setTenantId = (id) => { tenantOverride = id || null; };
api.clearTenantId = () => { tenantOverride = null; };
api.getTenantId = () =>
  tenantOverride ||
  (typeof localStorage !== "undefined" ? localStorage.getItem("activeTenantId") : null) ||
  null;

api.path = normalizePath;
api.withAbort = () => { const ac = new AbortController(); return { signal: ac.signal, cancel: () => ac.abort() }; };

// Normalized verb mirrors (opt-in)
["get", "post", "put", "patch", "delete"].forEach((m) => {
  api[`_${m}`] = (url, ...rest) => api[m](normalizePath(url), ...rest);
});

export default api;
export { api };
