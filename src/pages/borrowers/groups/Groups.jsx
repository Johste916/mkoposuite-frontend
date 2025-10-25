import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../api";

/* ---------- tenant + headers ---------- */
const getEffectiveTenantId = () =>
  (typeof api.getTenantId === "function" ? api.getTenantId() : null) ||
  localStorage.getItem("activeTenantId") ||
  null;
const NULL_TENANT = "00000000-0000-0000-0000-000000000000";
const isValidTenant = (t) => !!t && t !== NULL_TENANT && t !== "null" && t !== "undefined";
const withTenant = (tenantId) => (tenantId ? { headers: { "x-tenant-id": tenantId } } : {});

/* ---------- robust path variants ---------- */
function apiVariants(p) {
  const core = (p || "").replace(/^\/+/, "");
  return Array.from(new Set([`/${core}`, `/api/${core}`, `/api/v1/${core}`, `/v1/${core}`]));
}

/* ---------- helpers (robust) ---------- */
async function tryGET(paths = [], opts = {}) {
  let lastErr;
  for (const p of paths) {
    try {
      const res = await api.get(p, opts);
      return res?.data;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("No endpoint succeeded");
}
const pickArray = (d) =>
  Array.isArray(d) ? d : d?.items || d?.rows || d?.data || d?.results || d?.groups || [];

function toGroupRows(raw) {
  const arr = pickArray(raw);
  return arr.map((g) => {
    const id =
      g.id ?? g._id ?? g.groupId ?? g.code ?? g.slug ?? g.uuid ?? String(Math.random());
    return {
      id,
      name: g.name ?? g.groupName ?? g.title ?? "—",
      membersCount:
        g.membersCount ?? g.memberCount ?? pickArray(g.members).length ?? g.size ?? 0,
      branchName: g.branchName ?? g.branch?.name ?? "—",
      totalLoans: g.totalLoans ?? g.loanCount ?? g.stats?.loans ?? 0,
      outstanding: g.totalLoanAmount ?? g.outstanding ?? g.stats?.outstanding ?? 0,
    };
  });
}

/* ---------- UI tokens ---------- */
const ui = {
  container: "w-full px-4 md:px-6 lg:px-8 py-6 min-h-screen bg-[var(--bg)] text-[var(--fg)]",
  card: "rounded-2xl border-2 border-[var(--border-strong)] bg-[var(--card)] shadow-lg",
  head: "bg-[var(--kpi-bg)] sticky top-0",
  th: "px-3 py-3 font-semibold border-b-2 border-[var(--border)] text-left",
  td: "px-3 py-2",
  row: "odd:bg-[var(--card)] even:bg-[var(--kpi-bg)] border-t border-[var(--border)]",
  actions: "px-3 py-2 text-right",
  linkStrong:
    "inline-flex items-center gap-1 font-semibold no-underline text-indigo-700 hover:text-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded",
  muted: "text-[var(--muted)]",
  danger: "text-[var(--danger-fg)]",
  btn: "px-3 py-2 rounded-lg border-2 border-[var(--border-strong)] hover:bg-[var(--kpi-bg)]",
  primary:
    "px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold border border-indigo-700 shadow hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300",
  cta:
    "px-4 py-2 rounded-lg bg-white text-indigo-700 font-semibold border border-indigo-600 shadow hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300",
};

export default function BorrowerGroups() {
  const rawTenant = useMemo(() => getEffectiveTenantId(), []);
  const tenantId = isValidTenant(rawTenant) ? rawTenant : null;
  const tenantQuery = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
  const tenantOpts = withTenant(tenantId);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchGroups = async (signal) => {
    setLoading(true);
    setError("");
    try {
      // prefer /groups on your backend, then fall back
      const bases = [
        tenantId && `tenants/${tenantId}/groups?include=members`,
        tenantId && `tenants/${tenantId}/groups`,
        "groups?include=members",
        "groups",
        "loan-groups?include=members",
        "loan-groups",
        "borrowers/groups?include=members",
        "borrowers/groups",
        "borrower-groups?include=members",
        "borrower-groups",
      ]
        .filter(Boolean)
        .flatMap(apiVariants);

      const data = await tryGET(bases, { ...tenantOpts, signal });
      setRows(toGroupRows(data));
    } catch (e) {
      if (e?.name !== "CanceledError" && e?.code !== "ERR_CANCELED") {
        console.warn("Group list fetch failed:", e);
        setRows([]);
        setError("Failed to load groups (endpoint not implemented).");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const ac = new AbortController();
    fetchGroups(ac.signal);
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const fmtMoney = (v) => `TZS ${Number(v || 0).toLocaleString()}`;

  return (
    <div className={ui.container}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Borrower Groups</h1>
        <div className="flex items-center gap-2">
          <button
            className={ui.btn}
            onClick={() => {
              const ac = new AbortController();
              fetchGroups(ac.signal);
            }}
          >
            Refresh
          </button>
          <Link
            to={`/borrowers/groups/add${tenantQuery}`}
            className={ui.cta}
            aria-label="Add a new borrower group"
          >
            Add Group
          </Link>
        </div>
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
                  <td colSpan={6} className={`p-4 ${ui.muted}`}>Loading…</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className={`p-4 ${ui.danger}`}>
                    {error}{" "}
                    <button
                      className={`${ui.btn} ml-2`}
                      onClick={() => {
                        const ac = new AbortController();
                        fetchGroups(ac.signal);
                      }}
                    >
                      Retry
                    </button>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className={`p-4 ${ui.muted}`}>No groups yet.</td>
                </tr>
              ) : (
                rows.map((g) => (
                  <tr key={g.id} className={ui.row}>
                    <td className={ui.td}>
                      <Link
                        to={`/borrowers/groups/${encodeURIComponent(g.id)}${tenantQuery}`}
                        className={ui.linkStrong}
                      >
                        {g.name}
                      </Link>
                    </td>
                    <td className={ui.td}>{g.membersCount}</td>
                    <td className={ui.td}>{g.branchName}</td>
                    <td className={ui.td}>{g.totalLoans}</td>
                    <td className={ui.td}>{fmtMoney(g.outstanding)}</td>
                    <td className={ui.actions}>
                      <Link
                        to={`/borrowers/groups/${encodeURIComponent(g.id)}${tenantQuery}`}
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
}
