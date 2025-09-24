import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../api";

/** Try a list of endpoints until one works */
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

const BorrowerGroups = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        const data = await tryGET(
          [
            "/borrowers/groups?include=members",
            "/groups?include=members",
            "/borrower-groups?include=members",
            "/api/borrowers/groups?include=members",
          ],
          { signal: ac.signal }
        );
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
    <div className="p-4 space-y-4 bg-[var(--bg)] text-[var(--fg)]">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Borrower Groups</h1>
        <Link
          to="/borrowers/groups/add"
          className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Add Group
        </Link>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left muted">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Members</th>
              <th className="px-3 py-2">Branch</th>
              <th className="px-3 py-2">Loans</th>
              <th className="px-3 py-2">Outstanding</th>
              <th className="px-3 py-2 text-right pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-4 muted">Loading…</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="p-4 text-rose-600 dark:text-rose-400">{error}</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 muted">No groups yet.</td>
              </tr>
            ) : (
              rows.map((g) => (
                <tr key={g.id} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2">{g.name}</td>
                  <td className="px-3 py-2">{g.membersCount}</td>
                  <td className="px-3 py-2">{g.branchName}</td>
                  <td className="px-3 py-2">{g.totalLoans}</td>
                  <td className="px-3 py-2">{fmtMoney(g.outstanding)}</td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      to={`/borrowers/groups/${encodeURIComponent(g.id)}`}
                      className="text-indigo-600 hover:text-indigo-800 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300"
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
  );
};

export default BorrowerGroups;
