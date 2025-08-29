import React, { useEffect, useState } from "react";
import api from "../../api";

const fmt = (n) => Number(n || 0).toLocaleString();

export default function ProfitLoss() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const run = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const { data } = await api.get("/accounting/profit-loss", { params });
      setResult(data || null);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const base = import.meta.env.VITE_API_BASE_URL || "";
    const params = new URLSearchParams({});
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const qs = params.toString();
    window.open(`${base}/accounting/profit-loss/export/csv${qs ? `?${qs}` : ""}`, "_blank");
  };

  useEffect(() => { run(); }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
      <div className="flex items-end justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold">Profit &amp; Loss</h3>
          <div className="text-xs text-slate-500">
            {from || to ? `${from || "…"} → ${to || "…"}` : "All time"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm">
            <label className="block text-xs opacity-70">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border rounded px-2 py-1 dark:bg-gray-700" />
          </div>
          <div className="text-sm">
            <label className="block text-xs opacity-70">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border rounded px-2 py-1 dark:bg-gray-700" />
          </div>
          <button onClick={run} className="px-3 py-2 rounded bg-blue-600 text-white text-sm">Run</button>
          <button onClick={exportCSV} className="px-3 py-2 rounded border text-sm">Export CSV</button>
        </div>
      </div>

      {error && <div className="text-red-500 text-sm mb-3">Error: {error}</div>}
      {loading || !result ? (
        <div className="py-10 text-center opacity-70">Loading…</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="font-semibold mb-2">Income</h4>
            <div className="border rounded">
              <table className="w-full">
                <tbody>
                  {(result.income || []).map((l) => (
                    <tr key={l.accountId} className="border-b last:border-0">
                      <td className="px-3 py-2">{l.code || "—"} — {l.name || "—"}</td>
                      <td className="px-3 py-2 text-right">{fmt(l.amount)}</td>
                    </tr>
                  ))}
                  {(!result.income || result.income.length === 0) && (
                    <tr><td className="px-3 py-4 text-center opacity-60">No income lines</td></tr>
                  )}
                  <tr className="font-semibold border-t">
                    <td className="px-3 py-2 text-right">Total Income</td>
                    <td className="px-3 py-2 text-right">{fmt(result.totalIncome)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Expenses</h4>
            <div className="border rounded">
              <table className="w-full">
                <tbody>
                  {(result.expense || []).map((l) => (
                    <tr key={l.accountId} className="border-b last:border-0">
                      <td className="px-3 py-2">{l.code || "—"} — {l.name || "—"}</td>
                      <td className="px-3 py-2 text-right">{fmt(l.amount)}</td>
                    </tr>
                  ))}
                  {(!result.expense || result.expense.length === 0) && (
                    <tr><td className="px-3 py-4 text-center opacity-60">No expense lines</td></tr>
                  )}
                  <tr className="font-semibold border-t">
                    <td className="px-3 py-2 text-right">Total Expense</td>
                    <td className="px-3 py-2 text-right">{fmt(result.totalExpense)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="md:col-span-2 border-t pt-2 font-semibold flex justify-between">
            <span>Net Profit</span>
            <span>{fmt(result.netProfit)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
