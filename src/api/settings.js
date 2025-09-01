// src/api/settings.js
import api from "../api";

/* ---------------------------------------------------------
   Smart helpers: try multiple paths; treat 404 as "keep trying".
   For GET, if all paths fail and last error was 404 => return {}.
--------------------------------------------------------- */
async function smartGet(paths, params) {
  let lastErr;
  for (const p of paths) {
    try {
      const { data } = await api.get(p, { params });
      return data;
    } catch (e) {
      if (e?.response?.status === 404) { lastErr = e; continue; }
      lastErr = e;
    }
  }
  // Generic editors are fine starting from an empty object
  if (lastErr?.response?.status === 404) return {};
  throw lastErr || new Error("All GET paths failed");
}

async function smartPut(paths, body) {
  let lastErr;
  for (const p of paths) {
    try {
      const { data } = await api.put(p, body);
      return data;
    } catch (e) {
      if (e?.response?.status === 404) { lastErr = e; continue; }
      lastErr = e;
    }
  }
  throw lastErr || new Error("All PUT paths failed");
}

async function smartPost(paths, body) {
  let lastErr;
  for (const p of paths) {
    try {
      const { data } = await api.post(p, body);
      return data;
    } catch (e) {
      if (e?.response?.status === 404) { lastErr = e; continue; }
      lastErr = e;
    }
  }
  throw lastErr || new Error("All POST paths failed");
}

async function smartDelete(paths) {
  let lastErr;
  for (const p of paths) {
    try {
      const { data } = await api.delete(p);
      return data;
    } catch (e) {
      if (e?.response?.status === 404) { lastErr = e; continue; }
      lastErr = e;
    }
  }
  throw lastErr || new Error("All DELETE paths failed");
}

/* ---------------------------------------------------------
   Generic /api/settings key store (works with your Setting model)
   GET /api/settings/:key  -> returns raw JSON for key
   PUT /api/settings/:key  -> accepts body {key,value} or just value
   PATCH /api/settings/:key-> accepts body {patch} or patch object
   Also supports ?key= when hitting /api/settings
--------------------------------------------------------- */
const settingsGet = (key) =>
  smartGet([`/api/settings/${encodeURIComponent(key)}`, `/api/settings`], { key });

const settingsPut = (key, value) =>
  smartPut([`/api/settings/${encodeURIComponent(key)}`, `/api/settings`], { key, value });

/* ---------------------------------------------------------
   Public API
--------------------------------------------------------- */
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

  // Comments
  getCommentSettings: () => settingsGet("comments"),
  saveCommentSettings: (v) => settingsPut("comments", v),

  // Dashboard
  getDashboardSettings: () => settingsGet("dashboard"),
  saveDashboardSettings: (v) => settingsPut("dashboard", v),

  // Holidays
  getHolidaySettings: () => settingsGet("holidays"),
  saveHolidaySettings: (v) => settingsPut("holidays", v),

  // Income sources
  getIncomeSourceSettings: () => settingsGet("income-sources"),
  saveIncomeSourceSettings: (v) => settingsPut("income-sources", v),

  // Integrations
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

  // Savings
  getSavingSettings: () => settingsGet("savings"),
  saveSavingSettings: (v) => settingsPut("savings", v),

  // Users
  getUsersSettings: () => settingsGet("users"),
  saveUsersSettings: (v) => settingsPut("users", v),

  /* -------- Live resources -------- */
  listBranches: () => api.get(`/api/branches`).then(r => Array.isArray(r.data) ? r.data : (r.data?.data ?? [])),
  createBranch: (body) => api.post(`/api/branches`, body).then(r => r.data),
  updateBranch: (id, body) => api.put(`/api/branches/${encodeURIComponent(id)}`, body).then(r => r.data),
  deleteBranch: (id) => api.delete(`/api/branches/${encodeURIComponent(id)}`).then(r => r.data),

  /* -------- Loan categories (live) -------- */
  getLoanCategories: () =>
    smartGet([`/api/loans/categories`, `/api/settings/loan-categories`]).then(x =>
      Array.isArray(x?.items) ? x.items : x
    ),
  createLoanCategory: (body) => smartPost([`/api/loans/categories`, `/api/settings/loan-categories`], body),
  updateLoanCategory: (id, body) =>
    smartPut([`/api/loans/categories/${encodeURIComponent(id)}`, `/api/settings/loan-categories/${encodeURIComponent(id)}`], body),
  deleteLoanCategory: (id) =>
    smartDelete([`/api/loans/categories/${encodeURIComponent(id)}`, `/api/settings/loan-categories/${encodeURIComponent(id)}`]),
};

export default SettingsAPI;
