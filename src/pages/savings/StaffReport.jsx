import React, { useEffect, useState } from "react";
import api from "../../api";

export default function StaffReport() {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      const p = new URLSearchParams();
      if (start) p.set("start", start);
      if (end) p.set("end", end);
      const res = await api._get(`/savings/transactions/staff-report?${p.toString()}`);
      setRows(res.data || []);
    } catch (e) {
      setError(e?.response?.data?.error || e?.normalizedMessage || "Failed to load");
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const total = (k) => rows.reduce((s, r) => s + Number(r[k] || 0), 0);

  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4">
      <h1 className="text-lg font-semibold mb-3">Staff Transactions Report</h1>
      <div className="flex gap-2 mb-3">
        <input type="date" value={start} onChange={e=>setStart(e.target.value)} className="border px-3 py-2 rounded" />
        <input type="date" value={end} onChange={e=>setEnd(e.target.value)} className="border px-3 py-2 rounded" />
        <button onClick={load} className="px-3 py-2 rounded bg-blue-600 text-white">Filter</button>
      </div>
      {error && <div className="text-rose-600 text-sm mb-2">Error: {error}</div>}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 dark:bg-slate-800">
            <tr>
              <th className="p-2 border">Staff</th>
              <th className="p-2 border">Deposits</th>
              <th className="p-2 border">Withdrawals</th>
              <th className="p-2 border">Charges</th>
              <th className="p-2 border">Interest</th>
              <th className="p-2 border">Approved</th>
              <th className="p-2 border">Pending</th>
              <th className="p-2 border">Rejected</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.staffId || r.staffName || Math.random()}>
                <td className="border p-2">{r.staffName || `User #${r.staffId || '-'}`}</td>
                <td className="border p-2">{r.deposit}</td>
                <td className="border p-2">{r.withdrawal}</td>
                <td className="border p-2">{r.charge}</td>
                <td className="border p-2">{r.interest}</td>
                <td className="border p-2">{r.approvedCount}</td>
                <td className="border p-2">{r.pendingCount}</td>
                <td className="border p-2">{r.rejectedCount}</td>
              </tr>
            ))}
            {!rows.length && <tr><td className="p-3 text-slate-500" colSpan={8}>No data.</td></tr>}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="font-semibold">
                <td className="border p-2">TOTAL</td>
                <td className="border p-2">{total("deposit")}</td>
                <td className="border p-2">{total("withdrawal")}</td>
                <td className="border p-2">{total("charge")}</td>
                <td className="border p-2">{total("interest")}</td>
                <td className="border p-2">{total("approvedCount")}</td>
                <td className="border p-2">{total("pendingCount")}</td>
                <td className="border p-2">{total("rejectedCount")}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
