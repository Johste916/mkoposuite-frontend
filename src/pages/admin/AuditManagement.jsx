import React, { useEffect, useState } from "react";
import api from "../../api";

export default function AuditManagement() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true); setErr("");
    try {
      // Canonical backend path
      const r = await api.get("/admin/audit");
      setRows(r.data || []);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || "Failed to load audits");
      setRows([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = rows.filter((x) => {
    const term = q.toLowerCase().trim();
    if (!term) return true;
    return [
      x?.User?.name, x?.Branch?.name, x?.category, x?.message, x?.ip, x?.action,
    ].some((v) => String(v || "").toLowerCase().includes(term));
  });

  const reverse = async (id) => {
    try {
      await api.post(`/admin/audit/${id}/reverse`);
      await load();
    } catch (e) {
      alert(e?.response?.data?.error || e.message || "Failed to reverse entry");
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this audit entry?")) return;
    try {
      await api.delete(`/admin/audit/${id}`);
      await load();
    } catch (e) {
      alert(e?.response?.data?.error || e.message || "Failed to delete entry");
    }
  };

  return (
    <div className="space-y-4">
      <header className="bg-white dark:bg-slate-900 border rounded-2xl p-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Audit Management</h1>
          <p className="text-sm text-slate-500">
            Track logins, actions, and changes. Linked to dashboard activity widgets.
          </p>
        </div>
        <input
          className="rounded border px-3 py-2 text-sm"
          value={q}
          onChange={(e)=>setQ(e.target.value)}
          placeholder="Search audit…"
        />
      </header>

      {err && <div className="text-sm text-rose-600">{err}</div>}

      <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4">
        {loading ? (
          <div className="text-sm text-slate-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-slate-500">No entries.</div>
        ) : (
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
                    <td className="py-2 pr-3">{new Date(r.createdAt || r.ts || Date.now()).toLocaleString()}</td>
                    <td className="py-2 pr-3">{r?.Branch?.name || "-"}</td>
                    <td className="py-2 pr-3">{r?.User?.name || "-"}</td>
                    <td className="py-2 pr-3">{r.category || "-"}</td>
                    <td className="py-2 pr-3">{r.message || "-"}</td>
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
        )}
      </div>
    </div>
  );
}
