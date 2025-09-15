import React, { useEffect, useState } from "react";
import { listBanks, transferBetweenBanks } from "../../services/banking";

const card = "bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-5 md:p-7";
const cls = "w-full border rounded px-3 py-2";

export default function BankTransfers() {
  const [banks, setBanks] = useState([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(()=>{ listBanks().then(setBanks).catch(e=>setErr(e?.normalizedMessage || String(e))); },[]);

  const submit = async (e) => {
    e.preventDefault();
    if (!from || !to || !amount) return alert("From, to, amount");
    try {
      setLoading(true);
      setErr(null);
      await transferBetweenBanks(from, { toBankId: to, amount: Number(amount), occurredAt, reference });
      setAmount(""); setOccurredAt(""); setReference("");
      alert("Transferred");
    } catch (e) {
      setErr(e?.normalizedMessage || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <h1 className="text-2xl font-bold mb-4">Bank to Bank Transfer</h1>
      <form onSubmit={submit} className={card}>
        {err && <div className="text-sm text-red-600 mb-2">{err}</div>}
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-600">From</label>
            <select className={cls} value={from} onChange={(e)=>setFrom(e.target.value)}>
              <option value="">—</option>
              {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600">To</label>
            <select className={cls} value={to} onChange={(e)=>setTo(e.target.value)}>
              <option value="">—</option>
              {banks.filter(b => String(b.id) !== String(from)).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600">Amount</label>
            <input className={cls} type="number" step="0.01" value={amount} onChange={(e)=>setAmount(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-600">Occurred At</label>
            <input className={cls} type="datetime-local" value={occurredAt} onChange={(e)=>setOccurredAt(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-gray-600">Reference</label>
            <input className={cls} value={reference} onChange={(e)=>setReference(e.target.value)} />
          </div>
        </div>
        <div className="mt-4">
          <button className="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-60" disabled={loading}>
            {loading ? "Transferring…" : "Transfer"}
          </button>
        </div>
      </form>
    </div>
  );
}
