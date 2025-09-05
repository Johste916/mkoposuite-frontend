// src/App.jsx
import { Routes, Route, Outlet, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";

// Auth/public
const Login = lazy(() => import("./pages/Login"));

// Shell
import ProtectedRoute from "./components/ProtectedRoute";
import RoleProtectedRoute from "./components/RoleProtectedRoute";
import SidebarLayout from "./components/SidebarLayout";

// Feature flags + toasts
import { FeatureConfigProvider } from "./context/FeatureConfigContext";
import { ToastProvider } from "./components/common/ToastProvider";

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
const DisburseLoan = lazy(() => import("./pages/loans/DisburseLoan"));
const LoanReview = lazy(() => import("./pages/loans/LoanReview"));

// Repayments
const Repayments = lazy(() => import("./pages/Repayments"));
const ManualRepayment = lazy(() => import("./pages/repayments/ManualRepayment"));
const RepaymentReceipts = lazy(() => import("./pages/repayments/RepaymentReceipts"));
const UploadRepaymentsCSV = lazy(() => import("./pages/repayments/UploadRepaymentsCSV"));
const BulkRepayments = lazy(() => import("./pages/repayments/BulkRepayments"));
const RepaymentCharts = lazy(() => import("./pages/repayments/RepaymentCharts"));
const ApproveRepayments = lazy(() => import("./pages/repayments/ApproveRepayments"));

// Misc (legacy/back-compat)
const Disbursements = lazy(() => import("./pages/Disbursements"));
const Sms = lazy(() => import("./pages/Sms"));
const Bank = lazy(() => import("./pages/Bank"));

// User management
const Users = lazy(() => import("./pages/user-management/Users"));
const Roles = lazy(() => import("./pages/user-management/Roles"));
const Permissions = lazy(() => import("./pages/user-management/Permissions"));

const Branches = lazy(() => import("./pages/Branches"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Admin & account hubs
const Admin = lazy(() => import("./pages/Admin"));
const AdminRouter = lazy(() => import("./pages/admin/AdminRouter"));
const AccountSettings = lazy(() => import("./pages/account/AccountSettings"));
const Organization = lazy(() => import("./pages/account/Organization"));
const Profile = lazy(() => import("./pages/account/Profile")); // exists or load-on-demand

// NEW MODULES
const CollateralList = lazy(() => import("./pages/collateral/CollateralList"));
const CollateralForm = lazy(() => import("./pages/collateral/CollateralForm"));
const Assets = lazy(() => import("./pages/assets/Assets"));

const CollectionSheets = lazy(() => import("./pages/collections/CollectionSheets"));
const CollectionSheetCreate = lazy(() => import("./pages/collections/CollectionSheetCreate"));
const CollectionSheetEdit = lazy(() => import("./pages/collections/CollectionSheetEdit"));

// Savings
const Savings = lazy(() => import("./pages/Savings"));
const SavingsTransactions = lazy(() => import("./pages/savings/SavingsTransactions"));
const UploadSavingsCSV = lazy(() => import("./pages/savings/UploadCSV"));
const ApproveSavingsTx = lazy(() => import("./pages/savings/ApproveTransactions"));

// Biz ops
const Investors = lazy(() => import("./pages/investors/Investors"));
const AddInvestor = lazy(() => import("./pages/investors/AddInvestor"));
const InvestorDetails = lazy(() => import("./pages/investors/InvestorDetails"));
const ESignatures = lazy(() => import("./pages/esignatures/ESignatures"));
const Expenses = lazy(() => import("./pages/expenses/Expenses"));
const AddExpense = lazy(() => import("./pages/expenses/AddExpense"));
const UploadExpensesCSV = lazy(() => import("./pages/expenses/UploadCSV"));
const OtherIncome = lazy(() => import("./pages/other-income/OtherIncome"));

// HR & Payroll
const Payroll = lazy(() => import("./pages/payroll/Payroll"));
const AddPayroll = lazy(() => import("./pages/payroll/AddPayroll"));
const PayrollReport = lazy(() => import("./pages/payroll/PayrollReport"));
const HREmployees = lazy(() => import("./pages/hr/Employees"));
const HRAttendance = lazy(() => import("./pages/hr/Attendance"));
const HRLeave = lazy(() => import("./pages/hr/Leave"));
const HRContracts = lazy(() => import("./pages/hr/Contracts"));

// Accounting
const ChartOfAccounts = lazy(() => import("./pages/accounting/ChartOfAccounts"));
const TrialBalance = lazy(() => import("./pages/accounting/TrialBalance"));
const ProfitLoss = lazy(() => import("./pages/accounting/ProfitLoss"));
const Cashflow = lazy(() => import("./pages/accounting/Cashflow"));
const ManualJournal = lazy(() => import("./pages/accounting/ManualJournal"));

// Canonical account pages
const Billing = lazy(() => import("./pages/account/Billing"));
const ChangePassword = lazy(() => import("./pages/account/ChangePassword"));
const TwoFactor = lazy(() => import("./pages/account/TwoFactor"));

// Reports — ✅ add the lazy imports you were missing
const BorrowersReport = lazy(() => import("./pages/reports/BorrowersReport"));
const LoanReport = lazy(() => import("./pages/reports/LoanReport"));
const ArrearsAging = lazy(() => import("./pages/reports/ArrearsAging"));
const CollectionsReport = lazy(() => import("./pages/reports/CollectionsReport"));
const CollectorReport = lazy(() => import("./pages/reports/CollectorReport"));
const DeferredIncome = lazy(() => import("./pages/reports/DeferredIncome"));
const DeferredIncomeMonthly = lazy(() => import("./pages/reports/DeferredIncomeMonthly"));
const ProRataCollections = lazy(() => import("./pages/reports/ProRataCollections"));
const DisbursementReport = lazy(() => import("./pages/reports/DisbursementReport"));
const FeesReport = lazy(() => import("./pages/reports/FeesReport"));
const LoanOfficerReport = lazy(() => import("./pages/reports/LoanOfficerReport"));
const LoanProductsReport = lazy(() => import("./pages/reports/LoanProductsReport"));
const MfrsRatios = lazy(() => import("./pages/reports/MfrsRatios"));
const DailyReport = lazy(() => import("./pages/reports/DailyReport"));
const MonthlyReport = lazy(() => import("./pages/reports/MonthlyReport"));
const OutstandingReport = lazy(() => import("./pages/reports/OutstandingReport"));
const ParReport = lazy(() => import("./pages/reports/ParReport"));
const AtAGlance = lazy(() => import("./pages/reports/AtAGlance"));
const AllEntries = lazy(() => import("./pages/reports/AllEntries"));

const Fallback = () => (
  <div className="p-6 text-sm text-slate-700 dark:text-slate-300">Loading…</div>
);

const Forbidden = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-rose-600 dark:text-rose-300">403 — Forbidden</h1>
    <p className="mt-2 text-slate-700 dark:text-slate-300">You don’t have permission to access this area.</p>
  </div>
);

function App() {
  return (
    <Suspense fallback={<Fallback />}>
      <ToastProvider>
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

              {/* Admin hub */}
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

              {/* Account hub */}
              <Route path="account/settings" element={<AccountSettings />} />
              <Route path="account/profile" element={<Profile />} />
              <Route path="account/organization" element={<Organization />} />

              {/* Aliases */}
              <Route path="profile" element={<Navigate to="/account/profile" replace />} />
              <Route path="settings" element={<Navigate to="/account/settings" replace />} />
              <Route path="settings/profile" element={<Navigate to="/account/profile" replace />} />
              <Route path="account" element={<Navigate to="/account/settings" replace />} />
              <Route path="organization" element={<Navigate to="/account/organization" replace />} />
              <Route path="org" element={<Navigate to="/account/organization" replace />} />

              {/* Canonical account */}
              <Route path="billing" element={<Billing />} />
              <Route path="change-password" element={<ChangePassword />} />
              <Route path="2fa" element={<TwoFactor />} />

              {/* Back-compat for /settings/* */}
              <Route path="settings/billing" element={<Navigate to="/billing" replace />} />
              <Route path="settings/change-password" element={<Navigate to="/change-password" replace />} />
              <Route path="settings/2fa" element={<Navigate to="/2fa" replace />} />

              {/* Borrowers */}
              <Route path="borrowers" element={<Borrowers />} />
              <Route path="borrowers/add" element={<AddBorrower />} />
              <Route path="borrowers/kyc" element={<KycQueue />} />
              <Route path="borrowers/blacklist" element={<Blacklist />} />
              <Route path="borrowers/imports" element={<BorrowerImports />} />
              <Route path="borrowers/reports" element={<BorrowerReports />} />
              <Route path="borrowers/:id" element={<BorrowerDetails />} />
              <Route path="borrowers/sms" element={<Sms />} />
              <Route path="borrowers/email" element={<div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-4">Send Email to Borrowers</div>} />
              <Route path="borrowers/invite" element={<div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-4">Invite Borrowers</div>} />

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
              <Route
                path="loans/review-queue"
                element={
                  <RoleProtectedRoute allow={["branch_manager", "compliance", "admin", "director"]}>
                    <LoanReview />
                  </RoleProtectedRoute>
                }
              />
              <Route path="loans/disbursement-queue" element={<DisbursementQueue />} />
              <Route
                path="loans/products"
                element={
                  <RoleProtectedRoute allow={["admin", "director"]}>
                    <LoanProducts />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="loans/calculator"
                element={
                  <RoleProtectedRoute allow={["admin", "director"]}>
                    <LoanSchedulePage />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="loans/schedule"
                element={
                  <RoleProtectedRoute allow={["branch_manager", "admin", "director"]}>
                    <LoanSchedulePage />
                  </RoleProtectedRoute>
                }
              />
              <Route path="loans/:id" element={<LoanDetails />} />
              <Route path="loans/:id/disburse" element={<DisburseLoan />} />
              {/* Loan aliases */}
              <Route path="loans/due" element={<Navigate to="/loans/status/due" replace />} />
              <Route path="loans/missed" element={<Navigate to="/loans/status/missed" replace />} />
              <Route path="loans/arrears" element={<Navigate to="/loans/status/arrears" replace />} />
              <Route path="loans/no-repayments" element={<Navigate to="/loans/status/no-repayments" replace />} />
              <Route path="loans/past-maturity" element={<Navigate to="/loans/status/past-maturity" replace />} />
              <Route path="loans/principal-outstanding" element={<Navigate to="/loans/status/principal-outstanding" replace />} />
              <Route path="loans/1-month-late" element={<Navigate to="/loans/status/1-month-late" replace />} />
              <Route path="loans/3-months-late" element={<Navigate to="/loans/status/3-months-late" replace />} />

              {/* Repayments */}
              <Route path="repayments" element={<Repayments />} />
              <Route path="repayments/new" element={<ManualRepayment />} />
              <Route path="repayments/receipts" element={<RepaymentReceipts />} />
              <Route path="repayments/bulk" element={<BulkRepayments />} />
              <Route path="repayments/csv" element={<UploadRepaymentsCSV />} />
              <Route path="repayments/charts" element={<RepaymentCharts />} />
              <Route path="repayments/approve" element={<ApproveRepayments />} />

              {/* Collateral */}
              <Route path="collateral" element={<CollateralList />} />
              <Route
                path="collateral/new"
                element={
                  <RoleProtectedRoute allow={["admin", "branch_manager", "director"]}>
                    <CollateralForm mode="create" />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="collateral/:id/edit"
                element={
                  <RoleProtectedRoute allow={["admin", "branch_manager", "director"]}>
                    <CollateralForm mode="edit" />
                  </RoleProtectedRoute>
                }
              />

              {/* Collection Sheets */}
              <Route path="collections" element={<CollectionSheets />} />
              <Route
                path="collections/new"
                element={
                  <RoleProtectedRoute allow={["admin", "branch_manager", "director"]}>
                    <CollectionSheetCreate />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="collections/:id/edit"
                element={
                  <RoleProtectedRoute allow={["admin", "branch_manager", "director"]}>
                    <CollectionSheetEdit />
                  </RoleProtectedRoute>
                }
              />
              <Route path="collections/daily" element={<CollectionSheets />} />
              <Route path="collections/missed" element={<CollectionSheets />} />
              <Route path="collections/past-maturity" element={<CollectionSheets />} />
              <Route path="collections/sms" element={<Sms />} />
              <Route path="collections/email" element={<div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-4">Send Collection Emails</div>} />

              {/* Savings */}
              <Route path="savings" element={<Savings />} />
              <Route path="savings/report" element={<Savings />} />
              <Route path="savings/transactions" element={<SavingsTransactions />} />
              <Route path="savings/transactions/csv" element={<UploadSavingsCSV />} />
              <Route path="savings/transactions/approve" element={<ApproveSavingsTx />} />
              <Route path="savings-transactions" element={<Navigate to="/savings/transactions" replace />} />
              <Route path="savings-transactions/*" element={<Navigate to="/savings/transactions" replace />} />

              {/* Investors */}
              <Route path="investors" element={<Investors />} />
              <Route path="investors/add" element={<AddInvestor />} />
              <Route path="investors/:id" element={<InvestorDetails />} />

              {/* E-Signatures */}
              <Route path="esignatures" element={<ESignatures />} />

              {/* HR & Payroll */}
              <Route path="payroll" element={<Payroll />} />
              <Route
                path="payroll/add"
                element={
                  <RoleProtectedRoute allow={["admin", "director", "payroll_admin"]}>
                    <AddPayroll />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="payroll/report"
                element={
                  <RoleProtectedRoute allow={["admin", "director", "payroll_admin"]}>
                    <PayrollReport />
                  </RoleProtectedRoute>
                }
              />
              <Route path="hr" element={<Navigate to="/hr/employees" replace />} />
              <Route
                path="hr/employees"
                element={
                  <RoleProtectedRoute allow={["admin", "director", "payroll_admin", "branch_manager"]}>
                    <HREmployees />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="hr/attendance"
                element={
                  <RoleProtectedRoute allow={["admin", "director", "payroll_admin", "branch_manager"]}>
                    <HRAttendance />
                  </RoleProtectedRoute>
                }
              />
              <Route path="hr/leave" element={<HRLeave />} />
              <Route
                path="hr/contracts"
                element={
                  <RoleProtectedRoute allow={["admin", "director", "payroll_admin", "branch_manager"]}>
                    <HRContracts />
                  </RoleProtectedRoute>
                }
              />

              {/* Expenses */}
              <Route path="expenses" element={<Expenses />} />
              <Route
                path="expenses/add"
                element={
                  <RoleProtectedRoute allow={["admin", "director", "accountant", "branch_manager"]}>
                    <AddExpense />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="expenses/csv"
                element={
                  <RoleProtectedRoute allow={["admin", "director", "accountant", "branch_manager"]}>
                    <UploadExpensesCSV />
                  </RoleProtectedRoute>
                }
              />

              {/* Other Income */}
              <Route path="other-income" element={<OtherIncome />} />
              <Route
                path="other-income/add"
                element={
                  <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-4">
                    Add Other Income
                  </div>
                }
              />
              <Route
                path="other-income/csv"
                element={
                  <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-4">
                    Upload Other Income CSV
                  </div>
                }
              />

              {/* Assets */}
              <Route path="assets" element={<Assets />} />
              <Route
                path="assets/add"
                element={
                  <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-4">
                    Add Asset
                  </div>
                }
              />

              {/* Accounting (grouped) */}
              <Route
                path="accounting"
                element={
                  <RoleProtectedRoute allow={["admin", "director", "accountant"]}>
                    <Outlet />
                  </RoleProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/accounting/trial-balance" replace />} />
                <Route path="chart-of-accounts" element={<ChartOfAccounts />} />
                <Route path="trial-balance" element={<TrialBalance />} />
                <Route path="profit-loss" element={<ProfitLoss />} />
                <Route path="cashflow" element={<Cashflow />} />
                <Route path="manual-journal" element={<ManualJournal />} />
                <Route path="coa" element={<Navigate to="/accounting/chart-of-accounts" replace />} />
                <Route path="tb" element={<Navigate to="/accounting/trial-balance" replace />} />
                <Route path="pnl" element={<Navigate to="/accounting/profit-loss" replace />} />
              </Route>

              {/* Reports */}
              <Route path="reports" element={<Outlet />}>
                {/* safer index: redirect to a known child route */}
                <Route index element={<Navigate to="/reports/borrowers" replace />} />
                <Route path="borrowers" element={<BorrowersReport />} />
                <Route path="loans" element={<LoanReport />} />
                <Route path="arrears-aging" element={<ArrearsAging />} />
                <Route path="collections" element={<CollectionsReport />} />
                <Route path="collector" element={<CollectorReport />} />
                <Route path="deferred-income" element={<DeferredIncome />} />
                <Route path="deferred-income-monthly" element={<DeferredIncomeMonthly />} />
                <Route path="pro-rata" element={<ProRataCollections />} />
                <Route path="disbursement" element={<DisbursementReport />} />
                <Route path="fees" element={<FeesReport />} />
                <Route path="loan-officer" element={<LoanOfficerReport />} />
                <Route path="loan-products" element={<LoanProductsReport />} />
                <Route path="mfrs" element={<MfrsRatios />} />
                <Route path="daily" element={<DailyReport />} />
                <Route path="monthly" element={<MonthlyReport />} />
                <Route path="outstanding" element={<OutstandingReport />} />
                <Route path="par" element={<ParReport />} />
                <Route path="at-a-glance" element={<AtAGlance />} />
                <Route path="all" element={<AllEntries />} />
              </Route>

              {/* Legacy */}
              <Route path="disbursements" element={<Disbursements />} />
              <Route path="bank" element={<Bank />} />

              {/* 404 inside shell */}
              <Route path="*" element={<NotFound />} />
            </Route>

            {/* 403 and hard 404 (outside shell) */}
            <Route path="/403" element={<Forbidden />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </FeatureConfigProvider>
      </ToastProvider>
    </Suspense>
  );
}

export default App;
