// BorrowerGroups.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../api";

/** Try a list of endpoints using api.getFirst (handles /api variants) */
async function tryGET(paths = [], opts = {}) {
  return api.getFirst(paths, opts);
}

/** Normalize group list from various backend shapes */
function toGroupRows(raw) {
  const arr = Array.isArray(raw) ? raw : raw?.items || raw?.rows || raw?.data || [];
  return arr.map((g) => {
    const id =
      g.id ?? g._id ?? g.groupId ?? g.code ?? g.slug ?? g.uuid ?? String(Math.random());
    return {
      id,
      name: g.name ?? g.groupName ?? g.title ?? "—",
      membersCount: g.membersCount ?? g.memberCount ?? g.members?.length ?? g.size ?? 0,
      branchName: g.branchName ?? g.branch?.name ?? "—",
      totalLoans: g.totalLoans ?? g.loanCount ?? g.stats?.loans ?? 0,
      outstanding: g.totalLoanAmount ?? g.outstanding ?? g.stats?.outstanding ?? 0,
    };
  });
}

/* ---------- Token-based UI ---------- */
const ui = {
  container:
    "w-full px-4 md:px-6 lg:px-8 py-6 min-h-screen bg-[var(--bg)] text-[var(--fg)]",
  card: "rounded-2xl border-2 border-[var(--border-strong)] bg-[var(--card)] shadow-lg",
  head: "bg-[var(--kpi-bg)] sticky top-0",
  th: "px-3 py-3 font-semibold border-b-2 border-[var(--border)] text-left",
  td: "px-3 py-2",
  row: "odd:bg-[var(--card)] even:bg-[var(--kpi-bg)] border-t border-[var(--border)]",
  linkStrong:
    "inline-flex items-center gap-1 font-bold underline decoration-2 underline-offset-4 rounded " +
    "text-[var(--ring)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
  muted: "text-[var(--muted)]",
  danger: "text-[var(--danger-fg)]",
};

const BorrowerGroups = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        const tenantId = localStorage.getItem("activeTenantId") || null;
        const opt = {
          signal: ac.signal,
          ...(tenantId ? { headers: { "x-tenant-id": tenantId } } : {}),
        };
        const endpoints = [
          "/borrowers/groups?include=members",
          "/groups?include=members",
          "/borrower-groups?include=members",
          "/v1/borrowers/groups?include=members",
          "/v1/groups?include=members",
          "/v1/borrower-groups?include=members",
          tenantId && `/tenants/${tenantId}/groups?include=members`,
          tenantId && `/v1/tenants/${tenantId}/groups?include=members`,
        ].filter(Boolean);

        const data = await tryGET(endpoints, opt);
        setRows(toGroupRows(data));
        setError("");
      } catch {
        setError("Failed to load groups (endpoint not implemented).");
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  const fmtMoney = (v) => `TZS ${Number(v || 0).toLocaleString()}`;

  return (
    <div className={ui.container}>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight">Borrower Groups</h1>
        <Link
          to="/borrowers/groups/add"
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          Add Group
        </Link>
      </div>

      <div className={`${ui.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-[15px] border-collapse">
            <thead className={ui.head}>
              <tr className="text-left">
                <th className={ui.th}>Name</th>
                <th className={ui.th}>Members</th>
                <th className={ui.th}>Branch</th>
                <th className={ui.th}>Loans</th>
                <th className={ui.th}>Outstanding</th>
                <th className={`${ui.th} text-right pr-4`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className={`p-4 ${ui.muted}`}>
                    Loading…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className={`p-4 ${ui.danger}`}>
                    {error}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className={`p-4 ${ui.muted}`}>
                    No groups yet.
                  </td>
                </tr>
              ) : (
                rows.map((g) => (
                  <tr key={g.id} className={ui.row}>
                    <td className={ui.td}>
                      <Link
                        to={`/borrowers/groups/${encodeURIComponent(g.id)}`}
                        className={ui.linkStrong}
                      >
                        {g.name}
                      </Link>
                    </td>
                    <td className={ui.td}>{g.membersCount}</td>
                    <td className={ui.td}>{g.branchName}</td>
                    <td className={ui.td}>{g.totalLoans}</td>
                    <td className={ui.td}>{fmtMoney(g.outstanding)}</td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        to={`/borrowers/groups/${encodeURIComponent(g.id)}`}
                        className={ui.linkStrong}
                      >
                        View
                      </Link>
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
};

export default BorrowerGroups;
