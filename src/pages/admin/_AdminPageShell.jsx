import React from "react";

export default function AdminPageShell({ title, getUrl, putUrl, children }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{title}</h1>
        <div className="text-xs text-slate-500">
          {getUrl && <span className="mr-3">GET: <code>{getUrl}</code></span>}
          {putUrl && <span>PUT: <code>{putUrl}</code></span>}
        </div>
      </div>

      {/* TODO: Replace with real form/table + hooks to fetch {getUrl} and submit to {putUrl} */}
      <div className="text-sm text-slate-600 dark:text-slate-400">
        This editor is scaffolded. Wire the UI and API calls next.
      </div>

      {children}
    </div>
  );
}
