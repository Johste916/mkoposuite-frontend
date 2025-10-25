// src/pages/loans/LoanReports.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CSVLink } from "react-csv";
import api from "../../api";

/* ---------- token UI (matches the new theme) ---------- */
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

/* Normalizers across API shapes */
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
  "—";
const amountOf = (r) => Number(r.amount ?? r.principal ?? r.principalAmount ?? 0);
const currencyOf = (r) => r.currency || "TZS";
const disbursedOnOf = (r) =>
  r.disbursementDate || r.disbursedAt || r.disbursed_on || r.updatedAt || r.createdAt;

export default function LoanReports() {
  const navigate = useNavigate();

  // Filters
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Data & UI state
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  // Paging
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      // Use the most specific endpoint that exists
      let data;
      try {
        data = await api.getFirst(
          [
            "/loans/reports/disbursements/list", // your specialized endpoint
            "/loans/disbursements",              // queue/register
            "/loans?status=disbursed",           // fallback generic
          ],
          { params: { pageSize: 500, from, to, q } }
        );
      } catch (e) {
        // If getFirst throws, ensure consistent state
        data = [];
        throw e;
      }
      // Ensure only real disbursed records
      const list = toArray(data).filter(
        (r) => String(r.status || "").toLowerCase() === "disbursed"
      );
      setRows(list);
      setPage(1);
    } catch (e) {
      console.error(e);
      setErr(e?.normalizedMessage || "Failed to load disbursements");
      setRows([]);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }

  // Client-side filtering to keep UX snappy even if API ignores q/from/to
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const inRange = (r) => {
      const dt = disbursedOnOf(r);
      if (!from && !to) return true;
      const d = dt ? new Date(dt) : null;
      if (!d || isNaN(+d)) return false;
      if (from && d < new Date(`${from}T00:00:00`)) return false;
      if (to && d > new Date(`${to}T23:59:59`)) return false;
      return true;
    };
    const match = (r) =>
      !needle ||
      String(refOf(r)).toLowerCase().includes(needle) ||
      borrowerOf(r).toLowerCase().includes(needle) ||
      productOf(r).toLowerCase().includes(needle) ||
      officerOf(r).toLowerCase().includes(needle);
    return rows.filter((r) => inRange(r) && match(r));
  }, [rows, q, from, to]);

  // Paging slice
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paged = filtered.slice(start, end);

  // Totals
  const totalAmt = useMemo(
    () => filtered.reduce((s, r) => s + amountOf(r), 0),
    [filtered]
  );
  const currency = filtered[0] ? currencyOf(filtered[0]) : "TZS";

  // CSV
  const csvHeaders = [
    { label: "Ref", key: "ref" },
    { label: "Borrower", key: "borrower" },
    { label: "Product", key: "product" },
    { label: "Amount", key: "amount" },
    { label: "Currency", key: "currency" },
    { label: "Officer", key: "officer" },
    { label: "Disbursed On", key: "date" },
  ];
  const csvData = filtered.map((r) => ({
    ref: refOf(r),
    borrower: borrowerOf(r),
    product: productOf(r),
    amount: amountOf(r),
    currency: currencyOf(r),
    officer: officerOf(r),
    date: d10(disbursedOnOf(r)),
  }));

  return (
    <div className={ui.page}>
      <div className="space-y-1">
        <h2 className={ui.h1}>Loan Reports</h2>
        <p className={ui.sub}>
          Disbursed loans register with filters, pagination, and export.
          {lastUpdated && <> · Last updated {lastUpdated.toLocaleString()}</>}
        </p>
      </div>

      {/* Controls */}
      <div className={ui.card}>
        <div className={ui.row}>
          <div className="flex flex-wrap gap-2">
            <input
              className={ui.input}
              placeholder="Search ref / borrower / product / officer…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
            />
            <input
              type="date"
              className={ui.input}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <input
              type="date"
              className={ui.input}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
            <select
              className={ui.input}
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value) || 10);
                setPage(1);
              }}
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  Page size: {n}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button className={ui.btn} onClick={load}>
              Apply Filters
            </button>
            <button
              className={ui.btn}
              onClick={() => {
                setQ("");
                setFrom("");
                setTo("");
                setPage(1);
                load();
              }}
            >
              Reset
            </button>
            <CSVLink
              data={csvData}
              headers={csvHeaders}
              filename="disbursements.csv"
              className={ui.primary}
            >
              Export CSV
            </CSVLink>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className={ui.card}>
        {err && <div className={`${ui.alert} mb-3`}>{err}</div>}

        <div className={ui.tableWrap}>
          <table className="min-w-[1000px] w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className={ui.th}>Ref</th>
                <th className={ui.th}>Borrower</th>
                <th className={ui.th}>Product</th>
                <th className={ui.th}>Amount</th>
                <th className={ui.th}>Currency</th>
                <th className={ui.th}>Officer</th>
                <th className={ui.th}>Disbursed On</th>
                <th className={ui.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className={`${ui.td} text-center py-6 text-[var(--muted)]`} colSpan={8}>
                    Loading…
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td className={`${ui.td} text-center py-6 text-[var(--muted)]`} colSpan={8}>
                    No results match your filters.
                  </td>
                </tr>
              ) : (
                paged.map((r, i) => (
                  <tr
                    key={r.id || `${refOf(r)}-${i}`}
                    className={`${
                      i % 2 === 0 ? "bg-[var(--table-row-even)]" : "bg-[var(--table-row-odd)]"
                    } hover:bg-[var(--chip-soft)] transition-colors`}
                  >
                    <td className={ui.td}>{refOf(r)}</td>
                    <td className={ui.td}>{borrowerOf(r)}</td>
                    <td className={ui.td}>{productOf(r)}</td>
                    <td className={ui.tdRight}>{money(amountOf(r), currencyOf(r))}</td>
                    <td className={ui.td}>{currencyOf(r)}</td>
                    <td className={ui.td}>{officerOf(r)}</td>
                    <td className={ui.td}>{d10(disbursedOnOf(r))}</td>
                    <td className={ui.td}>
                      <button className={ui.btn} onClick={() => navigate(`/loans/${r.id}`)}>
                        View
                      </button>
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
            {filtered.length.toLocaleString()} disbursement(s)
            {filtered.length !== rows.length && ` • filtered from ${rows.length.toLocaleString()}`}
          </span>
          <span>Total {money(totalAmt, currency)}</span>
        </div>

        <div className="flex items-center justify-between mt-2">
          <button
            className={ui.btn}
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className={ui.sub}>
            Page {page} of {totalPages}
          </span>
          <button
            className={ui.btn}
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
