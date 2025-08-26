import React, { useEffect, useState } from "react";
import api from "../../api";

export default function ApproveTransactions() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [commentById, setCommentById] = useState({});
  const [actingId, setActingId] = useState(null);

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
    const comment = (commentById[id] || "").trim();
    if (!comment) return alert("Approval comment is required.");
    try {
      setActingId(id);
      await api._patch(`/savings/transactions/${id}/${action}`, { comment });
      await load();
      setCommentById((m) => ({ ...m, [id]: "" }));
    } catch (e) {
      alert(e?.response?.data?.error || e?.normalizedMessage || "Failed");
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-semibold">Approve Savings Transactions</h1>
        <button
          onClick={load}
          className="px-3 py-1.5 rounded border text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {err && <div className="text-sm text-rose-600 mb-2">{err}</div>}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 dark:bg-slate-800">
            <tr>
              <th className="p-2 border text-left">Date</th>
              <th className="p-2 border text-left">Borrower ID</th>
              <th className="p-2 border text-left">Type</th>
              <th className="p-2 border text-right">Amount</th>
              <th className="p-2 border text-left">Notes</th>
              <th className="p-2 border text-left w-[260px]">Approval Comment</th>
              <th className="p-2 border text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="odd:bg-white even:bg-slate-50/50 dark:odd:bg-slate-900 dark:even:bg-slate-800/60">
                <td className="border p-2">{r.date}</td>
                <td className="border p-2">{r.borrowerId}</td>
                <td className="border p-2 capitalize">{r.type}</td>
                <td className="border p-2 text-right">{r.amount}</td>
                <td className="border p-2">{r.notes || '-'}</td>
                <td className="border p-2">
                  <input
                    type="text"
                    placeholder="Required for approval"
                    className="w-full px-2 py-1 rounded border dark:bg-slate-800 dark:border-slate-700"
                    value={commentById[r.id] || ""}
                    onChange={(e) => setCommentById(m => ({ ...m, [r.id]: e.target.value }))}
                  />
                </td>
                <td className="border p-2 text-center">
                  <button
                    className="px-2 py-1 rounded bg-emerald-600 text-white mr-2 disabled:opacity-50"
                    onClick={() => act(r.id, "approve")}
                    disabled={actingId === r.id}
                  >
                    Approve
                  </button>
                  <button
                    className="px-2 py-1 rounded bg-rose-600 text-white disabled:opacity-50"
                    onClick={() => act(r.id, "reject")}
                    disabled={actingId === r.id}
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td className="p-3 text-slate-500" colSpan={7}>No pending transactions.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
