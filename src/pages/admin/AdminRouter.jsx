// src/pages/admin/AdminRouter.jsx
import React, { lazy, Suspense } from "react";
import { useParams, Navigate } from "react-router-dom";

/* Admin pages (yours) */
const GeneralSettings         = lazy(() => import("./GeneralSettings"));
const EmailAccounts           = lazy(() => import("./EmailAccounts"));
const SmsSettings             = lazy(() => import("./SmsSettings"));
const PenaltySettings         = lazy(() => import("./PenaltySettings"));
const BorrowerSettings        = lazy(() => import("./BorrowerSettings"));
const BranchSettings          = lazy(() => import("./BranchSettings"));
const BulkSmsSettings         = lazy(() => import("./BulkSmsSettings"));
const CommentSettings         = lazy(() => import("./CommentSettings"));
const Communications          = lazy(() => import("./Communications"));
const DashboardSettings       = lazy(() => import("./DashboardSettings"));
const HolidaySettings         = lazy(() => import("./HolidaySettings"));
const IncomeSourceSettings    = lazy(() => import("./IncomeSourceSettings"));
const IntegrationSettings     = lazy(() => import("./IntegrationSettings"));
const LoanCategories          = lazy(() => import("./LoanCategories"));
const LoanSectorSettings      = lazy(() => import("./LoanSectorSettings"));
const LoanSettings            = lazy(() => import("./LoanSettings"));
const PaymentSettings         = lazy(() => import("./PaymentSettings"));
const PayrollSettings         = lazy(() => import("./PayrollSettings"));
const SavingSettings          = lazy(() => import("./SavingSettings"));
const UserManagementSettings  = lazy(() => import("./UserManagementSettings"));

/* NEW Loan settings pages */
const LoanFees                = lazy(() => import("./LoanFees"));
const LoanRepaymentCycles     = lazy(() => import("./LoanRepaymentCycles"));
const LoanReminderSettings    = lazy(() => import("./LoanReminderSettings"));
const LoanTemplates           = lazy(() => import("./LoanTemplates"));
const LoanApprovals           = lazy(() => import("./LoanApprovals"));

/* NEW Manage Staff pages */
const Staff                   = lazy(() => import("./Staff"));
const StaffRolesPermissions   = lazy(() => import("./StaffRolesPermissions"));
const StaffEmailNotifications = lazy(() => import("./StaffEmailNotifications"));
const AuditManagement         = lazy(() => import("./AuditManagement"));

/* Module page */
const LoanProducts            = lazy(() => import("../loans/LoanProducts"));

/* NEW: generic KV settings page for many remaining slugs */
const KVPageRouter            = lazy(() => import("./KVPageRouter"));

const Fallback = () => <div className="p-6 text-sm text-gray-600">Loading…</div>;

