// src/api/settings.js
import api from "./index";

// Build path helpers that never double-append /api
const base = (() => {
  const b = api?.defaults?.baseURL || "";
  return b && b.endsWith("/api") ? "" : "/api";
})();
const P = (p) => `${base}/settings/${p}`;     // /api/settings/*
const C = (p) => `${base}/settings/${p}`;     // alias (communications live under /settings too)

// NOTE: This file mirrors server/routes/settingRoutes.js exactly.
export const SettingsAPI = {
  /* ------------------------------ Loan Categories ------------------------------ */
  getLoanCategories: () => api.get(P("loan-categories")).then(r => r.data),
  createLoanCategory: (payload) => api.post(P("loan-categories"), payload).then(r => r.data),
  updateLoanCategory: (id, payload) => api.put(P(`loan-categories/${id}`), payload).then(r => r.data),
  deleteLoanCategory: (id) => api.delete(P(`loan-categories/${id}`)).then(r => r.data),

  /* --------------------------------- Loans ------------------------------------ */
  getLoanSettings:     () => api.get(P("loan-settings")).then(r => r.data),
  saveLoanSettings:    (v) => api.put(P("loan-settings"), v).then(r => r.data),

  getPenaltySettings:  () => api.get(P("penalty-settings")).then(r => r.data),
  savePenaltySettings: (v) => api.put(P("penalty-settings"), v).then(r => r.data),

  getLoanFees:         () => api.get(P("loan-fees")).then(r => r.data),
  saveLoanFees:        (v) => api.put(P("loan-fees"), v).then(r => r.data),

  getLoanReminders:    () => api.get(P("loan-reminders")).then(r => r.data),
  saveLoanReminders:   (v) => api.put(P("loan-reminders"), v).then(r => r.data),

  getLoanCycles:       () => api.get(P("loan-repayment-cycles")).then(r => r.data),
  saveLoanCycles:      (v) => api.put(P("loan-repayment-cycles"), v).then(r => r.data),

  getLoanTemplates:    () => api.get(P("loan-templates")).then(r => r.data),
  saveLoanTemplates:   (v) => api.put(P("loan-templates"), v).then(r => r.data),

  getLoanApprovals:    () => api.get(P("loan-approvals")).then(r => r.data),
  saveLoanApprovals:   (v) => api.put(P("loan-approvals"), v).then(r => r.data),

  /* ------------------------------ System/General ------------------------------- */
  // Backend exposes BOTH "system-settings" (legacy) and "general" (current, used by dashboard)
  getSystemSettings:   () => api.get(P("system-settings")).then(r => r.data),
  saveSystemSettings:  (v) => api.put(P("system-settings"), v).then(r => r.data),

  getGeneral:          () => api.get(P("general")).then(r => r.data),
  saveGeneral:         (v) => api.put(P("general"), v).then(r => r.data),

  /* -------------------------------- Integrations ------------------------------- */
  getIntegrationSettings:  () => api.get(P("integration-settings")).then(r => r.data),
  saveIntegrationSettings: (v) => api.put(P("integration-settings"), v).then(r => r.data),

  /* --------------------------------- Branches --------------------------------- */
  getBranchSettings:   () => api.get(P("branch-settings")).then(r => r.data),
  updateBranch:        (id, v) => api.put(P(`branch-settings/${id}`), v).then(r => r.data),

  /* -------------------------------- Borrowers --------------------------------- */
  getBorrowerSettings: () => api.get(P("borrower-settings")).then(r => r.data),
  saveBorrowerSettings:(v) => api.put(P("borrower-settings"), v).then(r => r.data),

  /* --------------------------------- Users/ACL -------------------------------- */
  getUsersSettings:    () => api.get(P("user-management")).then(r => r.data),
  saveUsersSettings:   (v) => api.put(P("user-management"), v).then(r => r.data),

  /* ----------------------------------- SMS ------------------------------------ */
  getSms:      () => api.get(P("sms")).then(r => r.data),
  saveSms:     (v) => api.put(P("sms"), v).then(r => r.data),
  getBulkSms:  () => api.get(P("bulk-sms-settings")).then(r => r.data),
  saveBulkSms: (v) => api.put(P("bulk-sms-settings"), v).then(r => r.data),

  /* ---------------------------------- Email ----------------------------------- */
  getEmail: () => api.get(P("email")).then(r => r.data),
  saveEmail:(v) => api.put(P("email"), v).then(r => r.data),

  /* --------------------------------- Savings ---------------------------------- */
  getSavingSettings: () => api.get(P("saving-settings")).then(r => r.data),
  saveSavingSettings:(v) => api.put(P("saving-settings"), v).then(r => r.data),

  /* --------------------------------- Payroll ---------------------------------- */
  getPayrollSettings: () => api.get(P("payroll-settings")).then(r => r.data),
  savePayrollSettings:(v) => api.put(P("payroll-settings"), v).then(r => r.data),

  /* --------------------------------- Payment ---------------------------------- */
  getPaymentSettings: () => api.get(P("payment-settings")).then(r => r.data),
  savePaymentSettings:(v) => api.put(P("payment-settings"), v).then(r => r.data),

  /* --------------------------------- Comments --------------------------------- */
  getCommentSettings: () => api.get(P("comment-settings")).then(r => r.data),
  saveCommentSettings:(v) => api.put(P("comment-settings"), v).then(r => r.data),

  /* -------------------------------- Dashboard --------------------------------- */
  getDashboardSettings: () => api.get(P("dashboard-settings")).then(r => r.data),
  saveDashboardSettings:(v) => api.put(P("dashboard-settings"), v).then(r => r.data),

  /* ------------------------------ Loan Sectors -------------------------------- */
  getLoanSectorSettings: () => api.get(P("loan-sector-settings")).then(r => r.data),
  saveLoanSectorSettings:(v) => api.put(P("loan-sector-settings"), v).then(r => r.data),

  /* ---------------------------- Income Source --------------------------------- */
  getIncomeSourceSettings: () => api.get(P("income-source-settings")).then(r => r.data),
  saveIncomeSourceSettings:(v) => api.put(P("income-source-settings"), v).then(r => r.data),

  /* -------------------------------- Holidays ---------------------------------- */
  getHolidaySettings: () => api.get(P("holiday-settings")).then(r => r.data),
  saveHolidaySettings:(v) => api.put(P("holiday-settings"), v).then(r => r.data),

  /* ---------------------------- Communications CRUD --------------------------- */
  listComms:        () => api.get(C("communications")).then(r => r.data),
  createComm:       (v) => api.post(C("communications"), v).then(r => r.data),
  getComm:          (id) => api.get(C(`communications/${id}`)).then(r => r.data),
  updateComm:       (id, v) => api.put(C(`communications/${id}`), v).then(r => r.data),
  deleteComm:       (id) => api.delete(C(`communications/${id}`)).then(r => r.data),
  addCommAttachment:(id, formData) => api.post(C(`communications/${id}/attachments`), formData).then(r => r.data),
  removeCommAttachment:(id, attId) => api.delete(C(`communications/${id}/attachments/${attId}`)).then(r => r.data),

  /* ------------------------------ KV helpers ---------------------------------- */
  kvGet:   (key) => api.get(P(`kv/${encodeURIComponent(key)}`)).then(r => r.data),
  kvSave:  (key, value) => api.put(P(`kv/${encodeURIComponent(key)}`), value).then(r => r.data),
  kvPatch: (key, patch) => api.patch(P(`kv/${encodeURIComponent(key)}`), patch).then(r => r.data),
};

export default SettingsAPI;
