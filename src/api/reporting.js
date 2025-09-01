// src/api/reporting.js
import api from "../api";

const ReportingAPI = {
  listDefs: () => api.get(`/api/admin/report-subscriptions/defs`).then(r => r.data),
  listSubs: (params = {}) => api.get(`/api/admin/report-subscriptions`, { params }).then(r => r.data),
  createSub: (body) => api.post(`/api/admin/report-subscriptions`, body).then(r => r.data),
  deleteSub: (id) => api.delete(`/api/admin/report-subscriptions/${id}`).then(r => r.data),
  runNow: (id) => api.post(`/api/admin/report-subscriptions/${id}/run`).then(r => r.data),
};

export default ReportingAPI;
