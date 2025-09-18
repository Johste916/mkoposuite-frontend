// frontend/api/branches.js
import api from "./index";

/**
 * Tolerant discovery of the base route for branches so we don't break
 * if backend exposes /branches or /org/branches (your page already
 * does discovery, but these helpers let other screens use a simple API).
 */
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
      // treat 401/403 as "exists but protected"
      if (s === 401 || s === 403) {
        discoveredBase = p;
        return p;
      }
    }
  }
  // Fallback to preferred path to avoid nulls in callers
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
  const res = await api.post(base, payload);
  return res.data;
}

export async function updateBranch(id, payload) {
  const base = await discoverBase();
  const res = await api.put(`${base}/${id}`, payload);
  return res.data;
}

export async function deleteBranch(id) {
  const base = await discoverBase();
  await api.delete(`${base}/${id}`);
}

export async function assignStaff(branchId, userIds) {
  const base = await discoverBase();
  const res = await api.post(`${base}/${branchId}/assign-staff`, { userIds });
  return res.data;
}

export async function unassignStaff(branchId, userId) {
  const base = await discoverBase();
  const res = await api.delete(`${base}/${branchId}/staff/${userId}`);
  return res.data;
}

export default {
  listBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  assignStaff,
  unassignStaff,
};
