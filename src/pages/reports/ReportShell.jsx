// src/pages/reports/ReportShell.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../api";
import { FiDownload, FiRefreshCw, FiSearch } from "react-icons/fi";

/** Small helpers */
const startCase = (s) =>
  String(s || "")
    .replace(/[_\-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());

const fmtTZS = (v) => `TZS ${Number(v || 0).toLocaleString()}`;

function toCSV(rows) {
  if (!rows || !rows.length) return "";
  const cols = Array.from(
    rows.reduce((set, r) => {
      Object.keys(r || {}).forEach((k) => set.add(k));
      return set;
    }, new Set())
  );
  const esc = (x) => {
    const s = x == null ? "" : String(x);
    return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

/** Normalize whatever the API returns into { rows, columns, meta } */
function normalizeData(raw, columnsProp) {
  let rows = [];
  let columns = Array.isArray(columnsProp) ? columnsProp.slice() : [];
  let meta = typeof raw === "object" && raw && !Array.isArray(raw) ? raw : {};

  // 1) If it's already an array, use it
  if (Array.isArray(raw)) {
    rows = raw;
  }
  // 2) Common containers
  else if (Array.isArray(raw?.rows)) {
    rows = raw.rows;
  } else if (Array.isArray(raw?.items)) {
    rows = raw.items;
  } else if (Array.isArray(raw?.buckets)) {
    rows = raw.buckets;
  }
  // 3) Plain object summary => turn into Metric/Value rows
  else if (raw && typeof raw === "object") {
    const entries = Object.entries(raw).filter(
      ([k]) => !["rows", "items", "buckets"].includes(k)
    );
    rows = entries.map(([k, v]) => ({ metric: startCase(k), value: v }));
    if (!columns.length) {
      columns = [
        { key: "metric", label: "Metric" },
        {
          key: "value",
          label: "Value",
          fmt: (val) => (typeof val === "number" ? fmtTZS(val) : String(val ?? "")),
        },
      ];
    }
  }

  // If we still don’t have columns but we have object rows, infer from keys
  if (!columns.length && rows && rows.length && typeof rows[0] === "object") {
    const keys = Object.keys(rows[0]).slice(0, 10);
    columns = keys.map((k) => ({ key: k, label: startCase(k) }));
  }

  // Guarantee arrays
  return { rows: Array.isArray(rows) ? rows : [], columns, meta };
}

/** Formats the "scope" text shown above the table */
function composeScopeLabel(params, meta) {
  if (meta?.scope && String(meta.scope).trim()) return String(meta.scope);

  const parts = [];
  parts.push(params.branchId ? `Branch #${params.branchId}` : "All branches");
  parts.push(params.officerId ? `Officer #${params.officerId}` : "All officers");
  parts.push(params.borrowerId ? `Borrower #${params.borrowerId}` : "All borrowers");

  if (params.startDate || params.endDate) {
    const a = params.startDate || "…";
    const b = params.endDate || "…";
    parts.push(`${a} → ${b}`);
  } else {
    parts.push("All time");
  }
  return parts.join(" · ");
}

/** Main component */
export default function ReportShell({
  title = "Report",
  endpoint,                    // e.g. "/reports/loans/summary"
  columns = [],                // optional array of { key, label, fmt? }
  exportCsvPath = "",          // optional server path for CSV, falls back to client CSV
  mode = "auto",               // "auto" | "snapshot" (UI slightly simplified)
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [raw, setRaw] = useState(null);

  // Filters
  const todayISO = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [branchId, setBranchId] = useState("");
  const [officerId, setOfficerId] = useState("");
  const [borrowerId, setBorrowerId] = useState("");
  const [borrowerQ, setBorrowerQ] = useState("");

  // Filter options
  const [branches, setBranches] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [borrowerSuggestions, setBorrowerSuggestions] = useState([]);

  // Fetch options (non-blocking)
  useEffect(() => {
    (async () => {
      try {
        const [{ data: brs }, { data: ofs }] = await Promise.allSettled([
          api.get("/branches"),
          api.get("/users", { params: { role: "loan_officer", limit: 200 } }),
        ]).then((settled) =>
          settled.map((r) => (r.status === "fulfilled" ? r.value : { data: [] }))
        );
        setBranches(Array.isArray(brs) ? brs : brs?.data || []);
        setOfficers(Array.isArray(ofs) ? ofs : ofs?.data || []);
      } catch {
        // harmless
      }
    })();
  }, []);

  // Borrower typeahead (very lightweight)
  useEffect(() => {
    const q = borrowerQ.trim();
    if (!q) {
      setBorrowerSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        // you have a dedicated search router mounted at /api/borrowers/search
        const { data } = await api.get("/borrowers/search", { params: { q } });
        setBorrowerSuggestions(Array.isArray(data) ? data.slice(0, 8) : []);
      } catch {
        setBorrowerSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [borrowerQ]);

  const params = useMemo(
    () => ({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      branchId: branchId || undefined,
      officerId: officerId || undefined,
      borrowerId: borrowerId || undefined,
    }),
    [startDate, endDate, branchId, officerId, borrowerId]
  );

  // Fetch data
  const load = async () => {
    if (!endpoint) return;
    setLoading(true);
    setErr("");
    try {
      const { data } = await api.get(endpoint, { params });
      setRaw(data);
    } catch (e) {
      console.error("Report load error:", e);
      setErr(e?.response?.data?.error || e?.message || "Failed to load report");
      setRaw([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  const { rows, columns: cols, meta } = useMemo(
    () => normalizeData(raw, columns),
    [raw, columns]
  );

  const scopeLabel = useMemo(() => composeScopeLabel(params, meta), [params, meta]);

  const doExportCSV = () => {
    if (exportCsvPath) {
      const base = import.meta.env.VITE_API_BASE_URL || "";
      const url = `${base}${exportCsvPath}`;
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${title.replace(/\s+/g, "_").toLowerCase()}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setBranchId("");
    setOfficerId("");
    setBorrowerId("");
    setBorrowerQ("");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold">{title}</h1>
            <div className="text-[12px] text-slate-500">{scopeLabel}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="inline-flex items-center gap-2 h-9 px-3 rounded border hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Refresh"
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={doExportCSV}
              className="inline-flex items-center gap-2 h-9 px-3 rounded bg-blue-600 text-white hover:bg-blue-700"
              title="Export CSV"
            >
              <FiDownload /> Export
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="flex items-center gap-2">
            <label className="w-24 text-sm text-slate-600 dark:text-slate-300">Start</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={endDate || todayISO}
              className="flex-1 px-3 py-2 text-sm rounded border bg-white dark:bg-slate-800"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="w-24 text-sm text-slate-600 dark:text-slate-300">End</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || ""}
              max={todayISO}
              className="flex-1 px-3 py-2 text-sm rounded border bg-white dark:bg-slate-800"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="w-24 text-sm text-slate-600 dark:text-slate-300">Branch</label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="flex-1 px-3 py-2 text-sm rounded border bg-white dark:bg-slate-800"
            >
              <option value="">All</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name || `#${b.id}`}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="w-24 text-sm text-slate-600 dark:text-slate-300">Officer</label>
            <select
              value={officerId}
              onChange={(e) => setOfficerId(e.target.value)}
              className="flex-1 px-3 py-2 text-sm rounded border bg-white dark:bg-slate-800"
            >
              <option value="">All</option>
              {officers.map((o) => (
                <option key={o.id} value={o.id}>{o.name || o.email || `#${o.id}`}</option>
              ))}
            </select>
          </div>

          {/* Borrower search + choose */}
          <div className="md:col-span-2 flex items-center gap-2">
            <label className="w-24 text-sm text-slate-600 dark:text-slate-300">Borrower</label>
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-3 text-slate-400" />
              <input
                value={borrowerQ}
                onChange={(e) => setBorrowerQ(e.target.value)}
                placeholder="Type to search borrowers…"
                className="w-full pl-9 pr-3 py-2 text-sm rounded border bg-white dark:bg-slate-800"
              />
              {borrowerQ && borrowerSuggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-900 border rounded shadow max-h-56 overflow-auto">
                  {borrowerSuggestions.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setBorrowerId(String(b.id));
                        setBorrowerQ(b.name || b.phone || b.email || `Borrower #${b.id}`);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      {(b.name || `Borrower #${b.id}`)}{" "}
                      <span className="opacity-60">{b.phone || b.email || ""}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => load()}
              className="h-9 px-3 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Apply
            </button>
            <button
              onClick={clearFilters}
              className="h-9 px-3 rounded border hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        {err ? (
          <div className="text-red-600 text-sm">{err}</div>
        ) : loading ? (
          <div className="text-slate-500 text-sm">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-slate-500 text-sm">No data.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                <tr>
                  {cols.map((c) => (
                    <th key={c.key} className="px-3 py-2 text-left font-semibold">
                      {c.label || startCase(c.key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    {cols.map((c) => {
                      const val = r?.[c.key];
                      return (
                        <td key={c.key} className="px-3 py-2">
                          {c.fmt ? c.fmt(val, r) : String(val ?? "")}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Small foot note when server sends period/scope */}
      {(meta?.period || meta?.scope) && (
        <div className="text-[12px] text-slate-500">
          {meta?.period ? `Period: ${meta.period}` : ""} {meta?.scope ? `· Scope: ${meta.scope}` : ""}
        </div>
      )}
    </div>
  );
}
