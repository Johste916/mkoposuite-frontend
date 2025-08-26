import React, { useMemo, useState } from "react";
import api from "../../api";

/**
 * Small CSV parser (handles quotes, commas in quotes, CRLF).
 * Returns: { headers: string[], rows: string[][] }
 */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        // Escaped quote?
        if (text[i + 1] === '"') {
          field += '"';
          i += 1; // skip next "
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (c === "\r") {
        // handle CRLF -> treat CR like newline and swallow following LF
        if (text[i + 1] === "\n") {
          i += 1;
        }
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += c;
      }
    }
  }
  // tail
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (!rows.length) return { headers: [], rows: [] };
  const headers = rows[0].map((h) => String(h || "").trim());
  const data = rows.slice(1).filter((r) => r.some((x) => String(x || "").trim().length));
  return { headers, rows: data };
}

const VALID_TYPES = new Set(["deposit", "withdrawal", "charge", "interest"]);

function normalizeHeader(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

/** Map a CSV row (array) to our payload using flexible header names */
function mapRowToPayload(headers, row) {
  const h = headers.map(normalizeHeader);

  const get = (...candidates) => {
    for (const key of candidates) {
      const idx = h.indexOf(key);
      if (idx !== -1) return row[idx];
    }
    return undefined;
  };

  const rawBorrowerId = get("borrowerid", "borrower_id", "borrower");
  const rawType = String(get("type", "trx_type") || "").toLowerCase();
  const rawAmount = get("amount", "amt", "value", "total");
  const rawDate = get("date", "trx_date", "transaction_date");
  const rawNotes = get("notes", "note", "description", "memo");
  const rawReversed = String(get("reversed", "is_reversed") || "").toLowerCase();

  const borrowerId = rawBorrowerId ? Number(String(rawBorrowerId).trim()) : null;
  const type = VALID_TYPES.has(rawType) ? rawType : null;

  // amount: allow "1,234.56" or "1234.56"
  let amount = null;
  if (rawAmount !== undefined && rawAmount !== null && String(rawAmount).trim().length) {
    const cleaned = String(rawAmount).replace(/,/g, "");
    amount = Number(cleaned);
  }

  // date: accept YYYY-MM-DD; otherwise leave as-is and let backend validate
  const date = rawDate ? String(rawDate).slice(0, 10) : null;

  const notes = rawNotes ? String(rawNotes) : null;
  const reversed = rawReversed === "true" || rawReversed === "1" || rawReversed === "yes";

  return { borrowerId, type, amount, date, notes, reversed };
}

export default function UploadSavingsCSV() {
  const [file, setFile] = useState(null);
  const [rowsPreview, setRowsPreview] = useState([]);
  const [headersPreview, setHeadersPreview] = useState([]);
  const [parsingError, setParsingError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const canUpload = useMemo(() => !!file && !uploading, [file, uploading]);

  const handleFile = async (e) => {
    setParsingError("");
    setHeadersPreview([]);
    setRowsPreview([]);
    setResult(null);

    const f = e.target.files?.[0] || null;
    setFile(f);
    if (!f) return;

    try {
      const text = await f.text();
      const { headers, rows } = parseCSV(text);
      if (!headers.length) {
        setParsingError("No headers found in CSV.");
        return;
      }
      setHeadersPreview(headers);
      setRowsPreview(rows.slice(0, 10)); // show first 10 rows as a preview
    } catch (err) {
      setParsingError(err?.message || "Failed to read CSV.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setResult(null);
    setParsingError("");

    try {
      const text = await file.text();
      const { headers, rows } = parseCSV(text);
      if (!headers.length || !rows.length) {
        setParsingError("CSV appears to be empty.");
        setUploading(false);
        return;
      }

      // Prepare payloads
      const payloads = rows.map((r) => mapRowToPayload(headers, r));

      // Basic validation & filtering
      const toSend = [];
      const rejected = [];

      for (let i = 0; i < payloads.length; i += 1) {
        const p = payloads[i];
        const missing = [];
        if (!p.borrowerId) missing.push("borrowerId");
        if (!p.type) missing.push("type");
        if (!(Number.isFinite(p.amount) && p.amount > 0)) missing.push("amount");
        if (!p.date) missing.push("date");

        if (missing.length) {
          rejected.push({ index: i + 2 /* + header row */, reason: `Missing/invalid: ${missing.join(", ")}` });
          continue;
        }

        // Keep only keys the backend model expects; `reversed` is optional
        toSend.push({
          borrowerId: p.borrowerId,
          type: p.type,
          amount: p.amount,
          date: p.date,
          notes: p.notes || null,
          ...(p.reversed ? { reversed: true } : {}),
        });
      }

      // Send in small batches to avoid hammering the API
      const BATCH = 25;
      const successes = [];
      const failures = [];

      for (let i = 0; i < toSend.length; i += BATCH) {
        const batch = toSend.slice(i, i + BATCH);
        // POST each record to /savings-transactions
        const results = await Promise.allSettled(
          batch.map((rec) => api._post("/savings-transactions", rec))
        );
        results.forEach((r, idx) => {
          if (r.status === "fulfilled") successes.push(i + idx);
          else {
            const errMsg =
              r.reason?.response?.data?.error ||
              r.reason?.normalizedMessage ||
              r.reason?.message ||
              "Failed";
            failures.push({ index: i + idx, reason: errMsg });
          }
        });
      }

      setResult({
        inserted: successes.length,
        failed: failures.length + rejected.length,
        rejects: rejected.concat(failures),
      });
    } catch (err) {
      setParsingError(err?.message || "Failed to process CSV.");
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const header = ["borrowerId", "type", "amount", "date", "notes"];
    const sample = [
      ["101", "deposit", "5000", "2025-08-01", "opening balance"],
      ["101", "withdrawal", "1000", "2025-08-03", ""],
      ["102", "interest", "55.75", "2025-08-05", "monthly interest"],
      ["102", "charge", "10", "2025-08-05", "ledger fee"],
    ];
    const csv =
      header.join(",") +
      "\n" +
      sample.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "savings_transactions_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const card = "bg-white dark:bg-slate-800 rounded-xl shadow p-4";
  const label = "block text-sm font-medium mb-1";
  const input = "w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:border-slate-600";

  return (
    <div className={card}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Upload Savings Transactions (CSV)</h2>
          <p className="text-xs opacity-70">
            Allowed types: <code>deposit</code>, <code>withdrawal</code>, <code>charge</code>, <code>interest</code>.
            Required columns: <code>borrowerId</code>, <code>type</code>, <code>amount</code>, <code>date</code>.
          </p>
        </div>
        <button
          type="button"
          onClick={downloadTemplate}
          className="px-3 py-2 rounded bg-slate-700 text-white hover:bg-slate-800 text-sm"
        >
          Download template
        </button>
      </div>

      {parsingError ? (
        <div className="mb-3 text-sm text-rose-600 dark:text-rose-300">Error: {String(parsingError)}</div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={label}>CSV file</label>
          <input
            type="file"
            accept=".csv,text/csv"
            className={input}
            onChange={handleFile}
          />
        </div>

        {/* Preview */}
        {headersPreview.length ? (
          <div className="border rounded-md overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  {headersPreview.map((h) => (
                    <th key={h} className="px-2 py-1 border-b text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rowsPreview.map((r, i) => (
                  <tr key={i} className="odd:bg-white even:bg-slate-50/40 dark:odd:bg-slate-800 dark:even:bg-slate-700/40">
                    {headersPreview.map((_, j) => (
                      <td key={j} className="px-2 py-1 border-b">{r[j] ?? ""}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={!canUpload}
            className={`px-4 py-2 rounded text-white ${
              canUpload ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-300 cursor-not-allowed"
            }`}
          >
            {uploading ? "Uploading…" : "Upload CSV"}
          </button>
        </div>
      </form>

      {/* Result summary */}
      {result ? (
        <div className="mt-4 text-sm">
          <div className="mb-1">Inserted: <b>{result.inserted}</b></div>
          <div className="mb-2">Failed: <b>{result.failed}</b></div>
          {result.rejects?.length ? (
            <details className="mt-2">
              <summary className="cursor-pointer">View errors</summary>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                {result.rejects.slice(0, 150).map((e, i) => (
                  <li key={i}>Row {e.index}: {e.reason}</li>
                ))}
                {result.rejects.length > 150 ? <li>…and more</li> : null}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
