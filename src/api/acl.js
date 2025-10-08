import api from "./index";

/** Tolerant multi-path request helper */
async function tryPaths({ method = "get", paths = [], body, params }) {
  let lastErr;
  for (const p of paths) {
    try {
      const res =
        method === "get" || method === "delete"
          ? await api[method](p, { params })
          : await api[method](p, body, { params });
      return res.data;
    } catch (e) {
      lastErr = e;
      if (e?.response?.status === 401) throw e;
    }
  }
  throw lastErr || new Error("All paths failed");
}

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
  listRoles: () => tryPaths({ paths: ["/roles"] }),

  createRole: (payload) =>
    tryPaths({ method: "post", paths: ["/roles"], body: payload }),

  updateRole: (id, payload) =>
    tryPaths({ method: "put", paths: [`/roles/${encodeURIComponent(id)}`], body: payload }),

  deleteRole: (id) =>
    tryPaths({ method: "delete", paths: [`/roles/${encodeURIComponent(id)}`] }),

  /* ------------------- Users (Staff) ------------------- */
  listUsers: (params = {}) =>
    tryPaths({ paths: ["/admin/staff", "/staff", "/users"], params }).then(normalizeStaffList),

  getUser: (id) =>
    tryPaths({ paths: [`/admin/staff/${encodeURIComponent(id)}`, `/staff/${encodeURIComponent(id)}`, `/users/${encodeURIComponent(id)}`] }),

  createUser: (payload) => {
    const roleIds  = payload.roleIds ?? (payload.roleId ? [payload.roleId] : []);
    const branchId = payload.branchId ?? (Array.isArray(payload.branchIds) ? payload.branchIds[0] : undefined);
    const body = { ...payload, roleIds, branchId };
    delete body.roleId;
    delete body.branchIds;
    return tryPaths({ method: "post", paths: ["/admin/staff", "/staff", "/users"], body });
  },

  updateUser: (id, payload) => {
    const roleIds  = payload.roleIds ?? (payload.roleId ? [payload.roleId] : undefined);
    const branchId = payload.branchId ?? (Array.isArray(payload.branchIds) ? payload.branchIds[0] : undefined);
    const body = { ...payload, ...(roleIds ? { roleIds } : {}), ...(branchId !== undefined ? { branchId } : {}) };
    delete body.roleId;
    delete body.branchIds;
    return tryPaths({ method: "put", paths: [`/admin/staff/${encodeURIComponent(id)}`, `/staff/${encodeURIComponent(id)}`, `/users/${encodeURIComponent(id)}`], body });
  },

  resetUserPassword: (id, password) =>
    tryPaths({
      method: "patch",
      paths: [`/admin/staff/${encodeURIComponent(id)}/password`, `/staff/${encodeURIComponent(id)}/password`, `/users/${encodeURIComponent(id)}/password`],
      body: { password },
    }),

  toggleUserStatus: (id, isActive) =>
    tryPaths({
      method: "patch",
      paths: [`/admin/staff/${encodeURIComponent(id)}/status`, `/staff/${encodeURIComponent(id)}/status`, `/users/${encodeURIComponent(id)}/status`],
      body: { isActive },
    }),

  // Note: assigning branches is usually on the BRANCH endpoint (/branches/:id/assign-staff).
  // Keeping this here for backends that support user→branches mapping too.
  assignUserBranches: (id, branchIds = []) =>
    tryPaths({
      method: "put",
      paths: [
        `/admin/staff/${encodeURIComponent(id)}/branches`,
        `/staff/${encodeURIComponent(id)}/branches`,
        `/users/${encodeURIComponent(id)}/branches`,
      ],
      body: { branchIds },
    }),

  /* ------------------- Permissions --------------------- */
  listPermissions: () =>
    tryPaths({ paths: ["/permissions", "/admin/permissions"] }),

  updatePermission: (idOrAction, roles, description = "") =>
    tryPaths({
      method: "put",
      paths: [
        `/permissions/${encodeURIComponent(idOrAction)}`,
        `/admin/permissions/${encodeURIComponent(idOrAction)}`,
      ],
      body: { roles, description },
    }),

  /* ---------------------- Audit ------------------------ */
  listAudit: (params) =>
    tryPaths({ paths: ["/admin/audit", "/audit-logs"], params }),

  /* ---------------- Convenience ------------------------ */
  listBranches: () => tryPaths({ paths: ["/branches", "/org/branches"] }),
  can: (user, action, permissions) => {
    if (!user) return false;
    const role = String(user.role || "").toLowerCase();
    if (role === "admin" || role === "director") return true;
    if (!Array.isArray(permissions)) return false;
    const entry = permissions.find((p) => p.action === action);
    if (!entry) return false;
    const allowed = Array.isArray(entry.roles) ? entry.roles.map((r) => String(r).toLowerCase()) : [];
    return allowed.includes(role);
  },
};

export default ACL;
