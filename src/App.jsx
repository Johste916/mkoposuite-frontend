// src/App.jsx
import { Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';

// Lazy-load pages for faster first paint
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Borrowers = lazy(() => import('./pages/Borrowers'));
const Loans = lazy(() => import('./pages/Loans'));

const Repayments = lazy(() => import('./pages/Repayments'));
const ManualRepayment = lazy(() => import('./pages/repayments/ManualRepayment'));
const RepaymentReceipts = lazy(() => import('./pages/repayments/RepaymentReceipts'));

const Reports = lazy(() => import('./pages/Reports'));
const Disbursements = lazy(() => import('./pages/Disbursements'));

const Sms = lazy(() => import('./pages/Sms'));
const Bank = lazy(() => import('./pages/Bank'));
const Settings = lazy(() => import('./pages/Settings'));

const Users = lazy(() => import('./pages/Users'));
const Roles = lazy(() => import('./pages/Roles'));
const Branches = lazy(() => import('./pages/Branches'));

const NotFound = lazy(() => import('./pages/NotFound'));

import ProtectedRoute from './components/ProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import SidebarLayout from './components/SidebarLayout';

// Simple fallback UI while chunks load
const Fallback = () => <div className="p-6 text-sm text-gray-600">Loading…</div>;

function App() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected shell with sidebar */}
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

          {/* Core */}
          <Route path="borrowers" element={<Borrowers />} />
          <Route path="loans" element={<Loans />} />

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

          {/* Admin-only */}
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

          {/* 404 inside the authed shell */}
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Hard 404 for anything else */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default App;
