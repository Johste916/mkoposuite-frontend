import React, { useState } from "react";
import api from "../../api";

const today = () => new Date().toISOString().slice(0, 10);

const newRow = () => ({
  loanId: "",
  amount: "",
  date: today(),
  method: "cash",
  reference: "",
  notes: "",
});

export default function BulkRepayments() {
  const [rows, setRows] = useState([newRow()]);
  const [posting, setPosting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const setCell = (i, key, val) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));

  const addRow = () => setRows((rs) => [...rs, newRow()]);
  const removeRow = (i) => setRows((rs) => rs.filter((_, idx) => idx !== i));

  const post = async () => {
    const items = rows
      .map((r) => ({
        loanId: r.loanId ? Number(r.loanId) : undefined,
        amount: Number(r.amount || 0),
        date: r.date,
        method: r.method,
        reference: r.reference || undefined,
        notes: r.notes || undefined,
      }))
      .filter((x) => x.loanId && x.amount > 0 && x.date);

    if (!items.length) return alert("Fill at least one valid row.");

    setPosting(true);
    setError("");
    setResult(null);
    try {
      const { data } = await api.post("/repayments/bulk", { items });
      setResult(data || { ok: true });
    } catch (e) {
      setError(e?.response?.data?.error || "Bulk posting failed");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg border shadow p-6">
        <h2 className="text-xl font-semibold">Add Bulk Repayments</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Enter multiple repayments and submit in a single batch.
        </p>

        <div className="overflow-x-auto border rounded-xl mt-4">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-3 text-left">Loan ID</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Amount</th>
                <th className="p-3 text-left">Method</th>
                <th className="p-3 text-left">Reference</th>
                <th className="p-3 text-left">Notes</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2">
                    <input
                      className="border rounded px-2 py-1 w-28"
                      value={r.loanId}
                      onChange={(e) => setCell(i, "loanId", e.target.value)}
                      placeholder="123"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="date"
                      className="border rounded px-2 py-1"
                      value={r.date}
                      onChange={(e) => setCell(i, "date", e.target.value)}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      className="border rounded px-2 py-1 w-28"
                      value={r.amount}
                      onChange={(e) => setCell(i, "amount", e.target.value)}
                      placeholder="0.00"
                    />
                  </td>
                  <td className="p-2">
                    <select
                      className="border rounded px-2 py-1"
                      value={r.method}
                      onChange={(e) => setCell(i, "method", e.target.value)}
                    >
                      <option value="cash">Cash</option>
                      <option value="mobile_money">Mobile Money</option>
                      <option value="bank">Bank</option>
                      <option value="card">Card</option>
                      <option value="adjustment">Adjustment</option>
                    </select>
                  </td>
                  <td className="p-2">
                    <input
                      className="border rounded px-2 py-1"
                      value={r.reference}
                      onChange={(e) => setCell(i, "reference", e.target.value)}
                      placeholder="MPESA-… / Bank txn"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      className="border rounded px-2 py-1 w-64"
                      value={r.notes}
                      onChange={(e) => setCell(i, "notes", e.target.value)}
                      placeholder="optional"
                    />
                  </td>
                  <td className="p-2 text-right">
                    <button
                      className="px-2 py-1 rounded border hover:bg-gray-50"
                      onClick={() => removeRow(i)}
                      disabled={rows.length === 1}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="border-t">
                <td colSpan={7} className="p-3">
                  <button
                    className="px-3 py-1.5 rounded border hover:bg-gray-50"
                    onClick={addRow}
                  >
                    + Add Row
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={post}
            disabled={posting}
            className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {posting ? "Submitting…" : "Submit Bulk"}
          </button>
          <button
            className="px-3 py-2 rounded border hover:bg-gray-50"
            onClick={() => {
              setRows([newRow()]);
              setResult(null);
              setError("");
            }}
          >
            Reset
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded bg-red-50 text-red-700 text-sm border border-red-200">
            {error}
          </div>
        )}
        {result && (
          <div className="mt-4">
            <h3 className="font-semibold">Result</h3>
            <pre className="mt-2 p-3 text-sm bg-gray-50 dark:bg-gray-900 rounded border overflow-auto">
{JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
