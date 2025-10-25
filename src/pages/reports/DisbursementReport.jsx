// src/pages/loans/DisbursementReport.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CSVLink } from "react-csv";
import api from "../../api";

/* --- Token-based UI (theme.css + .app-theme-bold) --- */
const ui = {
  wrap: "w-full px-4 md:px-6 lg:px-8 py-6 bg-[var(--bg)] text-[var(--fg)]",
  h1: "text-3xl font-extrabold tracking-tight",
  sub: "text-sm text-[var(--muted)]",
  controls: "card p-3 mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between",
  line: "flex flex-col sm:flex-row sm:items-center gap-2",
  input:
    "h-10 rounded-lg border-2 border-[var(--border-strong)] bg-[var(--card)] px-3 " +
    "text-[var(--fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
  btn:
    "inline-flex items-center justify-center rounded-lg border-2 border-[var(--border-strong)] " +
    "px-3 py-2 bg-[var(--card)] text-[var(--fg)] hover:bg-[var(--chip-soft)] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] " +
    "focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
  primary:
    "inline-flex items-center justify-center rounded-lg px-3 py-2 font-semibold " +
    "bg-[var(--primary)] text-[var(--primary-contrast)] hover:opacity-90 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",

  card: "card overflow-hidden",
  tableWrap: "table-wrap table-frame relative overflow-x-auto",
  th:
    "bg-[var(--table-head-bg)] text-left text-[12px] uppercase tracking-wide " +
    "text-[var(--fg)]/90 font-semibold px-3 py-2 border border-[var(--border)] select-none",
  td: "px-3 py-2 border border-[var(--border)] text-sm text-[var(--fg)]",
  tdRight:
    "px-3 py-2 border border-[var(--border)] text-sm text-right tabular-nums text-[var(--fg)]",
  foot:
    "px-3 py-2 border-t-2 border-[var(--border-strong)] text-sm flex items-center justify-between",
};

const money = (v, c = "TZS") => `\u200e${c} ${Number(v || 0).toLocaleString()}`;
const d10 = (v) => (v ? new Date(v).toISOString().slice(0, 10) : "—");

/* Normalizers across API shapes */
const refOf = (r) => r.reference || r.ref || r.code || `LN-${r.id}`;
const borrowerOf = (r) => r.borrower?.name || r.borrowerName || r.Borrower?.name || "—";
const productOf = (r) => r.product?.name || r.Product?.name || r.productName || "—";
const officerOf = (r) =>
  r.officer?.name || r.loanOfficer?.name || r.Officer?.name || r.officerName || "—";
const disbursedOnOf = (r) =>
  r.disbursementDate || r.disbursedAt || r.disbursed_on || r.updatedAt || r.createdAt;
const methodOf = (r) => r.disbursementMethod || r.method || "—";
const amountOf = (r) => Number(r.amount ?? r.principal ?? r.principalAmount ?? 0);

/** Fee calculator compatible with product-level or loan-level overrides */
function feeAmount(r) {
  const principal = amountOf(r);
  const type = r.feeType || r.Product?.feeType || r.product?.feeType;
  const amt = Number(r.feeAmount ?? r.Product?.feeAmount ?? r.product?.feeAmount ?? 0);
  const pct = Number(r.feePercent ?? r.Product?.feePercent ?? r.product?.feePercent ?? 0);
  if (type === "percent") return (principal * pct) / 100;
  if (type === "amount") return amt;
  return 0;
}
const netAmount = (r) => Math.max(0, amountOf(r) - feeAmount(r));

