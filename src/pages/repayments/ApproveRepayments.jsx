// src/pages/repayments/ApproveRepayments.jsx
import React, { useEffect, useState } from "react";
import client from "../../api/client";
import { approveRepayment, rejectRepayment } from "../../api/repayments";

const money = (v) => Number(v || 0).toLocaleString();

export default function ApproveRepayments() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    setLoading(true);
    setMsg("");
    try {
      // expects backend to support status=pending on /repayments
      const { data } = await client.get("/repayments", { params: { status: "pending", pageSize: 200 } });
      setItems(Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []);
    } catch (e) {
      setMsg(e?.response?.data?.error || "Load failed");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const doApprove = async (id) => {
    try {
      await approveRepayment(id);
      setItems((arr) => arr.filter((x) => x.id !== id));
    } catch (e) {
      setMsg(e?.response?.data?.error || "Approve failed");
    }
  };
  const doReject = async (id) => {
    const reason = prompt("Reason for rejection (optional):") || "";
    try {
      await rejectRepayment(id, reason);
      setItems((arr) => arr.filter((x) => x.id !== id));
    } catch (e) {
      setMsg(e?.response?.data?.error || "Reject failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-xl shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Approve Repayments</h2>
            <p className="text-sm text-gray-500">Review manually posted or auto-captured repayments.</p>
          </div>
          <button className="px-3 py-2 rounded border" onClick={load}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {!!msg && <div className="mt-3 text-sm">{msg}</div>}

        <div className="overflow-x-auto border rounded-xl mt-3">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Loan</th>
                <th className="text-left p-2">Borrower</th>
                <th className="text-left p-2">Amount</th>
                <th className="text-left p-2">Method</th>
                <th className="text-left p-2">Reference</th>
                <th className="text-right p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && !loading && (
                <tr>
                  <td className="p-3 text-gray-500" colSpan={7}>No pending items.</td>
                </tr>
              )}
              {items.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{r.date || r.paymentDate || r.createdAt?.slice(0,10)}</td>
                  <td className="p-2">{r.Loan?.reference || `L-${r.loanId}`}</td>
                  <td className="p-2">{r.Loan?.Borrower?.name || "—"}</td>
                  <td className="p-2">{r.currency || "TZS"} {money(r.amount ?? r.amountPaid ?? 0)}</td>
                  <td className="p-2">{r.method || "—"}</td>
                  <td className="p-2">{r.reference || r.ref || "—"}</td>
                  <td className="p-2 text-right">
                    <div className="flex gap-2 justify-end">
                      <button className="px-2 py-1 rounded border" onClick={() => doApprove(r.id)}>Approve</button>
                      <button className="px-2 py-1 rounded border" onClick={() => doReject(r.id)}>Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
              {loading && (
                <tr><td className="p-3" colSpan={7}>Loading…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
