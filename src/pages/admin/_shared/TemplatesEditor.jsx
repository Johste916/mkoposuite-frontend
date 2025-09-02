import React, { useEffect, useState } from "react";
import { AdminAPI } from "../../../api/admin";

export default function TemplatesEditor({ title, category, channel = "email" }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await AdminAPI.listTemplates(channel, { category });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [category, channel]);

  async function createBlank() {
    setSaving(true);
    setError("");
    try {
      const created = await AdminAPI.createTemplate({
        channel, category, name: "", code: "", subject: "", body: "", active: true
      });
      setRows(prev => [created, ...prev]);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally { setSaving(false); }
  }

  async function saveRow(row) {
    setSaving(true);
    setError("");
    try {
      const payload = { ...row, channel, category };
      const saved = row.id
        ? await AdminAPI.updateTemplate(row.id, payload)
        : await AdminAPI.createTemplate(payload);
      setRows(prev => prev.map(r => (r.id === saved.id ? saved : r)));
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally { setSaving(false); }
  }

  async function removeRow(id) {
    if (!window.confirm("Delete this template?")) return;
    setSaving(true);
    setError("");
    try {
      await AdminAPI.deleteTemplate(id);
      setRows(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally { setSaving(false); }
  }

  return (
    <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-xs text-slate-500">Channel: {channel} • Category: {category}</p>
        </div>
        <button
          onClick={createBlank}
          disabled={saving}
          className="px-3 py-2 text-sm rounded bg-blue-600 text-white"
        >
          + Add Template
        </button>
      </div>

      {error && <div className="text-sm text-rose-600">{error}</div>}
      {loading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-slate-500">No templates found.</div>
      ) : (
        <div className="grid gap-3">
          {rows.map((row) => (
            <TemplateCard
              key={row.id || Math.random()}
              row={row}
              onSave={saveRow}
              onDelete={removeRow}
              saving={saving}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateCard({ row, onSave, onDelete, saving }) {
  const [draft, setDraft] = useState(row);

  useEffect(() => setDraft(row), [row]);

  return (
    <div className="border rounded-lg p-3">
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500">Name</label>
          <input
            className="w-full px-2 py-1 rounded border"
            value={draft.name ?? ""}
            onChange={(e)=>setDraft({ ...draft, name: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Code</label>
          <input
            className="w-full px-2 py-1 rounded border"
            value={draft.code ?? ""}
            onChange={(e)=>setDraft({ ...draft, code: e.target.value })}
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-slate-500">Subject (email only)</label>
          <input
            className="w-full px-2 py-1 rounded border"
            value={draft.subject ?? ""}
            onChange={(e)=>setDraft({ ...draft, subject: e.target.value })}
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-slate-500">Body</label>
          <textarea
            rows={6}
            className="w-full px-2 py-1 rounded border font-mono"
            value={draft.body ?? ""}
            onChange={(e)=>setDraft({ ...draft, body: e.target.value })}
          />
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!draft.active}
            onChange={(e)=>setDraft({ ...draft, active: e.target.checked })}
          />
          <span className="text-sm">Active</span>
        </label>
      </div>
      <div className="mt-3 text-right">
        <button
          onClick={()=>onSave(draft)}
          disabled={saving}
          className="px-2 py-1 text-xs rounded bg-emerald-600 text-white mr-2"
        >
          Save
        </button>
        {row.id && (
          <button
            onClick={()=>onDelete(row.id)}
            disabled={saving}
            className="px-2 py-1 text-xs rounded bg-rose-600 text-white"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
