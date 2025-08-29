import React, { useEffect, useState } from "react";
import api from "../../api";

const fmt = (n) => Number(n || 0).toLocaleString();

export default function Cashflow() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/accounting/cashflow-monthly", { params: { year } });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // initial

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
      <div className="flex items-end justify-between mb-3">
        <h3 className="text-lg font-semibold">Cashflow (Monthly)</h3>
        <div className="flex items-center gap-2">
          <div className="text-sm">
            <label className="block text-xs opacity-70">Year</label>
            <input type="number" className="border rounded px-2 py-1 w-28 dark:bg-gray-700" value={year} onChange={(e) => setYear(e.target.value)} />
          </div>
          <button onClick={load} className="px-3 py-2 rounded bg-blue-600 text-white text-sm">Run</button>
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
                <th className="px-3 py-2">Month</th>
                <th className="px-3 py-2">Inflow</th>
                <th className="px-3 py-2">Outflow</th>
                <th className="px-3 py-2">Net</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.month} className="border-b dark:border-gray-700">
                  <td className="px-3 py-2">{r.month}</td>
                  <td className="px-3 py-2">{fmt(r.inflow)}</td>
                  <td className="px-3 py-2">{fmt(r.outflow)}</td>
                  <td className="px-3 py-2">{fmt(r.net)}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={4} className="px-3 py-8 text-center opacity-70">No data</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
