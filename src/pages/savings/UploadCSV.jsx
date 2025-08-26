import React, { useState } from "react";
import Papa from "papaparse";
import api from "../../api";

export default function SavingsUploadCSV() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const sample = [
    ["borrowerId","type","amount","date","notes"],
    ["12","deposit","10000","2025-08-01","opening deposit"],
  ];

  const onFile = (e) => {
    setError(""); setOk("");
    const f = e.target.files?.[0];
    if (!f) return;
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => setRows(res.data || []),
      error: (err) => setError(err.message || "Failed to parse CSV"),
    });
  };

  const submit = async () => {
    setError(""); setOk("");
    try {
      const cleaned = rows.map(r => ({
        borrowerId: Number(r.borrowerId),
        type: String(r.type).trim().toLowerCase(),
        amount: Number(r.amount),
        date: r.date,
        notes: r.notes || null,
      })).filter(x => x.borrowerId && x.type && x.amount && x.date);
      if (!cleaned.length) { setError("No valid rows."); return; }
      await api._post("/savings/transactions/bulk", { items: cleaned });
      setOk(`Imported ${cleaned.length} transactions.`);
      setRows([]);
    } catch (e) {
      setError(e?.response?.data?.error || e?.normalizedMessage || "Import failed");
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4">
      <h1 className="text-lg font-semibold mb-3">Upload Savings CSV</h1>

      <input type="file" accept=".csv" onChange={onFile} className="mb-3" />
      {error && <div className="text-sm text-rose-600 mb-2">Error: {error}</div>}
      {ok && <div className="text-sm text-emerald-600 mb-2">{ok}</div>}

      <div className="text-xs text-slate-500 mb-2">Required headers: borrowerId, type (deposit|withdrawal|charge|interest), amount, date (YYYY-MM-DD). Optional: notes.</div>

      <button onClick={submit} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60" disabled={!rows.length}>
        Import {rows.length ? `(${rows.length})` : ""}
      </button>

      <div className="mt-5">
        <div className="text-xs font-mono bg-slate-50 dark:bg-slate-800 p-3 rounded inline-block">
          {Papa.unparse(sample)}
        </div>
      </div>
    </div>
  );
}
