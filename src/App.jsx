// src/App.jsx
import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Borrowers from './pages/Borrowers';
import Loans from './pages/Loans';
import Repayments from './pages/Repayments';
import Reports from './pages/Reports';
import Sms from './pages/Sms';
import Bank from './pages/Bank';
import Settings from './pages/Settings';
import Users from './pages/Users';
import Roles from './pages/Roles';
import Branches from './pages/Branches';

import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute'; // ✅ NEW
import SidebarLayout from './components/SidebarLayout';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <SidebarLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="borrowers" element={<Borrowers />} />
        <Route path="loans" element={<Loans />} />
        <Route path="repayments" element={<Repayments />} />
        <Route path="reports" element={<Reports />} />
        <Route path="sms" element={<Sms />} />
        <Route path="bank" element={<Bank />} />
        <Route path="settings" element={<Settings />} />

        {/* ✅ Admin-only pages wrapped with RoleProtectedRoute */}
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
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
