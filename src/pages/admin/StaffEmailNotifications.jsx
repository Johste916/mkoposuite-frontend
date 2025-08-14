// src/pages/admin/StaffEmailNotifications.jsx
import React, { useEffect, useState } from "react";
import { useSettingsResource } from "../../hooks/useSettingsResource";
import { SettingsAPI } from "../../api/settings";
import api from "../../api";

const makeId = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export default function StaffEmailNotifications() {
  const [staff, setStaff] = useState([]);
  const [err, setErr] = useState("");

  // store as a settings blob: { rules: [{id,name,frequency,recipients: [userId]}] }
  const { data, setData, loading, saving, error, success, save } = useSettingsResource(
    SettingsAPI.get,                 // generic
    (payload) => SettingsAPI.put("staff-email-notifications", payload),
    { rules: [] }
  );

  const loadStaff = async () => {
    try {
      const r = await api.get("/users");
      setStaff(r.data || []);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || "Failed to load staff");
    }
  };

  useEffect(() => {
    // load rules
    SettingsAPI.get("staff-email-notifications").then((r) => {
      if (r && r.rules) setData(r);
    }).catch(()=>{ /* first boot: empty ok */ });
    loadStaff();
  }, []);

  const add = () =>
    setData((p) => ({
      ...p,
      rules: [
        ...(p.rules || []),
        { id: makeId(), name: "Daily Report", frequency: "daily", recipients: [], active: true },
      ],
    }));

  const update = (id, patch) =>
    setData((p) => ({ ...p, rules: p.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));

  const remove = (id) =>
    setData((p) => ({ ...p, rules: p.rules.filter((r) => r.id !== id) }));

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;

  return (
    <div className="space-y-4">
      <header className="bg-white dark:bg-slate-900 border rounded-2xl p-4">
        <h1 className="text-xl font-semibold">Staff Email Notifications</h1>
        <p className="text-sm text-slate-500">Who receives daily/weekly/monthly reports.</p>
      </header>

      {(err || error) && <div className="text-sm text-rose-600">{err || error}</div>}
      {success && <div className="text-sm text-emerald-600">{success}</div>}

      <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3">
        <button className="px-3 py-1.5 rounded bg-slate-100" onClick={add}>Add Notification</button>

        {(data.rules || []).length === 0 ? (
          <div className="text-sm text-slate-500">No notification rules yet.</div>
        ) : (
          <div className="space-y-3">
            {data.rules.map((r) => (
              <div key={r.id} className="p-3 border rounded-lg grid grid-cols-1 md:grid-cols-5 gap-2">
                <input
                  className="rounded border px-3 py-2 text-sm"
                  placeholder="Rule name"
                  value={r.name || ""}
                  onChange={(e) => update(r.id, { name: e.target.value })}
                />
                <select
                  className="rounded border px-3 py-2 text-sm"
                  value={r.frequency || "daily"}
                  onChange={(e) => update(r.id, { frequency: e.target.value })}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                {/* recipients multi-select */}
                <select
                  multiple
                  className="rounded border px-3 py-2 text-sm"
                  value={r.recipients || []}
                  onChange={(e) =>
                    update(r.id, {
                      recipients: [...e.target.selectedOptions].map((o) => o.value),
                    })
                  }
                >
                  {staff.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.name} ({s.email || s.phone || s.username})
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!r.active}
                    onChange={(e) => update(r.id, { active: e.target.checked })}
                  />
                  Active
                </label>
                <div className="flex items-center gap-2">
                  <button
                    className="px-3 py-1.5 rounded bg-rose-50 text-rose-700"
                    onClick={() => remove(r.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm" disabled={saving} onClick={()=>save()}>
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
