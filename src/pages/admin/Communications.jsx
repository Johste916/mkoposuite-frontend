import { useEffect, useState } from "react";
import api from "../../api";

export default function Communications() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ title: "", text: "", type: "notice", priority: "normal", isActive: true });

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const res = await api.get("/settings/communications", { params: { q } });
      setItems(res.data.items || []);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || "Failed to load communications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // initial

  const create = async () => {
    if (!form.title.trim() || !form.text.trim()) return;
    try {
      await api.post("/settings/communications", form);
      setForm({ title: "", text: "", type: "notice", priority: "normal", isActive: true });
      await load();
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || "Failed to create");
    }
  };

  const toggleActive = async (id, current) => {
    try {
      await api.put(`/settings/communications/${id}`, { isActive: !current });
      await load();
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || "Failed to update");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this communication?")) return;
    try {
      await api.delete(`/settings/communications/${id}`);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || "Failed to delete");
    }
  };

  return (
    <div className="space-y-4">
      <header className="bg-white dark:bg-slate-900 border rounded-2xl p-4">
        <h1 className="text-xl font-semibold">Communications</h1>
        <p className="text-sm text-slate-500">Notices, alerts, and policies for staff/branches.</p>
      </header>

      <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3">
        <div className="flex gap-2">
          <input
            className="rounded border px-3 py-2 text-sm flex-1"
            placeholder="Search title/text…"
            value={q}
            onChange={(e)=>setQ(e.target.value)}
          />
          <button className="px-3 py-2 rounded bg-slate-100" onClick={load}>Search</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input
            placeholder="Title"
            className="rounded border px-3 py-2 text-sm md:col-span-2"
            value={form.title}
            onChange={(e)=>setForm({...form, title:e.target.value})}
          />
          <select
            className="rounded border px-3 py-2 text-sm"
            value={form.type}
            onChange={(e)=>setForm({...form, type:e.target.value})}
          >
            <option value="notice">Notice</option>
            <option value="policy">Policy</option>
            <option value="alert">Alert</option>
            <option value="guideline">Guideline</option>
          </select>
          <select
            className="rounded border px-3 py-2 text-sm"
            value={form.priority}
            onChange={(e)=>setForm({...form, priority:e.target.value})}
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <textarea
            placeholder="Text"
            className="rounded border px-3 py-2 text-sm md:col-span-3 h-24"
            value={form.text}
            onChange={(e)=>setForm({...form, text:e.target.value})}
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!form.isActive}
              onChange={(e)=>setForm({...form, isActive:e.target.checked})}
            />
            <span className="text-sm">Active</span>
          </label>
          <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={create}>Create</button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4">
        {err && <div className="text-sm text-rose-600 mb-2">{err}</div>}
        {loading ? (
          <div className="text-sm text-slate-500">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-slate-500">No communications yet.</div>
        ) : (
          <div className="space-y-2">
            {items.map((c) => (
              <div key={c.id} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{c.title}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100">{c.type}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100">{c.priority}</span>
                    <button
                      className="text-sm px-2 py-1 rounded bg-slate-100"
                      onClick={() => toggleActive(c.id, c.isActive)}
                    >
                      {c.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      className="text-sm px-2 py-1 rounded bg-rose-600 text-white"
                      onClick={() => remove(c.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{c.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
