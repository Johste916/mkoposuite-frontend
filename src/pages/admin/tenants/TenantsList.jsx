import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../api";

export default function TenantsList() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/admin/tenants", { params: { q, limit: 50, offset: 0 } });
      setRows(res.data || []);
      setTotal(Number(res.headers["x-total-count"] || 0));
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line

  return (
    <div className="ms-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Tenants ({total})</h2>
        <div className="flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="border rounded px-2 py-1" />
          <button onClick={load} className="h-9 px-3 rounded ms-btn">Search</button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-slate-500">No tenants.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Slug</th>
                <th className="py-2 pr-4">Plan</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Trial ends</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="py-2 pr-4">{t.name}</td>
                  <td className="py-2 pr-4">{t.slug}</td>
                  <td className="py-2 pr-4">{t.plan_code || '-'}</td>
                  <td className="py-2 pr-4">{t.status}</td>
                  <td className="py-2 pr-4">{t.trial_ends_at ? String(t.trial_ends_at).slice(0,10) : '-'}</td>
                  <td className="py-2 pr-4">
                    <Link className="text-blue-600 hover:underline" to={`/admin/tenants/${t.id}`}>Manage</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
