// src/pages/investors/Investors.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import usePaginatedFetch from "../../hooks/usePaginatedFetch";
import { FiPlus, FiSearch, FiUser } from "react-icons/fi";

const Avatar = ({ name = "", src = "" }) => {
  const initials = (name || "INV").trim().slice(0, 2).toUpperCase();
  return (
    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
      {src ? (
        // eslint-disable-next-line jsx-a11y/img-redundant-alt
        <img src={src} alt={`${name} photo`} className="w-full h-full object-cover" />
      ) : (
        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{initials}</span>
      )}
    </div>
  );
};

const fmtInt = (n) => new Intl.NumberFormat().format(Number(n || 0));

export default function Investors() {
  const navigate = useNavigate();
  const {
    rows, total, page, setPage, limit, setLimit, q, setQ, loading, error,
  } = usePaginatedFetch({ url: "/investors" });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Investors</h1>
          <p className="text-sm text-slate-500">Manage your investors, their shares and contributions.</p>
        </div>
        <button
          onClick={() => navigate("/investors/add")}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          <FiPlus /> Add Investor
        </button>
      </div>

      {/* Search + page size */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-80">
          <FiSearch className="absolute left-3 top-2.5 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email or phone…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          />
        </div>
        <select
          className="px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
        >
          {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className="min-w-[720px] w-full">
          <thead className="text-left text-sm text-slate-500">
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="px-4 py-3">Investor</th>
              <th className="px-4 py-3">Shares</th>
              <th className="px-4 py-3">Contributions</th>
              <th className="px-4 py-3">Positions</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {loading && (
              <tr><td colSpan={5} className="px-4 py-6 text-slate-500">Loading…</td></tr>
            )}
            {error && !loading && (
              <tr><td colSpan={5} className="px-4 py-6 text-rose-600">Failed to load investors.</td></tr>
            )}
            {!loading && !error && rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-slate-500">No investors yet.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={r.name} src={r.photoUrl} />
                    <div>
                      <div className="font-medium">{r.name || "—"}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        {r.email || "—"}
                        <span className="text-slate-400">•</span>
                        {r.phone || "—"}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">{fmtInt(r.shares)}</td>
                <td className="px-4 py-3">{fmtInt(r.contributions)}</td>
                <td className="px-4 py-3">
                  {Array.isArray(r.positions) ? r.positions.join(", ") : (r.positions || "—")}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => navigate(`/investors/${r.id}`)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <FiUser /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between text-sm">
          <div className="text-slate-500">
            Page {page} • {fmtInt(total)} total
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded border disabled:opacity-50"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded border"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
