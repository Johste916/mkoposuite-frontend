import React, { useEffect, useState } from "react";
import {
  listBanks,
  listBankTransactions,
  reconcileBankTx,
  unreconcileBankTx,
} from "../../services/banking";

const card = "bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-5 md:p-7";
const cls = "border rounded px-3 py-2";

export default function BankReconciliation() {
  const [banks, setBanks] = useState([]);
  const [bankId, setBankId] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    listBanks()
      .then(setBanks)
      .catch(e => setErr(e?.normalizedMessage || String(e)));
  }, []);

  const load = async () => {
    if (!bankId) return setRows([]);
    setLoading(true);
    setErr(null);
    try {
      const r = await listBankTransactions(bankId, { reconciled: "0" });
      setRows(r || []);
    } catch (e) {
      setErr(e?.normalizedMessage || String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [bankId]);

  const toggle = async (tx) => {
    try {
      if (tx.reconciled) await unreconcileBankTx(tx.id);
      else await reconcileBankTx(tx.id, { bankRef: tx.bankRef || "", note: tx.note || "" });
      await load();
    } catch (e) {
      setErr(e?.normalizedMessage || String(e));
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <h1 className="text-2xl font-bold mb-4">Bank Reconciliation</h1>
      <section className={card}>
        <div className="mb-3 flex items-end gap-3">
          <select className={cls} value={bankId} onChange={(e)=>setBankId(e.target.value)}>
            <option value="">— choose bank —</option>
            {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button className="px-3 py-2 rounded border" onClick={load} disabled={!bankId || loading}>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {err && <div className="text-sm text-red-600 mb-2">{err}</div>}

        <ul className="divide-y">
          {rows.map(tx=>(
            <li key={tx.id} className="py-3 flex items-center justify-between">
              <div className="text-sm">
                <div className="font-medium">
                  {tx.occurredAt ? new Date(tx.occurredAt).toLocaleString() : "—"}
                  {" "}- {tx.type} ({tx.direction})
                </div>
                <div className="text-gray-500">
                  {Number(tx.amount).toLocaleString()} {tx.currency || "TZS"} · Ref: {tx.reference || "—"}
                </div>
              </div>
              <button onClick={()=>toggle(tx)} className="px-3 py-1 rounded border">
                {tx.reconciled ? "Unreconcile" : "Reconcile"}
              </button>
            </li>
          ))}
          {rows.length===0 && <li className="py-6 text-center text-gray-500">Nothing to reconcile</li>}
        </ul>
      </section>
    </div>
  );
}
