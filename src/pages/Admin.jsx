// src/pages/admin/Admin.jsx
import React, { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  FiSettings,
  FiGlobe,
  FiCreditCard,
  FiTrendingUp,
  FiSearch,
} from "react-icons/fi";

/**
 * Admin IA v1 (lean):
 * - Keep only settings wired to backend now.
 * - Remove duplicates and low-priority stubs.
 * - Slugs match AdminRouter.registry exactly.
 */

const SECTIONS = [
  {
    title: "General",
    icon: <FiSettings className="opacity-70" />,
    items: [
      { label: "General Settings", slug: "general-settings" },
      { label: "Integration Settings", slug: "integration-settings" },
      { label: "Payment Settings", slug: "payment-settings" },
      { label: "Dashboard Settings", slug: "dashboard-settings" },
      { label: "Backup Settings", slug: "backup-settings" },
    ],
  },

  {
    title: "Email & SMS",
    icon: <FiGlobe className="opacity-70" />,
    items: [
      { label: "Email Accounts", slug: "email-accounts" },
      { label: "Email Templates", slug: "email-templates" },
      { label: "SMS Settings", slug: "sms-settings" },
      { label: "SMS Templates", slug: "sms-templates" },
      { label: "Bulk SMS Settings", slug: "bulk-sms-settings" },
      { label: "Communications", slug: "communications" }, // admin notices/content
      { label: "Staff Email Notifications", slug: "staff-email-notifications" }, // GET/PUT /notifications
    ],
  },

  {
    title: "Loans",
    icon: <FiCreditCard className="opacity-70" />,
    items: [
      { label: "Loan Products", slug: "loan-products" },
      { label: "Loan Settings", slug: "loan-settings" },
      { label: "Loan Penalty Settings", slug: "penalty-settings" },
      { label: "Loan Fees", slug: "loan-fees" },
      { label: "Loan Repayment Cycles", slug: "loan-repayment-cycles" },
      { label: "Loan Reminder Settings", slug: "loan-reminder-settings" },
      {
        label: "Loan Templates: Applications/Agreements",
        slug: "loan-templates-applications-agreements",
      },
      {
        label: "Manage Loan Status and Approvals",
        slug: "manage-loan-status-and-approvals",
      },
      { label: "Loan Categories", slug: "loan-categories" },
      { label: "Loan Sectors", slug: "loan-sector-settings" },
    ],
  },

  {
    title: "Borrowers",
    icon: <FiTrendingUp className="opacity-70" />,
    items: [
      { label: "Borrower Settings", slug: "borrower-settings" },
      { label: "Manage Branches", slug: "branch-settings" },
      { label: "Branch Holidays", slug: "branch-holidays" },
    ],
  },

  {
    title: "Savings",
    icon: <FiCreditCard className="opacity-70" />,
    items: [{ label: "Saving Settings", slug: "saving-settings" }],
  },

  {
    title: "HR & Security",
    icon: <FiSettings className="opacity-70" />,
    items: [
      { label: "Payroll Settings", slug: "payroll-settings" },
      { label: "Activity / Audit Logs", slug: "audit-logs" }, // mapped to /activity
    ],
  },
];

export default function Admin() {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return SECTIONS;
    return SECTIONS.map((sec) => ({
      ...sec,
      items: sec.items.filter(
        (it) =>
          it.label.toLowerCase().includes(term) || it.slug.includes(term)
      ),
    })).filter((sec) => sec.items.length > 0);
  }, [q]);

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Manage configuration, staff communications, integrations, and
              global rules.
            </p>
          </div>
          <div className="w-full md:w-96">
            <div className="relative">
              <FiSearch className="absolute left-3 top-3 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search settings… (e.g. communications, penalty, payroll)"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
              />
            </div>
          </div>
        </div>
      </div>

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
                  <li key={it.slug} className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                    <NavLink
                      to={`/admin/${it.slug}`}
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
        Tip: Try keywords like “communications”, “penalty”, “dashboard”, “audit”.
      </div>
    </div>
  );
}
