import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const sidebarItems = [
  { path: '', label: 'Loan Settings' },
  { path: 'loan-categories', label: 'Loan Categories' },
  { path: 'penalty', label: 'Penalty Settings' },
  { path: 'system', label: 'System Settings' },
  { path: 'integrations', label: 'Integration Settings' },
  { path: 'branch', label: 'Branch Settings' },
  { path: 'borrower', label: 'Borrower Settings' },
  { path: 'user', label: 'User Management' },
  { path: 'bulk-sms', label: 'Bulk SMS Settings' },
  { path: 'savings', label: 'Saving Account Settings' },
  { path: 'employee', label: 'Employee & Payroll Settings' },
  { path: 'payment', label: 'Payment Settings' },
  { path: 'comments', label: 'Comment Settings' },
  { path: 'dashboard', label: 'Dashboard Settings' },
  { path: 'loan-sector', label: 'Loan Sector Settings' },
  { path: 'income-source', label: 'Income Source Settings' },
  { path: 'holidays', label: 'Public Holiday Settings' }
];

const Settings = () => {
  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-100 p-4 border-r space-y-2">
        <h2 className="text-xl font-bold mb-4">Settings</h2>
        <nav className="flex flex-col gap-2">
          {sidebarItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === ''}
              className={({ isActive }) =>
                `block px-4 py-2 rounded hover:bg-blue-100 ${isActive ? 'bg-blue-600 text-white' : 'text-gray-800'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Content Area */}
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default Settings;
