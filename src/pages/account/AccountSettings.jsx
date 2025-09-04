import React from "react";
import { useNavigate } from "react-router-dom";

export default function AccountSettings() {
  const navigate = useNavigate();

  const items = [
    { title: "Profile", desc: "Update your name, phone, avatar and default branch", onClick: () => navigate("/account/profile") },
    { title: "Billing", desc: "Manage your subscription and invoices", onClick: () => navigate("/billing") },
    { title: "Change Password", desc: "Update your account password", onClick: () => navigate("/change-password") },
    { title: "Two-Factor Authentication", desc: "Secure your account with 2FA", onClick: () => navigate("/2fa") },
    { title: "Organization", desc: "Plan, tenant details and entitlements", onClick: () => navigate("/account/organization") },
    {
      title: "Logout",
      desc: "Sign out of your account",
      onClick: () => {
        try {
          localStorage.clear();
        } catch {}
        navigate("/login");
      },
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">My Settings</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((it) => (
          <button
            key={it.title}
            onClick={it.onClick}
            className="text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:shadow-md transition"
          >
            <div className="font-medium text-slate-800 dark:text-slate-100">{it.title}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{it.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
