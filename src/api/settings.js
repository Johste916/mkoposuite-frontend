// src/api/settings.js
import api from "../api";

/** Helper that tries multiple endpoints for maximum compatibility. */
async function smartGet(paths, params) {
  let lastErr;
  for (const p of paths) {
    try {
      const { data } = await api.get(p, { params });
      return data;
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("All GET paths failed");
}
async function smartPut(paths, body) {
  let lastErr;
  for (const p of paths) {
    try {
      const { data } = await api.put(p, body);
      return data;
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("All PUT paths failed");
}
async function smartPost(paths, body) {
  let lastErr;
  for (const p of paths) {
    try {
      const { data } = await api.post(p, body);
      return data;
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("All POST paths failed");
}
async function smartDelete(paths) {
  let lastErr;
  for (const p of paths) {
    try {
      const { data } = await api.delete(p);
      return data;
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("All DELETE paths failed");
}

/**
 * Generic KV endpoints — do NOT collide with named routes.
 * We use /api/settings/kv/:key specifically to avoid catching everything (like /loan-settings).
 */
const kvGet = (key) => api.get(`/api/settings/kv/${encodeURIComponent(key)}`).then(r => r.data);
const kvPut = (key, value) => api.put(`/api/settings/kv/${encodeURIComponent(key)}`, { value }).then(r => r.data);

/** Generic handlers for settings keys with fallbacks to REAL controllers first */
const settingsGet = (key, controllerPaths = []) =>
  smartGet([...controllerPaths, `/api/settings/kv/${key}`]);

const settingsPut = (key, value, controllerPaths = []) =>
  smartPut([...controllerPaths, `/api/settings/kv/${key}`], { value });

/* ------------------ BASIC SETTINGS (JSON blobs) ------------------ */
export const SettingsAPI = {
  // General
  getGeneral: () => settingsGet("general", ["/api/settings/general"]),
  saveGeneral: (v) => settingsPut("general", v, ["/api/settings/general"]),

  // Email
  getEmail: () => smartGet([`/api/email/accounts`, `/api/settings/email`, `/api/settings/kv/email`]),
  saveEmail: (v) => smartPut([`/api/email/accounts`, `/api/settings/email`, `/api/settings/kv/email`], v),

  // SMS
  getSms: () => smartGet([`/api/sms/settings`, `/api/settings/sms`, `/api/settings/kv/sms`]),
  saveSms: (v) => smartPut([`/api/sms/settings`, `/api/settings/sms`, `/api/settings/kv/sms`], v),

  // Borrower
  getBorrower: () => settingsGet("borrower", ["/api/settings/borrower-settings"]),
  saveBorrower: (v) => settingsPut("borrower", v, ["/api/settings/borrower-settings"]),

  // Comment
  getCommentSettings: () => settingsGet("comments", ["/api/settings/comment-settings"]),
  saveCommentSettings: (v) => settingsPut("comments", v, ["/api/settings/comment-settings"]),

  // Dashboard
  getDashboardSettings: () => settingsGet("dashboard", ["/api/settings/dashboard-settings"]),
  saveDashboardSettings: (v) => settingsPut("dashboard", v, ["/api/settings/dashboard-settings"]),

  // Holiday
  getHolidaySettings: () => settingsGet("holidays", ["/api/settings/holiday-settings"]),
  saveHolidaySettings: (v) => settingsPut("holidays", v, ["/api/settings/holiday-settings"]),

  // Income source
  getIncomeSourceSettings: () => settingsGet("income-sources", ["/api/settings/income-source-settings"]),
  saveIncomeSourceSettings: (v) => settingsPut("income-sources", v, ["/api/settings/income-source-settings"]),

  // Integration
  getIntegrationSettings: () => settingsGet("integrations", ["/api/settings/integration-settings"]),
  saveIntegrationSettings: (v) => settingsPut("integrations", v, ["/api/settings/integration-settings"]),

  // Loan approvals / statuses
  getLoanApprovals: () => settingsGet("loan-approvals", ["/api/settings/loan-approvals"]),
  saveLoanApprovals: (v) => settingsPut("loan-approvals", v, ["/api/settings/loan-approvals"]),

  // Loan templates
  getLoanTemplates: () => settingsGet("loan-templates", ["/api/settings/loan-templates"]),
  saveLoanTemplates: (v) => settingsPut("loan-templates", v, ["/api/settings/loan-templates"]),

  // Loan settings (singleton)
  getLoanSettings: () => smartGet([`/api/loans/settings`, `/api/settings/loan-settings`]),
  saveLoanSettings: (v) => smartPut([`/api/loans/settings`, `/api/settings/loan-settings`], v),

  // Loan penalties
  getPenaltySettings: () => smartGet([`/api/loans/penalties`, `/api/settings/penalty-settings`, `/api/settings/kv/loan-penalties`]),
  savePenaltySettings: (v) => smartPut([`/api/loans/penalties`, `/api/settings/penalty-settings`, `/api/settings/kv/loan-penalties`], v),

  // Loan fees
  getLoanFees: () => smartGet([`/api/loans/fees`, `/api/settings/loan-fees`, `/api/settings/kv/loan-fees`]),
  saveLoanFees: (v) => smartPut([`/api/loans/fees`, `/api/settings/loan-fees`, `/api/settings/kv/loan-fees`], v),

  // Loan repayment cycles
  getLoanCycles: () => smartGet([`/api/loans/repayment-cycles`, `/api/settings/loan-repayment-cycles`, `/api/settings/kv/loan-cycles`]),
  saveLoanCycles: (v) => smartPut([`/api/loans/repayment-cycles`, `/api/settings/loan-repayment-cycles`, `/api/settings/kv/loan-cycles`], v),

  // Loan reminders
  getLoanReminders: () => smartGet([`/api/loans/reminders`, `/api/settings/loan-reminders`, `/api/settings/kv/loan-reminders`]),
  saveLoanReminders: (v) => smartPut([`/api/loans/reminders`, `/api/settings/loan-reminders`, `/api/settings/kv/loan-reminders`], v),

  // Loan sectors
  getLoanSectorSettings: () => settingsGet("loan-sectors", ["/api/settings/loan-sector-settings"]),
  saveLoanSectorSettings: (v) => settingsPut("loan-sectors", v, ["/api/settings/loan-sector-settings"]),

  // Payment settings
  getPaymentSettings: () => settingsGet("payments", ["/api/settings/payment-settings"]),
  savePaymentSettings: (v) => settingsPut("payments", v, ["/api/settings/payment-settings"]),

  // Payroll (singleton controller if present, else KV)
  getPayrollSettings: () => smartGet([`/api/hr/payroll/settings`, `/api/settings/payroll-settings`, `/api/settings/kv/payroll`]),
  savePayrollSettings: (v) => smartPut([`/api/hr/payroll/settings`, `/api/settings/payroll-settings`, `/api/settings/kv/payroll`], v),

  // Saving
  getSavingSettings: () => settingsGet("savings", ["/api/settings/saving-settings"]),
  saveSavingSettings: (v) => settingsPut("savings", v, ["/api/settings/saving-settings"]),

  // Users
  getUsersSettings: () => settingsGet("users", ["/api/settings/user-management"]),
  saveUsersSettings: (v) => settingsPut("users", v, ["/api/settings/user-management"]),

  /* ------------- Branch management (live resources) ------------- */
  listBranches: () => api.get(`/api/branches`).then(r => r.data),
  createBranch: (body) => api.post(`/api/branches`, body).then(r => r.data),
  updateBranch: (id, body) => api.put(`/api/branches/${id}`, body).then(r => r.data),
  deleteBranch: (id) => api.delete(`/api/branches/${id}`).then(r => r.data),

  /* ------------- Loan categories (live resources) -------------- */
  getLoanCategories: () =>
    smartGet([`/api/loans/categories`, `/api/settings/loan-categories`])
      .then(x => Array.isArray(x?.items) ? x.items : x),
  createLoanCategory: (body) => smartPost([`/api/loans/categories`], body),
  updateLoanCategory: (id, body) => smartPut([`/api/loans/categories/${id}`], body),
  deleteLoanCategory: (id) => smartDelete([`/api/loans/categories/${id}`]),
};

export default SettingsAPI;
