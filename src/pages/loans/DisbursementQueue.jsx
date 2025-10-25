// src/pages/loans/DisbursementQueue.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import { getUserRole } from "../../utils/auth";

/* --- Token-based UI (matches theme.css + .app-theme-bold) --- */
const ui = {
  wrap: "w-full px-4 md:px-6 lg:px-8 py-6 bg-[var(--bg)] text-[var(--fg)]",
  h1: "text-3xl font-extrabold tracking-tight",
  sub: "text-sm text-[var(--muted)]",
  card: "card overflow-hidden",
  tableWrap: "table-wrap table-frame relative overflow-x-auto",
  th:
    "bg-[var(--table-head-bg)] text-left text-[12px] uppercase tracking-wide " +
    "text-[var(--fg)]/90 font-semibold px-3 py-2 border border-[var(--border)] select-none",
  td: "px-3 py-2 border border-[var(--border)] text-sm text-[var(--fg)]",
  tdRight: "px-3 py-2 border border-[var(--border)] text-sm text-right tabular-nums text-[var(--fg)]",
  btn:
    "inline-flex items-center justify-center rounded-lg border-2 border-[var(--border-strong)] " +
    "px-3 py-2 bg-[var(--card)] text-[var(--fg)] hover:bg-[var(--chip-soft)] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] " +
    "focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
  primary:
    "inline-flex items-center justify-center rounded-lg px-3 py-2 font-semibold " +
    "bg-[var(--primary)] text-[var(--primary-contrast)] hover:opacity-90 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
  stickyTh: "sticky right-0 z-10 bg-[var(--table-head-bg)] border-l-2 border-[var(--border-strong)]",
  stickyTd: "sticky right-0 z-10 bg-[var(--card)]/95 backdrop-blur border-l-2 border-[var(--border-strong)]",
};

const money = (v, c = "TZS") => `\u200e${c} ${Number(v || 0).toLocaleString()}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");

// normalize helpers
const refOf = (l) => l.ref || l.reference || l.code || `LN-${l.id}`;
const borrowerOf = (l) => l.borrower?.name || l.borrowerName || l.Borrower?.name || "—";
const approvedOnOf = (l) => l.approvedAt || l.approvalDate || l.updatedAt || l.createdAt || null;

// ---- robust role detection (fixes "No permission" for admins)
function readRole() {
  try {
    const r = getUserRole?.();
    if (r) return String(r).toLowerCase().trim();
  } catch {}
  try {
    const r = JSON.parse(localStorage.getItem("user") || "{}").role;
    if (r) return String(r).toLowerCase().trim();
  } catch {}
  return "";
}
function canUserDisburse(role) {
  // include likely admin/finance variants
  const r = String(role || "").toLowerCase().trim();
  return [
    "admin",
    "superadmin",
    "super admin",
    "systemadmin",
    "system_admin",
    "system admin",
    "director",
    "accountant",
    "finance",
  ].includes(r);
}

export default function DisbursementQueue() {
  const navigate = useNavigate();
  const role = readRole();
  const canDisburse = canUserDisburse(role);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [actingId, setActingId] = useState(null);
  const [err, setErr] = useState(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      let data;
      try {
        const r = await api.get("/loans/disbursements");
        data = Array.isArray(r.data) ? r.data : r.data?.items || r.data?.data || [];
      } catch {
        const r = await api.get("/loans", { params: { status: "approved", pageSize: 500 } });
        data = Array.isArray(r.data) ? r.data : r.data?.items || r.data?.data || [];
      }
      const ready = (data || []).filter(
        (l) => String(l.status || "").toLowerCase() === "approved"
      );
      setItems(ready);
    } catch (e) {
      console.error(e);
      setErr("Failed to load disbursement queue.");
      setItems([]);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  };

  useEffect(() => {
    load();
  }, []);

  async function disburse(loanId) {
    setActingId(loanId);
    try {
      try {
        await api.post(`/loans/${loanId}/disburse`);
      } catch {
        try {
          await api.patch(`/loans/${loanId}/status`, { status: "disbursed" });
        } catch {
          await api.put(`/loans/${loanId}/status`, { status: "disbursed" });
        }
      }
      await load();
      alert("Loan marked as disbursed.");
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.error || "Failed to disburse loan.");
    } finally {
      setActingId(null);
    }
  }

  const total = useMemo(() => items.reduce((s, r) => s + Number(r.amount || 0), 0), [items]);
  const currency = items[0]?.currency || "TZS";

  return (
    <div className={ui.wrap}>
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
        <div className="flex gap-2">
          <button onClick={load} className={ui.btn} title="Refresh">
            Refresh
          </button>
        </div>
      </div>

      <div className={ui.card}>
        <div className={ui.tableWrap}>
          <table className="min-w-[900px] w-full text-sm">
            <thead>
              <tr>
                <th className={ui.th}>Ref</th>
                <th className={ui.th}>Borrower</th>
                <th className={ui.th}>Amount</th>
                <th className={ui.th}>Approved On</th>
                <th className={`${ui.th} ${ui.stickyTh}`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className={`${ui.td} text-center py-10 text-[var(--muted)]`}>
                    Loading…
                  </td>
                </tr>
              ) : err ? (
                <tr>
                  <td colSpan={5} className={`${ui.td} text-center py-10 text-[var(--muted)]`}>
                    {err}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className={`${ui.td} text-center py-10 text-[var(--muted)]`}>
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
                    <td className={ui.td}>{refOf(l)}</td>
                    <td className={ui.td}>{borrowerOf(l)}</td>
                    <td className={ui.tdRight}>{money(l.amount, l.currency || "TZS")}</td>
                    <td className={ui.td}>{fmtDate(approvedOnOf(l))}</td>
                    <td className={`${ui.td} ${ui.stickyTd}`}>
                      <div className="flex flex-wrap gap-2">
                        <button className={ui.btn} onClick={() => navigate(`/loans/${l.id}`)}>
                          View
                        </button>
                        {canDisburse ? (
                          <button
                            className={ui.primary}
                            disabled={actingId === l.id}
                            onClick={() => disburse(l.id)}
                            title="Finalize and mark as disbursed"
                          >
                            {actingId === l.id ? "Working…" : "Disburse"}
                          </button>
                        ) : (
                          <span className="text-[var(--muted)] text-xs">No permission</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && !err && items.length > 0 && (
              <tfoot>
                <tr>
                  <td className={ui.td} colSpan={4}>
                    {items.length.toLocaleString()} ready for disbursement
                  </td>
                  <td className={`${ui.td} ${ui.stickyTd} text-right`}>
                    Total {money(total, currency)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
