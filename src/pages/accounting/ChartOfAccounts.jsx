import React, { useEffect, useState } from "react";
import api from "../../api";

export default function ChartOfAccounts() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/accounting/chart-of-accounts")
      .then(res => setRows(res.data || []))
      .catch(e => setError(e?.response?.data?.error || e.message));
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
      <h3 className="text-lg font-semibold mb-3">Chart of Accounts</h3>
      {error && <div className="text-red-500 text-sm mb-3">Error: {error}</div>}
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
            {rows.map(r => (
              <tr key={r.id} className="border-b dark:border-gray-700">
                <td className="px-3 py-2">{r.code}</td>
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2">{r.type}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={3} className="px-3 py-8 text-center opacity-70">No accounts</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
