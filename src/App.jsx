// src/App.jsx
import { Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';

// Auth/public
const Login = lazy(() => import('./pages/Login'));

// Shell
import ProtectedRoute from './components/ProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import SidebarLayout from './components/SidebarLayout';

// Core pages
const Dashboard = lazy(() => import('./pages/Dashboard'));

// Borrowers
const Borrowers = lazy(() => import('./pages/Borrowers'));
const BorrowerDetails = lazy(() => import('./pages/BorrowerDetails'));
const AddBorrower = lazy(() => import('./pages/borrowers/AddBorrower'));
const KycQueue = lazy(() => import('./pages/borrowers/KycQueue'));
const Blacklist = lazy(() => import('./pages/borrowers/Blacklist'));
const BorrowerImports = lazy(() => import('./pages/borrowers/Imports'));
const BorrowerReports = lazy(() => import('./pages/borrowers/Reports'));

// Groups
const BorrowerGroups = lazy(() => import('./pages/borrowers/groups/Groups'));
const AddGroup = lazy(() => import('./pages/borrowers/groups/AddGroup'));
const GroupDetails = lazy(() => import('./pages/borrowers/groups/GroupDetails'));
const GroupImports = lazy(() => import('./pages/borrowers/groups/GroupImports'));
const GroupReports = lazy(() => import('./pages/borrowers/groups/GroupReports'));

// Loans
const Loans = lazy(() => import('./pages/Loans'));            // src/pages/Loan.jsx
const LoanDetails = lazy(() => import('./pages/LoanDetails'));// src/pages/LoanDetails.jsx
const LoanApplications = lazy(() => import('./pages/loans/LoanApplications')); // ⬅ if your file is under /pages/loans/, change this path
const LoanStatusList = lazy(() => import('./pages/loans/LoanStatusList'));
const DisbursementQueue = lazy(() => import('./pages/loans/DisbursementQueue'));
const LoanProducts = lazy(() => import('./pages/loans/LoanProducts'));
const LoanSchedulePage = lazy(() => import('./pages/loans/LoanSchedulePage'));
const LoanReports = lazy(() => import('./pages/loans/LoanReports'));

// Repayments
const Repayments = lazy(() => import('./pages/Repayments'));
const ManualRepayment = lazy(() => import('./pages/repayments/ManualRepayment'));
const RepaymentReceipts = lazy(() => import('./pages/repayments/RepaymentReceipts'));

// Misc
const Reports = lazy(() => import('./pages/Reports'));
const Disbursements = lazy(() => import('./pages/Disbursements'));
const Sms = lazy(() => import('./pages/Sms'));
const Bank = lazy(() => import('./pages/Bank'));
const Settings = lazy(() => import('./pages/Settings'));
const Users = lazy(() => import('./pages/Users'));
const Roles = lazy(() => import('./pages/Roles'));
const Branches = lazy(() => import('./pages/Branches'));
const NotFound = lazy(() => import('./pages/NotFound'));

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
          <Route path="loans/:id" element={<LoanDetails />} /> {/* details route */}

          {/* Repayments */}
          <Route path="repayments" element={<Repayments />} />
          <Route path="repayments/new" element={<ManualRepayment />} />
          <Route path="repayments/receipts" element={<RepaymentReceipts />} />

          {/* Reports */}
          <Route path="reports" element={<Reports />} />

          {/* Disbursements */}
          <Route path="disbursements" element={<Disbursements />} />

          {/* Other */}
          <Route path="sms" element={<Sms />} />
          <Route path="bank" element={<Bank />} />
          <Route path="settings" element={<Settings />} />

          {/* Admin */}
          <Route
            path="users"
            element={
              <RoleProtectedRoute>
                <Users />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="roles"
            element={
              <RoleProtectedRoute>
                <Roles />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="branches"
            element={
              <RoleProtectedRoute>
                <Branches />
              </RoleProtectedRoute>
            }
          />

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
