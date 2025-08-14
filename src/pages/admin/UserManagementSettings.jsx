import React from "react";
import { useSettingsResource } from "../../hooks/useSettingsResource";
import { SettingsAPI } from "../../api/settings";

export default function UserManagementSettings() {
  const { data, setData, loading, saving, error, success, save } =
    useSettingsResource(SettingsAPI.getUsersSettings, SettingsAPI.saveUsersSettings, {
      enforce2FA:false, passwordMinLength:10, requireSpecialChar:true
    });

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;
  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3">
      <h1 className="text-xl font-semibold">User Management Settings</h1>
      {error && <div className="text-sm text-rose-600">{error}</div>}
      {success && <div className="text-sm text-emerald-600">{success}</div>}
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={!!data.enforce2FA}
               onChange={(e)=>setData({...data, enforce2FA:e.target.checked})}/>
        <span className="text-sm">Enforce 2FA</span>
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="text-sm">Password Min Length</label>
          <input type="number" className="mt-1 w-full rounded border px-3 py-2 text-sm"
                 value={data.passwordMinLength ?? 10}
                 onChange={(e)=>setData({...data, passwordMinLength:Number(e.target.value)})}/>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={!!data.requireSpecialChar}
                 onChange={(e)=>setData({...data, requireSpecialChar:e.target.checked})}/>
          <span className="text-sm">Require special character</span>
        </label>
      </div>
      <button className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm" onClick={()=>save()} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
