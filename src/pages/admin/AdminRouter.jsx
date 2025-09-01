// src/pages/admin/AdminRouter.jsx
import React, { lazy, Suspense } from "react";
import { useParams, Navigate } from "react-router-dom";

/* ---- Admin pages (already working) ---- */
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
const HolidaySettings         = lazy(() => import("./HolidaySettings")); // real UI
const IncomeSourceSettings    = lazy(() => import("./IncomeSourceSettings"));
const IntegrationSettings     = lazy(() => import("./IntegrationSettings"));
const LoanCategories          = lazy(() => import("./LoanCategories"));
const LoanSectorSettings      = lazy(() => import("./LoanSectorSettings"));
const LoanSettings            = lazy(() => import("./LoanSettings"));
const PaymentSettings         = lazy(() => import("./PaymentSettings"));
const PayrollSettings         = lazy(() => import("./PayrollSettings"));
const SavingSettings          = lazy(() => import("./SavingSettings"));
const UserManagementSettings  = lazy(() => import("./UserManagementSettings"));

/* ---- Loan sub-pages ---- */
const LoanFees                = lazy(() => import("./LoanFees"));
const LoanRepaymentCycles     = lazy(() => import("./LoanRepaymentCycles"));
const LoanReminderSettings    = lazy(() => import("./LoanReminderSettings"));
const LoanTemplates           = lazy(() => import("./LoanTemplates"));
const LoanApprovals           = lazy(() => import("./LoanApprovals"));

/* ---- Manage Staff ---- */
const Staff                   = lazy(() => import("./Staff"));
const StaffRolesPermissions   = lazy(() => import("./StaffRolesPermissions"));
const StaffEmailNotifications = lazy(() => import("./StaffEmailNotifications"));
const AuditManagement         = lazy(() => import("./AuditManagement"));

/* ---- Module page ---- */
const LoanProducts            = lazy(() => import("../loans/LoanProducts"));

/* ---- Real CRUD wrappers (Types/Templates) ---- */
const ExpenseTypes            = lazy(() => import("./ExpenseTypes"));
const OtherIncomeTypes        = lazy(() => import("./OtherIncomeTypes"));
const AssetManagementTypes    = lazy(() => import("./AssetManagementTypes"));
const CollateralTypes         = lazy(() => import("./CollateralTypes"));
const PayrollTemplates        = lazy(() => import("./PayrollTemplates"));

const SavingsProducts         = lazy(() => import("./SavingsProducts"));
const SavingsFees             = lazy(() => import("./SavingsFees"));
const SavingsTransactionTypes = lazy(() => import("./SavingsTransactionTypes"));

const EmailTemplates          = lazy(() => import("./EmailTemplates"));
const SmsTemplates            = lazy(() => import("./SmsTemplates"));

const InvestorProducts        = lazy(() => import("./InvestorProducts"));
const LoanInvestmentProducts  = lazy(() => import("./LoanInvestmentProducts"));
const InvestorFees            = lazy(() => import("./InvestorFees"));
const InvestorTransactionTypes= lazy(() => import("./InvestorTransactionTypes"));

const LoanRepaymentMethods    = lazy(() => import("./LoanRepaymentMethods"));
const ManageCollectors        = lazy(() => import("./ManageCollectors"));

const Fallback = () => <div className="p-6 text-sm text-gray-600">Loading…</div>;

/** Maps URL slug -> Component */
const registry = {
  /* General */
  "general": GeneralSettings,
  "general-settings": GeneralSettings,

  /* Email/SMS */
  "email": EmailAccounts,
  "email-accounts": EmailAccounts,
  "email-settings": EmailAccounts,
  "sms": SmsSettings,
  "sms-settings": SmsSettings,
  "bulk-sms-settings": BulkSmsSettings,

  /* Existing controllers */
  "loan-categories": LoanCategories,
  "loan-settings": LoanSettings,
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

  /* Holidays (real CRUD, no JSON blobs) */
  "holiday-settings": HolidaySettings,
  "branch-holidays": HolidaySettings,

  /* Loans batch */
  "loan-fees": LoanFees,
  "loan-repayment-cycles": LoanRepaymentCycles,
  "loan-reminder-settings": LoanReminderSettings,
  "loan-templates-applications-agreements": LoanTemplates,
  "manage-loan-status-and-approvals": LoanApprovals,

  /* Manage Staff */
  "staff": Staff,
  "staff-roles-and-permissions": StaffRolesPermissions,
  "staff-email-notifications": StaffEmailNotifications,
  "audit-management": AuditManagement,

  /* Module */
  "loan-products": LoanProducts,

  /* Types/Templates CRUD (replaces old KV JSON screens) */
  "expense-types": ExpenseTypes,
  "other-income-types": OtherIncomeTypes,
  "asset-management-types": AssetManagementTypes,
  "collateral-types": CollateralTypes,
  "payroll-templates": PayrollTemplates,

  "savings-products": SavingsProducts,
  "savings-fees": SavingsFees,
  "savings-transaction-types": SavingsTransactionTypes,

  "email-templates": EmailTemplates,
  "sms-templates": SmsTemplates,

  "investor-products": InvestorProducts,
  "loan-investment-products": LoanInvestmentProducts,
  "investor-fees": InvestorFees,
  "investor-transaction-types": InvestorTransactionTypes,

  "loan-repayment-methods": LoanRepaymentMethods,
  "manage-collectors": ManageCollectors,
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
