// src/pages/admin/AdminRouter.jsx
import React, { lazy, Suspense } from "react";
import { useParams, Navigate } from "react-router-dom";

/* Admin pages (tailored) */
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

/* Generic key-based settings editor (nice JSON UI, no placeholder text) */
const KeySettingsPage         = lazy(() => import("./KeySettingsPage"));

const Fallback = () => <div className="p-6 text-sm text-gray-600">Loading…</div>;

/** tiny factory to pass props into lazy component */
const K = (title, keyName, defaults = {}) =>
  function KeyWrapper() {
    return <KeySettingsPage title={title} keyName={keyName} defaults={defaults} />;
  };

/**
 * Registry maps slug -> Component.
 * If an item is pure JSON config, map it with K(title, keyName).
 */
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

  /* ----------------- JSON-backed pages (via /api/settings/:key) ----------------- */
  // Borrowers
  "format-borrower-reports": K("Format Borrower Reports", "format-borrower-reports"),
  "rename-borrower-reports": K("Rename Borrower Reports", "rename-borrower-reports"),
  "rename-collection-sheet-headings": K("Rename Collection Sheet Headings", "rename-collection-sheet-headings"),
  "manage-loan-officers": K("Manage Loan Officers", "manage-loan-officers"),
  "invite-borrowers-settings": K("Invite Borrowers Settings", "invite-borrowers-settings"),
  "bulk-update-borrowers-with-loan-officers": K("Bulk Update Borrowers With Loan Officers", "bulk-update-borrowers-with-loan-officers"),
  "bulk-move-borrowers-to-another-branch": K("Bulk Move Borrowers to Another Branch", "bulk-move-borrowers-to-another-branch"),
  "modify-add-borrower-fields": K("Modify Add Borrower Fields", "modify-add-borrower-fields"),

  // Repayments
  "loan-repayment-methods": K("Loan Repayment Methods", "loan-repayment-methods"),
  "manage-collectors": K("Manage Collectors", "manage-collectors"),

  // Collateral
  "collateral-types": K("Collateral Types", "collateral-types"),

  // Payroll
  "payroll-templates": K("Payroll Templates", "payroll-templates"),

  // Bulk Upload
  "upload-borrowers-from-csv-file": K("Upload Borrowers from CSV file", "upload-borrowers-csv"),
  "upload-loans-from-csv-file": K("Upload Loans from CSV file", "upload-loans-csv"),
  "upload-repayments-from-csv-file": K("Upload Repayments from CSV file", "upload-repayments-csv"),
  "upload-expenses-from-csv-file": K("Upload Expenses from CSV file", "upload-expenses-csv"),
  "upload-other-income-from-csv-file": K("Upload Other Income from CSV file", "upload-other-income-csv"),
  "upload-savings-accounts-from-csv-file": K("Upload Savings Accounts from CSV file", "upload-savings-accounts-csv"),
  "upload-savings-transactions-from-csv-file": K("Upload Savings Transactions from CSV file", "upload-savings-transactions-csv"),
  "upload-loan-schedule-from-csv-file": K("Upload Loan Schedule from CSV file", "upload-loan-schedule-csv"),
  "upload-inter-bank-transfer-from-csv-file": K("Upload Inter Bank Transfer from CSV file", "upload-interbank-transfer-csv"),

  // Other Income / Expenses / Assets
  "other-income-types": K("Other Income Types", "other-income-types"),
  "expense-types": K("Expense Types", "expense-types"),
  "asset-management-types": K("Asset Management Types", "asset-management-types"),

  // SMS
  "sms-credits": K("SMS Credits", "sms-credits"),
  "sender-id": K("Sender ID", "sms-sender-id"),
  "sms-templates": K("SMS Templates", "sms-templates"),
  "auto-send-sms": K("Auto Send SMS", "auto-send-sms"),
  "collection-sheets-sms-template": K("Collection Sheets - SMS Template", "collection-sheets-sms-template"),
  "sms-logs": K("SMS Logs", "sms-logs"),

  // Email
  "email-templates": K("Email Templates", "email-templates"),
  "auto-send-emails": K("Auto Send Emails", "auto-send-emails"),
  "collection-sheets-email-template": K("Collection Sheets - Email Template", "collection-sheets-email-template"),
  "email-logs": K("Email Logs", "email-logs"),

  // Savings
  "savings-products": K("Savings Products", "savings-products"),
  "savings-fees": K("Savings Fees", "savings-fees"),
  "savings-transaction-types": K("Savings Transaction Types", "savings-transaction-types"),

  // E-Signature
  "e-signature-settings": K("E-Signature Settings", "esignature-settings"),
  "email-templates-for-e-signature": K("Email Templates for E-Signature", "esignature-email-templates"),
  "e-signature-email-logs": K("E-Signature Email Logs", "esignature-email-logs"),

  // Investors
  "investor-products": K("Investor Products", "investor-products"),
  "loan-investment-products": K("Loan Investment Products", "loan-investment-products"),
  "investor-fees": K("Investor Fees", "investor-fees"),
  "format-investor-report": K("Format Investor Report", "format-investor-report"),
  "rename-investor-report": K("Rename Investor Report", "rename-investor-report"),
  "invite-investors-settings": K("Invite Investors Settings", "invite-investors-settings"),
  "investor-transaction-types": K("Investor Transaction Types", "investor-transaction-types"),

  // Accounting
  "settings": K("Accounting Settings", "accounting-settings"),
  "bank-accounts": K("Bank Accounts", "accounting-bank-accounts"),
  "taxes": K("Taxes", "accounting-taxes"),
  "opening-balances": K("Opening Balances", "accounting-opening-balances"),

  // Backups
  "backup-settings": K("Backup Settings", "backup-settings"),
  "download-backups": K("Download Backups", "backup-downloads"),
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
