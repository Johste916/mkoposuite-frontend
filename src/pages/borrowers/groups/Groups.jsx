import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../api";

const BorrowerGroups = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        const res = await api.get("/borrowers/groups", { signal: ac.signal });
        const list = Array.isArray(res.data) ? res.data : res.data?.items || res.data?.data || [];
        setRows(list);
      } catch {
        setError("Failed to load groups");
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  const fmtMoney = (v) => `TZS ${Number(v || 0).toLocaleString()}`;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Borrower Groups</h1>
        <Link
          to="/borrowers/groups/add"
          className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Add Group
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Members</th>
              <th className="px-3 py-2 text-left">Branch</th>
              <th className="px-3 py-2 text-left">Loans</th>
              <th className="px-3 py-2 text-left">Outstanding</th>
              <th className="px-3 py-2 text-right pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-4 text-gray-500">Loading…</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="p-4 text-red-600">{error}</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-gray-500">No groups yet.</td>
              </tr>
            ) : (
              rows.map((g) => (
                <tr key={g.id} className="border-t">
                  <td className="px-3 py-2">{g.name}</td>
                  <td className="px-3 py-2">{g.membersCount ?? g.memberCount ?? "—"}</td>
                  <td className="px-3 py-2">{g.branchName || "—"}</td>
                  <td className="px-3 py-2">{g.totalLoans ?? g.loanCount ?? "—"}</td>
                  <td className="px-3 py-2">{fmtMoney(g.totalLoanAmount || g.outstanding)}</td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      to={`/borrowers/groups/${encodeURIComponent(g.id)}`}
                      className="text-indigo-600 hover:text-indigo-800 hover:underline"
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
