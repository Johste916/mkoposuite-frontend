import React, { useEffect, useState } from "react";
import api from "../../api";

/* --- UI tokens for the bold, high-contrast look --- */
const ui = {
  wrap: "w-full px-4 md:px-6 lg:px-8 py-6 text-slate-900",
  h1: "text-3xl font-extrabold tracking-tight",
  sub: "text-sm text-slate-700",
  card: "rounded-2xl border-2 border-slate-300 bg-white shadow",
  th: "bg-slate-100 text-left text-[12px] uppercase tracking-wide text-slate-700 font-semibold px-3 py-2 border-2 border-slate-200 select-none",
  td: "px-3 py-2 border-2 border-slate-200 text-sm",
  btn: "inline-flex items-center justify-center rounded-lg border-2 border-slate-300 px-3 py-2 hover:bg-slate-50",
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
            <p className="text-xs text-slate-600 mt-1">
              Last updated {lastUpdated.toLocaleString()}
            </p>
          )}
        </div>
        <button onClick={load} className={ui.btn} title="Refresh">
          Refresh
        </button>
      </div>

      {/* Card with full-width, crisp table */}
      <div className={`${ui.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-2 border-slate-300 border-collapse bg-white">
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
                  <td colSpan={4} className={`${ui.td} text-center py-10 text-slate-600`}>
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className={`${ui.td} text-center py-10 text-slate-600`}>
                    Empty
                  </td>
                </tr>
              ) : (
                items.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className={ui.td}>{l.reference || `L-${l.id}`}</td>
                    <td className={ui.td}>{l.Borrower?.name || "—"}</td>
                    <td className={ui.td}>{money(l.amount, l.currency || "TZS")}</td>
                    <td className={ui.td}>{fmtDate(l.approvalDate?.slice(0, 10))}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer summary (optional but useful, still bold & tidy) */}
        {!loading && items.length > 0 && (
          <div className="flex items-center justify-between px-3 py-2 border-t-2 border-slate-300 text-sm">
            <span className="text-slate-700">
              {items.length.toLocaleString()} ready for disbursement
            </span>
            <span className="text-slate-700">
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
