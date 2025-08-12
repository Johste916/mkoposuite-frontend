// src/pages/Admin.jsx
import React, { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  FiSettings,
  FiUsers,
  FiShield,
  FiList,
  FiDatabase,
  FiGlobe,
  FiTrendingUp,
  FiBriefcase,
  FiBarChart2,
  FiCreditCard,
  FiSearch,
} from "react-icons/fi";

/**
 * IMPORTANT:
 * These links match the routes that exist in your current App.jsx.
 * If/when you add more specific pages (like /settings/system), you can update targets here.
 */
const SECTIONS = [
  {
    title: "System & Configuration",
    icon: <FiSettings className="opacity-70" />,
    items: [
      { label: "Settings (General)", to: "/settings" }, // single settings page in current App.jsx
      { label: "Branches", to: "/branches" },
    ],
  },
  {
    title: "User Management",
    icon: <FiUsers className="opacity-70" />,
    items: [
      { label: "Users", to: "/user-management/users" },
      { label: "Roles", to: "/user-management/roles" },
      { label: "Permissions", to: "/user-management/permissions" },
    ],
  },
  {
    title: "Loans",
    icon: <FiCreditCard className="opacity-70" />,
    items: [
      { label: "All Loans", to: "/loans" },
      { label: "Loan Applications", to: "/loans/applications" },
      { label: "Disbursement Queue", to: "/loans/disbursement-queue" },
      { label: "Loan Products", to: "/loans/products" },
      { label: "Loan Reports", to: "/loans/reports" },
    ],
  },
  {
    title: "Collections & Operations",
    icon: <FiTrendingUp className="opacity-70" />,
    items: [
      { label: "Collection Sheets", to: "/collections" },
      { label: "Repayments", to: "/repayments" },
      { label: "Manual Repayment", to: "/repayments/new" },
      { label: "Repayment Receipts", to: "/repayments/receipts" },
      { label: "Disbursements", to: "/disbursements" },
      { label: "SMS", to: "/sms" },
      { label: "Bank", to: "/bank" },
    ],
  },
  {
    title: "Savings & Investors",
    icon: <FiBriefcase className="opacity-70" />,
    items: [
      { label: "Savings Transactions", to: "/savings-transactions" },
      { label: "Investors", to: "/investors" },
      { label: "E-Signatures", to: "/esignatures" },
      { label: "Payroll", to: "/payroll" },
      { label: "Expenses", to: "/expenses" },
      { label: "Other Income", to: "/other-income" },
      { label: "Assets", to: "/assets" },
      { label: "Collateral Register", to: "/collateral" },
    ],
  },
  {
    title: "Reports & Analytics",
    icon: <FiBarChart2 className="opacity-70" />,
    items: [
      { label: "Reports (Hub)", to: "/reports" },
    ],
  },
  {
    title: "Accounting",
    icon: <FiList className="opacity-70" />,
    items: [
      { label: "Chart of Accounts", to: "/accounting/chart-of-accounts" },
      { label: "Trial Balance", to: "/accounting/trial-balance" },
      { label: "Profit / Loss", to: "/accounting/profit-loss" },
      { label: "Cash Flow", to: "/accounting/cashflow" },
    ],
  },
  {
    title: "Integrations",
    icon: <FiGlobe className="opacity-70" />,
    items: [
      // You currently route all settings to a single /settings page.
      // Keep this item if your Settings page exposes integrations from within.
      { label: "Integration Settings", to: "/settings" },
      { label: "E-Signatures", to: "/esignatures" },
    ],
  },
  {
    title: "Security",
    icon: <FiShield className="opacity-70" />,
    items: [
      // Personal security (2FA, change password) lives in the top-right "Settings" (Account) menu,
      // so Admin section links only to org-wide areas for now.
      { label: "User Permissions", to: "/user-management/permissions" },
      { label: "Roles", to: "/user-management/roles" },
    ],
  },
  {
    title: "Data Management",
    icon: <FiDatabase className="opacity-70" />,
    items: [
      // Backups & CSV uploads are typically inside Settings or module pages.
      // Link to the modules you already have routed to avoid 404s.
      { label: "Repayments CSV Upload", to: "/repayments/receipts" }, // or keep it at /repayments if your upload is there
      { label: "Savings Transactions", to: "/savings-transactions" },
    ],
  },
];

const Admin = () => {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return SECTIONS;
    return SECTIONS
      .map((sec) => {
        const items = sec.items.filter((i) =>
          i.label.toLowerCase().includes(term)
        );
        return { ...sec, items };
      })
      .filter((sec) => sec.items.length > 0);
  }, [q]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Manage system-wide configuration, staff, integrations, security, and accounting.
            </p>
          </div>
          <div className="w-full md:w-96">
            <div className="relative">
              <FiSearch className="absolute left-3 top-3 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search admin options…"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((sec) => (
          <div
            key={sec.title}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              {sec.icon}
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">
                {sec.title}
              </h2>
            </div>

            {sec.items.length === 0 ? (
              <p className="text-sm text-slate-500">No matches.</p>
            ) : (
              <ul className="space-y-1">
                {sec.items.map((it) => (
                  <li key={it.label} className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                    <NavLink
                      to={it.to}
                      className="text-sm text-blue-700 dark:text-blue-300 hover:underline"
                    >
                      {it.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <div className="text-[12px] text-slate-500 dark:text-slate-400">
        Tip: Can’t find something? Try different keywords (e.g., “roles”, “trial balance”, “cash flow”).
      </div>
    </div>
  );
};

export default Admin;
