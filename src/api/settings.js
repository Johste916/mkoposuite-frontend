import api from "./index";

// Build path helpers that never double-append /api
const base = (() => {
  const b = api?.defaults?.baseURL || "";
  return b && b.endsWith("/api") ? "" : "/api";
})();
const P = (p) => `${base}/settings/${p}`;

/** helper to try both /settings/* and top-level fallbacks */
const tryBoth = (paths, method = "get", body, config) => {
  const list = Array.isArray(paths) ? paths : [paths];
  const expanded = list.flatMap((p) => [P(p), `/${p}`]); // e.g. ["settings/communications", "/communications"]
  switch (method) {
    case "get": return api.getFirst(expanded, config);
    case "post": return api.postFirst(expanded, body, config);
    case "put": return api.putFirst(expanded, body, config);
    case "patch": return api.patchFirst(expanded, body, config);
    case "delete": return api.deleteFirst(expanded, config);
    default: return api.getFirst(expanded, config);
  }
};

export const SettingsAPI = {
  /* Loan Categories */
  getLoanCategories: () => api.getJSON(P("loan-categories")),
  createLoanCategory: (payload) => api.postJSON(P("loan-categories"), payload),
  updateLoanCategory: (id, payload) => api.putJSON(P(`loan-categories/${id}`), payload),
  deleteLoanCategory: (id) => api.deleteJSON(P(`loan-categories/${id}`)),

  /* Loans */
  getLoanSettings: () => api.getJSON(P("loan-settings")),
  saveLoanSettings: (v) => api.putJSON(P("loan-settings"), v),

  getPenaltySettings: () => api.getJSON(P("penalty-settings")),
  savePenaltySettings: (v) => api.putJSON(P("penalty-settings"), v),

  getLoanFees: () => api.getJSON(P("loan-fees")),
  saveLoanFees: (v) => api.putJSON(P("loan-fees"), v),

  getLoanReminders: () => api.getJSON(P("loan-reminders")),
  saveLoanReminders: (v) => api.putJSON(P("loan-reminders"), v),

  getLoanCycles: () => api.getJSON(P("loan-repayment-cycles")),
  saveLoanCycles: (v) => api.putJSON(P("loan-repayment-cycles"), v),

  getLoanTemplates: () => api.getJSON(P("loan-templates")),
  saveLoanTemplates: (v) => api.putJSON(P("loan-templates"), v),

  getLoanApprovals: () => api.getJSON(P("loan-approvals")),
  saveLoanApprovals: (v) => api.putJSON(P("loan-approvals"), v),

  /* System/General */
  getSystemSettings: () => api.getJSON(P("system-settings")),
  saveSystemSettings: (v) => api.putJSON(P("system-settings"), v),

  getGeneral: () => api.getJSON(P("general")),
  saveGeneral: (v) => api.putJSON(P("general"), v),

  /* Integrations */
  getIntegrationSettings: () => api.getJSON(P("integration-settings")),
  saveIntegrationSettings: (v) => api.putJSON(P("integration-settings"), v),

  /* Branches */
  getBranchSettings: () => api.getJSON(P("branch-settings")),
  updateBranch: (id, v) => api.putJSON(P(`branch-settings/${id}`), v),

  /* Borrowers */
  getBorrowerSettings: () => api.getJSON(P("borrower-settings")),
  saveBorrowerSettings: (v) => api.putJSON(P("borrower-settings"), v),

  /* Users/ACL */
  getUsersSettings: () => api.getJSON(P("user-management")),
  saveUsersSettings: (v) => api.putJSON(P("user-management"), v),

  /* SMS */
  getSms: () => api.getJSON(P("sms")),
  saveSms: (v) => api.putJSON(P("sms"), v),
  getBulkSms: () => api.getJSON(P("bulk-sms-settings")),
  saveBulkSms: (v) => api.putJSON(P("bulk-sms-settings"), v),

  /* Email */
  getEmail: () => api.getJSON(P("email")),
  saveEmail: (v) => api.putJSON(P("email"), v),

  /* Savings */
  getSavingSettings: () => api.getJSON(P("saving-settings")),
  saveSavingSettings: (v) => api.putJSON(P("saving-settings"), v),

  /* Payroll */
  getPayrollSettings: () => api.getJSON(P("payroll-settings")),
  savePayrollSettings: (v) => api.putJSON(P("payroll-settings"), v),

  /* Payment */
  getPaymentSettings: () => api.getJSON(P("payment-settings")),
  savePaymentSettings: (v) => api.putJSON(P("payment-settings"), v),

  /* Comments */
  getCommentSettings: () => api.getJSON(P("comment-settings")),
  saveCommentSettings: (v) => api.putJSON(P("comment-settings"), v),

  /* Dashboard */
  getDashboardSettings: () => api.getJSON(P("dashboard-settings")),
  saveDashboardSettings: (v) => api.putJSON(P("dashboard-settings"), v),

  /* Loan Sectors */
  getLoanSectorSettings: () => api.getJSON(P("loan-sector-settings")),
  saveLoanSectorSettings: (v) => api.putJSON(P("loan-sector-settings"), v),

  /* Income Source */
  getIncomeSourceSettings: () => api.getJSON(P("income-source-settings")),
  saveIncomeSourceSettings: (v) => api.putJSON(P("income-source-settings"), v),

  /* Holidays */
  getHolidaySettings: () => api.getJSON(P("holiday-settings")),
  saveHolidaySettings: (v) => api.putJSON(P("holiday-settings"), v),

  /* Communications (try /settings/communications AND /communications) */
  listComms: () => tryBoth("communications", "get"),
  createComm: (v) => tryBoth("communications", "post", v),
  getComm: (id) => tryBoth(`communications/${id}`, "get"),
  updateComm: (id, v) => tryBoth(`communications/${id}`, "put", v),
  deleteComm: (id) => tryBoth(`communications/${id}`, "delete"),

  addCommAttachment: (id, formData) => tryBoth(`communications/${id}/attachments`, "post", formData),
  removeCommAttachment: (id, attId) => tryBoth(`communications/${id}/attachments/${attId}`, "delete"),

  /* KV helpers (try /settings/kv/:key AND /kv/:key) */
  kvGet: (key) => tryBoth(`kv/${encodeURIComponent(key)}`, "get"),
  kvSave: (key, value) => tryBoth(`kv/${encodeURIComponent(key)}`, "put", value),
  kvPatch: (key, patch) => tryBoth(`kv/${encodeURIComponent(key)}`, "patch", patch),
};

export default SettingsAPI;
