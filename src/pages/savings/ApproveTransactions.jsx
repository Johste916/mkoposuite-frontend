import React, { useEffect, useState } from "react";
import api from "../../api";

export default function ApproveTransactions() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    setErr(""); setLoading(true);
    try {
      const res = await api._get("/savings/transactions?status=pending&limit=100");
      setRows(res.data?.data || []);
    } catch (e) {
      setErr(e?.response?.data?.error || e?.normalizedMessage || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const act = async (id, action) => {
    try {
      await api._patch(`/savings/transactions/${id}/${action}`);
      await load();
    } catch (e) {
      alert(e?.response?.data?.error || e?.normalizedMessage || "Failed");
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4">
      <h1 className="text-lg font-semibold mb-3">Approve Savings Transactions</h1>
      {err && <div className="text-sm text-rose-600">{err}</div>}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 dark:bg-slate-800">
            <tr>
              <th className="p-2 border">Date</th>
              <th className="p-2 border">Borrower ID</th>
              <th className="p-2 border">Type</th>
              <th className="p-2 border">Amount</th>
              <th className="p-2 border">Notes</th>
              <th className="p-2 border">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td className="border p-2">{r.date}</td>
                <td className="border p-2">{r.borrowerId}</td>
                <td className="border p-2 capitalize">{r.type}</td>
                <td className="border p-2">{r.amount}</td>
                <td className="border p-2">{r.notes || '-'}</td>
                <td className="border p-2">
                  <button className="px-2 py-1 rounded bg-emerald-600 text-white mr-2" onClick={() => act(r.id, "approve")}>Approve</button>
                  <button className="px-2 py-1 rounded bg-rose-600 text-white" onClick={() => act(r.id, "reject")}>Reject</button>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && <tr><td className="p-3 text-slate-500" colSpan={6}>No pending transactions.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
