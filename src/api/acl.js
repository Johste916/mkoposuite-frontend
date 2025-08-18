// src/api/acl.js
import api from "./index";

/** Normalize staff list shape so callers get an Array with .meta attached. */
function normalizeStaffList(resData) {
  if (Array.isArray(resData)) {
    const rows = resData;
    rows.meta = { page: 1, limit: rows.length, total: rows.length };
    return rows;
  }
  const rows = resData?.data ?? [];
  const meta = resData?.meta ?? { page: 1, limit: rows.length, total: rows.length };
  rows.meta = meta;
  return rows;
}

export const ACL = {
  /* ----------------------- Roles ----------------------- */
  listRoles:  () => api.get("/roles").then(r => r.data),
  createRole: (payload) => api.post("/roles", payload).then(r => r.data),

  /* ------------------- Users (Staff) ------------------- */
  listUsers: (params) =>
    api.get("/admin/staff", { params }).then(r => normalizeStaffList(r.data)),

  // Map { roleId, branchIds[] } → { roleIds[], branchId } for backend compatibility
  createUser: (payload) => {
    const roleIds  = payload.roleIds ?? (payload.roleId ? [payload.roleId] : []);
    const branchId = payload.branchId ?? (Array.isArray(payload.branchIds) ? payload.branchIds[0] : undefined);
    const body = { ...payload, roleIds, branchId };
    delete body.roleId;
    delete body.branchIds;
    return api.post("/admin/staff", body).then(r => r.data);
  },

  updateUser: (id, payload) => {
    const roleIds  = payload.roleIds ?? (payload.roleId ? [payload.roleId] : undefined);
    const branchId = payload.branchId ?? (Array.isArray(payload.branchIds) ? payload.branchIds[0] : undefined);
    const body = { ...payload, ...(roleIds ? { roleIds } : {}), ...(branchId !== undefined ? { branchId } : {}) };
    delete body.roleId;
    delete body.branchIds;
    return api.put(`/admin/staff/${encodeURIComponent(id)}`, body).then(r => r.data);
  },

  resetUserPassword: (id, password) =>
    api.patch(`/admin/staff/${encodeURIComponent(id)}/password`, { password }).then(r => r.data),

  toggleUserStatus: (id, next) =>
    api.patch(`/admin/staff/${encodeURIComponent(id)}/status`, { isActive: next }).then(r => r.data),

  /* ------------------- Permissions --------------------- */
  listPermissions: () => api.get("/permissions").then(r => r.data),
  updatePermission: (action, roles, description = "") =>
    api.put(`/permissions/${encodeURIComponent(action)}`, { roles, description }).then(r => r.data),

  /* ---------------------- Audit ------------------------ */
  listAudit: (params) => api.get("/admin/audit", { params }).then(r => r.data),
};