/** Registry maps slug -> Component. */
const registry = {
  // General
  "general": GeneralSettings,
  "general-settings": GeneralSettings,

  // Email/SMS
  "email": EmailAccounts,
  "email-accounts": EmailAccounts,
  "email-settings": EmailAccounts,
  "sms": SmsSettings,
  "sms-settings": SmsSettings,
  "bulk-sms-settings": BulkSmsSettings,

  // Existing controllers
  "loan-categories": LoanCategories,
  "loan-settings":   LoanSettings,
  "penalty-settings": PenaltySettings,
  "loan-penalty-settings": PenaltySettings,
  "integration-settings": IntegrationSettings,
  "branch-settings": BranchSettings,
  "branches": BranchSettings,
  "borrower-settings": BorrowerSettings,
  "user-management": UserManagementSettings,
  "saving-settings": SavingSettings,
  "payroll-settings": PayrollSettings,
  "payment-settings": PaymentSettings,
  "comment-settings": CommentSettings,
  "dashboard-settings": DashboardSettings,
  "loan-sector-settings": LoanSectorSettings,
  "income-source-settings": IncomeSourceSettings,
  "holiday-settings": HolidaySettings,
  "branch-holidays": HolidaySettings,
  "communications": Communications,

  // NEW — Loans batch
  "loan-fees": LoanFees,
  "loan-repayment-cycles": LoanRepaymentCycles,
  "loan-reminder-settings": LoanReminderSettings,
  "loan-templates-applications-agreements": LoanTemplates,
  "manage-loan-status-and-approvals": LoanApprovals,

  // NEW — Manage Staff batch
  "staff": Staff,
  "staff-roles-and-permissions": StaffRolesPermissions,
  "staff-email-notifications": StaffEmailNotifications,
  "audit-management": AuditManagement,

  // Module page
  "loan-products": LoanProducts,

  /* ---------- KV-backed pages (now real editors) ---------- */
  "format-borrower-reports": KVPageRouter,
  "rename-borrower-reports": KVPageRouter,
  "rename-collection-sheet-headings": KVPageRouter,
  "invite-borrowers-settings": KVPageRouter,
  "modify-add-borrower-fields": KVPageRouter,

  "loan-repayment-methods": KVPageRouter,
  "manage-collectors": KVPageRouter,

  "collateral-types": KVPageRouter,
  "payroll-templates": KVPageRouter,

  "upload-borrowers-from-csv-file": KVPageRouter,            // shows info JSON placeholder
  "upload-loans-from-csv-file": KVPageRouter,
  "upload-repayments-from-csv-file": KVPageRouter,
  "upload-expenses-from-csv-file": KVPageRouter,
  "upload-other-income-from-csv-file": KVPageRouter,
  "upload-savings-accounts-from-csv-file": KVPageRouter,
  "upload-savings-transactions-from-csv-file": KVPageRouter,
  "upload-loan-schedule-from-csv-file": KVPageRouter,
  "upload-inter-bank-transfer-from-csv-file": KVPageRouter,

  "other-income-types": KVPageRouter,
  "expense-types": KVPageRouter,
  "asset-management-types": KVPageRouter,

  "sms-credits": KVPageRouter,
  "sender-id": KVPageRouter,
  "sms-templates": KVPageRouter,
  "auto-send-sms": KVPageRouter,
  "collection-sheets-sms-template": KVPageRouter,

  "email-templates": KVPageRouter,
  "auto-send-emails": KVPageRouter,
  "collection-sheets-email-template": KVPageRouter,

  "savings-products": KVPageRouter,
  "savings-fees": KVPageRouter,
  "savings-transaction-types": KVPageRouter,

  "e-signature-settings": KVPageRouter,
  "email-templates-for-e-signature": KVPageRouter,

  "investor-products": KVPageRouter,
  "loan-investment-products": KVPageRouter,
  "investor-fees": KVPageRouter,
  "format-investor-report": KVPageRouter,
  "rename-investor-report": KVPageRouter,
  "invite-investors-settings": KVPageRouter,
  "investor-transaction-types": KVPageRouter,

  "settings": KVPageRouter,                 // accounting -> settings
  "bank-accounts": KVPageRouter,
  "taxes": KVPageRouter,
  "opening-balances": KVPageRouter,

  "backup-settings": KVPageRouter,
  "download-backups": KVPageRouter,
};

const ComingSoon = ({ title }) => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
    <h1 className="text-xl font-semibold mb-1">{title}</h1>
    <p className="text-sm text-slate-600 dark:text-slate-400">
      This settings editor is not wired yet. We’ll enable this page shortly.
    </p>
  </div>
);

export default function AdminRouter() {
  const { slug } = useParams();
  if (!slug) return <Navigate to="/admin/general-settings" replace />;

  const Component = registry[slug];

  const title = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  if (!Component) return <ComingSoon title={title} />;

  return (
    <Suspense fallback={<Fallback />}>
      <Component />
    </Suspense>
  );
}
