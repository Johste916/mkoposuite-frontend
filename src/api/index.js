import axios from "axios";

/* ---------- Base URL (Vite/Node/browser safe) ---------- */
const fromVite =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE)) ||
  "";

const fromNode =
  (typeof globalThis !== "undefined" &&
    globalThis.process &&
    globalThis.process.env &&
    (globalThis.process.env.REACT_APP_API_BASE_URL ||
      globalThis.process.env.REACT_APP_API_URL)) ||
  "";

const origin =
  (typeof window !== "undefined" && window.location && window.location.origin) ||
  "http://localhost:10000";

const rawBase = String(fromVite || fromNode || origin).replace(/\/+$/, "");
const baseURL = /\/api$/i.test(rawBase) ? rawBase : `${rawBase}/api`;

/* ---------- Optional knobs via env ---------- */
const WITH_CREDENTIALS =
  String(
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_API_WITH_CREDENTIALS) ?? "0"
  ) === "1";

const TIMEOUT =
  Number(
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_API_TIMEOUT) ?? 30000
  ) || 30000;

const MAX_GET_RETRIES =
  Number(
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_API_RETRIES) ?? 0
  ) || 0;

/* ---------- Axios instance ---------- */
const api = axios.create({
  baseURL,
  withCredentials: WITH_CREDENTIALS,
  timeout: TIMEOUT,
  headers: { Accept: "application/json" },
});

/* ---------- Path helpers ---------- */
const BASE_HAS_API = /\/api$/i.test(baseURL);

function normalizePath(url) {
  if (!url) return "/";
  if (/^https?:\/\//i.test(url)) return url;
  let u = String(url).trim();
  if (!u.startsWith("/")) u = `/${u}`;
  if (BASE_HAS_API && u.startsWith("/api/")) u = u.slice(4); // avoid /api/api
  return u.replace(/\/{2,}/g, "/");
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

/* ---------- Request interceptor ---------- */
api.interceptors.request.use((config) => {
  if (config.url && !/^https?:\/\//i.test(config.url)) {
    config.url = normalizePath(config.url);
  }

  // Auth
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${String(token).replace(/^Bearer\s+/i, "")}`;

  // Tenant
  const tenantId =
    tenantOverride ||
    localStorage.getItem("activeTenantId") ||
    (() => {
      try {
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        return u?.tenantId || u?.tenant?.id || u?.orgId || u?.companyId || null;
      } catch {
        return null;
      }
    })() ||
    localStorage.getItem("tenantId") ||
    localStorage.getItem("x-tenant-id");
  if (tenantId) config.headers["x-tenant-id"] = tenantId;

  // Branch
  const branchId = localStorage.getItem("activeBranchId");
  if (branchId) config.headers["x-branch-id"] = branchId;

  // Timezone hints
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) config.headers["x-timezone"] = tz;
  } catch {}
  try {
    config.headers["x-tz-offset"] = String(new Date().getTimezoneOffset());
  } catch {}

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

/* ---------- Response interceptor ---------- */
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

    // Hard 401: purge + redirect
    if (status === 401) {
      try {
        [
          "token",
          "jwt",
          "authToken",
          "accessToken",
          "access_token",
          "user",
          "tenant",
          "tenantId",
          "tenantName",
          "activeBranchId",
        ].forEach((k) => {
          try {
            localStorage.removeItem(k);
            sessionStorage.removeItem(k);
          } catch {}
        });
        delete api.defaults.headers.common.Authorization;
        delete api.defaults.headers.common["x-tenant-id"];
        delete api.defaults.headers.common["x-branch-id"];
      } catch {}
      if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        window.location.replace("/login");
      }
      return Promise.reject(err);
    }

    // Optional GET retries on transient errors
    const transient = status && [429, 502, 503, 504].includes(status);
    const isGet = (cfg.method || "get").toLowerCase() === "get";
    cfg.__retryCount = cfg.__retryCount || 0;
    if (MAX_GET_RETRIES > 0 && isGet && transient && cfg.__retryCount < MAX_GET_RETRIES) {
      cfg.__retryCount += 1;
      const backoff = Math.min(1000 * 2 ** (cfg.__retryCount - 1), 4000);
      await new Promise((r) => setTimeout(r, backoff));
      return api.request(cfg);
    }

    if (import.meta?.env?.MODE !== "production") {
      // eslint-disable-next-line no-console
      console.error("API error:", err.normalizedMessage, err?.response || err);
    }
    return Promise.reject(err);
  }
);

/* ---------- Convenience JSON helpers ---------- */
api.getJSON = async (url, config) => (await api.get(normalizePath(url), config)).data;
api.postJSON = async (url, data, config) => (await api.post(normalizePath(url), data, config)).data;
api.putJSON = async (url, data, config) => (await api.put(normalizePath(url), data, config)).data;
api.patchJSON = async (url, data, config) => (await api.patch(normalizePath(url), data, config)).data;
api.deleteJSON = async (url, config) => (await api.delete(normalizePath(url), config)).data;

/* ---------- “First endpoint that works” helpers ---------- */
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

// Attach (polyfill-safe)
api.getFirst    = api.getFirst    || ((paths, config)       => __firstOk("get", paths, undefined, config));
api.postFirst   = api.postFirst   || ((paths, data, config) => __firstOk("post", paths, data, config));
api.putFirst    = api.putFirst    || ((paths, data, config) => __firstOk("put", paths, data, config));
api.patchFirst  = api.patchFirst  || ((paths, data, config) => __firstOk("patch", paths, data, config));
api.deleteFirst = api.deleteFirst || ((paths, config)       => __firstOk("delete", paths, undefined, config));

/* ---------- Misc helpers ---------- */
api.setTenantId = (id) => { tenantOverride = id || null; };
api.clearTenantId = () => { tenantOverride = null; };
api.path = normalizePath;
api.withAbort = () => { const ac = new AbortController(); return { signal: ac.signal, cancel: () => ac.abort() }; };

// Also expose normalized verb wrappers if you want to opt-in
["get", "post", "put", "patch", "delete"].forEach((m) => {
  api[`_${m}`] = (url, ...rest) => api[m](normalizePath(url), ...rest);
});

export default api;
export { api };
