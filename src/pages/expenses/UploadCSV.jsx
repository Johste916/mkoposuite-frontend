// frontend/src/pages/expenses/UploadCSV.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";

export default function UploadExpensesCSV() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const onDownloadTemplate = () => {
    const template =
      "date,type,amount,vendor,reference,note,branch_id\n" +
      "2025-08-01,OPERATING,125000,Office Supplies Ltd,INV-001,Stationery,\n";
    const blob = new Blob([template], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "expenses_template.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!file) {
      setError("Please choose a CSV file.");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api._post("/expenses/csv", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res?.data || { inserted: 0, failed: 0, errors: [] });
    } catch (err) {
      setError(err?.response?.data?.error || err?.normalizedMessage || err?.message || "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  const card = "bg-white dark:bg-slate-800 rounded-xl shadow p-4";
  const label = "block text-sm font-medium mb-1";
  const input = "w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:border-slate-600";

  return (
    <div className={card}>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Upload Expenses CSV</h2>
        <p className="text-xs opacity-70">
          Columns supported: <code>date,type,amount,vendor,reference,note,branch_id</code>. Date format: <code>YYYY-MM-DD</code>.
        </p>
      </div>

      {error ? <div className="mb-3 text-sm text-rose-600 dark:text-rose-300">Error: {String(error)}</div> : null}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className={label}>CSV File</label>
          <input
            type="file"
            accept=".csv,text/csv"
            className={input}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={submitting || !file}
            className={`px-4 py-2 rounded text-white ${submitting || !file ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            {submitting ? "Uploading…" : "Upload"}
          </button>
          <button type="button" onClick={onDownloadTemplate} className="px-4 py-2 rounded border dark:border-slate-600">
            Download Template
          </button>
          <button type="button" onClick={() => navigate("/expenses")} className="px-4 py-2 rounded border dark:border-slate-600">
            Back to Expenses
          </button>
        </div>
      </form>

      {result && (
        <div className="mt-4 text-sm">
          <div className="font-medium">Result</div>
          <div className="mt-1">Inserted: <b>{result.inserted}</b></div>
          <div>Failed: <b>{result.failed}</b></div>
          {Array.isArray(result.errors) && result.errors.length > 0 && (
            <div className="mt-2">
              <div className="font-medium mb-1">Errors:</div>
              <ul className="list-disc ml-6 space-y-1">
                {result.errors.slice(0, 20).map((e, i) => (
                  <li key={i}>
                    Row {e.index}: {e.error}
                  </li>
                ))}
                {result.errors.length > 20 && (
                  <li>…and {result.errors.length - 20} more</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
