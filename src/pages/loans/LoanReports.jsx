// src/pages/loans/LoanReports.jsx
import React, { useEffect, useState } from "react";
import api from "../../api";

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
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold">Loan Reports</h2>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Recently Disbursed</h3>
        </div>

        {err && (
          <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 text-rose-700 px-3 py-2 text-sm">
            {err}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border border-[var(--border)] rounded-xl overflow-hidden">
            <thead className="bg-slate-50 dark:bg-slate-800/60">
              <tr className="text-left">
                {["Ref", "Borrower", "Amount", "Date"].map((h) => (
                  <th key={h} className="px-3 py-2 border-b border-[var(--border)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-3 py-6 text-center text-[var(--muted-fg)]" colSpan={4}>
                    Loading…
                  </td>
                </tr>
              ) : disbursed.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-[var(--muted-fg)]">
                    No data
                  </td>
                </tr>
              ) : (
                disbursed.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                    <td className="px-3 py-2 border-t border-[var(--border)]">
                      {l.reference || `L-${l.id}`}
                    </td>
                    <td className="px-3 py-2 border-t border-[var(--border)]">
                      {l.Borrower?.name || "—"}
                    </td>
                    <td className="px-3 py-2 border-t border-[var(--border)]">
                      {money(l.amount)}
                    </td>
                    <td className="px-3 py-2 border-t border-[var(--border)]">
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
