// src/api/repayments.js
import client from "./client";

// Lists (supports filters/pagination)
export const listRepayments = (params = {}) =>
  client.get("/repayments", { params }).then((r) => r.data);

// Repayments for a loan
export const listLoanRepayments = (loanId, params = {}) =>
  client.get(`/repayments/loan/${loanId}`, { params }).then((r) => r.data);

// Single receipt
export const getRepayment = (id) =>
  client.get(`/repayments/${id}`).then((r) => r.data);

// Allocation preview
export const previewAllocation = (payload) =>
  client.post("/repayments/preview-allocation", payload).then((r) => r.data);

// Create manual repayment
export const createRepayment = (payload) =>
  client.post("/repayments/manual", payload).then((r) => r.data);

// Bulk
export const createBulkRepayments = (rows = []) =>
  client.post("/repayments/bulk", { rows }).then((r) => r.data);

// Approvals
export const approveRepayment = (id) =>
  client.post(`/repayments/${id}/approve`).then((r) => r.data);
export const rejectRepayment = (id, reason = "") =>
  client.post(`/repayments/${id}/reject`, { reason }).then((r) => r.data);

// CSV upload (multipart)
export const uploadRepaymentsCSV = (file, extra = {}) => {
  const fd = new FormData();
  fd.append("file", file);
  Object.entries(extra || {}).forEach(([k, v]) => fd.append(k, v));
  return client.post("/repayments/upload-csv", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then((r) => r.data);
};

export default {
  listRepayments,
  listLoanRepayments,
  getRepayment,
  previewAllocation,
  createRepayment,
  createBulkRepayments,
  approveRepayment,
  rejectRepayment,
  uploadRepaymentsCSV,
};
