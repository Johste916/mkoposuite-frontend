// pages/banks/BankTransactions.jsx
import React, { useEffect, useState } from "react";
import api from "../../api";
const card = "bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-5 md:p-7";
export default function BankTransactions() {
  const [banks, setBanks] = useState([]);
  const [bankId, setBankId] = useState("");
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get("/banks").then(r => setBanks(r.data||[])); }, []);
  useEffect(() => {
    if (!bankId) return setRows([]);
    api.get(`/banks/${bankId}/transactions`).then(r => setRows(r.data||[]));
  }, [bankId]);
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <h1 className="text-2xl font-bold mb-4">Bank Transactions</h1>
      <section className={card}>
        <div className="mb-3">
          <select className="border rounded px-3 py-2" value={bankId} onChange={(e)=>setBankId(e.target.value)}>
            <option value="">— choose bank —</option>
            {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead><tr className="text-left text-gray-600">
              <th className="py-2 pr-4">Date</th><th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Dir</th><th className="py-2 pr-4 text-right">Amount</th>
              <th className="py-2 pr-4">Ref</th><th className="py-2 pr-4">Status</th>
            </tr></thead>
            <tbody>
              {rows.map(x=>(
                <tr key={x.id} className="border-t">
                  <td className="py-2 pr-4">{x.occurredAt ? new Date(x.occurredAt).toLocaleString() : "—"}</td>
                  <td className="py-2 pr-4">{x.type}</td>
                  <td className="py-2 pr-4">{x.direction}</td>
                  <td className="py-2 pr-4 text-right">{Number(x.amount).toLocaleString()} {x.currency||"TZS"}</td>
                  <td className="py-2 pr-4">{x.reference||"—"}</td>
                  <td className="py-2 pr-4">{x.status}</td>
                </tr>
              ))}
              {rows.length===0 && <tr><td colSpan={6} className="py-6 text-center text-gray-500">No data</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
