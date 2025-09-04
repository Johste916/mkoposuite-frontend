import React, { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiUser, FiCreditCard, FiLock, FiShield, FiGrid, FiLogOut,
} from "react-icons/fi";

export default function AccountSettings() {
  const navigate = useNavigate();

  // read role once for simple gating of the Organization tile
  const role = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return (u.role || "").toLowerCase();
    } catch {
      return "";
    }
  }, []);

  const items = [
    {
      title: "Profile",
      desc: "Update your name, phone, avatar and default branch",
      to: "/account/profile",
      icon: <FiUser className="opacity-70" />,
    },
    {
      title: "Billing",
      desc: "Manage your subscription and invoices",
      to: "/billing",
      icon: <FiCreditCard className="opacity-70" />,
    },
    {
      title: "Change Password",
      desc: "Update your account password",
      to: "/change-password",
      icon: <FiLock className="opacity-70" />,
    },
    {
      title: "Two-Factor Authentication",
      desc: "Secure your account with 2FA",
      to: "/2fa",
      icon: <FiShield className="opacity-70" />,
    },
    // show Organization to admins/directors by default
    ...(role === "admin" || role === "director"
      ? [{
          title: "Organization",
          desc: "Plan, tenant details and entitlements",
          to: "/account/organization",
          icon: <FiGrid className="opacity-70" />,
        }]
      : []),
    {
      title: "Logout",
      desc: "Sign out of your account",
      onClick: () => {
        try {
          // clear common auth keys
          ["token","jwt","access_token","user","tenant","tenantId","tenantName","activeBranchId"]
            .forEach(k => localStorage.removeItem(k));
          sessionStorage?.clear?.();
        } catch {}
        navigate("/login");
      },
      icon: <FiLogOut className="opacity-70" />,
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">My Settings</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((it) => {
          const CardInner = (
            <>
              <div className="flex items-center gap-2">
                <span className="text-slate-600 dark:text-slate-300">{it.icon}</span>
                <div className="font-medium text-slate-800 dark:text-slate-100">{it.title}</div>
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{it.desc}</div>
            </>
          );

          // Use real links for navigation when we have a path, else a button for actions (logout)
          return it.to ? (
            <Link
              key={it.title}
              to={it.to}
              className="block text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition"
            >
              {CardInner}
            </Link>
          ) : (
            <button
              key={it.title}
              onClick={it.onClick}
              className="text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition"
            >
              {CardInner}
            </button>
          );
        })}
      </div>
    </div>
  );
}
