// src/pages/account/AccountSettings.jsx
import React, { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiUser,
  FiCreditCard,
  FiLock,
  FiShield,
  FiGrid,
  FiUsers,
  FiLogOut,
} from "react-icons/fi";

export default function AccountSettings() {
  const navigate = useNavigate();

  // Read role(s) once – supports { role: "admin" }, { roles: ["admin"] }, or { Roles: [{name:"admin"}] }
  const { role, roles } = useMemo(() => {
    const lower = (s) => String(s || "").toLowerCase();
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      const primary = lower(u.role);
      const list =
        Array.isArray(u.roles)
          ? u.roles.map((r) => lower(r))
          : Array.isArray(u.Roles)
          ? u.Roles.map((r) => lower(r?.name || r))
          : [];
      return { role: primary, roles: list };
    } catch {
      return { role: "", roles: [] };
    }
  }, []);

  const hasAnyRole = (...allowed) =>
    allowed.some((r) => role === r || roles.includes(r));

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
      // canonical route (present in App.jsx)
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
    // Organization — visible to system_admin/admin/director
    ...(hasAnyRole("system_admin", "admin", "director")
      ? [
          {
            title: "Organization",
            desc: "Plan, tenant details and entitlements",
            to: "/account/organization",
            icon: <FiGrid className="opacity-70" />,
          },
        ]
      : []),
    // Tenants
    ...(hasAnyRole("system_admin", "admin", "director")
      ? [
          {
            title: "Tenants",
            desc: "Manage tenants, subscriptions, entitlements & billing",
            to: "/admin/tenants", // use admin path to avoid 404
            icon: <FiUsers className="opacity-70" />,
          },
        ]
      : []),
    {
      title: "Logout",
      desc: "Sign out of your account",
      onClick: () => {
        try {
          // Clear common auth/tenant keys without touching other app caches
          [
            "token",
            "jwt",
            "authToken",
            "accessToken",
            "access_token",
            "user",
            "tenant",
            "tenantId",
            "tenantName",
            "activeBranchId",
          ].forEach((k) => localStorage.removeItem(k));
          sessionStorage?.clear?.();
        } catch {}
        navigate("/login", { replace: true });
      },
      icon: <FiLogOut className="opacity-70" />,
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
        My Settings
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((it) => {
          const CardInner = (
            <>
              <div className="flex items-center gap-2">
                <span className="text-slate-600 dark:text-slate-300">{it.icon}</span>
                <div className="font-medium text-slate-800 dark:text-slate-100">
                  {it.title}
                </div>
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {it.desc}
              </div>
            </>
          );

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
