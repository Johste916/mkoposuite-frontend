// src/pages/reports/BorrowerReports.jsx
import React, { useEffect, useState } from "react";
import api from "../../api";

const money = (v) => `TZS ${Number(v || 0).toLocaleString()}`;

const ui = {
  container: 'w-full px-4 md:px-6 lg:px-8 py-6 text-slate-900',
  h1: 'text-3xl font-extrabold tracking-tight',
  kpiCard: 'rounded-2xl border-2 border-slate-300 bg-white shadow p-4',
  kpiLabel: 'text-[11px] uppercase tracking-wide text-slate-600 font-semibold',
  kpiValue: 'mt-1 text-xl font-semibold',
  alert: 'rounded-2xl border-2 border-rose-300 bg-rose-50 px-4 py-3 text-rose-800',
  skeleton: 'rounded-2xl border-2 border-slate-300 bg-white shadow p-4',
  placeholderCard: 'rounded-2xl border-2 border-slate-300 bg-white shadow p-4',
};

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
    <div className={ui.container}>
      <h1 className={ui.h1}>Borrower Reports</h1>

      {loading ? (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className={ui.skeleton}>
              <div className="mb-3 h-3 w-24 rounded bg-slate-200" />
              <div className="h-6 w-32 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className={`${ui.alert} mt-4`}>{error}</div>
      ) : (
        <>
          {/* KPIs */}
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            {kpis.map((k) => (
              <div key={k.label} className={ui.kpiCard}>
                <div className={ui.kpiLabel}>{k.label}</div>
                <div className={ui.kpiValue}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Charts placeholder */}
          <div className={`${ui.placeholderCard} mt-4`}>
            <div className="text-sm text-slate-600">
              Charts will go here (by branch, officer, risk tiers).
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BorrowerReports;
