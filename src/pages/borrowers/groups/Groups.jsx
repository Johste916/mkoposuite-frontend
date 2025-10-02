// BorrowerGroups.jsx
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

/* ---------- Shared styles ---------- */
const containerCls = "w-full px-4 md:px-6 lg:px-8 py-6 min-h-screen bg-white text-slate-900";
const cardCls = "rounded-2xl border-2 border-slate-400 bg-white shadow-lg";
const strongLink =
  "inline-flex items-center gap-1 text-indigo-700 font-bold underline decoration-2 underline-offset-4 hover:text-indigo-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded";

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
    <div className={containerCls}>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight">Borrower Groups</h1>
        <Link
          to="/borrowers/groups/add"
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-semibold"
        >
          Add Group
        </Link>
      </div>

      <div className={`${cardCls} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-[15px] border-collapse">
            <thead className="bg-slate-100 sticky top-0">
              <tr className="text-left">
                <th className="px-3 py-3 font-semibold border-b-2 border-slate-200">Name</th>
                <th className="px-3 py-3 font-semibold border-b-2 border-slate-200">Members</th>
                <th className="px-3 py-3 font-semibold border-b-2 border-slate-200">Branch</th>
                <th className="px-3 py-3 font-semibold border-b-2 border-slate-200">Loans</th>
                <th className="px-3 py-3 font-semibold border-b-2 border-slate-200">Outstanding</th>
                <th className="px-3 py-3 font-semibold border-b-2 border-slate-200 text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-4 text-slate-700">
                    Loading…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="p-4 text-rose-700">
                    {error}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-slate-700">
                    No groups yet.
                  </td>
                </tr>
              ) : (
                rows.map((g) => (
                  <tr key={g.id} className="odd:bg-white even:bg-slate-50 border-t border-slate-200">
                    <td className="px-3 py-2">
                      <Link to={`/borrowers/groups/${encodeURIComponent(g.id)}`} className={strongLink}>
                        {g.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{g.membersCount}</td>
                    <td className="px-3 py-2">{g.branchName}</td>
                    <td className="px-3 py-2">{g.totalLoans}</td>
                    <td className="px-3 py-2">{fmtMoney(g.outstanding)}</td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        to={`/borrowers/groups/${encodeURIComponent(g.id)}`}
                        className="text-indigo-700 hover:text-indigo-900 underline decoration-2 underline-offset-4 font-semibold"
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
