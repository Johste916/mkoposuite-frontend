import React, { useEffect, useMemo, useState } from "react";
import { AdminAPI } from "../../../api/admin";

export default function TypesEditor({ title, category }) {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await AdminAPI.listTypes(category);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [category]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      Object.values(r).some(v => String(v ?? "").toLowerCase().includes(term))
    );
  }, [rows, q]);

  async function createBlank() {
    setSaving(true);
    setError("");
    try {
      const created = await AdminAPI.createType({ category, name: "", code: "" });
      setRows(prev => [created, ...prev]);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally { setSaving(false); }
  }

  async function saveRow(row) {
    setSaving(true);
    setError("");
    try {
      const payload = { ...row, category };
      const saved = row.id
        ? await AdminAPI.updateType(row.id, payload)
        : await AdminAPI.createType(payload);
      setRows(prev => prev.map(r => (r.id === saved.id ? saved : r)));
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally { setSaving(false); }
  }

  async function removeRow(id) {
    if (!window.confirm("Delete this item?")) return;
    setSaving(true);
    setError("");
    try {
      await AdminAPI.deleteType(id);
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
          <p className="text-xs text-slate-500">Category: {category}</p>
        </div>
        <div className="flex gap-2">
          <input
            placeholder="Search…"
            className="px-3 py-2 text-sm rounded border"
            value={q}
            onChange={(e)=>setQ(e.target.value)}
          />
          <button
            onClick={createBlank}
            disabled={saving}
            className="px-3 py-2 text-sm rounded bg-blue-600 text-white"
          >
            + Add
          </button>
        </div>
      </div>

      {error && <div className="text-sm text-rose-600">{error}</div>}
      {loading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-slate-500">No items found.</div>
      ) : (
        <div className="overflow-auto border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Code</th>
                <th className="px-3 py-2 text-left">Active</th>
                <th className="px-3 py-2 w-36"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => (
                <EditableRow
                  key={row.id ?? `tmp-${idx}`}
                  row={row}
                  onSave={saveRow}
                  onDelete={removeRow}
                  saving={saving}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EditableRow({ row, onSave, onDelete, saving }) {
  const [draft, setDraft] = useState(row);
  useEffect(() => setDraft(row), [row]);

  return (
    <tr className="border-t">
      <td className="px-3 py-2">
        <input
          className="w-full px-2 py-1 rounded border"
          value={draft.name ?? ""}
          onChange={(e)=>setDraft({ ...draft, name: e.target.value })}
        />
      </td>
      <td className="px-3 py-2">
        <input
          className="w-full px-2 py-1 rounded border"
          value={draft.code ?? ""}
          onChange={(e)=>setDraft({ ...draft, code: e.target.value })}
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="checkbox"
          checked={!!draft.active}
          onChange={(e)=>setDraft({ ...draft, active: e.target.checked })}
        />
      </td>
      <td className="px-3 py-2 text-right">
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
      </td>
    </tr>
  );
}
