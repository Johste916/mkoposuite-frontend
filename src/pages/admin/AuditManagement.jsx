// src/pages/admin/AuditManagement.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../api";

export default function AuditManagement() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  const normalizeList = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.items)) return payload.items;
    return [];
  };

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const [listRes, sumRes] = await Promise.all([
        api.get("/admin/audit?limit=200"),
        api.get("/admin/audit/summary"),
      ]);
      setRows(normalizeList(listRes.data));
      setTotal(listRes.data?.total ?? normalizeList(listRes.data).length ?? 0);
      setSummary(sumRes.data || null);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || "Failed to load audits");
      setRows([]); setSummary(null); setTotal(0);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const list = normalizeList(rows);
    const term = q.toLowerCase().trim();
    if (!term) return list;
    return list.filter((x) =>
      [x?.User?.name, x?.Branch?.name, x?.category, x?.message, x?.ip, x?.action]
        .some((v) => String(v || "").toLowerCase().includes(term))
    );
  }, [rows, q]);

  const reverse = async (id) => {
    try { await api.post(`/admin/audit/${id}/reverse`); await load(); }
    catch (e) { alert(e?.response?.data?.error || e.message || "Failed to reverse entry"); }
  };

  const remove = async (id) => {
    if (!confirm("Delete this audit entry?")) return;
    try { await api.delete(`/admin/audit/${id}`); await load(); }
    catch (e) { alert(e?.response?.data?.error || e.message || "Failed to delete entry"); }
  };

  const Card = ({ label, value }) => (
    <div className="rounded-2xl border p-3 bg-white dark:bg-slate-900">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <header className="bg-white dark:bg-slate-900 border rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Audit Management</h1>
          <p className="text-sm text-slate-500">
            Track logins, actions, and changes. Linked to dashboard activity widgets.
          </p>
        </div>
        <input
          className="rounded border px-3 py-2 text-sm w-full md:w-96"
          value={q}
          onChange={(e)=>setQ(e.target.value)}
          placeholder="Search audit…"
        />
      </header>

      {/* Summary widgets */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card label="Events (30d)" value={summary?.totals?.all ?? 0} />
        <Card label="Creates" value={summary?.totals?.create ?? 0} />
        <Card label="Updates" value={summary?.totals?.update ?? 0} />
        <Card label="Deletes" value={summary?.totals?.delete ?? 0} />
        <Card label="Logins (OK)" value={summary?.totals?.loginSuccess ?? 0} />
        <Card label="Logins (Failed)" value={summary?.totals?.loginFailed ?? 0} />
      </div>

      {err && <div className="text-sm text-rose-600">{err}</div>}

      <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4">
        {loading ? (
          <div className="text-sm text-slate-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-slate-500">No entries.</div>
        ) : (
          <>
            <div className="text-xs text-slate-500 mb-2">
              Showing {filtered.length} of {total} events
            </div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left">
                  <tr className="border-b">
                    <th className="py-2 pr-3">Time</th>
                    <th className="py-2 pr-3">Branch</th>
                    <th className="py-2 pr-3">Staff</th>
                    <th className="py-2 pr-3">Category</th>
                    <th className="py-2 pr-3">Message</th>
                    <th className="py-2 pr-3">Action</th>
                    <th className="py-2 pr-3">IP</th>
                    <th className="py-2 pr-3">Ops</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2 pr-3">
                        {new Date(r.createdAt || r.ts || Date.now()).toLocaleString()}
                      </td>
                      <td className="py-2 pr-3">{r?.Branch?.name || "-"}</td>
                      <td className="py-2 pr-3">{r?.User?.name || "-"}</td>
                      <td className="py-2 pr-3">{r.category || "-"}</td>
                      <td className="py-2 pr-3">
                        {/* Show short version of message JSON if present */}
                        {(() => {
                          try {
                            const m = typeof r.message === 'string' ? JSON.parse(r.message) : r.message;
                            if (m?.body) return JSON.stringify(m.body).slice(0, 90) + (JSON.stringify(m.body).length > 90 ? '…' : '');
                            return r.message || '-';
                          } catch { return r.message || '-'; }
                        })()}
                      </td>
                      <td className="py-2 pr-3">{r.action || "-"}</td>
                      <td className="py-2 pr-3">{r.ip || "-"}</td>
                      <td className="py-2 pr-3">
                        <div className="flex gap-2">
                          <button className="px-2 py-1 rounded bg-slate-100" onClick={()=>reverse(r.id)}>Reverse</button>
                          <button className="px-2 py-1 rounded bg-rose-50 text-rose-700" onClick={()=>remove(r.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
