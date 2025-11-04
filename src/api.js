import axios from "axios";

/**
 * Base URL rules
 * - Prefer VITE_API_BASE_URL or VITE_API_BASE (full origin, may include /api)
 * - Fallback to same-origin + /api for local dev
 * - Ensure final baseURL ends WITH /api (but avoid /api/api)
 */
const envBaseRaw = (
  import.meta.env?.VITE_API_BASE_URL ||
  import.meta.env?.VITE_API_BASE ||
  ""
).toString();

const trimmed = envBaseRaw.replace(/\/+$/, "");
const fallbackOrigin =
  typeof window !== "undefined" ? window.location.origin : "http://localhost:10000";

// If no env provided, use same-origin; then ensure /api
const rawBase = trimmed || fallbackOrigin;
const base = rawBase.replace(/\/+$/, "");
const baseURL = /\/api$/i.test(base) ? base : `${base}/api`; // canonical

// Optional knobs (safe defaults)
const WITH_CREDENTIALS =
  (import.meta.env?.VITE_API_WITH_CREDENTIALS ?? "0").toString() === "1";
const TIMEOUT_MS = Number(import.meta.env?.VITE_API_TIMEOUT ?? 30000); // 30s
const MAX_GET_RETRIES = Number(import.meta.env?.VITE_API_RETRIES ?? 0); // off by default

// OFF by default; enable via env or api.enableLogging(true)
let LOG_HTTP =
  (import.meta.env?.VITE_LOG_HTTP ?? "0").toString() === "1";

