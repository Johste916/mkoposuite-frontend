// src/api/reporting.js
'use strict';

import api from './index'; // use the same axios instance style as other API files

const BASE = '/admin/report-subscriptions';

/** Normalize list responses to always yield { rows, meta } */
function normalizeList(res) {
  const payload = res?.data;
  if (Array.isArray(payload)) {
    return { rows: payload, meta: { total: payload.length, page: 1, limit: payload.length } };
  }
  const rows = payload?.data ?? [];
  const meta = payload?.meta ?? { total: rows.length, page: 1, limit: rows.length };
  return { rows, meta };
}

/** Ensure IDs are safely encoded in URLs */
const enc = (v) => encodeURIComponent(String(v));

/**
 * Primary API (keeps your existing method names so nothing else breaks)
 * - listDefs / listSubs / createSub / deleteSub / runNow
 *
 * Also exposes friendly aliases used by other pages:
 * - listSubscriptions / getSubscription / createSubscription / updateSubscription / deleteSubscription
 * - listTemplates / testSend
 */
export const ReportingAPI = {
  /* ------------------ Your existing methods ------------------ */
  listDefs: () =>
    api.get(`${BASE}/defs`).then((r) => {
      const data = r?.data;
      return Array.isArray(data) ? data : (data?.data ?? []);
    }),

  listSubs: (params = {}) =>
    api.get(`${BASE}`, { params }).then((r) => {
      // Return raw data for backward-compat, but attach meta if it was an array
      const norm = normalizeList(r);
      // If server already returns {data, meta}, use that. Otherwise return array with .meta
      if (Array.isArray(r?.data)) {
        norm.rows.meta = norm.meta; // attach meta on the array for convenience
        return norm.rows;
      }
      return r.data; // expected {data, meta}
    }),

  createSub: (body) => api.post(`${BASE}`, body).then((r) => r.data),

  deleteSub: (id) => api.delete(`${BASE}/${enc(id)}`).then((r) => r.data ?? { ok: true }),

  runNow: (id) => api.post(`${BASE}/${enc(id)}/run`).then((r) => r.data),

  /* ------------------ Helpful aliases (non-breaking) ------------------ */
  listSubscriptions: (params = {}) =>
    api.get(`${BASE}`, { params }).then((r) => normalizeList(r)),

  getSubscription: (id) =>
    api.get(`${BASE}/${enc(id)}`).then((r) => r.data),

  createSubscription: (payload) =>
    api.post(`${BASE}`, payload).then((r) => r.data),

  updateSubscription: (id, payload) =>
    api.put(`${BASE}/${enc(id)}`, payload).then((r) => r.data),

  deleteSubscription: (id) =>
    api.delete(`${BASE}/${enc(id)}`).then((r) => r.data ?? { ok: true }),

  listTemplates: () =>
    api.get(`${BASE}/defs`).then((r) => {
      const data = r?.data;
      return Array.isArray(data) ? data : (data?.data ?? []);
    }),

  testSend: (id) =>
    api.post(`${BASE}/${enc(id)}/test`).then((r) => r.data),
};

export default ReportingAPI;
