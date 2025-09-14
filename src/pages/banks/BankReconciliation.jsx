// pages/banks/BankReconciliation.jsx
import React, { useEffect, useState } from "react";
import api from "../../api";
const card="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-5 md:p-7";
export default function BankReconciliation(){
  const [banks,setBanks]=useState([]); const [bankId,setBankId]=useState("");
  const [rows,setRows]=useState([]);
  useEffect(()=>{ api.get("/banks").then(r=>setBanks(r.data||[])); },[]);
  useEffect(()=>{ if(!bankId) return setRows([]); api.get(`/banks/${bankId}/transactions`,{params:{reconciled:'0'}}).then(r=>setRows(r.data||[])); },[bankId]);
  const toggle=async(tx)=>{ if(tx.reconciled) await api.post(`/banks/transactions/${tx.id}/unreconcile`);
                            else await api.post(`/banks/transactions/${tx.id}/reconcile`,{bankRef:tx.bankRef||'',note:tx.note||''});
                            const r=await api.get(`/banks/${bankId}/transactions`,{params:{reconciled:'0'}}); setRows(r.data||[]); };
  return (<div className="p-4 md:p-6 lg:p-8">
    <h1 className="text-2xl font-bold mb-4">Bank Reconciliation</h1>
    <section className={card}>
      <div className="mb-3">
        <select className="border rounded px-3 py-2" value={bankId} onChange={e=>setBankId(e.target.value)}>
          <option value="">— choose bank —</option>{banks.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>
      <ul className="divide-y">
        {rows.map(tx=>(
          <li key={tx.id} className="py-3 flex items-center justify-between">
            <div className="text-sm">
              <div className="font-medium">{new Date(tx.occurredAt).toLocaleString()} — {tx.type} ({tx.direction})</div>
              <div className="text-gray-500">{Number(tx.amount).toLocaleString()} {tx.currency||"TZS"} · Ref: {tx.reference||"—"}</div>
            </div>
            <button onClick={()=>toggle(tx)} className="px-3 py-1 rounded border">{tx.reconciled ? "Unreconcile" : "Reconcile"}</button>
          </li>
        ))}
        {rows.length===0 && <li className="py-6 text-center text-gray-500">Nothing to reconcile</li>}
      </ul>
    </section>
  </div>);
}
