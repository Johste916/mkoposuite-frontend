// src/pages/loans/DisbursedLoans.jsx
import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Search, Filter, Download, ChevronDown, Calendar, RefreshCw } from "lucide-react";
import api from "../../api";

/* ---------- Token-aware UI (no reliance on `.card`) ---------- */
const ui = {
  page: "w-full px-4 md:px-6 lg:px-8 py-6 bg-[var(--bg)] text-[var(--fg)]",
  h1: "text-2xl md:text-3xl font-extrabold tracking-tight",
  sub: "text-sm text-[var(--muted)]",

  // Explicit token classes so vendor CSS can't override
  card:
    "rounded-2xl border-2 border-[var(--border-strong)] bg-[var(--card)] shadow",

  // Table frame that matches theme.css tokens
  tableWrap:
    "overflow-x-auto rounded-2xl border-2 border-[var(--border-strong)] bg-[var(--card)] shadow",

  th:
    "sticky top-0 z-10 bg-[var(--table-head-bg)] text-left text-[12px] md:text-[13px] " +
    "uppercase tracking-wide font-semibold px-3 py-2 border border-[var(--border)] text-[var(--fg)]/95",
  td: "px-3 py-2 border border-[var(--border)] text-sm text-[var(--fg)] align-top",

  btn:
    "inline-flex items-center gap-2 rounded-lg px-3 py-2 font-semibold border-2 " +
    "border-[var(--border-strong)] bg-[var(--card)] text-[var(--fg)] hover:bg-[var(--chip-soft)] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] " +
    "focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:opacity-60",

  primary:
    "inline-flex items-center gap-2 rounded-lg px-3 py-2 font-semibold " +
    "bg-[var(--primary)] text-[var(--primary-contrast)] hover:brightness-95 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] " +
    "focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:opacity-60",

  input:
    "h-10 w-full rounded-lg text-sm outline-none border-2 " +
    "bg-[var(--input-bg)] text-[var(--input-fg)] border-[var(--input-border)] " +
    "placeholder:text-[var(--input-placeholder)] focus-visible:outline-none focus-visible:ring-2 " +
    "focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
};

/* ---------- tiny helpers (select/date) ---------- */
const baseInput =
  "h-10 w-full rounded-lg text-sm outline-none border-2 " +
  "bg-[var(--input-bg)] text-[var(--input-fg)] border-[var(--input-border)] " +
  "placeholder:text-[var(--input-placeholder)] focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]";

const SelectField = ({ className = "", children, ...props }) => (
  <div className={`relative ${className}`}>
    <select {...props} className={`${baseInput} pr-9 appearance-none bg-none ms-select`}>
      {children}
    </select>
    <ChevronDown
      className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]"
      aria-hidden="true"
    />
  </div>
);

const DateField = ({ className = "", ...props }) => (
  <div className={`relative ${className}`}>
    <input type="date" {...props} className={`${baseInput} pr-9 appearance-none bg-none ms-date`} />
    <Calendar
      className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]"
      aria-hidden="true"
    />
  </div>
);

/* Normalize arrays safely */
const toArray = (data) =>
  Array.isArray(data) ? data :
  Array.isArray(data?.items) ? data.items :
  Array.isArray(data?.rows) ? data.rows :
  Array.isArray(data?.results) ? data.results : [];

