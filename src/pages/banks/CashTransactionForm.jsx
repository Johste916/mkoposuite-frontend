import React, { useEffect, useState } from "react";
import { listCashAccounts, createCashTransaction } from "../../services/banking";

const card = "bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-5 md:p-7";
const cls = "w-full border rounded px-3 py-2";

export default function CashTransactionForm() {
  const [accounts, setAccounts] = useState([]);
  const [cashAccountId, setAcc] = useState("");
  const [direction, setDir] = useState("in");
  const [type, setType] = useState("other");
  const [amount, setAmount] = useState("");
  const [occurredAt, setWhen] = useState("");
  const [reference, setRef] = useState("");
  const [description, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(()=>{ listCashAccounts().then(setAccounts).catch(e=>setErr(e?.normalizedMessage || String(e))); },[]);

  const submit = async (e) => {
    e.preventDefault();
    if (!cashAccountId || !amount) return alert("Account & amount required");
    try {
      setLoading(true);
      setErr(null);
      await createCashTransaction(cashAccountId, {
        direction,
        type,
        amount: Number(amount),
        occurredAt: occurredAt || undefined,
        reference,
        description,
      });
      setAmount(""); setWhen(""); setRef(""); setDesc("");
      alert("Saved");
    } catch (e) {
      setErr(e?.normalizedMessage || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <h1 className="text-2xl font-bold mb-4">Add Cash Transaction</h1>
      <form onSubmit={submit} className={card}>
        {err && <div className="text-sm text-red-600 mb-2">{err}</div>}
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-600">Cash Account</label>
            <select className={cls} value={cashAccountId} onChange={e=>setAcc(e.target.value)}>
              <option value="">—</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600">Direction</label>
            <select className={cls} value={direction} onChange={e=>setDir(e.target.value)}>
              <option value="in">In</option>
              <option value="out">Out</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600">Type</label>
            <input className={cls} value={type} onChange={e=>setType(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-600">Amount</label>
            <input className={cls} type="number" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-600">Occurred At</label>
            <input className={cls} type="datetime-local" value={occurredAt} onChange={e=>setWhen(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-gray-600">Reference</label>
            <input className={cls} value={reference} onChange={e=>setRef(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-gray-600">Description</label>
            <input className={cls} value={description} onChange={e=>setDesc(e.target.value)} />
          </div>
        </div>
        <div className="mt-4">
          <button className="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-60" disabled={loading}>
            {loading ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
