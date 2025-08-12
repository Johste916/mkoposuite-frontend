import React from "react";
import Pagination from "./Pagination";

export default function ListShell({ title, q, setQ, columns = [], rows = [], loading, error, page, setPage, limit, setLimit, total, renderActions }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="px-3 py-2 border rounded w-60 dark:bg-gray-700"
        />
      </div>

      {error && <div className="text-red-500 text-sm mb-3">Error: {error}</div>}
      {loading ? (
        <div className="py-10 text-center text-sm opacity-70">Loading…</div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b dark:border-gray-700">
                {columns.map((c) => <th key={c.key} className="px-3 py-2">{c.title}</th>)}
                {renderActions && <th className="px-3 py-2">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={columns.length + (renderActions ? 1 : 0)} className="px-3 py-10 text-center opacity-70">No data</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id ?? JSON.stringify(r)} className="border-b last:border-0 dark:border-gray-700">
                  {columns.map((c) => (
                    <td key={c.key} className="px-3 py-2">
                      {typeof c.render === "function" ? c.render(r[c.key], r) : String(r[c.key] ?? "—")}
                    </td>
                  ))}
                  {renderActions && <td className="px-3 py-2">{renderActions(r)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} setPage={setPage} limit={limit} setLimit={setLimit} total={total} />
    </div>
  );
}
