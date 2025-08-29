import React, { useEffect, useState, useMemo } from "react";
import api from "../../api";

const fmt = (n) => Number(n || 0).toLocaleString();

export default function TrialBalance() {
  const [asOf, setAsOf] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/accounting/trial-balance", { params: asOf ? { asOf } : {} });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const exportCSV = () => {
    const base = import.meta.env.VITE_API_BASE_URL || "";
    const qs = asOf ? `?asOf=${encodeURIComponent(asOf)}` : "";
    window.open(`${base}/accounting/trial-balance/export/csv${qs}`, "_blank");
  };

  const totals = useMemo(() => rows.reduce((acc, r) => {
    acc.debit += Number(r.debit || 0);
    acc.credit += Number(r.credit || 0);
    return acc;
  }, { debit: 0, credit: 0 }), [rows]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
      <div className="flex items-end justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold">Trial Balance</h3>
          <div className="text-xs text-slate-500">{asOf ? `As of ${asOf}` : "All time"}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm">
            <label className="block text-xs opacity-70">As of</label>
            <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="border rounded px-2 py-1 dark:bg-gray-700"/>
          </div>
          <button onClick={load} className="px-3 py-2 rounded bg-blue-600 text-white text-sm">Run</button>
          <button onClick={exportCSV} className="px-3 py-2 rounded border text-sm">Export CSV</button>
        </div>
      </div>

      {error && <div className="text-red-500 text-sm mb-3">Error: {error}</div>}
      {loading ? (
        <div className="py-10 text-center opacity-70">Loading…</div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b dark:border-gray-700">
                <th className="px-3 py-2">Account</th>
                <th className="px-3 py-2">Debit</th>
                <th className="px-3 py-2">Credit</th>
                <th className="px-3 py-2">Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.accountId} className="border-b dark:border-gray-700">
                  <td className="px-3 py-2">{r.accountCode || "—"} — {r.accountName || "—"}</td>
                  <td className="px-3 py-2">{fmt(r.debit)}</td>
                  <td className="px-3 py-2">{fmt(r.credit)}</td>
                  <td className="px-3 py-2">{fmt(r.balance)}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={4} className="px-3 py-8 text-center opacity-70">No data</td></tr>}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td className="px-3 py-2 text-right">Totals</td>
                <td className="px-3 py-2">{fmt(totals.debit)}</td>
                <td className="px-3 py-2">{fmt(totals.credit)}</td>
                <td className="px-3 py-2">{fmt(totals.debit - totals.credit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
