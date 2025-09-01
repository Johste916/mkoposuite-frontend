// src/pages/admin/HolidaySettings.jsx
import React, { useEffect, useState } from "react";
import { SettingsAPI } from "../../api/settings";

/**
 * Real Holiday Settings editor (no JSON box).
 * Works with:
 *   GET /api/settings/holiday-settings  -> returns [] or { holidays: [] }
 *   PUT /api/settings/holiday-settings  -> body is array of {date,name[,branchId]}
 *
 * If your API wraps in { holidays: [] }, this component handles both shapes.
 */
export default function HolidaySettings() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [form, setForm] = useState({ date: "", name: "", branchId: "" });

  const load = async () => {
    setErr(""); setOk(""); setLoading(true);
    try {
      const data = await SettingsAPI.getHolidaySettings();
      // accept either [] or {holidays:[...]}
      const list = Array.isArray(data) ? data : Array.isArray(data?.holidays) ? data.holidays : [];
      // normalize: keep only supported fields
      const normalized = list.map(h => ({
        date: h.date || "",
        name: h.name || "",
        ...(h.branchId ? { branchId: h.branchId } : {})
      }));
      setRows(normalized);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const add = () => {
    if (!form.date || !form.name) return;
    setRows(prev => [...prev, { date: form.date, name: form.name, ...(form.branchId ? { branchId: form.branchId } : {}) }]);
    setForm({ date: "", name: "", branchId: "" });
  };

  const updateRow = (idx, patch) => {
    setRows(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const remove = (idx) => {
    setRows(prev => prev.filter((_, i) => i !== idx));
  };

  const saveAll = async () => {
    setSaving(true); setErr(""); setOk("");
    try {
      // API expects the full array
      await SettingsAPI.saveHolidaySettings(rows);
      setOk("Saved.");
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Holiday Settings</h1>
        <div className="flex items-center gap-2">
          <button onClick={load} className="px-3 py-2 border rounded bg-white">Reload</button>
          <button onClick={saveAll} disabled={saving} className="px-3 py-2 border rounded bg-blue-600 text-white">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {err && <div className="text-sm text-rose-600">{err}</div>}
      {ok &&  <div className="text-sm text-emerald-600">{ok}</div>}

      {/* Add form */}
      <div className="grid md:grid-cols-4 gap-2 items-end">
        <div>
          <label className="block text-xs">Date</label>
          <input type="date" className="w-full border rounded px-2 py-1 text-sm"
                 value={form.date}
                 onChange={(e)=>setForm(s=>({...s, date:e.target.value}))}/>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs">Name</label>
          <input className="w-full border rounded px-2 py-1 text-sm"
                 placeholder="Christmas"
                 value={form.name}
                 onChange={(e)=>setForm(s=>({...s, name:e.target.value}))}/>
        </div>
        <div>
          <label className="block text-xs">Branch (optional)</label>
          <input className="w-full border rounded px-2 py-1 text-sm"
                 placeholder="branch UUID or code"
                 value={form.branchId}
                 onChange={(e)=>setForm(s=>({...s, branchId:e.target.value}))}/>
        </div>
        <div>
          <button onClick={add} className="px-3 py-2 border rounded bg-white">Add</button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-xl">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Branch</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td className="p-3" colSpan={4}>No holidays</td></tr>
            ) : rows.map((r, idx) => (
              <tr key={`${r.date}-${idx}`} className="border-b">
                <td className="p-2">
                  <input type="date" className="w-full border rounded px-2 py-1"
                         value={r.date}
                         onChange={(e)=>updateRow(idx, { date: e.target.value })}/>
                </td>
                <td className="p-2">
                  <input className="w-full border rounded px-2 py-1"
                         value={r.name}
                         onChange={(e)=>updateRow(idx, { name: e.target.value })}/>
                </td>
                <td className="p-2">
                  <input className="w-full border rounded px-2 py-1"
                         placeholder="optional"
                         value={r.branchId || ""}
                         onChange={(e)=>updateRow(idx, { branchId: e.target.value })}/>
                </td>
                <td className="p-2 text-right">
                  <button className="px-2 py-1 text-xs border rounded" onClick={()=>remove(idx)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
