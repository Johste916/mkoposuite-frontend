// src/api/acl.js
import api from "./index";

/* ---------------------------------------------------------------
   Normalizers
-----------------------------------------------------------------*/

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

/** Try multiple endpoints when servers differ slightly */
async function tryPaths({ method = "get", paths = [], body, params }) {
  let lastErr;
  for (const p of paths) {
    try {
      const res = await api.request({ url: p, method, data: body, params });
      return res.data;
    } catch (e) {
      lastErr = e;
      // if unauthorized, fail fast so the UI can redirect/login
      const code = e?.response?.status;
      if (code === 401) throw e;
    }
  }
  throw lastErr || new Error("All paths failed");
}

/* ---------------------------------------------------------------
   ACL Client
-----------------------------------------------------------------*/
export const ACL = {
  /* ----------------------- Roles ----------------------- */
  listRoles: () =>
    tryPaths({ paths: ["/roles"] }),

  createRole: (payload) =>
    tryPaths({ method: "post", paths: ["/roles"], body: payload }),

  updateRole: (id, payload) =>
    tryPaths({ method: "put", paths: [`/roles/${encodeURIComponent(id)}`], body: payload }),

  deleteRole: (id) =>
    tryPaths({ method: "delete", paths: [`/roles/${encodeURIComponent(id)}`] }),

  /* ------------------- Users (Staff) ------------------- */
  listUsers: (params = {}) =>
    tryPaths({ paths: ["/admin/staff"], params }).then(normalizeStaffList),

  getUser: (id) =>
    tryPaths({ paths: [`/admin/staff/${encodeURIComponent(id)}`] }),

  // Map { roleId, branchIds[] } → { roleIds[], branchId } for backend compatibility
  createUser: (payload) => {
    const roleIds  = payload.roleIds ?? (payload.roleId ? [payload.roleId] : []);
    const branchId = payload.branchId ?? (Array.isArray(payload.branchIds) ? payload.branchIds[0] : undefined);
    const body = { ...payload, roleIds, branchId };
    delete body.roleId;
    delete body.branchIds;
    return tryPaths({ method: "post", paths: ["/admin/staff"], body });
  },

  updateUser: (id, payload) => {
    const roleIds  = payload.roleIds ?? (payload.roleId ? [payload.roleId] : undefined);
    const branchId = payload.branchId ?? (Array.isArray(payload.branchIds) ? payload.branchIds[0] : undefined);
    const body = { ...payload, ...(roleIds ? { roleIds } : {}), ...(branchId !== undefined ? { branchId } : {}) };
    delete body.roleId;
    delete body.branchIds;
    return tryPaths({ method: "put", paths: [`/admin/staff/${encodeURIComponent(id)}`], body });
  },

  resetUserPassword: (id, password) =>
    tryPaths({
      method: "patch",
      paths: [`/admin/staff/${encodeURIComponent(id)}/password`],
      body: { password },
    }),

  toggleUserStatus: (id, isActive) =>
    tryPaths({
      method: "patch",
      paths: [`/admin/staff/${encodeURIComponent(id)}/status`],
      body: { isActive },
    }),

  assignUserBranches: (id, branchIds = []) =>
    tryPaths({
      method: "put",
      paths: [`/admin/staff/${encodeURIComponent(id)}/branches`],
      body: { branchIds },
    }),

  /* ------------------- Permissions --------------------- */
  listPermissions: () =>
    tryPaths({ paths: ["/permissions"] }),

  /**
   * Update permission roles:
   *  - Works with either numeric id (/permissions/:id) or action key (/permissions/:action)
   *  - Pass array of role slugs/names in `roles`, optional description.
   */
  updatePermission: (idOrAction, roles, description = "") =>
    tryPaths({
      method: "put",
      paths: [
        `/permissions/${encodeURIComponent(idOrAction)}`, // supports :id or :action — whichever your API uses
      ],
      body: { roles, description },
    }),

  /* ---------------------- Audit ------------------------ */
  listAudit: (params) =>
    tryPaths({ paths: ["/admin/audit", "/audit-logs"], params }),

  /* ---------------- Convenience (optional) ------------- */
  listBranches: () => tryPaths({ paths: ["/branches"] }),
  can: (user, action, permissions) => {
    // simple client-side check helper (UI-only; server is source of truth)
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
