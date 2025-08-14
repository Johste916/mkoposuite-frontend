// src/api/settings.js
import api from "./index"; // axios instance

// If axios baseURL is not already "/api", change `/settings/...` to `/api/settings/...`.
const G    = (path, params)  => api.get(`/settings/${path}`, { params }).then(r => r.data);
const P    = (path, payload) => api.put(`/settings/${path}`, payload).then(r => r.data);
const POST = (path, payload) => api.post(`/settings/${path}`, payload).then(r => r.data);
const DEL  = (path)          => api.delete(`/settings/${path}`).then(r => r.data);

const PUT_ID = (path, id, payload) => api.put(`/settings/${path}/${id}`, payload).then(r => r.data);
const GET_ID = (path, id)          => api.get(`/settings/${path}/${id}`).then(r => r.data);

export const SettingsAPI = {
  // Generic
  get: G,
  put: P,
  post: POST,
  del: DEL,

  /* ===== General/Email/SMS ===== */
  getGeneral:        () => G("general"),
  saveGeneral:       (payload) => P("general", payload),

  getSms:            () => G("sms"),
  saveSms:           (payload) => P("sms", payload),

  getEmail:          () => G("email"),
  saveEmail:         (payload) => P("email", payload),

  /* ===== Loans batch (new) ===== */
  getLoanFees:       () => G("loan-fees"),
  saveLoanFees:      (payload) => P("loan-fees", payload),

  getLoanReminders:  () => G("loan-reminders"),
  saveLoanReminders: (payload) => P("loan-reminders", payload),

  getLoanCycles:     () => G("loan-repayment-cycles"),
  saveLoanCycles:    (payload) => P("loan-repayment-cycles", payload),

  getLoanTemplates:  () => G("loan-templates"),
  saveLoanTemplates: (payload) => P("loan-templates", payload),

  getLoanApprovals:  () => G("loan-approvals"),
  saveLoanApprovals: (payload) => P("loan-approvals", payload),

  /* ===== Existing blobs ===== */
  getSystem:            () => G("system-settings"),
  saveSystem:           (payload) => P("system-settings", payload),

  getBorrower:          () => G("borrower-settings"),
  saveBorrower:         (payload) => P("borrower-settings", payload),

  getDashboard:         () => G("dashboard-settings"),
  saveDashboard:        (payload) => P("dashboard-settings", payload),

  getPenalty:           () => G("penalty-settings"),
  savePenalty:          (payload) => P("penalty-settings", payload),

  getBulkSms:           () => G("bulk-sms-settings"),
  saveBulkSms:          (payload) => P("bulk-sms-settings", payload),

  getIntegration:       () => G("integration-settings"),
  saveIntegration:      (payload) => P("integration-settings", payload),

  getSaving:            () => G("saving-settings"),
  saveSaving:           (payload) => P("saving-settings", payload),

  getPayroll:           () => G("payroll-settings"),
  savePayroll:          (payload) => P("payroll-settings", payload),

  getPayment:           () => G("payment-settings"),
  savePayment:          (payload) => P("payment-settings", payload),

  getLoan:              () => G("loan-settings"),
  saveLoan:             (payload) => P("loan-settings", payload),

  getLoanSectors:       () => G("loan-sector-settings"),
  saveLoanSectors:      (payload) => P("loan-sector-settings", payload),

  getIncomeSources:     () => G("income-source-settings"),
  saveIncomeSources:    (payload) => P("income-source-settings", payload),

  getHolidays:          () => G("holiday-settings"),
  saveHolidays:         (payload) => P("holiday-settings", payload),

  /* ===== Loan categories CRUD ===== */
  listLoanCategories:         () => G("loan-categories"),
  createLoanCategory:         (payload) => POST("loan-categories", payload),
  updateLoanCategory:         (id, payload) => PUT_ID("loan-categories", id, payload),
  deleteLoanCategory:         (id) => DEL(`loan-categories/${id}`),

  /* ===== Branch Settings (list + update by :id) ===== */
  listBranches:               () => G("branch-settings"),
  updateBranch:               (id, payload) => PUT_ID("branch-settings", id, payload),

  /* ===== Communications ===== */
  listCommunications:         (params) => G("communications", params),
  createCommunication:        (payload) => POST("communications", payload),
  getCommunication:           (id) => GET_ID("communications", id),
  updateCommunication:        (id, payload) => PUT_ID("communications", id, payload),
  deleteCommunication:        (id) => DEL(`communications/${id}`),
  addCommunicationAttachment: (id, payload) => POST(`communications/${id}/attachments`, payload),
  removeCommunicationAttachment: (id, attId) => DEL(`communications/${id}/attachments/${attId}`),

  /* ===== Friendly aliases (optional) ===== */
  getBorrowerSettings:       () => G("borrower-settings"),
  saveBorrowerSettings:      (payload) => P("borrower-settings", payload),
  getPaymentSettings:        () => G("payment-settings"),
  savePaymentSettings:       (payload) => P("payment-settings", payload),
  getDashboardSettings:      () => G("dashboard-settings"),
  saveDashboardSettings:     (payload) => P("dashboard-settings", payload),
  getPenaltySettings:        () => G("penalty-settings"),
  savePenaltySettings:       (payload) => P("penalty-settings", payload),
  getSavingSettings:         () => G("saving-settings"),
  saveSavingSettings:        (payload) => P("saving-settings", payload),
  getPayrollSettings:        () => G("payroll-settings"),
  savePayrollSettings:       (payload) => P("payroll-settings", payload),
  getIntegrationSettings:    () => G("integration-settings"),
  saveIntegrationSettings:   (payload) => P("integration-settings", payload),
  getIncomeSourceSettings:   () => G("income-source-settings"),
  saveIncomeSourceSettings:  (payload) => P("income-source-settings", payload),
  getLoanSectorSettings:     () => G("loan-sector-settings"),
  saveLoanSectorSettings:    (payload) => P("loan-sector-settings", payload),
  getHolidaySettings:        () => G("holiday-settings"),
  saveHolidaySettings:       (payload) => P("holiday-settings", payload),
  getSystemSettings:         () => G("system-settings"),
  saveSystemSettings:        (payload) => P("system-settings", payload),
  getLoanSettings:           () => G("loan-settings"),
  saveLoanSettings:          (payload) => P("loan-settings", payload),
};