/* ---------- Page ---------- */
export default function DisbursedLoans() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  // filters
  const [q, setQ] = useState("");
  const [product, setProduct] = useState("");
  const [officer, setOfficer] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minAmt, setMinAmt] = useState("");
  const [maxAmt, setMaxAmt] = useState("");

  const [products, setProducts] = useState([]);
  const [officers, setOfficers] = useState([]);

  // paging
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  /* Fetch filters (products/officers) */
  const fetchFilters = useCallback(async () => {
    const [p, o] = await Promise.all([
      api.get("/loan-products").catch(() => ({ data: [] })),
      api.get("/users?role=loan_officer").catch(() => ({ data: [] })),
    ]);
    setProducts(toArray(p.data));
    setOfficers(toArray(o.data));
  }, []);

  /* Fetch data */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/loans/disbursed", {
        params: {
          page,
          pageSize,
          q: q || undefined,
          productId: product || undefined,
          officerId: officer || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          minAmount: minAmt || undefined,
          maxAmount: maxAmt || undefined,
        },
      });
      const items = toArray(res?.data?.items || res?.data);
      const totalCount = Number(res?.data?.total ?? res?.data?.totalCount ?? items.length) || 0;
      setRows(items);
      setTotal(totalCount);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, q, product, officer, dateFrom, dateTo, minAmt, maxAmt]);

  useEffect(() => { fetchFilters().catch(() => {}); }, [fetchFilters]);
  useEffect(() => { fetchData().catch(() => {}); }, [fetchData]);

  const resetFilters = () => {
    setQ(""); setProduct(""); setOfficer("");
    setDateFrom(""); setDateTo("");
    setMinAmt(""); setMaxAmt("");
    setPage(1);
  };

  const exportAs = async (fmt) => {
    const res = await api.get(`/loans/disbursed/export`, {
      params: {
        format: fmt, q, productId: product, officerId: officer,
        dateFrom, dateTo, minAmount: minAmt, maxAmount: maxAmt,
      },
      responseType: "blob",
    });
    const mime =
      fmt === "pdf"
        ? "application/pdf"
        : fmt === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "text/csv";
    const blob = new Blob([res.data], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `disbursed_loans.${fmt === "pdf" ? "pdf" : fmt}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pages = Math.max(1, Math.ceil((total || 0) / pageSize));
  const hasFilters = q || product || officer || dateFrom || dateTo || minAmt || maxAmt;

  return (
    <div className={ui.page}>
      {/* Remove native select/calendar icons to keep token icons clean */}
      <style>{`
        select.ms-select{ -webkit-appearance:none; -moz-appearance:none; appearance:none; background-image:none!important; }
        select.ms-select::-ms-expand{ display:none; }
        input.ms-date[type="date"]{ -webkit-appearance:none; appearance:none; background-image:none!important; }
        input.ms-date[type="date"]::-webkit-calendar-picker-indicator{ opacity:0; display:none; }
      `}</style>

      {/* Header + actions */}
      <div className="mb-5 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className={ui.h1}>Disbursed Loans</h1>
          <p className={ui.sub}>{total.toLocaleString()} total</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={ui.btn} onClick={() => exportAs("csv")}>
            <Download className="w-4 h-4" /> CSV
          </button>
          <button className={ui.btn} onClick={() => exportAs("xlsx")}>
            <Download className="w-4 h-4" /> Excel
          </button>
          <button className={ui.btn} onClick={() => exportAs("pdf")}>
            <Download className="w-4 h-4" /> PDF
          </button>
          <button className={ui.btn} onClick={() => fetchData()}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <section className={`${ui.card} p-4 md:p-5 mb-5`} aria-label="Filters">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-[var(--muted)]" aria-hidden="true" />
          <span className="text-sm font-semibold">Filters</span>
          {hasFilters && (
            <button
              className="ml-auto text-sm underline decoration-2 underline-offset-2 hover:opacity-90"
              onClick={resetFilters}
            >
              Clear all
            </button>
          )}
        </div>

        <div className="grid grid-cols-12 gap-3">
          {/* Search */}
          <div className="col-span-12 lg:col-span-4">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]"
                aria-hidden="true"
              />
              <input
                className={`${ui.input} pl-8`}
                placeholder="Search borrower / phone / product / loan #"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Search"
              />
            </div>
          </div>

          {/* Selects */}
          <div className="col-span-12 sm:col-span-4 lg:col-span-2">
            <SelectField value={product} onChange={(e) => setProduct(e.target.value)} aria-label="Product">
              <option value="">Product: All</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </SelectField>
          </div>
          <div className="col-span-12 sm:col-span-4 lg:col-span-2">
            <SelectField value={officer} onChange={(e) => setOfficer(e.target.value)} aria-label="Officer">
              <option value="">Officer: All</option>
              {officers.map((o) => (
                <option key={o.id} value={o.id}>{o.name || o.email}</option>
              ))}
            </SelectField>
          </div>

          {/* Dates */}
          <div className="col-span-6 sm:col-span-2">
            <DateField value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="Start date" />
          </div>
          <div className="col-span-6 sm:col-span-2">
            <DateField value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="End date" />
          </div>

          {/* Amount range */}
          <div className="col-span-6 sm:col-span-2">
            <input
              className={ui.input}
              placeholder="Min Amount"
              type="number"
              min="0"
              step="0.01"
              value={minAmt}
              onChange={(e) => setMinAmt(e.target.value)}
              aria-label="Minimum amount"
            />
          </div>
          <div className="col-span-6 sm:col-span-2">
            <input
              className={ui.input}
              placeholder="Max Amount"
              type="number"
              min="0"
              step="0.01"
              value={maxAmt}
              onChange={(e) => setMaxAmt(e.target.value)}
              aria-label="Maximum amount"
            />
          </div>

          {/* Apply / Reset */}
          <div className="col-span-12 flex gap-2 pt-1">
            <button
              className={ui.primary}
              onClick={() => { setPage(1); fetchData(); }}
            >
              Apply Filters
            </button>
            <button className={ui.btn} onClick={resetFilters}>
              Reset
            </button>
          </div>
        </div>
      </section>

      {/* Table */}
      <section className={ui.tableWrap} aria-label="Results table">
        <table className="min-w-full">
          <thead>
            <tr>
              {[
                "Date", "Borrower", "Phone", "Loan Product",
                "Principal", "Interest", "Outstanding Principal", "Outstanding Interest",
                "Outstanding Fees", "Outstanding Penalty", "Total Outstanding",
                "Interest/Year %", "Duration (months)", "Loan Officer", "Status", "Action",
              ].map((h) => (
                <th key={h} className={ui.th}>{h}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={16} className={`${ui.td} text-[var(--muted)]`}>Loading…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={16} className={`${ui.td} text-[var(--muted)]`}>No disbursed loans found.</td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr
                  key={r.id}
                  className={`transition-colors ${
                    i % 2 === 0 ? "bg-[var(--table-row-even)]" : "bg-[var(--table-row-odd)]"
                  } hover:bg-[var(--chip-soft)]`}
                >
                  <td className={ui.td}>{r.date || r.disbursedAt || "—"}</td>
                  <td className={ui.td}>
                    {r.borrowerId ? (
                      <Link
                        className="underline decoration-2 underline-offset-2 hover:opacity-90"
                        to={`/borrowers/${r.borrowerId}`}
                      >
                        {r.borrowerName}
                      </Link>
                    ) : (
                      r.borrowerName || "—"
                    )}
                  </td>
                  <td className={ui.td}>{r.borrowerPhone || "—"}</td>
                  <td className={ui.td}>{r.productName || "—"}</td>

                  {/* numeric right-aligned */}
                  <td className={`${ui.td} text-right tabular-nums`}>{fmt(r.principal)}</td>
                  <td className={`${ui.td} text-right tabular-nums`}>{fmt(r.interestAmount)}</td>
                  <td className={`${ui.td} text-right tabular-nums`}>{fmt(r.outstandingPrincipal)}</td>
                  <td className={`${ui.td} text-right tabular-nums`}>{fmt(r.outstandingInterest)}</td>
                  <td className={`${ui.td} text-right tabular-nums`}>{fmt(r.outstandingFees)}</td>
                  <td className={`${ui.td} text-right tabular-nums`}>{fmt(r.outstandingPenalty)}</td>
                  <td className={`${ui.td} text-right font-semibold tabular-nums`}>{fmt(r.totalOutstanding)}</td>

                  <td className={`${ui.td} text-right tabular-nums`}>{num(r.interestRateYear)}</td>
                  <td className={`${ui.td} text-right tabular-nums`}>{num(r.durationMonths)}</td>

                  <td className={ui.td}>{r.officerName || "—"}</td>
                  <td className={ui.td}>{(r.status || "—").replaceAll("_", " ")}</td>
                  <td className={ui.td}>
                    <Link className={`${ui.btn} h-9`} to={`/loans/${r.id}`}>View</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* Pagination */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-[var(--muted)]">
          Page {page} of {Math.max(1, Math.ceil((total || 0) / pageSize))} • {total.toLocaleString()} total
        </div>
        <div className="flex items-center gap-2">
          <SelectField
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="w-[140px]"
            aria-label="Rows per page"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </SelectField>
          <div className="flex gap-2">
            <button className={ui.btn} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              Prev
            </button>
            <button
              className={ui.btn}
              onClick={() => setPage((p) => Math.min(Math.max(1, Math.ceil((total || 0) / pageSize)), p + 1))}
              disabled={page >= Math.max(1, Math.ceil((total || 0) / pageSize))}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- utilities ---------- */
function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : "—";
}
const TZS = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
function fmt(v, c = "TZS") {
  const n = Number(v || 0);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `${c} ${TZS.format(n)}`;
}
