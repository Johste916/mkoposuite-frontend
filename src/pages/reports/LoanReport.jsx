import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { CSVLink } from "react-csv";
import api from "../../api";

/* ---------- UI tokens ---------- */
const ui = {
  page: "p-4 md:p-6 lg:p-8 space-y-6 bg-[var(--bg)] text-[var(--fg)]",
  h1: "text-2xl font-extrabold tracking-tight",
  sub: "text-sm text-[var(--muted)]",
  row: "flex flex-col gap-2 md:flex-row md:items-end md:justify-between",
  card: "card p-4 rounded-2xl border-2 border-[var(--border-strong)] bg-[var(--card)]",
  input:
    "h-10 rounded-lg border-2 border-[var(--border-strong)] bg-[var(--card)] px-3 text-[var(--fg)] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
  btn:
    "inline-flex items-center justify-center rounded-lg border-2 border-[var(--border-strong)] " +
    "px-3 py-2 bg-[var(--card)] text-[var(--fg)] hover:bg-[var(--chip-soft)] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
  primary:
    "inline-flex items-center justify-center rounded-lg px-3 py-2 font-semibold " +
    "bg-[var(--primary)] text-[var(--primary-contrast)] hover:opacity-90 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
  alert:
    "rounded-md border-2 border-[var(--border-strong)] bg-[var(--card)] text-[var(--fg)] px-3 py-2 text-sm",
  tableWrap: "overflow-x-auto rounded-2xl border-2 border-[var(--border-strong)] bg-[var(--card)]",
  th:
    "bg-[var(--table-head-bg)] text-left text-[12px] uppercase tracking-wide font-semibold " +
    "px-3 py-2 border border-[var(--border)] text-[var(--fg)]/90",
  td: "px-3 py-2 border border-[var(--border)] text-sm",
  tdRight: "px-3 py-2 border border-[var(--border)] text-sm text-right tabular-nums",
  foot: "px-3 py-2 border-t-2 border-[var(--border-strong)] text-sm flex items-center justify-between",
};

/* ---------- helpers ---------- */
const toArray = (data) =>
  Array.isArray(data)
    ? data
    : Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.rows)
    ? data.rows
    : Array.isArray(data?.results)
    ? data.results
    : Array.isArray(data?.data)
    ? data.data
    : [];

const money = (n, c = "TZS") => `\u200e${c} ${Number(n || 0).toLocaleString()}`;
const d10 = (val) => {
  if (!val) return "—";
  const s = String(val);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  return isNaN(+d) ? "—" : d.toISOString().slice(0, 10);
};
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

