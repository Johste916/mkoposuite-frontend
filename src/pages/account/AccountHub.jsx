// src/pages/account/AccountHub.jsx
import React from "react";
import { NavLink, Outlet } from "react-router-dom";

function Tab({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-3 py-2 rounded-md text-sm transition
         ${isActive
           ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
           : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"}`
      }
      end
    >
      {children}
    </NavLink>
  );
}

export default function AccountHub() {
  // Keep only the Profile tab in this hub.
  return (
    <div className="ms-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Account
        </h2>
      </div>

      <div className="flex flex-wrap gap-2">
        <Tab to="/account/profile">Profile</Tab>
      </div>

      <div className="pt-2">
        <Outlet />
      </div>
    </div>
  );
}
