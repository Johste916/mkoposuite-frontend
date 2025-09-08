// src/pages/account/AccountSettings.jsx
import React from "react";
import { Link } from "react-router-dom";
import { FiUser } from "react-icons/fi";

export default function AccountSettings() {
  // Only the Profile tile remains here.
  const items = [
    {
      title: "Profile",
      desc: "Update your name, phone, avatar and default branch",
      to: "/account/profile",
      icon: <FiUser className="opacity-70" />,
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
        My Settings
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((it) => (
          <Link
            key={it.title}
            to={it.to}
            className="block text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition"
          >
            <div className="flex items-center gap-2">
              <span className="text-slate-600 dark:text-slate-300">{it.icon}</span>
              <div className="font-medium text-slate-800 dark:text-slate-100">
                {it.title}
              </div>
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {it.desc}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
