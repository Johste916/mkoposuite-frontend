// src/pages/admin/AdminPlaceholder.jsx
import React from "react";
import { useParams } from "react-router-dom";

const prettify = (slug = "") =>
  slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

const AdminPlaceholder = () => {
  const { slug } = useParams();
  const title = prettify(slug);

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          This page is scaffolded. Share the field spec (inputs, validation, permissions, and API)
          and I’ll convert it into a full settings form with proper save/rollback and toasts.
        </p>
      </div>
    </div>
  );
};

export default AdminPlaceholder;
