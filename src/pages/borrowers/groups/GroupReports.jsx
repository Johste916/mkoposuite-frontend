// src/pages/borrowers/groups/GroupReports.jsx
import React, { useEffect, useState } from "react";
import api from "../../../api";

/** Avoid /api/api/... and support both prefixed/unprefixed backends */
function apiVariants(p) {
  const clean = p.startsWith("/") ? p : `/${p}`;
  const noApi = clean.replace(/^\/api\//, "/");
  const withApi = noApi.startsWith("/api/") ? noApi : `/api${noApi}`;
  return Array.from(new Set([noApi, withApi]));
}

async function tryGET(paths = [], opts = {}) {
  let lastErr;
  for (const p of paths) {
    try { const res = await api.get(p, opts); return res?.data; }
    catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("No endpoint succeeded");
}

/** Accepts many shapes from the backend and normalizes */
function toSummary(raw) {
  const s = raw?.summary || raw || {};
  const n = (v) => Number(v || 0);
  const pct = (v) =>
    typeof v === "string" && v.trim().endsWith("%")
      ? v
      : `${Number(v || 0).toFixed(2).replace(/\.00$/, "")}%`;

  return {
    totalGroups: n(s.totalGroups ?? s.groups ?? s.count),
    activeGroups: n(s.activeGroups ?? s.active ?? s.enabled),
    totalLoans: n(s.totalLoans ?? s.groupLoans ?? s.loans),
    par: pct(s.par ?? s.portfolioAtRisk ?? s.par30 ?? 0),
  };
}

const GroupReports = () => {
  const [summary, setSummary] = useState({
    totalGroups: 0,
    activeGroups: 0,
    totalLoans: 0,
    par: "0%",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchGroupSummary = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await tryGET([
        ...apiVariants("borrowers/groups/reports/summary"),
        ...apiVariants("groups/reports/summary"),
        ...apiVariants("borrower-groups/reports/summary"),
      ]);
      setSummary(toSummary(data));
    } catch (err) {
      // Show a clean error but keep the page usable
      setError(
        err?.response?.status === 404
          ? "Group report endpoint not implemented."
          : (err?.response?.data?.error || err?.message || "Failed to load group report data.")
      );
      setSummary({ totalGroups: 0, activeGroups: 0, totalLoans: 0, par: "0%" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGroupSummary(); }, []);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Group Reports</h1>
        <button
          onClick={fetchGroupSummary}
          className="px-3 py-2 rounded bg-slate-100 hover:bg-slate-200"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading group analytics...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded shadow p-4">
              <div className="text-xs text-gray-500">Total Groups</div>
              <div className="text-xl font-semibold">{summary.totalGroups || 0}</div>
            </div>
            <div className="bg-white rounded shadow p-4">
              <div className="text-xs text-gray-500">Active Groups</div>
              <div className="text-xl font-semibold">{summary.activeGroups || 0}</div>
            </div>
            <div className="bg-white rounded shadow p-4">
              <div className="text-xs text-gray-500">Total Group Loans</div>
              <div className="text-xl font-semibold">
                {Number(summary.totalLoans || 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-white rounded shadow p-4">
              <div className="text-xs text-gray-500">PAR</div>
              <div className="text-xl font-semibold text-red-600">
                {summary.par || "0%"}
              </div>
            </div>
          </div>

          <div className="bg-white rounded shadow p-4">
            <p className="text-sm text-gray-600">
              Charts and trends (by branch, officer, performance tiers) will appear
              here once backend analytics endpoints are available.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default GroupReports;
