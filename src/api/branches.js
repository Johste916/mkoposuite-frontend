import api from "./index";

const CANDIDATES = ["/branches", "/org/branches"];
let discoveredBase = null;

async function discoverBase() {
  if (discoveredBase) return discoveredBase;
  for (const p of CANDIDATES) {
    try {
      await api.get(p, { params: { limit: 1 } });
      discoveredBase = p;
      return p;
    } catch (e) {
      const s = e?.response?.status;
      if (s === 401 || s === 403) {
        discoveredBase = p;
        return p;
      }
    }
  }
  discoveredBase = "/branches";
  return discoveredBase;
}

export async function listBranches(q = "", limit = 50, offset = 0) {
  const base = await discoverBase();
  const res = await api.get(base, { params: { q, limit, offset } });
  const total = Number(res.headers["x-total-count"] || 0);
  const data = res.data;
  const items = Array.isArray(data) ? data : data?.items || data?.rows || data?.data || [];
  return { items, total };
}

export async function createBranch(payload) {
  const base = await discoverBase();
  return (await api.post(base, payload)).data;
}

export async function updateBranch(id, payload) {
  const base = await discoverBase();
  return (await api.put(`${base}/${id}`, payload)).data;
}

export async function deleteBranch(id) {
  const base = await discoverBase();
  await api.delete(`${base}/${id}`);
}

export async function assignStaff(branchId, userIds) {
  const base = await discoverBase();
  return (await api.post(`${base}/${branchId}/assign-staff`, { userIds })).data;
}

export async function unassignStaff(branchId, userId) {
  const base = await discoverBase();
  return (await api.delete(`${base}/${branchId}/staff/${userId}`)).data;
}

export default {
  listBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  assignStaff,
  unassignStaff,
};
