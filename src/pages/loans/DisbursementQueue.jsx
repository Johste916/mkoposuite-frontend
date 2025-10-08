// src/pages/loans/DisbursementQueue.jsx
import React, { useEffect, useState } from "react";
import api from "../../api";

/* --- Token-based UI (matches theme.css + .app-theme-bold) --- */
const ui = {
  wrap: "w-full px-4 md:px-6 lg:px-8 py-6 bg-[var(--bg)] text-[var(--fg)]",
  h1: "text-3xl font-extrabold tracking-tight",
  sub: "text-sm text-[var(--muted)]",
  // rely on tokens; .app-theme-bold will further upgrade .card / .table-frame
  card: "card overflow-hidden",
  tableWrap: "table-wrap table-frame",
  th:
    "bg-[var(--table-head-bg)] text-left text-[12px] uppercase tracking-wide " +
    "text-[var(--fg)]/90 font-semibold px-3 py-2 border border-[var(--border)] select-none",
  td: "px-3 py-2 border border-[var(--border)] text-sm text-[var(--fg)]",
  btn:
    "inline-flex items-center justify-center rounded-lg border-2 border-[var(--border-strong)] " +
    "px-3 py-2 bg-[var(--card)] text-[var(--fg)] hover:bg-[var(--chip-soft)] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] " +
    "focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
};

const money = (v, c = "TZS") => `\u200e${c} ${Number(v || 0).toLocaleString()}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");

export default function DisbursementQueue() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/loans", { params: { status: "approved" } });
      const all = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setItems((all || []).filter((l) => (l.status || "").toLowerCase() === "approved"));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className={ui.wrap}>
      {/* Header */}
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <h1 className={ui.h1}>Disbursement Queue</h1>
          <p className={ui.sub}>Loans awaiting disbursement.</p>
          {lastUpdated && (
            <p className="text-xs text-[var(--muted)] mt-1">
              Last updated {lastUpdated.toLocaleString()}
            </p>
          )}
        </div>
        <button onClick={load} className={ui.btn} title="Refresh">
          Refresh
        </button>
      </div>

      {/* Card with full-width, crisp table (token colors only) */}
      <div className={`${ui.card}`}>
        <div className={`${ui.tableWrap}`}>
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className={ui.th}>Ref</th>
                <th className={ui.th}>Borrower</th>
                <th className={ui.th}>Amount</th>
                <th className={ui.th}>Approved On</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className={`${ui.td} text-center py-10 text-[var(--muted)]`}>
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className={`${ui.td} text-center py-10 text-[var(--muted)]`}>
                    Empty
                  </td>
                </tr>
              ) : (
                items.map((l, i) => (
                  <tr
                    key={l.id}
                    className={`transition-colors ${
                      i % 2 === 0 ? "bg-[var(--table-row-even)]" : "bg-[var(--table-row-odd)]"
                    } hover:bg-[var(--chip-soft)]`}
                  >
                    <td className={ui.td}>{l.reference || `L-${l.id}`}</td>
                    <td className={ui.td}>{l.Borrower?.name || "—"}</td>
                    <td className={`${ui.td} text-right tabular-nums`}>
                      {money(l.amount, l.currency || "TZS")}
                    </td>
                    <td className={ui.td}>{fmtDate(l.approvalDate?.slice(0, 10))}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer summary (tokenized) */}
        {!loading && items.length > 0 && (
          <div className="flex items-center justify-between px-3 py-2 border-t-2 border-[var(--border-strong)] text-sm">
            <span className="text-[var(--fg)]">
              {items.length.toLocaleString()} ready for disbursement
            </span>
            <span className="text-[var(--fg)]">
              Total{" "}
              {money(
                items.reduce((s, r) => s + Number(r.amount || 0), 0),
                items[0]?.currency || "TZS"
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
