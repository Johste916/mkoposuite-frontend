// src/api/repayments.js
import api from "./index";

// Build a querystring from a params object
const qs = (params = {}) =>
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

const repaymentsApi = {
  // LIST
  list(params) {
    return api.get(`/repayments${params ? "?" + qs(params) : ""}`);
  },

  // By loan
  listByLoan(loanId, params) {
    return api.get(`/repayments/loan/${loanId}${params ? "?" + qs(params) : ""}`);
  },

  // Single
  get(id) {
    return api.get(`/repayments/${id}`);
  },

  // Allocation preview
  previewAllocation(payload) {
    return api.post("/repayments/preview-allocation", payload);
  },

  // Manual create
  create(payload) {
    return api.post("/repayments/manual", payload);
  },

  // BULK JSON — controller expects a raw array body
  createBulk(items = []) {
    return api.post("/repayments/bulk", items);
  },

  // CSV UPLOAD (multipart)
  uploadCsv(file) {
    const fd = new FormData();
    fd.append("file", file);
    return api.post("/repayments/csv", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // APPROVALS
  pendingApprovals() {
    return api.get("/repayments/approvals/pending");
  },
  approve(id) {
    return api.post(`/repayments/approvals/${id}/approve`);
  },
  reject(id, reason = "") {
    return api.post(`/repayments/approvals/${id}/reject`, { reason });
  },

  // REPORTS
  summary(params) {
    return api.get(`/repayments/summary${params ? "?" + qs(params) : ""}`);
  },
  timeseries(params) {
    return api.get(`/repayments/timeseries${params ? "?" + qs(params) : ""}`);
  },

  // EXPORT (returns URL you can open in a new tab)
  exportCsvUrl(params) {
    const base = api.defaults.baseURL?.replace(/\/+$/, "") || "";
    return `${base}/repayments/export.csv${params ? "?" + qs(params) : ""}`;
  },
};

export default repaymentsApi;
export const {
  list,
  listByLoan,
  get,
  previewAllocation,
  create,
  createBulk,
  uploadCsv,
  pendingApprovals,
  approve,
  reject,
  summary,
  timeseries,
  exportCsvUrl,
} = repaymentsApi;
