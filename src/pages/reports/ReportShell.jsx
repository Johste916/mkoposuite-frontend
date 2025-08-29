// src/pages/reports/ReportShell.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api";
import { FiDownload, FiRefreshCw, FiSearch } from "react-icons/fi";

/** ─── helpers ──────────────────────────────────────────────────────────── */
const startCase = (s) =>
  String(s || "")
    .replace(/[_\-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());

const fmtTZS = (v) => `TZS ${Number(v || 0).toLocaleString()}`;
const fmtPercent = (v) =>
  typeof v === "number"
    ? `${(v > 1 ? v : v * 100).toFixed(2)}%`
    : String(v ?? "");

const isPlainObject = (x) =>
  Object.prototype.toString.call(x) === "[object Object]";

function stringifyMaybe(val) {
  if (val == null) return "";
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (typeof val === "string") return val;
  try {
    return JSON.stringify(val);
  } catch {
    return String(val);
  }
}

/** ⬅️ FIX: CSV now stringifies objects/arrays instead of outputting [object Object] */
function toCSV(rows) {
  if (!rows || !rows.length) return "";
  const cols = Array.from(
    rows.reduce((set, r) => {
      Object.keys(r || {}).forEach((k) => set.add(k));
      return set;
    }, new Set())
  );
  const esc = (x) => {
    const s = stringifyMaybe(x);
    return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    cols.join(","),
    ...rows.map((r) => cols.map((c) => esc(r[c])).join(",")),
  ].join("\n");
}

/** Prefer server columns when available. Accepts:
 *  - raw.columns = [{key,label,fmt?}] or string[]
 *  - raw.table.columns = same
 */
function extractServerColumns(raw) {
  const srvCols = raw?.columns || raw?.table?.columns;
  if (!srvCols) return null;
  if (Array.isArray(srvCols)) {
    return srvCols.map((c) =>
      typeof c === "string" ? { key: c, label: startCase(c) } : c
    );
  }
  return null;
}

/** Normalize API payloads into { rows, columns, meta } */
function normalizeData(raw, columnsProp) {
  let rows = [];
  let meta = isPlainObject(raw) ? raw : {};
  let columns =
    extractServerColumns(raw) ||
    (Array.isArray(columnsProp) ? columnsProp.slice() : []);

  if (Array.isArray(raw?.table?.rows)) {
    rows = raw.table.rows;
  } else if (Array.isArray(raw?.rows)) rows = raw.rows;
  else if (Array.isArray(raw?.items)) rows = raw.items;
  else if (Array.isArray(raw?.buckets)) rows = raw.buckets;
  else if (raw && typeof raw === "object") {
    const entries = Object.entries(raw).filter(
      ([k]) => !["rows", "items", "buckets", "table", "columns"].includes(k)
    );
    rows = entries.map(([k, v]) => ({ metric: startCase(k), value: v }));
    if (!columns.length) {
      columns = [
        { key: "metric", label: "Metric" },
        {
          key: "value",
          label: "Value",
          fmt: (val) =>
            typeof val === "number" ? fmtTZS(val) : stringifyMaybe(val),
        },
      ];
    }
  }

  if (!columns.length && rows?.length && isPlainObject(rows[0])) {
    const keys = Object.keys(rows[0]).slice(0, 12);
    columns = keys.map((k) => ({ key: k, label: startCase(k) }));
  }

  return { rows: Array.isArray(rows) ? rows : [], columns, meta };
}

/** Compose a friendly scope line */
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

/** ─── component ─────────────────────────────────────────────────────────── */
export default function ReportShell({
  title = "Report",
  endpoint,
  columns = [],
  exportCsvPath = "",
  mode = "auto",
  filters = { date: true, branch: true, officer: true, borrower: true },
  extraParams = {},
  onAfterLoad,
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [raw, setRaw] = useState(null);

  const todayISO = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [branchId, setBranchId] = useState("");
  const [officerId, setOfficerId] = useState("");
  const [borrowerId, setBorrowerId] = useState("");
  const [borrowerQ, setBorrowerQ] = useState("");

  const [branches, setBranches] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [borrowerSuggestions, setBorrowerSuggestions] = useState([]);

  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  // Fetch options
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/reports/filters");
        setBranches(data?.branches || []);
        setOfficers(data?.officers || []);
      } catch {}
    })();
  }, []);

  // Borrower typeahead
  useEffect(() => {
    const q = borrowerQ.trim();
    if (!q) { setBorrowerSuggestions([]); return; }
    const t = setTimeout(async () => {
      try {
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
      ...extraParams,
      startDate: filters.date ? (startDate || undefined) : undefined,
      endDate: filters.date ? (endDate || undefined) : undefined,
      branchId: filters.branch ? (branchId || undefined) : undefined,
      officerId: filters.officer ? (officerId || undefined) : undefined,
      borrowerId: filters.borrower ? (borrowerId || undefined) : undefined,
    }),
    [extraParams, startDate, endDate, branchId, officerId, borrowerId, filters]
  );

  const load = async () => {
    if (!endpoint) return;
    setLoading(true);
    setErr("");
    try {
      const { data } = await api.get(endpoint, { params });
      if (!mounted.current) return;
      setRaw(data);
      if (typeof onAfterLoad === "function") onAfterLoad(data);
    } catch (e) {
      if (!mounted.current) return;
      console.error("Report load error:", e);
      setErr(e?.response?.data?.error || e?.message || "Failed to load report");
      setRaw({ table: { rows: [] } });
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [endpoint]);

  const { rows, columns: cols, meta } = useMemo(
    () => normalizeData(raw, columns),
    [raw, columns]
  );
  const scopeLabel = useMemo(() => composeScopeLabel(params, meta), [params, meta]);

  /** Cell renderer with currency/percent hints support */
  const renderCell = (c, r) => {
    const val = r?.[c.key];
    const isCurrency = r?.currency && (c.key === "value" || /amount|total|balance|olp/i.test(c.key));
    const isPercent  = r?.percent  && (c.key === "value" || /par|ratio|yield|efficiency|achievement/i.test(c.key));

    if (c.fmt) return c.fmt(val, r);
    if (isPercent) return fmtPercent(Number(val || 0));
    if (isCurrency && typeof val === "number") return fmtTZS(val);
    return stringifyMaybe(val);
  };

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
            {meta?.welcome && (
              <div className="text-[12px] text-emerald-700 dark:text-emerald-400 mt-1">
                {meta.welcome}
              </div>
            )}
            {(meta?.asOf || meta?.period) && (
              <div className="text-[12px] text-slate-500 mt-1">
                {meta?.asOf ? `As Of: ${String(meta.asOf).slice(0, 10)}` : ""}
                {meta?.asOf && meta?.period ? " · " : ""}
                {meta?.period ? `Period: ${meta.period}` : ""}
              </div>
            )}
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
      {mode !== "snapshot" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {filters.date && (
              <>
                <div className="flex items-center gap-2">
                  <label className="w-24 text-sm text-slate-600 dark:text-slate-300">Start</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    max={endDate || new Date().toISOString().slice(0, 10)}
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
              </>
            )}

            {filters.branch && (
              <div className="flex items-center gap-2">
                <label className="w-24 text-sm text-slate-600 dark:text-slate-300">Branch</label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm rounded border bg-white dark:bg-slate-800"
                >
                  <option value="">All</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name || `#${b.id}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {filters.officer && (
              <div className="flex items-center gap-2">
                <label className="w-24 text-sm text-slate-600 dark:text-slate-300">Officer</label>
                <select
                  value={officerId}
                  onChange={(e) => setOfficerId(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm rounded border bg-white dark:bg-slate-800"
                >
                  <option value="">All</option>
                  {(Array.isArray(officers) ? officers : []).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name || o.email || `#${o.id}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Borrower search + choose */}
            {filters.borrower && (
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
                          {b.name || `Borrower #${b.id}`}{" "}
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
            )}
          </div>
        </div>
      )}

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
                  <tr
                    key={i}
                    className="border-t border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    {cols.map((c) => (
                      <td key={c.key} className="px-3 py-2">
                        {(() => {
                          const val = r?.[c.key];
                          const isCurrency = r?.currency && (c.key === "value" || /amount|total|balance|olp/i.test(c.key));
                          const isPercent  = r?.percent  && (c.key === "value" || /par|ratio|yield|efficiency|achievement/i.test(c.key));
                          if (c.fmt) return c.fmt(val, r);
                          if (isPercent) return fmtPercent(Number(val || 0));
                          if (isCurrency && typeof val === "number") return fmtTZS(val);
                          return stringifyMaybe(val);
                        })()}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(meta?.period || meta?.scope) && (
        <div className="text-[12px] text-slate-500">
          {meta?.period ? `Period: ${meta.period}` : ""}{" "}
          {meta?.scope ? `· Scope: ${meta.scope}` : ""}
        </div>
      )}
    </div>
  );
}
