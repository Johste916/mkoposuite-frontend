// src/pages/admin/AdminRouter.jsx
import React, { lazy, Suspense } from "react";
import { useParams, Navigate } from "react-router-dom";

/* ---- Admin pages (kept and wired) ---- */
const GeneralSettings         = lazy(() => import("./GeneralSettings"));
const EmailAccounts           = lazy(() => import("./EmailAccounts"));
const SmsSettings             = lazy(() => import("./SmsSettings"));
const PenaltySettings         = lazy(() => import("./PenaltySettings"));
const BorrowerSettings        = lazy(() => import("./BorrowerSettings"));
const BranchSettings          = lazy(() => import("./BranchSettings"));
const BulkSmsSettings         = lazy(() => import("./BulkSmsSettings"));
const DashboardSettings       = lazy(() => import("./DashboardSettings"));
const HolidaySettings         = lazy(() => import("./HolidaySettings"));
const IntegrationSettings     = lazy(() => import("./IntegrationSettings"));
const LoanCategories          = lazy(() => import("./LoanCategories"));
const LoanSectorSettings      = lazy(() => import("./LoanSectorSettings"));
const LoanSettings            = lazy(() => import("./LoanSettings"));
const PaymentSettings         = lazy(() => import("./PaymentSettings"));
const PayrollSettings         = lazy(() => import("./PayrollSettings"));
const SavingSettings          = lazy(() => import("./SavingSettings"));
const StaffEmailNotifications = lazy(() => import("./StaffEmailNotifications")); // GET/PUT /notifications
const AuditManagement         = lazy(() => import("./AuditManagement"));         // reads /activity

/* ---- Loan sub-pages ---- */
const LoanFees                = lazy(() => import("./LoanFees"));
const LoanRepaymentCycles     = lazy(() => import("./LoanRepaymentCycles"));
const LoanReminderSettings    = lazy(() => import("./LoanReminderSettings"));
const LoanTemplates           = lazy(() => import("./LoanTemplates"));
const LoanApprovals           = lazy(() => import("./LoanApprovals"));

/* ---- Module page ---- */
const LoanProducts            = lazy(() => import("../loans/LoanProducts"));

/* ---- Templates ---- */
const EmailTemplates          = lazy(() => import("./EmailTemplates"));
const SmsTemplates            = lazy(() => import("./SmsTemplates"));

/* ---- Communications ---- */
const Communications          = lazy(() => import("./Communications"));

/* ---- Tenants console (SysAdmin) ---- */
const TenantsAdmin            = lazy(() => import("./Tenants"));

/* ---- Backups ---- */
const BackupSettings          = lazy(() => import("./BackupSettings"));

const Fallback = () => <div className="p-6 text-sm text-gray-600">Loading…</div>;

/** Map /admin/:slug -> component */
const registry = {
  /* General */
  general: GeneralSettings,
  "general-settings": GeneralSettings,
  "integration-settings": IntegrationSettings,
  "payment-settings": PaymentSettings,
  "dashboard-settings": DashboardSettings,
  "backup-settings": BackupSettings,

  /* Email/SMS core */
  email: EmailAccounts,
  "email-accounts": EmailAccounts,
  "email-templates": EmailTemplates,
  "sms-settings": SmsSettings,
  "sms-templates": SmsTemplates,
  "bulk-sms-settings": BulkSmsSettings,

  /* Communications + Notifications */
  communications: Communications,
  "staff-email-notifications": StaffEmailNotifications, // uses /notifications

  /* Tenants (SysAdmin) */
  tenants: TenantsAdmin,
  organizations: TenantsAdmin,

  /* Borrowers / Branches */
  "borrower-settings": BorrowerSettings,
  "branch-settings": BranchSettings,
  "branch-holidays": HolidaySettings,
  "holiday-settings": HolidaySettings,

  /* Loans */
  "loan-products": LoanProducts,
  "loan-settings": LoanSettings,
  "penalty-settings": PenaltySettings,
  "loan-penalty-settings": PenaltySettings,
  "loan-fees": LoanFees,
  "loan-repayment-cycles": LoanRepaymentCycles,
  "loan-reminder-settings": LoanReminderSettings,
  "loan-templates-applications-agreements": LoanTemplates,
  "manage-loan-status-and-approvals": LoanApprovals,
  "loan-categories": LoanCategories,
  "loan-sector-settings": LoanSectorSettings,

  /* Savings */
  "saving-settings": SavingSettings,

  /* Activity / Audit */
  "audit-logs": AuditManagement,
};

const ComingSoon = ({ title }) => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
    <h1 className="text-xl font-semibold mb-1">{title}</h1>
    <p className="text-sm text-slate-600 dark:text-slate-400">
      This settings editor is not wired yet.
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
