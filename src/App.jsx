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

import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
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
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
