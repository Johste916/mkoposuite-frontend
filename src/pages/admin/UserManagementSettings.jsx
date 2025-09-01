import React from "react";
import { useSettingsResource } from "../../hooks/useSettingsResource";
import { SettingsAPI } from "../../api/settings";

export default function UserManagementSettings() {
  const { data, setData, loading, saving, error, success, save } =
    useSettingsResource(SettingsAPI.getUsersSettings, SettingsAPI.saveUsersSettings, {
      passwordMinLength: 8,
      require2FA: false,
      sessionTimeoutMinutes: 60,
    });

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;
  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3">
      <h1 className="text-xl font-semibold">User Management Settings</h1>
      {error && <div className="text-sm text-rose-600">{error}</div>}
      {success && <div className="text-sm text-emerald-600">{success}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="text-sm">Password Min Length</label>
          <input type="number" className="mt-1 w-full rounded border px-3 py-2 text-sm"
                 value={data.passwordMinLength ?? 8}
                 onChange={(e)=>setData({...data, passwordMinLength: Number(e.target.value)})}/>
        </div>
        <div><label className="text-sm">Session Timeout (minutes)</label>
          <input type="number" className="mt-1 w-full rounded border px-3 py-2 text-sm"
                 value={data.sessionTimeoutMinutes ?? 60}
                 onChange={(e)=>setData({...data, sessionTimeoutMinutes: Number(e.target.value)})}/>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox"
                 checked={!!data.require2FA}
                 onChange={(e)=>setData({...data, require2FA: e.target.checked})}/>
          <span className="text-sm">Require 2FA</span>
        </label>
      </div>

      <button className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm" onClick={()=>save()} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
