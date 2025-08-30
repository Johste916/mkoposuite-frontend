import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function Payroll() {
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0,7)); // YYYY-MM
  const [loading, setLoading] = useState(true);
  const [payruns, setPayruns] = useState([]);
  const [error, setError] = useState(null);

  async function load() {
    setError(null);
    setLoading(true);
    try {
      // Prefer REST list
      let rows;
      try {
        rows = await api("/api/payroll/payruns");
      } catch {
        // fallback to any mounted base -> array or object
        const any = await api("/api/payroll");
        rows = Array.isArray(any) ? any : (any?.rows || []);
      }
      setPayruns(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function runNow() {
    try {
      setError(null);
      await api("/api/payroll/run", { method: "POST", body: { period } });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Payroll</h1>
          <p className="text-sm text-gray-500">Run payroll and review recent payruns.</p>
        </div>
        <div className="flex gap-2">
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border rounded-lg px-2 py-1 text-sm"
          />
          <button onClick={runNow} className="px-3 py-1.5 rounded-lg border">Run payroll</button>
        </div>
      </div>

      {loading && <div className="text-sm text-gray-500">Loading…</div>}
      {error && <div className="text-sm text-red-600 mb-3">Error: {error}</div>}

      <div className="rounded-2xl border bg-white dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="px-3 py-2">Period</th>
              <th className="px-3 py-2">Run At</th>
              <th className="px-3 py-2">Employees</th>
              <th className="px-3 py-2">Gross</th>
              <th className="px-3 py-2">Net</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {!payruns.length && (
              <tr><td className="px-3 py-3 text-gray-500" colSpan={6}>No payruns yet.</td></tr>
            )}
            {payruns.map((p) => (
              <tr key={p.id || `${p.period}-${p.runAt}`}>
                <td className="px-3 py-2">{p.period || '-'}</td>
                <td className="px-3 py-2">{p.runAt ? new Date(p.runAt).toLocaleString() : '-'}</td>
                <td className="px-3 py-2">{p.employees ?? '-'}</td>
                <td className="px-3 py-2">{p.gross ?? '-'}</td>
                <td className="px-3 py-2">{p.net ?? '-'}</td>
                <td className="px-3 py-2">{p.status || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