// ---- Axios instance ----
const api = axios.create({
  baseURL, // ends WITHOUT trailing slash
  withCredentials: WITH_CREDENTIALS,
  timeout: TIMEOUT_MS,
  headers: {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
  paramsSerializer: {
    serialize: (params) => {
      const usp = new URLSearchParams();
      Object.entries(params || {}).forEach(([k, v]) => {
        if (v == null) return;
        if (Array.isArray(v)) v.forEach((x) => usp.append(k, String(x)));
        else usp.set(k, String(v));
      });
      return usp.toString();
    },
  },
});

// Runtime toggle for logging
api.enableLogging = (on) => {
  LOG_HTTP = !!on;
};

// ---- Path utilities ----
const BASE_HAS_API = /\/api$/i.test(baseURL);
function normalizePath(input) {
  if (!input) return "/";
  if (/^https?:\/\//i.test(input)) return input; // absolute pass-through
  let url = String(input).trim();
  if (!url.startsWith("/")) url = `/${url}`;
  if (BASE_HAS_API && url.startsWith("/api/")) url = url.slice(4); // drop duplicate /api
  url = url.replace(/\/{2,}/g, "/");
  return url;
}
function variantsFor(p) {
  const clean = normalizePath(p);
  const noApi = clean.replace(/^\/api\//, "/");
  const withApi = noApi.startsWith("/api/") ? noApi : `/api${noApi}`;
  return Array.from(new Set([noApi, withApi]));
}

// ---- Small helpers ----
function makeReqId() {
  try {
    const c = globalThis?.crypto;
    if (c?.randomUUID) return c.randomUUID();
  } catch {}
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function isFormData(v) {
  return typeof FormData !== "undefined" && v instanceof FormData;
}

// Allow external set/clear of token & tenant override
let overrideTenantId = null;
let overrideToken = null;
api.setAuthToken = (token) => {
  overrideToken = token || null;
  if (token) localStorage.setItem("token", token);
};
api.clearAuthToken = () => {
  overrideToken = null;
  localStorage.removeItem("token");
};
api.setTenantId = (id) => {
  overrideTenantId = id || null;
  if (id) localStorage.setItem("activeTenantId", id);
};
api.clearTenantId = () => {
  overrideTenantId = null;
  localStorage.removeItem("activeTenantId");
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

// ---- Request interceptor ----
api.interceptors.request.use((config) => {
  // Normalize relative URL
  if (config.url && !/^https?:\/\//i.test(config.url)) {
    config.url = normalizePath(config.url);
  }

  // Auth header
  const token = overrideToken || localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Adopt ?tenantId=... from URL if no override yet (so FIRST request has tenant)
  try {
    if (typeof window !== "undefined" && !overrideTenantId) {
      const u = new URL(window.location.href);
      const t = u.searchParams.get("tenantId");
      if (t) overrideTenantId = t;
    }
  } catch {}

  // Tenant header: override > activeTenantId > user.tenant.id
  let tenantId = api.getTenantId();
  if (tenantId) config.headers["x-tenant-id"] = tenantId;

  // Branch header (for auto-assign & filtering on backend)
  const activeBranchId = localStorage.getItem("activeBranchId");
  if (activeBranchId) config.headers["x-branch-id"] = activeBranchId;

  // Timezone headers
  const SEND_TZ_HEADERS =
    (import.meta.env?.VITE_SEND_TZ_HEADERS ?? "1").toString() !== "0";
  if (SEND_TZ_HEADERS) {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) config.headers["x-timezone"] = tz;
    } catch {}
    config.headers["x-tz-offset"] = String(new Date().getTimezoneOffset());
  }

  // Request id
  if (!isFormData(config.data) && !config.headers["x-request-id"]) {
    config.headers["x-request-id"] = makeReqId();
  }
  // If sending FormData, let the browser set the boundary automatically
  if (isFormData(config.data) && config.headers && "Content-Type" in config.headers) {
    delete config.headers["Content-Type"];
  }

  if (LOG_HTTP) {
    try {
      console.debug(
        "[api] →",
        (config.method || "GET").toUpperCase(),
        config.baseURL?.replace(/\/+$/, "") + (config.url || ""),
        { params: config.params, data: config.data }
      );
    } catch {}
  }

  return config;
});

// ---- Response interceptor ----
let redirectingOn401 = false;
/** Consistent error normalization + 401 handler + optional safe GET retries */
api.interceptors.response.use(
  (res) => {
    if (LOG_HTTP) {
      try {
        console.debug(
          "[api] ←",
          (res.config?.method || "GET").toUpperCase(),
          res.config?.baseURL?.replace(/\/+$/, "") + (res.config?.url || ""),
          res.status
        );
      } catch {}
    }
    return res;
  },
  async (err) => {
    // Silently ignore/log axios cancellations (these flood dev consoles)
    const isCanceled =
      axios.isCancel?.(err) ||
      err?.code === "ERR_CANCELED" ||
      err?.message === "canceled";
    if (isCanceled) {
      if (LOG_HTTP) {
        try {
          const cfg = err?.config || {};
          console.debug(
            "[api] ⏹ canceled",
            (cfg.method || "GET").toUpperCase(),
            cfg.baseURL?.replace(/\/+$/, "") + (cfg.url || "")
          );
        } catch {}
      }
      return Promise.reject(err);
    }

    const status = err?.response?.status;
    const cfg = err?.config || {};

    // Normalize message
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
      try {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      } catch {}
      if (
        typeof window !== "undefined" &&
        !redirectingOn401 &&
        !window.location.pathname.includes("/login")
      ) {
        redirectingOn401 = true;
        window.location.href = "/login?reason=expired";
      }
      return Promise.reject(err);
    }

    // Optional: retry **GET** on transient errors
    const transient = status && [429, 502, 503, 504].includes(status);
    const isGet = (cfg.method || "get").toLowerCase() === "get";
    cfg.__retryCount = cfg.__retryCount || 0;

    if (
      MAX_GET_RETRIES > 0 &&
      isGet &&
      transient &&
      cfg.__retryCount < MAX_GET_RETRIES
    ) {
      cfg.__retryCount += 1;
      const jitter = Math.random() * 250;
      const backoff = Math.min(1000 * 2 ** (cfg.__retryCount - 1) + jitter, 4000);
      await new Promise((r) => setTimeout(r, backoff));
      return api.request(cfg);
    }

    if (LOG_HTTP) {
      try {
        console.warn(
          "[api] ✖",
          (cfg.method || "GET").toUpperCase(),
          cfg.baseURL?.replace(/\/+$/, "") + (cfg.url || ""),
          status,
          err.normalizedMessage
        );
      } catch {}
    }

    return Promise.reject(err);
  }
);

// ---- Convenience helpers (return .data directly) ----
api.getJSON = async (url, config) =>
  (await api.get(normalizePath(url), config)).data;
api.postJSON = async (url, data, config) =>
  (await api.post(normalizePath(url), data, config)).data;
api.putJSON = async (url, data, config) =>
  (await api.put(normalizePath(url), data, config)).data;
api.patchJSON = async (url, data, config) =>
  (await api.patch(normalizePath(url), data, config)).data;
api.deleteJSON = async (url, config) =>
  (await api.delete(normalizePath(url), config)).data;

// HEAD helper (used by exporters / tryOpen)
api.head = (url, config) => api.request({ ...config, url: normalizePath(url), method: "HEAD" });

// ---- Form helpers (KYC uploads, etc.) ----
api.postForm = async (url, formData, config = {}) =>
  (await api.post(normalizePath(url), formData, config)).data;
api.putForm = async (url, formData, config = {}) =>
  (await api.put(normalizePath(url), formData, config)).data;
api.patchForm = async (url, formData, config = {}) =>
  (await api.patch(normalizePath(url), formData, config)).data;

// ---- Try a list of endpoints (first that works) ----
async function firstOk(method, paths, payload, config) {
  const inputList = Array.isArray(paths) ? paths : [paths];
  const candidates = Array.from(new Set(inputList.flatMap((p) => variantsFor(p))));
  let lastErr;
  for (const p of candidates) {
    try {
      const url = normalizePath(p);
      const res =
        method === "get" || method === "delete" || method === "head"
          ? await api[method](url, config)
          : await api[method](url, payload, config);
      return res.data ?? true;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("No endpoint succeeded");
}
api.getFirst = (paths, config) => firstOk("get", paths, undefined, config);
api.postFirst = (paths, data, config) => firstOk("post", paths, data, config);
api.patchFirst = (paths, data, config) => firstOk("patch", paths, data, config);
api.putFirst = (paths, data, config) => firstOk("put", paths, data, config);
api.deleteFirst = (paths, config) => firstOk("delete", paths, undefined, config);
api.headFirst = (paths, config) => firstOk("head", paths, undefined, config);

// ---- Path sugar methods mirroring axios verbs with normalization ----
api.path = normalizePath;
["get", "post", "put", "patch", "delete"].forEach((m) => {
  api[`_${m}`] = (url, ...rest) => api[m](normalizePath(url), ...rest);
});

// ---- Abort helper ----
api.withAbort = () => {
  const ac = new AbortController();
  return { signal: ac.signal, cancel: () => ac.abort() };
};

export default api;
export { api };
