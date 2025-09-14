// src/pages/banking/BankApprovals.jsx
import { useEffect, useState } from "react";
import {
  listPendingBankTx, listPendingCashTx,
  approveBankTx, rejectBankTx, approveCashTx, rejectCashTx,
} from "../../services/banking";

export default function BankApprovals() {
  const [bankRows, setBankRows] = useState([]);
  const [cashRows, setCashRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const load = async () => {
    setLoading(true); setErr(null);
    try {
      const [b, c] = await Promise.all([listPendingBankTx(), listPendingCashTx()]);
      setBankRows(b || []); setCashRows(c || []);
    } catch (e) { setErr(e?.normalizedMessage || String(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const act = async (kind, txId, action) => {
    try {
      if (kind === "bank") {
        if (action === "approve") await approveBankTx(txId);
        else await rejectBankTx(txId, "Rejected in UI");
      } else {
        if (action === "approve") await approveCashTx(txId);
        else await rejectCashTx(txId, "Rejected in UI");
      }
      await load();
    } catch (e) { setErr(e?.normalizedMessage || String(e)); }
  };

  const Card = ({ title, items, kind }) => (
    <div className="border rounded p-3">
      <div className="font-semibold mb-2">{title}</div>
      <div className="overflow-auto">
        <table className="min-w-full text-sm border">
          <thead className="bg-gray-50">
            <tr>
              <th className="border px-2 py-1 text-left">Date</th>
              <th className="border px-2 py-1">Type</th>
              <th className="border px-2 py-1 text-right">Amount</th>
              <th className="border px-2 py-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(x => (
              <tr key={x.id}>
                <td className="border px-2 py-1">{new Date(x.occurredAt).toLocaleString()}</td>
                <td className="border px-2 py-1">{x.type}</td>
                <td className="border px-2 py-1 text-right">{Number(x.amount).toLocaleString()}</td>
                <td className="border px-2 py-1 space-x-2">
                  <button className="px-2 py-0.5 bg-green-600 text-white rounded" onClick={()=>act(kind, x.id, "approve")}>Approve</button>
                  <button className="px-2 py-0.5 bg-red-600 text-white rounded" onClick={()=>act(kind, x.id, "reject")}>Reject</button>
                </td>
              </tr>
            ))}
            {!items.length && <tr><td className="border px-2 py-2 text-center" colSpan={4}>No pending items</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Banking Approvals</h1>
        <button className="bg-black text-white px-3 py-1 rounded" onClick={load} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      {err && <div className="text-red-600 text-sm">{err}</div>}
      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Bank — Pending" items={bankRows} kind="bank" />
        <Card title="Cash — Pending" items={cashRows} kind="cash" />
      </div>
    </div>
  );
}
