import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Login from './pages/Login';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import SidebarLayout from './components/SidebarLayout';

// Real pages
import Dashboard from './pages/Dashboard';
import Borrowers from './pages/Borrowers';
import Loans from './pages/Loans';
import Repayments from './pages/Repayments';
import Reports from './pages/Reports';

// Dummy Pages if needed
const Sms = () => <div className="p-4">📨 Bulk SMS Page</div>;
const Bank = () => <div className="p-4">🏦 Cash & Bank Page</div>;
const Settings = () => <div className="p-4">⚙️ Settings Page</div>;

function App() {
  return (
    <Router>
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <SidebarLayout />
            </ProtectedRoute>
          }
        >
          {/* Nested pages inside SidebarLayout */}
          <Route index element={<Dashboard />} />
          <Route path="borrowers" element={<Borrowers />} />
          <Route path="loans" element={<Loans />} />
          <Route path="repayments" element={<Repayments />} />
          <Route path="reports" element={<Reports />} />
          <Route path="sms" element={<Sms />} />
          <Route path="bank" element={<Bank />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
