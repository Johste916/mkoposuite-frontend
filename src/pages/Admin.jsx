import React, { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  FiSettings, FiUsers, FiShield, FiList, FiDatabase, FiGlobe,
  FiTrendingUp, FiBriefcase, FiBarChart2, FiCreditCard, FiSearch
} from "react-icons/fi";

/** Each item has an explicit slug that matches AdminRouter.registry keys */
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
      { label: "Communications", slug: "communications" }, // ✅ admin editor that drives dashboard notices
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
      { label: "Loan Templates: Applications/Agreements", slug: "loan-templates-applications-agreements" },
      { label: "Manage Loan Status and Approvals", slug: "manage-loan-status-and-approvals" },
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
      // Bulk ops – for now route to BorrowerSettings until you add dedicated screens
      { label: "Bulk Update Borrowers With Loan Officers", slug: "bulk-update-borrowers-with-loan-officers" },
      { label: "Bulk Move Borrowers to Another Branch", slug: "bulk-move-borrowers-to-another-branch" },
      { label: "Modify Add Borrower Fields", slug: "modify-add-borrower-fields" },
    ],
  },

  {
    title: "Repayments",
    icon: <FiBarChart2 className="opacity-70" />,
    items: [
      { label: "Loan Repayment Methods", slug: "loan-repayment-methods" },
      { label: "Manage Collectors", slug: "manage-collectors" },
    ],
  },

  {
    title: "Savings",
    icon: <FiBriefcase className="opacity-70" />,
    items: [
      { label: "Savings Products", slug: "savings-products" },
      { label: "Savings Fees", slug: "savings-fees" },
      { label: "Savings Transaction Types", slug: "savings-transaction-types" },
      { label: "Saving Settings", slug: "saving-settings" },
    ],
  },

  {
    title: "Investors",
    icon: <FiTrendingUp className="opacity-70" />,
    items: [
      { label: "Investor Products", slug: "investor-products" },
      { label: "Loan Investment Products", slug: "loan-investment-products" },
      { label: "Investor Fees", slug: "investor-fees" },
      { label: "Investor Transaction Types", slug: "investor-transaction-types" },
    ],
  },

  {
    title: "Expenses & Assets",
    icon: <FiList className="opacity-70" />,
    items: [
      { label: "Expense Types", slug: "expense-types" },
      { label: "Other Income Types", slug: "other-income-types" },
      { label: "Asset Management Types", slug: "asset-management-types" },
      { label: "Collateral Types", slug: "collateral-types" },
    ],
  },

  {
    title: "Payroll & HR",
    icon: <FiBriefcase className="opacity-70" />,
    items: [
      { label: "Payroll Settings", slug: "payroll-settings" },
      { label: "Payroll Templates", slug: "payroll-templates" },
      { label: "User Management", slug: "user-management" },
      { label: "Staff", slug: "staff" },
      { label: "Staff Roles and Permissions", slug: "staff-roles-and-permissions" },
      { label: "Staff Email Notifications", slug: "staff-email-notifications" },
      { label: "Audit Management", slug: "audit-management" },
    ],
  },

  {
    title: "Bulk Upload",
    icon: <FiDatabase className="opacity-70" />,
    items: [
      { label: "Upload Borrowers from CSV file", slug: "upload-borrowers-from-csv-file" },
      { label: "Upload Loans from CSV file", slug: "upload-loans-from-csv-file" },
      { label: "Upload Repayments from CSV file", slug: "upload-repayments-from-csv-file" },
      { label: "Upload Expenses from CSV file", slug: "upload-expenses-from-csv-file" },
      { label: "Upload Other Income from CSV file", slug: "upload-other-income-from-csv-file" },
      { label: "Upload Savings Accounts from CSV file", slug: "upload-savings-accounts-from-csv-file" },
      { label: "Upload Savings Transactions from CSV file", slug: "upload-savings-transactions-from-csv-file" },
      { label: "Upload Loan Schedule from CSV file", slug: "upload-loan-schedule-from-csv-file" },
      { label: "Upload Inter Bank Transfer from CSV file", slug: "upload-inter-bank-transfer-from-csv-file" },
    ],
  },

  {
    title: "Accounting",
    icon: <FiList className="opacity-70" />,
    items: [
      { label: "Settings", slug: "settings" },            // temporary alias -> Integration/Payment
      { label: "Bank Accounts", slug: "bank-accounts" },  // temporary -> PaymentSettings
      { label: "Taxes", slug: "taxes" },                  // temporary -> PaymentSettings
      { label: "Opening Balances", slug: "opening-balances" }, // temp -> DashboardSettings
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
      items: sec.items.filter((it) =>
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
              Manage configuration, staff, integrations, communications, and more.
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
          <div key={sec.title} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              {sec.icon}
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">{sec.title}</h2>
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
        Tip: Try keywords like “communications”, “penalty”, “backup”, “templates”.
      </div>
    </div>
  );
}
