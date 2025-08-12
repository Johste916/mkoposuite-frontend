import React, { useEffect, useState } from "react";
import api from "../../api";

export default function ProfitLoss() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [resu, setResu] = useState(null);
  const [error, setError] = useState("");

  const run = () => {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    api.get("/accounting/profit-loss", { params })
      .then((r) => setResu(r.data))
      .catch((e) => setError(e?.response?.data?.error || e.message));
  };

  useEffect(() => { run(); }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
      <div className="flex items-end justify-between mb-3">
        <h3 className="text-lg font-semibold">Profit & Loss</h3>
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
        </div>
      </div>
      {error && <div className="text-red-500 text-sm mb-3">Error: {error}</div>}
      {!resu ? (
        <div className="py-10 text-center opacity-70">Loading…</div>
      ) : (
        <div className="text-sm">
          <div className="flex justify-between py-1"><span>Total Income</span><span>{Number(resu.totalIncome || 0).toLocaleString()}</span></div>
          <div className="flex justify-between py-1"><span>Total Expense</span><span>{Number(resu.totalExpense || 0).toLocaleString()}</span></div>
          <div className="flex justify-between py-2 font-semibold border-t mt-2"><span>Net Profit</span><span>{Number(resu.netProfit || 0).toLocaleString()}</span></div>
        </div>
      )}
    </div>
  );
}
