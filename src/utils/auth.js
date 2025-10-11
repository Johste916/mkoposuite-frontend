// src/utils/auth.js

/** Basic auth utilities used across the app */
export const isLoggedIn = () => !!localStorage.getItem("token");
export const getToken   = () => localStorage.getItem("token") || null;

export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

/**
 * Robust role getter:
 * - supports string role ("admin")
 * - or object role { name: "admin" }
 * - or first role in array [{ name: "admin" }, ...]
 */
export const getUserRole = () => {
  const u = getUser();
  if (!u) return null;

  // direct string
  if (typeof u.role === "string" && u.role) return u.role;

  // object with name
  if (u.role && typeof u.role === "object" && u.role.name) return u.role.name;

  // roles array
  const arr = Array.isArray(u.roles) ? u.roles : (Array.isArray(u.Roles) ? u.Roles : []);
  const first = arr && arr[0];
  if (first && typeof first === "object" && (first.name || first.title)) {
    return first.name || first.title;
  }

  return null;
};

/** Optional helpers for multi-tenant header behavior */
export const getActiveTenantId = () =>
  localStorage.getItem("activeTenantId") ||
  (() => {
    const u = getUser();
    return u?.tenantId || u?.tenant?.id || u?.orgId || u?.companyId || null;
  })();

export const setActiveTenantId = (id) => {
  if (id) localStorage.setItem("activeTenantId", String(id));
  else localStorage.removeItem("activeTenantId");
};
