// src/pages/loans/LoanReports.jsx
import React, { useEffect, useState } from "react";
import api from "../../api";

const ui = {
  page: "p-4 space-y-4 bg-[var(--bg)] text-[var(--fg)]",
  h1: "text-2xl font-extrabold tracking-tight",
  card: "card p-4 rounded-2xl border-2 border-[var(--border-strong)] bg-[var(--card)]",
  alert:
    "mb-3 rounded-md border-2 border-[var(--border-strong)] bg-[var(--card)] text-[var(--fg)] px-3 py-2 text-sm",
  tableWrap:
    "overflow-x-auto rounded-2xl border-2 border-[var(--border-strong)] bg-[var(--card)]",
  th:
    "bg-[var(--table-head-bg)] text-left text-[12px] uppercase tracking-wide font-semibold " +
    "px-3 py-2 border border-[var(--border)] text-[var(--fg)]/90",
  td: "px-3 py-2 border border-[var(--border)] text-sm",
};

const toArray = (data) =>
  Array.isArray(data) ? data
  : Array.isArray(data?.items) ? data.items
  : Array.isArray(data?.rows) ? data.rows
  : Array.isArray(data?.results) ? data.results
  : [];

const money = (n) => {
  const x = Number(n);
  return Number.isFinite(x) ? x.toLocaleString() : n ?? "—";
};

export default function LoanReports() {
  const [disbursed, setDisbursed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await api.get("/loans/reports/disbursements/list");
        setDisbursed(toArray(res.data));
      } catch (e) {
        setErr("Failed to load disbursements");
        setDisbursed([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className={ui.page}>
      <h2 className={ui.h1}>Loan Reports</h2>

      <div className={ui.card}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Recently Disbursed</h3>
        </div>

        {err && <div className={ui.alert}>{err}</div>}

        <div className={ui.tableWrap}>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                {["Ref", "Borrower", "Amount", "Date"].map((h) => (
                  <th key={h} className={ui.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className={`${ui.td} text-center py-6 text-[var(--muted)]`} colSpan={4}>
                    Loading…
                  </td>
                </tr>
              ) : disbursed.length === 0 ? (
                <tr>
                  <td colSpan={4} className={`${ui.td} text-center py-6 text-[var(--muted)]`}>
                    No data
                  </td>
                </tr>
              ) : (
                disbursed.map((l, i) => (
                  <tr
                    key={l.id}
                    className={`${
                      i % 2 === 0 ? "bg-[var(--table-row-even)]" : "bg-[var(--table-row-odd)]"
                    } hover:bg-[var(--chip-soft)] transition-colors`}
                  >
                    <td className={ui.td}>{l.reference || `L-${l.id}`}</td>
                    <td className={ui.td}>{l.Borrower?.name || "—"}</td>
                    <td className={ui.td}>{money(l.amount)}</td>
                    <td className={ui.td}>
                      {(l.disbursementDate || l.date || l.createdAt || "").slice(0, 10) || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