export default function DisbursementReport() {
  const navigate = useNavigate();

  /* Filters */
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  /* Data */
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      // Try dedicated list first, then queue, then /loans status=disbursed
      const data = await api.getFirst(
        ["/loans/reports/disbursements/list", "/loans/disbursements", "/loans?status=disbursed"],
        { params: { pageSize: 500, from, to, q: search } }
      );

      const cleaned = (Array.isArray(data) ? data : (data?.items || data?.data || data?.rows || []))
        .filter((x) => String(x.status || "").toLowerCase() === "disbursed");

      setRows(cleaned);
    } catch (e) {
      console.error(e);
      setErr(e?.normalizedMessage || "Failed to load disbursements.");
      setRows([]);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }

  /* Client-side search */
  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        String(refOf(r)).toLowerCase().includes(q) ||
        borrowerOf(r).toLowerCase().includes(q) ||
        productOf(r).toLowerCase().includes(q) ||
        officerOf(r).toLowerCase().includes(q)
    );
  }, [rows, search]);

  const totals = useMemo(
    () => ({
      principal: filtered.reduce((s, r) => s + amountOf(r), 0),
      fees: filtered.reduce((s, r) => s + feeAmount(r), 0),
      net: filtered.reduce((s, r) => s + netAmount(r), 0),
    }),
    [filtered]
  );
  const currency = rows[0]?.currency || "TZS";

  /* CSV export */
  const csvHeaders = [
    { label: "Ref", key: "ref" },
    { label: "Borrower", key: "borrower" },
    { label: "Product", key: "product" },
    { label: "Principal", key: "principal" },
    { label: "Fees", key: "fees" },
    { label: "Net Disbursed", key: "net" },
    { label: "Currency", key: "currency" },
    { label: "Officer", key: "officer" },
    { label: "Disbursed On", key: "date" },
    { label: "Method", key: "method" },
  ];
  const csvData = filtered.map((r) => ({
    ref: refOf(r),
    borrower: borrowerOf(r),
    product: productOf(r),
    principal: amountOf(r),
    fees: feeAmount(r),
    net: netAmount(r),
    currency: r.currency || "TZS",
    officer: officerOf(r),
    date: d10(disbursedOnOf(r)),
    method: methodOf(r),
  }));

  return (
    <div className={ui.wrap}>
      {/* Header */}
      <div className="mb-2">
        <h1 className={ui.h1}>Disbursement Report</h1>
        <p className={ui.sub}>
          All loans marked <strong>Disbursed</strong> with fees and net amounts.
          {lastUpdated && <> · <span>Last updated {lastUpdated.toLocaleString()}</span></>}
        </p>
      </div>

      {/* Controls */}
      <div className={ui.controls}>
        <div className={ui.line}>
          <input
            className={ui.input}
            placeholder="Search ref / borrower / product / officer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
          />
          <input type="date" className={ui.input} value={from} onChange={(e) => setFrom(e.target.value)} />
          <input type="date" className={ui.input} value={to} onChange={(e) => setTo(e.target.value)} />
          <button className={ui.btn} onClick={load}>Apply Filters</button>
          <button
            className={ui.btn}
            onClick={() => {
              setSearch(""); setFrom(""); setTo(""); load();
            }}
          >
            Reset
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button className={ui.btn} onClick={load}>Refresh</button>
          <CSVLink data={csvData} headers={csvHeaders} filename="disbursements.csv" className={ui.primary}>
            Export CSV
          </CSVLink>
        </div>
      </div>

      {/* Table */}
      <div className={ui.card}>
        <div className={ui.tableWrap}>
          <table className="min-w-[1100px] w-full text-sm">
            <thead>
              <tr>
                <th className={ui.th}>Ref</th>
                <th className={ui.th}>Borrower</th>
                <th className={ui.th}>Product</th>
                <th className={ui.th}>Principal</th>
                <th className={ui.th}>Fees</th>
                <th className={ui.th}>Net Disbursed</th>
                <th className={ui.th}>Currency</th>
                <th className={ui.th}>Officer</th>
                <th className={ui.th}>Disbursed On</th>
                <th className={ui.th}>Method</th>
                <th className={ui.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className={`${ui.td} text-center py-10 text-[var(--muted)]`}>Loading…</td>
                </tr>
              ) : err ? (
                <tr>
                  <td colSpan={11} className={`${ui.td} text-center py-10`}>
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-[var(--muted)]">{err}</span>
                      <button className={ui.btn} onClick={load}>Retry</button>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className={`${ui.td} text-center py-10 text-[var(--muted)]`}>
                    No disbursements match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((r, i) => (
                  <tr
                    key={r.id || `${refOf(r)}-${i}`}
                    className={`transition-colors ${i % 2 === 0 ? "bg-[var(--table-row-even)]" : "bg-[var(--table-row-odd)]"} hover:bg-[var(--chip-soft)]`}
                  >
                    <td className={ui.td}>{refOf(r)}</td>
                    <td className={ui.td}>{borrowerOf(r)}</td>
                    <td className={ui.td}>{productOf(r)}</td>
                    <td className={ui.tdRight}>{money(amountOf(r), r.currency || "TZS")}</td>
                    <td className={ui.tdRight}>{money(feeAmount(r), r.currency || "TZS")}</td>
                    <td className={ui.tdRight}>{money(netAmount(r), r.currency || "TZS")}</td>
                    <td className={ui.td}>{r.currency || "TZS"}</td>
                    <td className={ui.td}>{officerOf(r)}</td>
                    <td className={ui.td}>{d10(disbursedOnOf(r))}</td>
                    <td className={ui.td}>{methodOf(r)}</td>
                    <td className={ui.td}>
                      <button className={ui.btn} onClick={() => navigate(`/loans/${r.id}`)} title="Open loan">
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer summary */}
        {!loading && !err && (
          <div className={ui.foot}>
            <span>{filtered.length.toLocaleString()} disbursement(s)</span>
            <div className="flex items-center gap-4">
              <span>Principal {money(totals.principal, currency)}</span>
              <span>Fees {money(totals.fees, currency)}</span>
              <span><strong>Net {money(totals.net, currency)}</strong></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
