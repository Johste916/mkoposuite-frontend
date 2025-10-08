import api from "./index";

/** build a querystring */
const qs = (params = {}) =>
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

/** default date range (last 30 days) to avoid 400s on summary/timeseries */
function ensureRange(params = {}) {
  if (params.from && params.to) return params;
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 30);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { ...params, from: params.from || fmt(from), to: params.to || fmt(to) };
}

const repaymentsApi = {
  // LIST
  async list(params) {
    return api.getFirst(
      ["/repayments", "/transactions/repayments"],
      { params }
    );
  },

  // By loan
  async listByLoan(loanId, params) {
    return api.getFirst(
      [`/repayments/loan/${encodeURIComponent(loanId)}`, `/loan/${encodeURIComponent(loanId)}/repayments`],
      { params }
    );
  },

  // Single
  async get(id) {
    return api.getFirst(
      [`/repayments/${encodeURIComponent(id)}`, `/repayments/id/${encodeURIComponent(id)}`]
    );
  },

  // Allocation preview
  async previewAllocation(payload) {
    return api.postFirst(
      ["/repayments/preview-allocation", "/preview-allocation"],
      payload
    );
  },

  // Manual create
  async create(payload) {
    return api.postFirst(
      ["/repayments/manual", "/manual"],
      payload
    );
  },

  // BULK JSON — controller expects a raw array body
  async createBulk(items = []) {
    return api.postFirst(
      ["/repayments/bulk", "/bulk"],
      items
    );
  },

  // CSV UPLOAD (multipart)
  async uploadCsv(file) {
    const fd = new FormData();
    fd.append("file", file);
    return api.postFirst(
      ["/repayments/csv", "/upload-csv"],
      fd,
      { headers: { /* let browser set content-type for FormData */ } }
    );
  },

  // APPROVALS
  pendingApprovals() {
    return api.getFirst(["/repayments/approvals/pending", "/approvals/pending"]);
  },
  approve(id) {
    return api.postFirst(
      [`/repayments/approvals/${encodeURIComponent(id)}/approve`, `/approvals/${encodeURIComponent(id)}/approve`],
      {}
    );
  },
  reject(id, reason = "") {
    return api.postFirst(
      [`/repayments/approvals/${encodeURIComponent(id)}/reject`, `/approvals/${encodeURIComponent(id)}/reject`],
      { reason }
    );
  },

  // REPORTS
  summary(params) {
    const p = ensureRange(params);
    return api.getFirst(
      ["/reports/summary", "/repayments/summary", "/reports/repayments/summary"],
      { params: p }
    );
  },
  timeseries(params) {
    const p = ensureRange(params);
    return api.getFirst(
      ["/reports/timeseries", "/repayments/timeseries", "/reports/repayments/timeseries"],
      { params: p }
    );
  },

  // EXPORT URL
  exportCsvUrl(params) {
    const base = api.defaults.baseURL?.replace(/\/+$/, "") || "";
    const q = params ? `?${qs(params)}` : "";
    // Prefer /repayments/export.csv, fallback to /export/csv on same base
    const primary = `${base}/repayments/export.csv${q}`;
    const fallback = `${base}/export/csv${q}`;
    return primary; // use primary; if server only has fallback, UI can try both if needed
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

export const createRepayment = repaymentsApi.create;
