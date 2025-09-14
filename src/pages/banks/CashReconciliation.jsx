// src/pages/banking/CashReconciliation.jsx
import { useEffect, useState } from "react";
import {
  listCashAccounts,
  cashAccountTransactions,
  cashReconcile,
  cashUnreconcile,
} from "../../services/banking";

export default function CashReconciliation() {
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => { listCashAccounts().then(setAccounts).catch(e=>setErr(e?.normalizedMessage || String(e))); }, []);

  const load = async () => {
    if (!accountId) return;
    setLoading(true); setErr(null);
    try {
      const data = await cashAccountTransactions(accountId, { status: "posted" });
      setRows(data);
    } catch (e) { setErr(e?.normalizedMessage || String(e)); }
    finally { setLoading(false); }
  };

  const toggle = async (tx) => {
    try {
      if (tx.reconciled) await cashUnreconcile(tx.id);
      else await cashReconcile(tx.id);
      await load();
    } catch (e) { setErr(e?.normalizedMessage || String(e)); }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Cash Reconciliation</h1>
        <div className="text-xs text-gray-500">/api/banks/cash/transactions/:id/(un)reconcile</div>
      </div>

      <div className="flex gap-3 items-end">
        <div>
          <label className="block text-sm">Cash Account</label>
          <select className="border px-2 py-1 rounded" value={accountId} onChange={e=>setAccountId(e.target.value)}>
            <option value="">-- select --</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <button className="bg-black text-white px-3 py-1 rounded" onClick={load} disabled={!accountId || loading}>
          {loading ? "Loading…" : "Load"}
        </button>
      </div>

      {err && <div className="text-red-600 text-sm">{err}</div>}

      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="border px-2 py-1 text-left">Date</th>
              <th className="border px-2 py-1">Type</th>
              <th className="border px-2 py-1">Dir</th>
              <th className="border px-2 py-1 text-right">Amount</th>
              <th className="border px-2 py-1">Reconciled</th>
              <th className="border px-2 py-1">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td className="border px-2 py-1">{new Date(r.occurredAt).toLocaleString()}</td>
                <td className="border px-2 py-1">{r.type}</td>
                <td className="border px-2 py-1">{r.direction}</td>
                <td className="border px-2 py-1 text-right">{Number(r.amount).toLocaleString()}</td>
                <td className="border px-2 py-1">{r.reconciled ? "Yes" : "No"}</td>
                <td className="border px-2 py-1">
                  <button className="underline text-blue-700" onClick={() => toggle(r)}>
                    {r.reconciled ? "Unreconcile" : "Reconcile"}
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td className="border px-2 py-2 text-center" colSpan={6}>No rows</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
