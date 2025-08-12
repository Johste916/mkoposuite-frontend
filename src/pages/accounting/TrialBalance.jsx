import React, { useEffect, useState } from "react";
import api from "../../api";

export default function TrialBalance() {
  const [asOf, setAsOf] = useState("");
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  const load = () => {
    api.get("/accounting/trial-balance", { params: asOf ? { asOf } : {} })
      .then(res => setRows(res.data || []))
      .catch(e => setError(e?.response?.data?.error || e.message));
  };

  useEffect(() => { load(); }, []); // initial

  const totals = rows.reduce((acc, r) => {
    acc.debit += Number(r.debit || 0);
    acc.credit += Number(r.credit || 0);
    return acc;
  }, { debit: 0, credit: 0 });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
      <div className="flex items-end justify-between mb-3">
        <h3 className="text-lg font-semibold">Trial Balance</h3>
        <div className="flex items-center gap-2">
          <div className="text-sm">
            <label className="block text-xs opacity-70">As of</label>
            <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="border rounded px-2 py-1 dark:bg-gray-700"/>
          </div>
          <button onClick={load} className="px-3 py-2 rounded bg-blue-600 text-white text-sm">Run</button>
        </div>
      </div>
      {error && <div className="text-red-500 text-sm mb-3">Error: {error}</div>}
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
            {rows.map(r => (
              <tr key={r.accountId} className="border-b dark:border-gray-700">
                <td className="px-3 py-2">{r.accountCode} — {r.accountName}</td>
                <td className="px-3 py-2">{Number(r.debit || 0).toLocaleString()}</td>
                <td className="px-3 py-2">{Number(r.credit || 0).toLocaleString()}</td>
                <td className="px-3 py-2">{Number(r.balance || 0).toLocaleString()}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="px-3 py-8 text-center opacity-70">No data</td></tr>}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td className="px-3 py-2 text-right">Totals</td>
              <td className="px-3 py-2">{totals.debit.toLocaleString()}</td>
              <td className="px-3 py-2">{totals.credit.toLocaleString()}</td>
              <td className="px-3 py-2">{(totals.debit - totals.credit).toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
