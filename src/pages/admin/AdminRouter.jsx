// src/pages/admin/AdminRouter.jsx
import React, { lazy, Suspense } from "react";
import { useParams, Navigate } from "react-router-dom";

/* Admin pages */
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

const Fallback = () => <div className="p-6 text-sm text-gray-600">Loading…</div>;

/**
 * Registry maps slug -> Component.
 * Includes helpful aliases so menu labels like "General Settings", "Branches", etc. work out of the box.
 */
const registry = {
  // General
  "general": GeneralSettings,
  "general-settings": GeneralSettings, // alias for menu label

  // Email/SMS
  "email": EmailAccounts,
  "email-accounts": EmailAccounts,     // alias for menu label
  "email-settings": EmailAccounts,     // temporary alias
  "sms": SmsSettings,
  "sms-settings": SmsSettings,         // alias for menu label
  "bulk-sms-settings": BulkSmsSettings,

  // Existing controllers
  "loan-categories": LoanCategories,
  "loan-settings":   LoanSettings,
  "penalty-settings": PenaltySettings,
  "loan-penalty-settings": PenaltySettings, // alias for menu label
  "integration-settings": IntegrationSettings,
  "branch-settings": BranchSettings,
  "branches": BranchSettings,                 // alias for menu label
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
  "branch-holidays": HolidaySettings,         // alias for menu label
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
