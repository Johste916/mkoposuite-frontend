// src/pages/Admin.jsx
import React, { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  FiSettings, FiUsers, FiShield, FiList, FiDatabase, FiGlobe,
  FiTrendingUp, FiBriefcase, FiBarChart2, FiCreditCard, FiSearch,
} from "react-icons/fi";

const slug = (s) =>
  s.toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const linkFor = (label) => `/admin/${slug(label)}`;

const SECTIONS = [
  { title: "General", icon: <FiSettings className="opacity-70" />, items: ["General Settings"] },
  { title: "Manage Staff", icon: <FiUsers className="opacity-70" />, items: [
      "Staff","Staff Roles and Permissions","Staff Email Notifications","Audit Management",
    ]},
  { title: "Loans", icon: <FiCreditCard className="opacity-70" />, items: [
      "Loan Products","Loan Penalty Settings","Loan Fees","Loan Repayment Cycles","Loan Reminder Settings",
      "Loan Templates: Applications/Agreements","Manage Loan Status and Approvals",
    ]},
  { title: "Manage Branches", icon: <FiList className="opacity-70" />, items: ["Branches","Branch Holidays"]},
  { title: "Borrowers", icon: <FiTrendingUp className="opacity-70" />, items: [
      "Download Statements/Schedules","Format Borrower Reports","Rename Borrower Reports",
      "Rename Collection Sheet Headings","Manage Loan Officers","Invite Borrowers Settings",
      "Bulk Update Borrowers With Loan Officers","Bulk Move Borrowers to Another Branch",
      "Modify Add Borrower Fields","Borrower Settings",
    ]},
  { title: "Repayments", icon: <FiBarChart2 className="opacity-70" />, items: ["Loan Repayment Methods","Manage Collectors"]},
  { title: "Collateral", icon: <FiBriefcase className="opacity-70" />, items: ["Collateral Types"]},
  { title: "Payroll", icon: <FiBriefcase className="opacity-70" />, items: ["Payroll Templates"]},
  { title: "Bulk Upload", icon: <FiDatabase className="opacity-70" />, items: [
      "Upload Borrowers from CSV file","Upload Loans from CSV file","Upload Repayments from CSV file",
      "Upload Expenses from CSV file","Upload Other Income from CSV file","Upload Savings Accounts from CSV file",
      "Upload Savings Transactions from CSV file","Upload Loan Schedule from CSV file","Upload Inter Bank Transfer from CSV file",
    ]},
  { title: "Other Income", icon: <FiList className="opacity-70" />, items: ["Other Income Types"]},
  { title: "Expenses", icon: <FiList className="opacity-70" />, items: ["Expense Types"]},
  { title: "Asset Management", icon: <FiBriefcase className="opacity-70" />, items: ["Asset Management Types"]},
  { title: "SMS Settings", icon: <FiGlobe className="opacity-70" />, items: [
      "SMS Credits","Sender ID","SMS Templates","Auto Send SMS","Collection Sheets - SMS Template","SMS Logs","SMS Settings",
    ]},
  { title: "Email Settings", icon: <FiGlobe className="opacity-70" />, items: [
      "Email Accounts","Email Templates","Auto Send Emails","Collection Sheets - Email Template","Email Logs","Email Settings",
    ]},
  { title: "Savings", icon: <FiBriefcase className="opacity-70" />, items: ["Savings Products","Savings Fees","Savings Transaction Types"]},
  { title: "E-Signature", icon: <FiShield className="opacity-70" />, items: [
      "E-Signature Settings","Email Templates for E-Signature","E-Signature Email Logs",
    ]},
  { title: "Investors", icon: <FiTrendingUp className="opacity-70" />, items: [
      "Investor Products","Loan Investment Products","Investor Fees","Format Investor Report","Rename Investor Report",
      "Invite Investors Settings","Investor Transaction Types",
    ]},
  { title: "Accounting", icon: <FiList className="opacity-70" />, items: ["Settings","Bank Accounts","Taxes","Opening Balances"]},
  { title: "Backups", icon: <FiDatabase className="opacity-70" />, items: ["Backup Settings","Download Backups"]},
];

export default function Admin() {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return SECTIONS;
    return SECTIONS
      .map((sec) => ({ ...sec, items: sec.items.filter((label) => label.toLowerCase().includes(term)) }))
      .filter((sec) => sec.items.length > 0);
  }, [q]);

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">Manage configuration, staff, integrations, security, and more.</p>
          </div>
          <div className="w-full md:w-96">
            <div className="relative">
              <FiSearch className="absolute left-3 top-3 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search settings…"
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
                {sec.items.map((label) => (
                  <li key={label} className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                    <NavLink to={linkFor(label)} className="text-sm text-blue-700 dark:text-blue-300 hover:underline">
                      {label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <div className="text-[12px] text-slate-500 dark:text-slate-400">
        Tip: Can’t find something? Try different keywords (e.g., “penalty”, “backup”, “par”).
      </div>
    </div>
  );
}
