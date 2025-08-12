// src/pages/account/AccountSettings.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

export default function AccountSettings() {
  const navigate = useNavigate();

  const items = [
    { title: "Billing", desc: "Manage your subscription and invoices", onClick: () => navigate("/billing") },
    { title: "Change Password", desc: "Update your account password", onClick: () => navigate("/change-password") },
    { title: "Two-Factor Authentication", desc: "Secure your account with 2FA", onClick: () => navigate("/2fa") },
    { title: "Logout", desc: "Sign out of your account", onClick: () => { localStorage.clear(); navigate("/login"); } },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">My Settings</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((it) => (
          <button
            key={it.title}
            onClick={it.onClick}
            className="text-left rounded-lg border border-slate-200 bg-white p-4 hover:shadow-md transition"
          >
            <div className="font-medium text-slate-800">{it.title}</div>
            <div className="text-sm text-slate-500 mt-1">{it.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
