import React, { useEffect, useState } from "react";
import api from "../../api";

export default function ChartOfAccounts() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/accounting/chart-of-accounts");
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e?.response?.data?.error || e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
      <h3 className="text-lg font-semibold mb-3">Chart of Accounts</h3>
      {error && <div className="text-red-500 text-sm mb-3">Error: {error}</div>}
      {loading ? (
        <div className="py-10 text-center opacity-70">Loading…</div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b dark:border-gray-700">
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Type</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b dark:border-gray-700">
                  <td className="px-3 py-2">{r.code || r.accountCode || r.number || "—"}</td>
                  <td className="px-3 py-2">{r.name || r.accountName || r.title || "—"}</td>
                  <td className="px-3 py-2">{r.type || r.category || r.group || "—"}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={3} className="px-3 py-8 text-center opacity-70">No accounts</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
