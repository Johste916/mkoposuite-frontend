// src/utils/permissions.js
/**
 * Manage and check user permissions on the frontend.
 * These are populated at login or from /auth/me.
 */

export function getPermissions() {
  try {
    return JSON.parse(localStorage.getItem("permissions") || "[]");
  } catch {
    return [];
  }
}

export function setPermissions(perms) {
  if (!Array.isArray(perms)) return;
  localStorage.setItem("permissions", JSON.stringify(perms));
}

export function can(action) {
  const list = getPermissions();
  return Array.isArray(list) && list.includes(action);
}

export function clearPermissions() {
  localStorage.removeItem("permissions");
}
