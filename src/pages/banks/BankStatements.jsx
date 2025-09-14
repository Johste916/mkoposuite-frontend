// pages/banks/BankStatements.jsx
import React, { useEffect, useState } from "react";
import api from "../../api";
const card="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-5 md:p-7";
export default function BankStatements(){
  const [banks,setBanks]=useState([]); const [bankId,setBankId]=useState("");
  const [from,setFrom]=useState(""); const [to,setTo]=useState("");
  const [data,setData]=useState(null);
  useEffect(()=>{ api.get("/banks").then(r=>setBanks(r.data||[])); },[]);
  const run=async()=>{ if(!bankId) return; const r=await api.get(`/banks/${bankId}/statement`,{params:{from,to,includeOpening:1}}); setData(r.data); };
  return (<div className="p-4 md:p-6 lg:p-8">
    <h1 className="text-2xl font-bold mb-4">Bank Statement</h1>
    <section className={card}>
      <div className="grid md:grid-cols-4 gap-2 mb-3">
        <select className="border rounded px-3 py-2" value={bankId} onChange={e=>setBankId(e.target.value)}>
          <option value="">— bank —</option>{banks.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <input type="date" className="border rounded px-3 py-2" value={from} onChange={e=>setFrom(e.target.value)} />
        <input type="date" className="border rounded px-3 py-2" value={to} onChange={e=>setTo(e.target.value)} />
        <button className="px-3 py-2 rounded bg-indigo-600 text-white" onClick={run}>Generate</button>
      </div>
      {data && (
        <div>
          {data.opening!=null && <div className="mb-2 text-sm text-gray-600">Opening: {Number(data.opening).toLocaleString()}</div>}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead><tr className="text-left text-gray-600"><th className="py-2 pr-4">Date</th><th className="py-2 pr-4">Type</th><th className="py-2 pr-4">Dir</th><th className="py-2 pr-4 text-right">Amount</th><th className="py-2 pr-4">Ref</th></tr></thead>
              <tbody>
                {data.items?.map(x=>(
                  <tr key={x.id} className="border-t">
                    <td className="py-2 pr-4">{x.occurredAt?new Date(x.occurredAt).toLocaleString():"—"}</td>
                    <td className="py-2 pr-4">{x.type}</td>
                    <td className="py-2 pr-4">{x.direction}</td>
                    <td className="py-2 pr-4 text-right">{Number(x.amount).toLocaleString()} {x.currency||"TZS"}</td>
                    <td className="py-2 pr-4">{x.reference||"—"}</td>
                  </tr>
                ))}
                {(!data.items||!data.items.length) && <tr><td colSpan={5} className="py-6 text-center text-gray-500">No rows</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  </div>);
}
