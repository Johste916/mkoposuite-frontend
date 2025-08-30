import React, { useEffect, useMemo, useState } from "react";
import api from "../../api";

const money = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? `TZS ${n.toLocaleString()}` : "TZS —";
};

export default function PayrollReport() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true); setErr("");
      try {
        const { data } = await api.get("/payroll");
        const items = Array.isArray(data) ? data : data?.items || data?.data || [];
        setRows(items);
      } catch (e) {
        setErr(e?.response?.data?.error || e?.message || "Failed to load report.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const byPeriod = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      const k = r.period || "—";
      const prev = map.get(k) || { period: k, staff: 0, total: 0, count: 0 };
      prev.staff += Number(r.staffCount) || 0;
      prev.total += Number(r.total) || 0;
      prev.count += 1;
      map.set(k, prev);
    }
    return Array.from(map.values()).sort((a, b) => (a.period > b.period ? -1 : 1));
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <h1 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-slate-100">Payroll Report</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Aggregated totals by period.</p>
      </div>

      {err && <div className="rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-200 p-3 text-sm">{err}</div>}

      {loading ? (
        <div className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-2 px-3">Period</th>
                <th className="py-2 px-3">Records</th>
                <th className="py-2 px-3">Staff (sum)</th>
                <th className="py-2 px-3">Total (sum)</th>
              </tr>
            </thead>
            <tbody>
              {byPeriod.map((r) => (
                <tr key={r.period} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">{r.period}</td>
                  <td className="py-2 px-3">{r.count.toLocaleString()}</td>
                  <td className="py-2 px-3">{r.staff.toLocaleString()}</td>
                  <td className="py-2 px-3">{money(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
