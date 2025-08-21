// src/pages/repayments/UploadRepaymentsCSV.jsx
import React, { useState } from "react";
import { uploadRepaymentsCSV } from "../../api/repayments";

export default function UploadRepaymentsCSV() {
  const [file, setFile] = useState(null);
  const [dateFormat, setDateFormat] = useState("YYYY-MM-DD");
  const [method, setMethod] = useState("");
  const [waivePenalties, setWaivePenalties] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!file) return setMessage("Choose a CSV file.");
    setLoading(true);
    setMessage("");
    setResult(null);
    try {
      const data = await uploadRepaymentsCSV(file, {
        dateFormat,
        method: method || undefined,
        waivePenalties: waivePenalties ? "1" : "0",
      });
      setResult(data);
      setMessage("Uploaded.");
    } catch (e) {
      setMessage(e?.response?.data?.error || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold">Upload Repayments CSV</h2>
        <p className="text-sm text-gray-500">CSV columns: loanReference (or loanId), amount, date, method, notes</p>

        <form onSubmit={onSubmit} className="grid md:grid-cols-3 gap-4 mt-4">
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm">CSV File</label>
            <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0])} />
          </div>
          <div className="space-y-1">
            <label className="text-sm">Date format</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
              placeholder="YYYY-MM-DD"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm">Default Method (optional)</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="">(use per-row)</option>
              <option value="cash">Cash</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="bank">Bank Transfer</option>
            </select>
          </div>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={waivePenalties}
              onChange={(e) => setWaivePenalties(e.target.checked)}
            />
            <span className="text-sm">Waive penalties for all rows</span>
          </label>

          <div className="md:col-span-3 flex gap-2 justify-end">
            <button type="submit" className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-60" disabled={loading}>
              {loading ? "Uploading…" : "Upload"}
            </button>
          </div>
        </form>

        {!!message && <div className="mt-3 text-sm">{message}</div>}
        {!!result && (
          <pre className="mt-3 p-3 bg-gray-50 border rounded text-xs overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
