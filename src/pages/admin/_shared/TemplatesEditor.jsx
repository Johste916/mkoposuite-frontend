// src/pages/admin/_shared/TemplatesEditor.jsx
import React, { useEffect, useState } from "react";
import { AdminAPI } from "../../../api/admin";

export default function TemplatesEditor({ title, channel }) {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const data = await AdminAPI.listTemplates(channel, { q });
      setRows(data || []);
      setErr("");
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [channel]);

  const addRow = () => setRows([{ id: null, name: "", subject: "", body: "", meta: {} }, ...rows]);

  const saveRow = async (row) => {
    try {
      setSaving(true);
      const payload = { channel, name: row.name, subject: row.subject, body: row.body, meta: row.meta || {} };
      const saved = row.id ? await AdminAPI.updateTemplate(row.id, payload) : await AdminAPI.createTemplate(payload);
      setRows((prev) => prev.map(r => (r === row ? saved : r)));
    } catch (e) {
      alert(e?.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteRow = async (row) => {
    if (!row.id) { setRows(rows.filter(r => r !== row)); return; }
    if (!window.confirm("Delete this template?")) return;
    try {
      setSaving(true);
      await AdminAPI.deleteTemplate(row.id);
      setRows(rows.filter(r => r.id !== row.id));
    } catch (e) {
      alert(e?.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{title}</h1>
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e)=>setQ(e.target.value)}
            placeholder="Search…"
            className="text-sm border rounded px-2 py-1"
          />
          <button className="text-sm px-3 py-1 rounded border" onClick={load}>Search</button>
          <button className="text-sm px-3 py-1 rounded bg-blue-600 text-white" onClick={addRow}>Add</button>
        </div>
      </div>

      {err && <div className="text-sm text-rose-600">{err}</div>}
      {loading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-600">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Subject</th>
                <th className="py-2 pr-4">Body</th>
                <th className="py-2 pr-4">Meta (JSON)</th>
                <th className="py-2 pr-4 w-40">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.id ?? `new-${idx}`} className="border-t">
                  <td className="py-2 pr-4">
                    <input
                      value={row.name || ""}
                      onChange={(e)=>setRows(rs => rs.map((r,i)=> i===idx ? {...r, name:e.target.value} : r))}
                      className="w-full border rounded px-2 py-1"
                    />
                  </td>
                  <td className="py-2 pr-4">
                    <input
                      value={row.subject || ""}
                      onChange={(e)=>setRows(rs => rs.map((r,i)=> i===idx ? {...r, subject:e.target.value} : r))}
                      className="w-full border rounded px-2 py-1"
                    />
                  </td>
                  <td className="py-2 pr-4">
                    <textarea
                      rows={3}
                      value={row.body || ""}
                      onChange={(e)=>setRows(rs => rs.map((r,i)=> i===idx ? {...r, body:e.target.value} : r))}
                      className="w-full border rounded px-2 py-1 font-mono"
                    />
                  </td>
                  <td className="py-2 pr-4">
                    <input
                      value={row.meta ? JSON.stringify(row.meta) : ""}
                      onChange={(e)=>{
                        let meta = {};
                        try { meta = JSON.parse(e.target.value || "{}"); } catch {}
                        setRows(rs => rs.map((r,i)=> i===idx ? {...r, meta} : r));
                      }}
                      className="w-full border rounded px-2 py-1 font-mono"
                      placeholder="{}"
                    />
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex gap-2">
                      <button className="px-2 py-1 text-sm rounded border" disabled={saving} onClick={()=>saveRow(row)}>
                        {saving ? "Saving…" : "Save"}
                      </button>
                      <button className="px-2 py-1 text-sm rounded border" disabled={saving} onClick={()=>deleteRow(row)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-slate-500">No templates.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