/** Map path like /loans/status/disbursed → "disbursed" */
const statusFromPath = (pathname, fallback) => {
  const m = pathname.match(/\/loans\/status\/([^/?#]+)/i);
  return m ? decodeURIComponent(m[1].toLowerCase()) : (fallback || "disbursed");
};

/** Fallback “shape” extractors for old endpoints */
const refOf = (r) => r.reference || r.ref || r.code || `LN-${r.id}`;
const borrowerOf = (r) =>
  r.borrower?.name || r.Borrower?.name || r.borrowerName || r.borrower_name || "—";
const productOf = (r) =>
  r.product?.name || r.Product?.name || r.productName || r.product_name || "—";
const officerOf = (r) =>
  r.officer?.name ||
  r.loanOfficer?.name ||
  r.Officer?.name ||
  r.officerName ||
  r.officer_name ||
  r.officerFullName ||
  "—";
const amountOf = (r) => Number(r.amount ?? r.principal ?? r.principalAmount ?? 0);
const currencyOf = (r) => r.currency || "TZS";
const disbursedOnOf = (r) =>
  r.disbursementDate || r.disbursedAt || r.disbursed_on || r.updatedAt || r.createdAt;

const DEFAULT_COLUMNS = [
  { key: "ref", label: "Ref" },
  { key: "borrower", label: "Borrower" },
  { key: "product", label: "Product" },
  { key: "principalAmount", label: "Principal", currency: true },
  { key: "totalOutstanding", label: "Total Outstanding", currency: true },
  { key: "currency", label: "Currency" },
  { key: "officerName", label: "Officer" },
  { key: "disbursementDate", label: "Disbursed On" },
];

/**
 * Frontend utility hook: loads table data for a given status.
 * It prefers the new dedicated backend endpoint, but gracefully
 * falls back to your older routes so you don’t break anything.
 */
function useLoanStatusData(statusKey) {
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [startDate, setStartDate] = useState(searchParams.get("startDate") || "");
  const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");

  const [rows, setRows] = useState([]);
  const [table, setTable] = useState(null); // { columns, rows } if server sends it
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  async function fetchData() {
    setLoading(true);
    setErr("");
    try {
      const params = {
        q: q || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        pageSize: 1000,
      };

      let data;

      // 1) Preferred: new status endpoint
      try {
        const r = await api.get(`/loans/status/${encodeURIComponent(statusKey)}`, { params });
        data = r.data;
      } catch {
        // 2) Specific disbursement register (kept for compatibility)
        if (statusKey === "disbursed") {
          try {
            const r = await api.get("/reports/loans/disbursements/list", { params });
            data = r.data;
          } catch {}
          if (!data) {
            try {
              const r = await api.get("/loans/disbursements", { params });
              data = r.data;
            } catch {}
          }
        }
        // 3) Generic loans listing filtered by status
        if (!data) {
          const r = await api.get("/loans", {
            params: { ...params, status: statusKey },
          });
          data = r.data;
        }
      }

      // Server may return { table: {columns, rows}, summary, rows }
      const serverRows = toArray(data);
      const tableRows = toArray(data?.table?.rows);
      const finalRows = tableRows.length ? tableRows : serverRows;
      setRows(finalRows);
      setTable(data?.table?.columns?.length ? data.table : null);
      setSummary(data?.summary || null);
    } catch (e) {
      console.error(e);
      setRows([]);
      setTable(null);
      setSummary(null);
      setErr(e?.normalizedMessage || "Failed to load data");
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusKey]);

  return {
    q, setQ, startDate, setStartDate, endDate, setEndDate,
    rows, table, summary, loading, err, lastUpdated, reload: fetchData
  };
}

/**
 * Default export: a reusable page that auto-detects the status
 * from the route (/loans/status/<status>) and renders a consistent table.
 */
export default function LoanReports() {
  const location = useLocation();
  const navigate = useNavigate();

  // Auto-detect status from the path; allow override via ?status=
  const urlStatus = statusFromPath(location.pathname);
  const [searchParams] = useSearchParams();
  const statusKey = (searchParams.get("status") || urlStatus || "disbursed").toLowerCase();

  const {
    q, setQ, startDate, setStartDate, endDate, setEndDate,
    rows, table, summary, loading, err, lastUpdated, reload
  } = useLoanStatusData(statusKey);

  // Paging
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);

  // When data changes, reset page
  useEffect(() => { setPage(1); }, [rows]);

  // Client-side filter (lightweight; server already filters by dates/query if available)
  const filtered = useMemo(() => {
    const needle = (q || "").trim().toLowerCase();
    if (!needle) return rows;
    // Try common keys if server didn’t provide column mapping
    return rows.filter((r) => {
      const any =
        JSON.stringify(r).toLowerCase().includes(needle) ||
        borrowerOf(r).toLowerCase().includes(needle) ||
        productOf(r).toLowerCase().includes(needle) ||
        officerOf(r).toLowerCase().includes(needle) ||
        String(refOf(r)).toLowerCase().includes(needle);
      return any;
    });
  }, [rows, q]);

  // Paging slice
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paged = filtered.slice(start, end);

  // Derive columns (prefer server table)
  const columns = table?.columns?.length ? table.columns : DEFAULT_COLUMNS;

  // Currency (best-effort guess from first row)
  const first = filtered[0] || {};
  const currency =
    first.currency || first.Currency || first.currencyCode || first.CurrencyCode || "TZS";

  // Format a cell using column meta if present
  const renderCell = (row, col) => {
    let v = row[col.key];
    // Graceful fallback mapping for older shapes
    if (v == null) {
      if (col.key === "ref") v = refOf(row);
      if (col.key === "borrower") v = borrowerOf(row);
      if (col.key === "product") v = productOf(row);
      if (col.key === "officerName") v = officerOf(row);
      if (col.key === "principalAmount") v = amountOf(row);
      if (col.key === "totalOutstanding") v = row.totalOutstanding ?? 0;
      if (col.key === "currency") v = currencyOf(row);
      if (col.key === "disbursementDate") v = disbursedOnOf(row);
    }
    if (col.currency) return money(v, currency);
    if (col.percent) return `${Number(v || 0).toFixed(2)}%`;
    if (/date/i.test(col.key) || /Date$/.test(col.key)) return d10(v);
    return v == null || v === "" ? "—" : String(v);
  };

  // CSV (use visible columns)
  const csvHeaders = columns.map((c) => ({ label: c.label, key: c.key }));
  const csvData = filtered.map((r) =>
    Object.fromEntries(columns.map((c) => [c.key, renderCell(r, c)]))
  );

  const title = `Loans — ${cap(statusKey.replace(/-/g, " "))}`;

  return (
    <div className={ui.page}>
      <div className="space-y-1">
        <h2 className={ui.h1}>{title}</h2>
        <p className={ui.sub}>
          Status-specific register with filters, pagination, and export.
          {lastUpdated && <> · Last updated {lastUpdated.toLocaleString()}</>}
        </p>
      </div>

      {/* Controls */}
      <div className={ui.card}>
        <div className={ui.row}>
          <div className="flex flex-wrap gap-2">
            <input
              className={ui.input}
              placeholder="Search borrower / product / officer / ref…"
              value={q}
              onChange={(e) => (setQ(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && reload()}
            />
            <input type="date" className={ui.input} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <input type="date" className={ui.input} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            <select
              className={ui.input}
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value) || 20); setPage(1); }}
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>Page size: {n}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button className={ui.btn} onClick={reload}>Apply Filters</button>
            <button
              className={ui.btn}
              onClick={() => {
                setQ(""); setStartDate(""); setEndDate(""); setPage(1); reload();
              }}
            >
              Reset
            </button>
            <CSVLink data={csvData} headers={csvHeaders} filename={`${statusKey}-loans.csv`} className={ui.primary}>
              Export CSV
            </CSVLink>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className={ui.card}>
        {err && <div className={`${ui.alert} mb-3`}>{err}</div>}

        <div className={ui.tableWrap}>
          <table className="min-w-[1100px] w-full text-sm">
            <thead>
              <tr className="text-left">
                {columns.map((c) => (
                  <th key={c.key} className={ui.th}>{c.label}</th>
                ))}
                <th className={ui.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className={`${ui.td} text-center py-6 text-[var(--muted)]`} colSpan={columns.length + 1}>
                    Loading…
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td className={`${ui.td} text-center py-6 text-[var(--muted)]`} colSpan={columns.length + 1}>
                    No results match your filters.
                  </td>
                </tr>
              ) : (
                paged.map((r, i) => (
                  <tr
                    key={r.id || `${refOf(r)}-${i}`}
                    className={`${i % 2 === 0 ? "bg-[var(--table-row-even)]" : "bg-[var(--table-row-odd)]"} hover:bg-[var(--chip-soft)] transition-colors`}
                  >
                    {columns.map((c) => {
                      const val = renderCell(r, c);
                      const cls = c.currency || c.percent ? ui.tdRight : ui.td;
                      return <td key={c.key} className={cls}>{val}</td>;
                    })}
                    <td className={ui.td}>
                      <button className={ui.btn} onClick={() => navigate(`/loans/${r.id}`)}>View</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      {/* Footer summary & paginator */}
        <div className={ui.foot}>
          <span>
            {filtered.length.toLocaleString()} item(s)
          </span>
          <div className="flex items-center gap-4">
            {summary?.principalSum != null && <span>Principal {money(summary.principalSum, currency)}</span>}
            {summary?.outstandingSum != null && <span><strong>Outstanding {money(summary.outstandingSum, currency)}</strong></span>}
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <button className={ui.btn} disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
          <span className={ui.sub}>Page {page} of {totalPages}</span>
          <button className={ui.btn} disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
        </div>
      </div>
    </div>
  );
}

// (Optional) Named export if you want to import the hook elsewhere.
export { useLoanStatusData };
