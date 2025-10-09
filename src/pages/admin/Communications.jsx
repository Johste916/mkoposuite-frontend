// src/pages/admin/Communications.jsx
import React, { useEffect, useState } from "react";
import { SettingsAPI } from "../../api/settings";

const CHANNELS = [
  { value: "inapp", label: "In-app" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
];

const TYPES = [
  { value: "notice", label: "Notice" },
  { value: "maintenance", label: "Maintenance" },
  { value: "policy", label: "Policy" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export default function Communications() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    text: "",
    channel: "inapp",
    type: "notice",
    priority: "normal",
    isActive: true,
    showInTicker: true,
    showOnDashboard: false,
    startAt: "",
    endAt: "",
  });

  async function load() {
    setErr("");
    try {
      const data = await SettingsAPI.listComms();
      const items = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
        ? data
        : [];
      setRows(items);
    } catch (e) {
      console.warn("Failed to list communications, treating as empty.", e?.response?.status, e?.response?.data);
      setRows([]);
      if (e?.response?.status === 401) setErr("You are not authorized. Please sign in again.");
    }
  }
  useEffect(() => { load(); }, []);

  const toIso = (v) => (v ? new Date(v).toISOString() : null);

  async function add() {
    setErr("");
    if (!form.title.trim() || !form.text.trim()) { setErr("title and text are required"); return; }
    setSaving(true);
    try {
      await SettingsAPI.createComm({
        title: form.title.trim(),
        text: form.text.trim(),
        channel: form.channel,
        type: form.type,
        priority: form.priority,
        isActive: !!form.isActive,
        showInTicker: !!form.showInTicker,
        showOnDashboard: !!form.showOnDashboard,
        startAt: toIso(form.startAt),
        endAt: toIso(form.endAt),
      });
      setForm((s) => ({ ...s, title: "", text: "" }));
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
    // Bold skin + card = clear, consistent borders/contrast
    <div className="app-theme-bold card p-4 space-y-3">
      <div className="page-head">
        <h1 className="text-xl font-extrabold">Communications</h1>
      </div>

      {err && <div className="text-sm text-rose-600">{err}</div>}

      {/* Form */}
      <div className="grid md:grid-cols-2 gap-3 items-start">
        <div>
          <label className="block text-xs mb-1 muted">Title</label>
          <input
            className="input text-sm"
            value={form.title}
            onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
            placeholder="Important Notice"
          />
        </div>

        <div>
          <label className="block text-xs mb-1 muted">Channel</label>
          <select
            className="input text-sm ms-select"
            value={form.channel}
            onChange={(e) => setForm((s) => ({ ...s, channel: e.target.value }))}
          >
            {CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs mb-1 muted">Type</label>
          <select
            className="input text-sm ms-select"
            value={form.type}
            onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))}
          >
            {TYPES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs mb-1 muted">Priority</label>
          <select
            className="input text-sm ms-select"
            value={form.priority}
            onChange={(e) => setForm((s) => ({ ...s, priority: e.target.value }))}
          >
            {PRIORITIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs mb-1 muted">Body</label>
          <textarea
            className="input text-sm min-h-[120px]"
            value={form.text}
            onChange={(e) => setForm((s) => ({ ...s, text: e.target.value }))}
            placeholder="REMINDER: Submit weekly PAR review by Friday 4:00 PM."
          />
        </div>

        {/* Checkboxes — native appearance, large hit-area, fully clickable */}
        <div className="flex flex-wrap items-center gap-6 md:col-span-2">
          <div className="inline-flex items-center gap-2">
            <input
              id="isActive"
              type="checkbox"
              className="ms-checkbox cursor-pointer"
              checked={form.isActive}
              onChange={(e) => setForm((s) => ({ ...s, isActive: e.target.checked }))}
            />
            <label htmlFor="isActive" className="text-xs cursor-pointer">Active</label>
          </div>

          <div className="inline-flex items-center gap-2">
            <input
              id="showTicker"
              type="checkbox"
              className="ms-checkbox cursor-pointer"
              checked={form.showInTicker}
              onChange={(e) => setForm((s) => ({ ...s, showInTicker: e.target.checked }))}
            />
            <label htmlFor="showTicker" className="text-xs cursor-pointer">
              Show in ticker (bottom line)
            </label>
          </div>

          <div className="inline-flex items-center gap-2">
            <input
              id="showDash"
              type="checkbox"
              className="ms-checkbox cursor-pointer"
              checked={form.showOnDashboard}
              onChange={(e) => setForm((s) => ({ ...s, showOnDashboard: e.target.checked }))}
            />
            <label htmlFor="showDash" className="text-xs cursor-pointer">
              Show on dashboard (curated card)
            </label>
          </div>
        </div>

        {/* Start/End/Add — zoom-safe inline group */}
        <div className="ms-inline-add md:col-span-2">
          <div className="min-w-0">
            <label className="block text-xs mb-1 muted">Start at</label>
            <input
              type="datetime-local"
              className="input text-sm"
              value={form.startAt}
              onChange={(e) => setForm((s) => ({ ...s, startAt: e.target.value }))}
            />
          </div>
          <div className="min-w-0">
            <label className="block text-xs mb-1 muted">End at</label>
            <input
              type="datetime-local"
              className="input text-sm"
              value={form.endAt}
              onChange={(e) => setForm((s) => ({ ...s, endAt: e.target.value }))}
            />
          </div>
          <button
            onClick={add}
            disabled={saving}
            className="btn px-3 py-2 bg-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Add"}
          </button>
        </div>
      </div>

      {/* Table with framed look */}
      <div className="table-frame">
        <div className="table-wrap">
          <table className="min-w-full text-sm">
            <thead className="sticky-head">
              <tr>
                <th className="p-2 text-left">Title</th>
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left">Priority</th>
                <th className="p-2 text-left">Channel</th>
                <th className="p-2 text-left">Preview</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="p-3 muted" colSpan={6}>No communications</td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id || r._id || r.title} className="align-top">
                    <td className="p-2">{r.title}</td>
                    <td className="p-2">{r.type || "notice"}</td>
                    <td className="p-2">{r.priority || "normal"}</td>
                    <td className="p-2">{r.channel || "inapp"}</td>
                    <td className="p-2 max-w-[520px]">
                      <div className="line-clamp-2 whitespace-pre-wrap">
                        {r.text || r.body || ""}
                      </div>
                      <div className="text-[11px] muted mt-1">
                        {r.isActive ? "Active" : "Inactive"} · {r.showInTicker ? "Ticker" : "—"} {r.showOnDashboard ? "· Dashboard" : ""}
                        {r.startAt ? ` · from ${new Date(r.startAt).toLocaleString()}` : ""}
                        {r.endAt ? ` · until ${new Date(r.endAt).toLocaleString()}` : ""}
                      </div>
                    </td>
                    <td className="p-2 text-right">
                      <button
                        className="px-2 py-1 text-xs btn"
                        onClick={() => remove(r.id || r._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
