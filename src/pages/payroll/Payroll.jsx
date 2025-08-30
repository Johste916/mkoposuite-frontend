import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiPlus, FiRefreshCw } from "react-icons/fi";
import api from "../../api";

const fmtMoney = (v) => {
  const num = Number(v);
  if (!Number.isFinite(num)) return "TZS —";
  return `TZS ${num.toLocaleString()}`;
};
const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString();
};

export default function Payroll() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/payroll");
      const data = Array.isArray(res.data) ? res.data : res.data?.items || res.data?.data || [];
      setItems(data);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Failed to load payroll data.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((p) =>
      String(p.period || "").toLowerCase().includes(needle) ||
      String(p.notes || "").toLowerCase().includes(needle) ||
      String(p.branchName || "").toLowerCase().includes(needle)
    );
  }, [items, q]);

  const totals = useMemo(() => {
    let staff = 0, total = 0;
    for (const r of filtered) {
      staff += Number(r.staffCount) || 0;
      total += Number(r.total) || 0;
    }
    return { staff, total };
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-slate-800 dark:text-slate-100">Payroll</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">Review payroll periods, headcount and totals.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter by period (YYYY-MM) or text…"
              className="w-64 max-w-[70vw] px-3 py-2 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
            />
            <button onClick={load} className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-sm">
              <FiRefreshCw /> Refresh
            </button>
            <Link to="/payroll/add" className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-sm">
              <FiPlus /> Add Payroll
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-200 p-3 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-sm text-slate-600 dark:text-slate-400">
          No payroll records found.
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <div className="text-slate-500 dark:text-slate-400">Periods</div>
                <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{filtered.length.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-slate-500 dark:text-slate-400">Staff (sum)</div>
                <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{totals.staff.toLocaleString()}</div>
              </div>
              <div className="col-span-2">
                <div className="text-slate-500 dark:text-slate-400">Total (sum)</div>
                <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{fmtMoney(totals.total)}</div>
              </div>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {filtered.map((p) => (
              <div key={p.id || p.period} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">Period: {p.period || "—"}</div>
                    <div className="text-slate-600 dark:text-slate-400">Staff: {(Number(p.staffCount) || 0).toLocaleString()}</div>
                  </div>
                  <div className="text-right text-sm font-semibold text-slate-900 dark:text-slate-100">{fmtMoney(p.total)}</div>
                </div>
                {(p.processedAt || p.paidAt) && (
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {p.processedAt && <>Processed: {fmtDate(p.processedAt)} </>}
                    {p.paidAt && <span className="ml-2">Paid: {fmtDate(p.paidAt)}</span>}
                  </div>
                )}
                {p.notes && <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">{p.notes}</div>}
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-2 px-3">Period</th>
                  <th className="py-2 px-3">Staff</th>
                  <th className="py-2 px-3">Total</th>
                  <th className="py-2 px-3">Processed</th>
                  <th className="py-2 px-3">Paid</th>
                  <th className="py-2 px-3">Branch</th>
                  <th className="py-2 px-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id || p.period} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">{p.period || "—"}</td>
                    <td className="py-2 px-3">{(Number(p.staffCount) || 0).toLocaleString()}</td>
                    <td className="py-2 px-3">{fmtMoney(p.total)}</td>
                    <td className="py-2 px-3">{fmtDate(p.processedAt)}</td>
                    <td className="py-2 px-3">{fmtDate(p.paidAt)}</td>
                    <td className="py-2 px-3">{p.branchName || "—"}</td>
                    <td className="py-2 px-3 whitespace-pre-wrap max-w-[420px]">{p.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
