// src/pages/admin/AdminRouter.jsx
import React, { lazy, Suspense } from "react";
import { useParams, Navigate } from "react-router-dom";
import ErrorBoundary from "../../components/ErrorBoundary";

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

const Fallback = () => (
  <div className="p-6 text-sm text-gray-600">Loading…</div>
);

/** Keep slug logic consistent with the Admin list */
const normalize = (s = "") =>
  s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

/** Registry maps normalized slug -> Component. */
const registry = {
  // General
  [normalize("general")]: GeneralSettings,
  [normalize("general-settings")]: GeneralSettings,

  // Email/SMS
  [normalize("email")]: EmailAccounts,
  [normalize("email-accounts")]: EmailAccounts,
  [normalize("email-settings")]: EmailAccounts,
  [normalize("sms")]: SmsSettings,
  [normalize("sms-settings")]: SmsSettings,
  [normalize("bulk-sms-settings")]: BulkSmsSettings,

  // Existing controllers
  [normalize("loan-categories")]: LoanCategories,
  [normalize("loan-settings")]: LoanSettings,
  [normalize("penalty-settings")]: PenaltySettings,
  [normalize("loan-penalty-settings")]: PenaltySettings,
  [normalize("integration-settings")]: IntegrationSettings,
  [normalize("branch-settings")]: BranchSettings,
  [normalize("branches")]: BranchSettings,
  [normalize("borrower-settings")]: BorrowerSettings,
  [normalize("user-management")]: UserManagementSettings,
  [normalize("saving-settings")]: SavingSettings,
  [normalize("payroll-settings")]: PayrollSettings,
  [normalize("payment-settings")]: PaymentSettings,
  [normalize("comment-settings")]: CommentSettings,
  [normalize("dashboard-settings")]: DashboardSettings,
  [normalize("loan-sector-settings")]: LoanSectorSettings,
  [normalize("income-source-settings")]: IncomeSourceSettings,
  [normalize("holiday-settings")]: HolidaySettings,
  [normalize("branch-holidays")]: HolidaySettings,
  [normalize("communications")]: Communications,

  // NEW — Loans batch
  [normalize("loan-fees")]: LoanFees,
  [normalize("loan-repayment-cycles")]: LoanRepaymentCycles,
  [normalize("loan-reminder-settings")]: LoanReminderSettings,
  [normalize("loan-templates-applications-agreements")]: LoanTemplates,
  [normalize("manage-loan-status-and-approvals")]: LoanApprovals,

  // NEW — Manage Staff batch
  [normalize("staff")]: Staff,
  [normalize("staff-roles-and-permissions")]: StaffRolesPermissions,
  [normalize("staff-email-notifications")]: StaffEmailNotifications,
  [normalize("audit-management")]: AuditManagement,

  // Module page
  [normalize("loan-products")]: LoanProducts,

  /* ---------- KV-backed pages (now real editors) ---------- */
  [normalize("format-borrower-reports")]: KVPageRouter,
  [normalize("rename-borrower-reports")]: KVPageRouter,
  [normalize("rename-collection-sheet-headings")]: KVPageRouter,
  [normalize("invite-borrowers-settings")]: KVPageRouter,
  [normalize("modify-add-borrower-fields")]: KVPageRouter,

  [normalize("loan-repayment-methods")]: KVPageRouter,
  [normalize("manage-collectors")]: KVPageRouter,

  [normalize("collateral-types")]: KVPageRouter,
  [normalize("payroll-templates")]: KVPageRouter,

  [normalize("upload-borrowers-from-csv-file")]: KVPageRouter,
  [normalize("upload-loans-from-csv-file")]: KVPageRouter,
  [normalize("upload-repayments-from-csv-file")]: KVPageRouter,
  [normalize("upload-expenses-from-csv-file")]: KVPageRouter,
  [normalize("upload-other-income-from-csv-file")]: KVPageRouter,
  [normalize("upload-savings-accounts-from-csv-file")]: KVPageRouter,
  [normalize("upload-savings-transactions-from-csv-file")]: KVPageRouter,
  [normalize("upload-loan-schedule-from-csv-file")]: KVPageRouter,
  [normalize("upload-inter-bank-transfer-from-csv-file")]: KVPageRouter,

  [normalize("other-income-types")]: KVPageRouter,
  [normalize("expense-types")]: KVPageRouter,
  [normalize("asset-management-types")]: KVPageRouter,

  [normalize("sms-credits")]: KVPageRouter,
  [normalize("sender-id")]: KVPageRouter,
  [normalize("sms-templates")]: KVPageRouter,
  [normalize("auto-send-sms")]: KVPageRouter,
  [normalize("collection-sheets-sms-template")]: KVPageRouter,

  [normalize("email-templates")]: KVPageRouter,
  [normalize("auto-send-emails")]: KVPageRouter,
  [normalize("collection-sheets-email-template")]: KVPageRouter,

  [normalize("savings-products")]: KVPageRouter,
  [normalize("savings-fees")]: KVPageRouter,
  [normalize("savings-transaction-types")]: KVPageRouter,

  [normalize("e-signature-settings")]: KVPageRouter,
  [normalize("email-templates-for-e-signature")]: KVPageRouter,

  [normalize("investor-products")]: KVPageRouter,
  [normalize("loan-investment-products")]: KVPageRouter,
  [normalize("investor-fees")]: KVPageRouter,
  [normalize("format-investor-report")]: KVPageRouter,
  [normalize("rename-investor-report")]: KVPageRouter,
  [normalize("invite-investors-settings")]: KVPageRouter,
  [normalize("investor-transaction-types")]: KVPageRouter,

  [normalize("settings")]: KVPageRouter, // accounting -> settings
  [normalize("bank-accounts")]: KVPageRouter,
  [normalize("taxes")]: KVPageRouter,
  [normalize("opening-balances")]: KVPageRouter,

  [normalize("backup-settings")]: KVPageRouter,
  [normalize("download-backups")]: KVPageRouter,
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

  const key = normalize(slug);
  const Component = registry[key];

  const title = key
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  if (!Component) return <ComingSoon title={title} />;

  return (
    <ErrorBoundary>
      <Suspense fallback={<Fallback />}>
        <Component />
      </Suspense>
    </ErrorBoundary>
  );
}
