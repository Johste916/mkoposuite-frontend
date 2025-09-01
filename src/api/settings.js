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

/** Generic handlers for /api/settings/:key with fallbacks */
const settingsGet = (key) => smartGet([`/api/settings/${key}`, `/api/settings`], { key });
const settingsPut = (key, value) => smartPut([`/api/settings/${key}`, `/api/settings`], { key, value });

/* ------------------ BASIC SETTINGS (JSON blobs) ------------------ */
export const SettingsAPI = {
  // General
  getGeneral: () => settingsGet("general"),
  saveGeneral: (v) => settingsPut("general", v),

  // Email
  getEmail: () => smartGet([`/api/email/accounts`, `/api/settings/email`]),
  saveEmail: (v) => smartPut([`/api/email/accounts`, `/api/settings/email`], v),

  // SMS
  getSms: () => smartGet([`/api/sms/settings`, `/api/settings/sms`]),
  saveSms: (v) => smartPut([`/api/sms/settings`, `/api/settings/sms`], v),

  // Borrower
  getBorrower: () => settingsGet("borrower"),
  saveBorrower: (v) => settingsPut("borrower", v),

  // Comment
  getCommentSettings: () => settingsGet("comments"),
  saveCommentSettings: (v) => settingsPut("comments", v),

  // Dashboard
  getDashboardSettings: () => settingsGet("dashboard"),
  saveDashboardSettings: (v) => settingsPut("dashboard", v),

  // Holiday
  getHolidaySettings: () => settingsGet("holidays"),
  saveHolidaySettings: (v) => settingsPut("holidays", v),

  // Income source
  getIncomeSourceSettings: () => settingsGet("income-sources"),
  saveIncomeSourceSettings: (v) => settingsPut("income-sources", v),

  // Integration
  getIntegrationSettings: () => settingsGet("integrations"),
  saveIntegrationSettings: (v) => settingsPut("integrations", v),

  // Loan approvals / statuses
  getLoanApprovals: () => settingsGet("loan-approvals"),
  saveLoanApprovals: (v) => settingsPut("loan-approvals", v),

  // Loan templates
  getLoanTemplates: () => settingsGet("loan-templates"),
  saveLoanTemplates: (v) => settingsPut("loan-templates", v),

  // Loan settings
  getLoanSettings: () => smartGet([`/api/loans/settings`, `/api/settings/loans`]),
  saveLoanSettings: (v) => smartPut([`/api/loans/settings`, `/api/settings/loans`], v),

  // Loan penalties
  getPenaltySettings: () => smartGet([`/api/loans/penalties`, `/api/settings/loan-penalties`]),
  savePenaltySettings: (v) => smartPut([`/api/loans/penalties`, `/api/settings/loan-penalties`], v),

  // Loan fees
  getLoanFees: () => smartGet([`/api/loans/fees`, `/api/settings/loan-fees`]),
  saveLoanFees: (v) => smartPut([`/api/loans/fees`, `/api/settings/loan-fees`], v),

  // Loan repayment cycles
  getLoanCycles: () => smartGet([`/api/loans/repayment-cycles`, `/api/settings/loan-cycles`]),
  saveLoanCycles: (v) => smartPut([`/api/loans/repayment-cycles`, `/api/settings/loan-cycles`], v),

  // Loan reminders
  getLoanReminders: () => smartGet([`/api/loans/reminders`, `/api/settings/loan-reminders`]),
  saveLoanReminders: (v) => smartPut([`/api/loans/reminders`, `/api/settings/loan-reminders`], v),

  // Loan sectors
  getLoanSectorSettings: () => settingsGet("loan-sectors"),
  saveLoanSectorSettings: (v) => settingsPut("loan-sectors", v),

  // Payment settings
  getPaymentSettings: () => settingsGet("payments"),
  savePaymentSettings: (v) => settingsPut("payments", v),

  // Payroll
  getPayrollSettings: () => smartGet([`/api/hr/payroll/settings`, `/api/settings/payroll`]),
  savePayrollSettings: (v) => smartPut([`/api/hr/payroll/settings`, `/api/settings/payroll`], v),

  // Saving
  getSavingSettings: () => settingsGet("savings"),
  saveSavingSettings: (v) => settingsPut("savings", v),

  // Users
  getUsersSettings: () => settingsGet("users"),
  saveUsersSettings: (v) => settingsPut("users", v),
};

/* ------------------ KV helpers for “simple settings” ------------------ */
export const KV = {
  get: (key) =>
    api.get(`/api/settings/kv/${encodeURIComponent(key)}`).then((r) => r.data),
  save: (key, value) =>
    api.put(`/api/settings/kv/${encodeURIComponent(key)}`, value).then((r) => r.data),
  patch: (key, patch) =>
    api.patch(`/api/settings/kv/${encodeURIComponent(key)}`, patch).then((r) => r.data),
};

/** Ensure we have the shape the editor expects ([], {}, or "") */
export function ensureType(value, fallback) {
  const t = Array.isArray(fallback) ? "array" : typeof fallback;
  if (t === "array") return Array.isArray(value) ? value : [];
  if (t === "object") return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  if (t === "string") return typeof value === "string" ? value : "";
  if (t === "boolean") return !!value;
  return value ?? fallback;
}

export default SettingsAPI;
