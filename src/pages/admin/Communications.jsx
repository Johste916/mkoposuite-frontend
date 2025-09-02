import React, { useEffect, useState } from "react";
import { SettingsAPI } from "../../api/settings";

const CHANNELS = [
  { value: "inapp", label: "In-app" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
];

export default function Communications() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    text: "",         // ✅ backend expects "text" (not "body")
    channel: "inapp", // default
  });

  async function load() {
    setErr("");
    try {
      const data = await SettingsAPI.listComms();
      // Be tolerant of null/undefined/single-object responses
      setRows(Array.isArray(data) ? data : (data ? [data] : []));
    } catch (e) {
      // Treat 404/500 as empty list but show a small hint in console
      console.warn("Failed to list communications, treating as empty.", e?.response?.status, e?.response?.data);
      setRows([]);
      if (e?.response?.status === 401) setErr("You are not authorized. Please sign in again.");
    }
  }

  useEffect(() => { load(); }, []);

  async function add() {
    setErr("");
    if (!form.title.trim() || !form.text.trim()) {
      setErr("title and text are required");
      return;
    }
    setSaving(true);
    try {
      await SettingsAPI.createComm({
        title: form.title.trim(),
        text: form.text.trim(),     // ✅ send "text"
        channel: form.channel,
      });
      setForm({ title: "", text: "", channel: form.channel });
      await load();
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || "Failed to create communication");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!confirm("Delete this communication?")) return;
    setErr("");
    try {
      await SettingsAPI.deleteComm(id);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || "Delete failed");
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3">
      <h1 className="text-xl font-semibold">Communications</h1>
      {err && <div className="text-sm text-rose-600">{err}</div>}

      <div className="grid md:grid-cols-2 gap-3 items-start">
        <div>
          <label className="block text-xs mb-1">Title</label>
          <input
            className="w-full border rounded px-2 py-1 text-sm"
            value={form.title}
            onChange={(e) => setForm(s => ({ ...s, title: e.target.value }))}
            placeholder="Important Notice"
          />
        </div>

        <div>
          <label className="block text-xs mb-1">Channel</label>
          <select
            className="w-full border rounded px-2 py-1 text-sm"
            value={form.channel}
            onChange={(e) => setForm(s => ({ ...s, channel: e.target.value }))}
          >
            {CHANNELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs mb-1">Body</label>
          <textarea
            className="w-full min-h-[120px] border rounded px-2 py-1 text-sm"
            value={form.text}
            onChange={(e) => setForm(s => ({ ...s, text: e.target.value }))}
            placeholder="REMINDER: Submit weekly PAR review by Friday 4:00 PM."
          />
        </div>

        <div>
          <button
            onClick={add}
            disabled={saving}
            className="px-3 py-2 border rounded bg-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Add"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-xl">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left">Title</th>
              <th className="p-2 text-left">Channel</th>
              <th className="p-2 text-left">Preview</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td className="p-3 text-slate-500" colSpan={4}>No communications</td></tr>
            ) : rows.map(r => (
              <tr key={r.id || r._id || r.title} className="border-b align-top">
                <td className="p-2">{r.title}</td>
                <td className="p-2">{r.channel || "inapp"}</td>
                <td className="p-2 max-w-[480px]">
                  <div className="line-clamp-2 whitespace-pre-wrap">{r.text || r.body || ""}</div>
                </td>
                <td className="p-2 text-right">
                  <button className="px-2 py-1 text-xs border rounded"
                          onClick={() => remove(r.id || r._id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
