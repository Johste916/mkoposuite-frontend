import api from "./index";

export const ReportingAPI = {
  listDefs:           () => api.get("/admin/report-subscriptions/defs").then(r => r.data),
  listSubs:           () => api.get("/admin/report-subscriptions").then(r => r.data),
  createSub:          (payload) => api.post("/admin/report-subscriptions", payload).then(r => r.data),
  updateSub:          (id, payload) => api.put(`/admin/report-subscriptions/${id}`, payload).then(r => r.data),
  deleteSub:          (id) => api.delete(`/admin/report-subscriptions/${id}`).then(r => r.data),
  runNow:             (id) => api.post(`/admin/report-subscriptions/${id}/run-now`).then(r => r.data),
};
