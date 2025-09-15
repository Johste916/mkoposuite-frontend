import { useEffect, useState } from "react";
import { listCashAccounts, getCashStatement } from "../../services/banking";

export default function CashStatement() {
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [includeOpening, setIncludeOpening] = useState(true);
  const [stmt, setStmt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    listCashAccounts().then(setAccounts).catch(e => setErr(e?.normalizedMessage || String(e)));
  }, []);

  const load = async () => {
    if (!accountId) return;
    setLoading(true); setErr(null);
    try {
      const s = await getCashStatement(accountId, { from, to, includeOpening });
      setStmt(s);
    } catch (e) {
      setErr(e?.normalizedMessage || String(e));
    } finally { setLoading(false); }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Cash Statement</h1>
        <div className="text-xs text-gray-500">/api/banks/cash/accounts/:id/statement</div>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm">Cash Account</label>
          <select className="border px-2 py-1 rounded" value={accountId} onChange={e=>setAccountId(e.target.value)}>
            <option value="">-- select --</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm">From</label>
          <input type="date" className="border px-2 py-1 rounded" value={from} onChange={e=>setFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">To</label>
          <input type="date" className="border px-2 py-1 rounded" value={to} onChange={e=>setTo(e.target.value)} />
        </div>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={includeOpening} onChange={e=>setIncludeOpening(e.target.checked)} />
          <span className="text-sm">Include opening</span>
        </label>
        <button className="bg-black text-white px-3 py-1 rounded" onClick={load} disabled={!accountId || loading}>
          {loading ? "Loading…" : "Load"}
        </button>
      </div>

      {err && <div className="text-red-600 text-sm">{err}</div>}

      {stmt && (
        <div className="space-y-3">
          <div className="text-sm">
            Account: <b>{stmt.account?.name}</b> • Opening:{" "}
            <b>{Number(stmt.openingBalance || 0).toLocaleString()}</b>{" "}
            {stmt.account?.currency}
          </div>
          <div className="overflow-auto border rounded">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">Date</th>
                  <th className="border px-2 py-1">Type</th>
                  <th className="border px-2 py-1">Dir</th>
                  <th className="border px-2 py-1 text-right">Amount</th>
                  <th className="border px-2 py-1">Ref</th>
                  <th className="border px-2 py-1">Desc</th>
                  <th className="border px-2 py-1">Status</th>
                </tr>
              </thead>
              <tbody>
                {stmt.items?.map(tx => (
                  <tr key={tx.id}>
                    <td className="border px-2 py-1">{tx.occurredAt ? new Date(tx.occurredAt).toLocaleString() : "—"}</td>
                    <td className="border px-2 py-1">{tx.type}</td>
                    <td className="border px-2 py-1">{tx.direction}</td>
                    <td className="border px-2 py-1 text-right">{Number(tx.amount).toLocaleString()}</td>
                    <td className="border px-2 py-1">{tx.reference || ""}</td>
                    <td className="border px-2 py-1">{tx.description || ""}</td>
                    <td className="border px-2 py-1">{tx.status}</td>
                  </tr>
                ))}
                {!stmt.items?.length && (
                  <tr><td className="border px-2 py-2 text-center" colSpan={7}>No transactions</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
