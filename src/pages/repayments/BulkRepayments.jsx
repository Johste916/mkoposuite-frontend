// src/pages/repayments/BulkRepayments.jsx
import React, { useState } from "react";
import { createBulkRepayments } from "../../api/repayments";

const emptyRow = () => ({
  loanId: "",
  loanReference: "",
  date: new Date().toISOString().slice(0, 10),
  amount: "",
  method: "cash",
  notes: "",
  waivePenalties: false,
});

const money = (v) => Number(v || 0).toLocaleString();

export default function BulkRepayments() {
  const [rows, setRows] = useState([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const update = (i, patch) => {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  };

  const addRow = () => setRows((r) => [...r, emptyRow()]);
  const removeRow = (i) => setRows((r) => r.filter((_, idx) => idx !== i));

  const submit = async () => {
    setSaving(true);
    setMessage("");
    try {
      // backend will accept either loanId or loanReference per row
      const payload = rows.filter((r) => r.amount && (r.loanId || r.loanReference) && r.date);
      const res = await createBulkRepayments(payload);
      setMessage(`Saved ${res?.saved || payload.length} rows.`);
      if (res?.errors?.length) setMessage((m) => `${m} ${res.errors.length} error(s) occurred.`);
    } catch (e) {
      setMessage(e?.response?.data?.error || "Bulk save failed");
    } finally {
      setSaving(false);
    }
  };

  const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-xl shadow p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Add Bulk Repayments</h2>
          <div className="text-sm text-gray-600">Total: {money(total)}</div>
        </div>

        <div className="overflow-x-auto border rounded-xl">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-2">Loan ID</th>
                <th className="text-left p-2">Loan Ref</th>
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Amount</th>
                <th className="text-left p-2">Method</th>
                <th className="text-left p-2">Notes</th>
                <th className="text-left p-2">Waive Pen.</th>
                <th className="text-right p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2">
                    <input className="border rounded px-2 py-1 w-28"
                      value={r.loanId} onChange={(e) => update(i, { loanId: e.target.value })} />
                  </td>
                  <td className="p-2">
                    <input className="border rounded px-2 py-1 w-36"
                      value={r.loanReference} onChange={(e) => update(i, { loanReference: e.target.value })} />
                  </td>
                  <td className="p-2">
                    <input type="date" className="border rounded px-2 py-1"
                      value={r.date} onChange={(e) => update(i, { date: e.target.value })} />
                  </td>
                  <td className="p-2">
                    <input type="number" step="0.01" className="border rounded px-2 py-1 w-28"
                      value={r.amount} onChange={(e) => update(i, { amount: e.target.value })} />
                  </td>
                  <td className="p-2">
                    <select className="border rounded px-2 py-1"
                      value={r.method} onChange={(e) => update(i, { method: e.target.value })}>
                      <option value="cash">Cash</option>
                      <option value="mobile_money">Mobile Money</option>
                      <option value="bank">Bank</option>
                    </select>
                  </td>
                  <td className="p-2">
                    <input className="border rounded px-2 py-1 w-56"
                      value={r.notes} onChange={(e) => update(i, { notes: e.target.value })} />
                  </td>
                  <td className="p-2">
                    <input type="checkbox"
                      checked={r.waivePenalties}
                      onChange={(e) => update(i, { waivePenalties: e.target.checked })} />
                  </td>
                  <td className="p-2 text-right">
                    <button className="px-2 py-1 rounded border" onClick={() => removeRow(i)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between">
          <button className="px-3 py-2 rounded border" onClick={addRow}>Add Row</button>
          <button className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-60" disabled={saving} onClick={submit}>
            {saving ? "Saving…" : "Save All"}
          </button>
        </div>

        {!!message && <div className="text-sm mt-2">{message}</div>}
      </div>
    </div>
  );
}
