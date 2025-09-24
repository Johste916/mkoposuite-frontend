import React, { useEffect, useState } from "react";
import api from "../../api";

const money = (v) => `TZS ${Number(v || 0).toLocaleString()}`;

const BorrowerReports = () => {
  const [kpis, setKpis] = useState([
    { label: "Active Borrowers", value: "0" },
    { label: "Total Outstanding", value: money(0) },
    { label: "PAR", value: "0%" },
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get("/borrowers/reports/summary");
        const { activeBorrowers, totalOutstanding, par } = res?.data || {};
        setKpis([
          { label: "Active Borrowers", value: `${activeBorrowers ?? 0}` },
          { label: "Total Outstanding", value: money(totalOutstanding ?? 0) },
          { label: "PAR", value: `${Number(par ?? 0).toFixed(2)}%` },
        ]);
      } catch (err) {
        console.error("Error loading borrower reports summary:", err);
        setError("Failed to load borrower report data.");
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-4 bg-[var(--bg)] text-[var(--fg)]">
      <h1 className="text-2xl font-semibold">Borrower Reports</h1>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="card p-4 animate-pulse"
            >
              <div className="h-3 w-24 rounded bg-[var(--border)] mb-3" />
              <div className="h-6 w-32 rounded bg-[var(--border)]" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="card p-4">
          <p className="text-sm" style={{ color: "var(--fg)" }}>
            <span className="text-rose-600 dark:text-rose-400 font-medium">Error:</span>{" "}
            <span className="opacity-80">{error}</span>
          </p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {kpis.map((k) => (
              <div key={k.label} className="card p-4">
                <div className="text-[11px] uppercase tracking-wide muted">{k.label}</div>
                <div className="mt-1 text-xl font-semibold">{k.value}</div>
              </div>
            ))}
          </div>

          {/* Charts placeholder */}
          <div className="card p-4">
            <div className="text-sm muted">
              Charts will go here (by branch, officer, risk tiers).
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BorrowerReports;
