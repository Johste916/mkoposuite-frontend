// src/App.jsx
import { Routes, Route, Outlet, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";

// Auth/public
const Login = lazy(() => import("./pages/Login"));

// Shell
import ProtectedRoute from "./components/ProtectedRoute";
import RoleProtectedRoute from "./components/RoleProtectedRoute";
import SidebarLayout from "./components/SidebarLayout";

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

function App() {
  return (
    <Suspense fallback={<Fallback />}>
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

          {/* ===== Admin hub + dynamic admin pages ===== */}
          <Route
            path="admin"
            element={
              <RoleProtectedRoute allow={["admin", "director"]}>
                <Outlet />
              </RoleProtectedRoute>
            }
          >
            {/* Admin home grid */}
            <Route index element={<Admin />} />

            {/* All admin pages handled dynamically */}
            <Route path=":slug" element={<AdminRouter />} />
          </Route>

          {/* Top-right Account quick panel */}
          <Route path="account/settings" element={<AccountSettings />} />

          {/* Borrowers */}
          <Route path="borrowers" element={<Borrowers />} />
          <Route path="borrowers/add" element={<AddBorrower />} />
          <Route path="borrowers/kyc" element={<KycQueue />} />
          <Route path="borrowers/blacklist" element={<Blacklist />} />
          <Route path="borrowers/imports" element={<BorrowerImports />} />
          <Route path="borrowers/reports" element={<BorrowerReports />} />
          <Route path="borrowers/:id" element={<BorrowerDetails />} />

          {/* Groups */}
          <Route path="borrowers/groups" element={<BorrowerGroups />} />
          <Route path="borrowers/groups/add" element={<AddGroup />} />
          <Route path="borrowers/groups/:groupId" element={<GroupDetails />} />
          <Route path="borrowers/groups/imports" element={<GroupImports />} />
          <Route path="borrowers/groups/reports" element={<GroupReports />} />

          {/* Loans */}
          <Route path="loans" element={<Loans />} />
          <Route path="loans/applications" element={<LoanApplications />} />
          <Route path="loans/status/:status" element={<LoanStatusList />} />
          <Route path="loans/disbursement-queue" element={<DisbursementQueue />} />
          <Route path="loans/products" element={<LoanProducts />} />
          <Route path="loans/schedule" element={<LoanSchedulePage />} />
          <Route path="loans/reports" element={<LoanReports />} />
          <Route path="loans/:id" element={<LoanDetails />} />

          {/* Repayments */}
          <Route path="repayments" element={<Repayments />} />
          <Route path="repayments/new" element={<ManualRepayment />} />
          <Route path="repayments/receipts" element={<RepaymentReceipts />} />

          {/* Misc (legacy) */}
          <Route path="reports" element={<Reports />} />
          <Route path="disbursements" element={<Disbursements />} />
          <Route path="sms" element={<Sms />} />
          <Route path="bank" element={<Bank />} />

          {/* NEW MODULES */}
          <Route path="collateral" element={<CollateralList />} />
          <Route path="assets" element={<Assets />} />
          <Route path="collections" element={<CollectionSheets />} />
          <Route path="savings-transactions" element={<SavingsTransactions />} />
          <Route path="investors" element={<Investors />} />
          <Route path="esignatures" element={<ESignatures />} />
          <Route path="payroll" element={<Payroll />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="other-income" element={<OtherIncome />} />

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

          {/* 404 inside shell */}
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Hard 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default App;
