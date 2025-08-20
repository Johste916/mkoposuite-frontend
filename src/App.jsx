import { Routes, Route, Outlet, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";

// Auth/public
const Login = lazy(() => import("./pages/Login"));

// Shell
import ProtectedRoute from "./components/ProtectedRoute";
import RoleProtectedRoute from "./components/RoleProtectedRoute";
import SidebarLayout from "./components/SidebarLayout";

// Feature config provider (Admin-controlled)
import { FeatureConfigProvider } from "./context/FeatureConfigContext";

// Core
const Dashboard = lazy(() => import("./pages/Dashboard"));

// Borrowers
const Borrowers = lazy(() => import("./pages/Borrowers"));
const BorrowerDetails = lazy(() => import("./pages/BorrowerDetails"));
const AddBorrower = lazy(() => import("./pages/borrowers/AddBorrower"));
const KycQueue = lazy(() => import("./pages/borrowers/KycQueue"));
const Blacklist = lazy(() => import("./pages/borrowers/Blacklist"));
const BorrowerImports = lazy(() => import("./pages/borrowers/Imports"));
const BorrowerReports = lazy(() => import("./pages/borrowers/Reports"));

// Groups
const BorrowerGroups = lazy(() => import("./pages/borrowers/groups/Groups"));
const AddGroup = lazy(() => import("./pages/borrowers/groups/AddGroup"));
const GroupDetails = lazy(() => import("./pages/borrowers/groups/GroupDetails"));
const GroupImports = lazy(() => import("./pages/borrowers/groups/GroupImports"));
const GroupReports = lazy(() => import("./pages/borrowers/groups/GroupReports"));

// Loans
const Loans = lazy(() => import("./pages/Loans"));
const LoanDetails = lazy(() => import("./pages/LoanDetails"));
const LoanApplications = lazy(() => import("./pages/loans/LoanApplications"));
const LoanStatusList = lazy(() => import("./pages/loans/LoanStatusList"));
const DisbursementQueue = lazy(() => import("./pages/loans/DisbursementQueue"));
const LoanProducts = lazy(() => import("./pages/loans/LoanProducts"));
const LoanSchedulePage = lazy(() => import("./pages/loans/LoanSchedulePage"));
const LoanReports = lazy(() => import("./pages/loans/LoanReports"));
const DisburseLoan = lazy(() => import("./pages/loans/DisburseLoan")); // <-- NEW

// Repayments
const Repayments = lazy(() => import("./pages/Repayments"));
const ManualRepayment = lazy(() => import("./pages/repayments/ManualRepayment"));
const RepaymentReceipts = lazy(() => import("./pages/repayments/RepaymentReceipts"));

// Misc Existing (legacy)
const Reports = lazy(() => import("./pages/Reports"));
const Disbursements = lazy(() => import("./pages/Disbursements"));
const Sms = lazy(() => import("./pages/Sms"));
const Bank = lazy(() => import("./pages/Bank"));

// User management
const Users = lazy(() => import("./pages/user-management/Users"));
const Roles = lazy(() => import("./pages/user-management/Roles"));
const Permissions = lazy(() => import("./pages/user-management/Permissions"));

const Branches = lazy(() => import("./pages/Branches"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Admin hub + account
const Admin = lazy(() => import("./pages/Admin"));
const AdminRouter = lazy(() => import("./pages/admin/AdminRouter"));
const AccountSettings = lazy(() => import("./pages/account/AccountSettings"));

// NEW MODULES
const CollateralList = lazy(() => import("./pages/collateral/CollateralList"));
const Assets = lazy(() => import("./pages/assets/Assets"));
const CollectionSheets = lazy(() => import("./pages/collections/CollectionSheets"));
const SavingsTransactions = lazy(() => import("./pages/savings/SavingsTransactions"));
const Investors = lazy(() => import("./pages/investors/Investors"));
const ESignatures = lazy(() => import("./pages/esignatures/ESignatures"));
const Payroll = lazy(() => import("./pages/payroll/Payroll"));
const Expenses = lazy(() => import("./pages/expenses/Expenses"));
const OtherIncome = lazy(() => import("./pages/other-income/OtherIncome"));

// ACCOUNTING
const ChartOfAccounts = lazy(() => import("./pages/accounting/ChartOfAccounts"));
const TrialBalance = lazy(() => import("./pages/accounting/TrialBalance"));
const ProfitLoss = lazy(() => import("./pages/accounting/ProfitLoss"));
const Cashflow = lazy(() => import("./pages/accounting/Cashflow"));

const Fallback = () => <div className="p-6 text-sm text-gray-600">Loading…</div>;

// Tiny inline placeholder
const Stub = ({ title = "Coming soon" }) => (
  <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4">
    <h1 className="text-lg font-semibold">{title}</h1>
    <p className="text-sm text-slate-500 mt-1">This screen is scaffolded and will be wired up next.</p>
  </div>
);

function App() {
  return (
    <Suspense fallback={<Fallback />}>
      <FeatureConfigProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected shell */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <SidebarLayout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard */}
            <Route index element={<Dashboard />} />

            {/* ===== Admin hub ===== */}
            <Route
              path="admin"
              element={
                <RoleProtectedRoute allow={["admin", "director"]}>
                  <Outlet />
                </RoleProtectedRoute>
              }
            >
              <Route index element={<Admin />} />
              <Route path=":slug" element={<AdminRouter />} />
            </Route>

            {/* Account quick panel */}
            <Route path="account/settings" element={<AccountSettings />} />

            {/* Settings */}
            <Route path="settings/billing" element={<Stub title="Billing Settings" />} />
            <Route path="settings/change-password" element={<AccountSettings />} />
            <Route path="settings/2fa" element={<Stub title="Two-Factor Authentication" />} />

            {/* Borrowers */}
            <Route path="borrowers" element={<Borrowers />} />
            <Route path="borrowers/add" element={<AddBorrower />} />
            <Route path="borrowers/kyc" element={<KycQueue />} />
            <Route path="borrowers/blacklist" element={<Blacklist />} />
            <Route path="borrowers/imports" element={<BorrowerImports />} />
            <Route path="borrowers/reports" element={<BorrowerReports />} />
            <Route path="borrowers/:id" element={<BorrowerDetails />} />
            <Route path="borrowers/sms" element={<Sms />} />
            <Route path="borrowers/email" element={<Stub title="Send Email to Borrowers" />} />
            <Route path="borrowers/invite" element={<Stub title="Invite Borrowers" />} />

            {/* Groups */}
            <Route path="borrowers/groups" element={<BorrowerGroups />} />
            <Route path="borrowers/groups/add" element={<AddGroup />} />
            <Route path="borrowers/groups/:groupId" element={<GroupDetails />} />
            <Route path="borrowers/groups/imports" element={<GroupImports />} />
            <Route path="borrowers/groups/reports" element={<GroupReports />} />

            {/* Loans */}
            <Route path="loans" element={<Loans />} />
            <Route path="loans/applications" element={<LoanApplications />} />
            <Route path="loans/add" element={<Navigate to="/loans/applications" replace />} />
            <Route path="loans/status/:status" element={<LoanStatusList />} />
            <Route path="loans/disbursement-queue" element={<DisbursementQueue />} />
            <Route path="loans/products" element={<LoanProducts />} />
            <Route path="loans/schedule" element={<LoanSchedulePage />} />
            <Route path="loans/reports" element={<LoanReports />} />
            <Route path="loans/:id" element={<LoanDetails />} />
            <Route path="loans/:id/disburse" element={<DisburseLoan />} /> {/* NEW */}

            {/* Loans aliases */}
            <Route path="loans/due" element={<Navigate to="/loans/status/due" replace />} />
            <Route path="loans/missed" element={<Navigate to="/loans/status/missed" replace />} />
            <Route path="loans/arrears" element={<Navigate to="/loans/status/arrears" replace />} />
            <Route path="loans/no-repayments" element={<Navigate to="/loans/status/no-repayments" replace />} />
            <Route path="loans/past-maturity" element={<Navigate to="/loans/status/past-maturity" replace />} />
            <Route path="loans/principal-outstanding" element={<Navigate to="/loans/status/principal-outstanding" replace />} />
            <Route path="loans/1-month-late" element={<Navigate to="/loans/status/1-month-late" replace />} />
            <Route path="loans/3-months-late" element={<Navigate to="/loans/status/3-months-late" replace />} />
            <Route path="loans/calculator" element={<LoanSchedulePage />} />
            <Route path="loans/guarantors" element={<Stub title="Guarantors" />} />
            <Route path="loans/comments" element={<Stub title="Loan Comments" />} />
            <Route path="loans/approve" element={<Stub title="Approve Loans" />} />

            {/* Repayments */}
            <Route path="repayments" element={<Repayments />} />
            <Route path="repayments/new" element={<ManualRepayment />} />
            <Route path="repayments/receipts" element={<RepaymentReceipts />} />
            <Route path="repayments/bulk" element={<Stub title="Add Bulk Repayments" />} />
            <Route path="repayments/csv" element={<Stub title="Upload Repayments CSV" />} />
            <Route path="repayments/charts" element={<Stub title="Repayment Charts" />} />
            <Route path="repayments/approve" element={<Stub title="Approve Repayments" />} />

            {/* Collateral */}
            <Route path="collateral" element={<CollateralList />} />

            {/* Collection Sheets */}
            <Route path="collections" element={<CollectionSheets />} />
            <Route path="collections/daily" element={<CollectionSheets />} />
            <Route path="collections/missed" element={<CollectionSheets />} />
            <Route path="collections/past-maturity" element={<CollectionSheets />} />
            <Route path="collections/sms" element={<Sms />} />
            <Route path="collections/email" element={<Stub title="Send Collection Emails" />} />

            {/* Savings */}
            <Route path="savings" element={<Navigate to="/savings-transactions" replace />} />
            <Route path="savings/add" element={<Stub title="Add Savings Account" />} />
            <Route path="savings/charts" element={<Stub title="Savings Charts" />} />
            <Route path="savings/report" element={<Stub title="Savings Report" />} />
            <Route path="savings/products" element={<Stub title="Savings Products Report" />} />
            <Route path="savings/fees" element={<Stub title="Savings Fee Report" />} />
            <Route path="savings/cash-safe" element={<Stub title="Cash Safe Management" />} />

            {/* Savings Transactions */}
            <Route path="savings-transactions" element={<SavingsTransactions />} />
            <Route path="savings-transactions/bulk" element={<Stub title="Add Bulk Savings Transactions" />} />
            <Route path="savings-transactions/csv" element={<Stub title="Upload Savings CSV" />} />
            <Route path="savings-transactions/staff-report" element={<Stub title="Staff Transactions Report" />} />
            <Route path="savings-transactions/approve" element={<Stub title="Approve Savings Transactions" />} />

            {/* Investors */}
            <Route path="investors" element={<Investors />} />
            <Route path="investors/add" element={<Stub title="Add Investor" />} />
            <Route path="investors/sms" element={<Sms />} />
            <Route path="investors/email" element={<Stub title="Send Email to Investors" />} />
            <Route path="investors/invite" element={<Stub title="Invite Investors" />} />

            {/* E-Signatures */}
            <Route path="esignatures" element={<ESignatures />} />

            {/* Payroll */}
            <Route path="payroll" element={<Payroll />} />
            <Route path="payroll/add" element={<Stub title="Add Payroll" />} />
            <Route path="payroll/report" element={<Stub title="Payroll Report" />} />

            {/* Expenses */}
            <Route path="expenses" element={<Expenses />} />
            <Route path="expenses/add" element={<Stub title="Add Expense" />} />
            <Route path="expenses/csv" element={<Stub title="Upload Expenses CSV" />} />

            {/* Other Income */}
            <Route path="other-income" element={<OtherIncome />} />
            <Route path="other-income/add" element={<Stub title="Add Other Income" />} />
            <Route path="other-income/csv" element={<Stub title="Upload Other Income CSV" />} />

            {/* Asset Management */}
            <Route path="assets" element={<Assets />} />
            <Route path="assets/add" element={<Stub title="Add Asset" />} />

            {/* ACCOUNTING */}
            <Route path="accounting/chart-of-accounts" element={<ChartOfAccounts />} />
            <Route path="accounting/trial-balance" element={<TrialBalance />} />
            <Route path="accounting/profit-loss" element={<ProfitLoss />} />
            <Route path="accounting/cashflow" element={<Cashflow />} />

            {/* User Management */}
            <Route path="user-management" element={<Outlet />}>
              <Route path="users" element={<Users />} />
              <Route path="roles" element={<Roles />} />
              <Route path="permissions" element={<Permissions />} />
            </Route>

            {/* Branches */}
            <Route path="branches" element={<Branches />} />

            {/* Reports */}
            <Route path="reports" element={<Reports />} />
            <Route path="reports/borrowers" element={<Reports />} />
            <Route path="reports/loans" element={<Reports />} />
            <Route path="reports/arrears-aging" element={<Reports />} />
            <Route path="reports/collections" element={<Reports />} />
            <Route path="reports/collector" element={<Reports />} />
            <Route path="reports/deferred-income" element={<Reports />} />
            <Route path="reports/deferred-income-monthly" element={<Reports />} />
            <Route path="reports/pro-rata" element={<Reports />} />
            <Route path="reports/disbursement" element={<Reports />} />
            <Route path="reports/fees" element={<Reports />} />
            <Route path="reports/loan-officer" element={<Reports />} />
            <Route path="reports/loan-products" element={<Reports />} />
            <Route path="reports/mfrs" element={<Reports />} />
            <Route path="reports/daily" element={<Reports />} />
            <Route path="reports/monthly" element={<Reports />} />
            <Route path="reports/outstanding" element={<Reports />} />
            <Route path="reports/par" element={<Reports />} />
            <Route path="reports/at-a-glance" element={<Reports />} />
            <Route path="reports/all" element={<Reports />} />

            {/* Legacy */}
            <Route path="disbursements" element={<Disbursements />} />
            <Route path="bank" element={<Bank />} />

            {/* 404 inside shell */}
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* Hard 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </FeatureConfigProvider>
    </Suspense>
  );
}

export default App;
