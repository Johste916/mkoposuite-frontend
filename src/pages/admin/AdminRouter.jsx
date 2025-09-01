// src/pages/admin/AdminRouter.jsx
import React, { lazy, Suspense } from "react";
import { useParams, Navigate } from "react-router-dom";

// --- Admin pages (concrete editors) ---
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

// NEW: Loans
const LoanFees                = lazy(() => import("./LoanFees"));
const LoanRepaymentCycles     = lazy(() => import("./LoanRepaymentCycles"));
const LoanReminderSettings    = lazy(() => import("./LoanReminderSettings"));
const LoanTemplates           = lazy(() => import("./LoanTemplates"));
const LoanApprovals           = lazy(() => import("./LoanApprovals"));

// Staff
const Staff                   = lazy(() => import("./Staff"));
const StaffRolesPermissions   = lazy(() => import("./StaffRolesPermissions"));
const StaffEmailNotifications = lazy(() => import("./StaffEmailNotifications"));
const AuditManagement         = lazy(() => import("./AuditManagement"));

// Module page
const LoanProducts            = lazy(() => import("../loans/LoanProducts"));

// Smart fallback that still works with live data
const AdminPlaceholder        = lazy(() => import("./AdminPlaceholder"));

const Fallback = () => <div className="p-6 text-sm text-gray-600">Loading…</div>;

// Map readable slugs -> components
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

  // Core settings
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

  // Loans batch
  "loan-fees": LoanFees,
  "loan-repayment-cycles": LoanRepaymentCycles,
  "loan-reminder-settings": LoanReminderSettings,
  "loan-templates-applications-agreements": LoanTemplates,
  "manage-loan-status-and-approvals": LoanApprovals,

  // Staff batch
  "staff": Staff,
  "staff-roles-and-permissions": StaffRolesPermissions,
  "staff-email-notifications": StaffEmailNotifications,
  "audit-management": AuditManagement,

  // Modules
  "loan-products": LoanProducts,
};

// Normalize unknown slugs into a settings key for the smart placeholder
function slugToSettingsKey(s) {
  if (!s) return "";
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export default function AdminRouter() {
  const { slug } = useParams();
  if (!slug) return <Navigate to="/admin/general-settings" replace />;

  const Component = registry[slug];
  const title = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return (
    <Suspense fallback={<Fallback />}>
      {Component ? (
        <Component />
      ) : (
        // Fallback editor that persists JSON at /api/settings/:key so every page is at least functional
        <AdminPlaceholder keyProp={slugToSettingsKey(slug)} title={title} />
      )}
    </Suspense>
  );
}
