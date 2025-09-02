import React from "react";
import api from "../../api";
import { useSettingsResource } from "../../hooks/useSettingsResource";

export default function BackupSettings() {
  // use KV key "backup-settings" directly, no JSON editor UI
  const getFn  = () => api.get("/api/settings/kv/backup-settings").then(r => r.data);
  const saveFn = (payload) => api.put("/api/settings/kv/backup-settings", { value: payload }).then(r => r.data);

  const { data, setData, loading, saving, error, success, save } =
    useSettingsResource(getFn, saveFn, {
      enabled: true,
      freq: "daily",        // daily | weekly | monthly
      time: "02:00",        // 24h
      keepDays: 30,
      includeUploads: false
    });

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;

  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3">
      <h1 className="text-xl font-semibold">Backup Settings</h1>
      {error && <div className="text-sm text-rose-600">{error}</div>}
      {success && <div className="text-sm text-emerald-600">{success}</div>}

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={!!data.enabled}
          onChange={(e)=>setData({ ...data, enabled: e.target.checked })}
        />
        <span className="text-sm">Enable automated backups</span>
      </label>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm">Frequency</label>
          <select
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            value={data.freq || "daily"}
            onChange={(e)=>setData({ ...data, freq: e.target.value })}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div>
          <label className="text-sm">Run Time (24h)</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            value={data.time || "02:00"}
            onChange={(e)=>setData({ ...data, time: e.target.value })}
            placeholder="02:00"
          />
        </div>
        <div>
          <label className="text-sm">Retention (days)</label>
          <input
            type="number"
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            value={Number(data.keepDays || 30)}
            onChange={(e)=>setData({ ...data, keepDays: Number(e.target.value) })}
          />
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!data.includeUploads}
            onChange={(e)=>setData({ ...data, includeUploads: e.target.checked })}
          />
          <span className="text-sm">Include /uploads directory</span>
        </label>
      </div>

      <button
        className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm"
        onClick={()=>save()}
        disabled={saving}
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
