// pages/cash/CashTransactions.jsx
import React, { useEffect, useState } from "react";
import api from "../../api";
const card="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-5 md:p-7";
export default function CashTransactions(){
  const [rows,setRows]=useState([]);
  useEffect(()=>{ api.get("/cash/transactions").then(r=>setRows(r.data||[])); },[]);
  return (<div className="p-4 md:p-6 lg:p-8">
    <h1 className="text-2xl font-bold mb-4">Cash Transactions</h1>
    <section className={card}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead><tr className="text-left text-gray-600">
            <th className="py-2 pr-4">Date</th><th className="py-2 pr-4">Account</th>
            <th className="py-2 pr-4">Type</th><th className="py-2 pr-4">Dir</th>
            <th className="py-2 pr-4 text-right">Amount</th><th className="py-2 pr-4">Ref</th>
          </tr></thead>
          <tbody>
            {rows.map(x=>(
              <tr key={x.id} className="border-t">
                <td className="py-2 pr-4">{x.occurredAt?new Date(x.occurredAt).toLocaleString():"—"}</td>
                <td className="py-2 pr-4">{x.cashAccountId?.slice?.(0,8) || "—"}</td>
                <td className="py-2 pr-4">{x.type}</td>
                <td className="py-2 pr-4">{x.direction}</td>
                <td className="py-2 pr-4 text-right">{Number(x.amount).toLocaleString()} {x.currency||"TZS"}</td>
                <td className="py-2 pr-4">{x.reference||"—"}</td>
              </tr>
            ))}
            {rows.length===0 && <tr><td colSpan={6} className="py-6 text-center text-gray-500">No data</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  </div>);
}
