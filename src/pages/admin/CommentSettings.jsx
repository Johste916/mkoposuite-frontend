import React from "react";
import { useSettingsResource } from "../../hooks/useSettingsResource";
import { SettingsAPI } from "../../api/settings";

export default function CommentSettings() {
  const { data, setData, loading, saving, error, success, save } =
    useSettingsResource(SettingsAPI.getCommentSettings, SettingsAPI.saveCommentSettings, {
      enableComments: true,
      requireStaffRole: false,
      maxLength: 1000,
    });

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;
  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3">
      <h1 className="text-xl font-semibold">Comment Settings</h1>
      {error && <div className="text-sm text-rose-600">{error}</div>}
      {success && <div className="text-sm text-emerald-600">{success}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex items-center gap-2">
          <input type="checkbox"
                 checked={!!data.enableComments}
                 onChange={(e)=>setData({...data, enableComments: e.target.checked})}/>
          <span className="text-sm">Enable Comments</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox"
                 checked={!!data.requireStaffRole}
                 onChange={(e)=>setData({...data, requireStaffRole: e.target.checked})}/>
          <span className="text-sm">Restrict to Staff Roles</span>
        </label>
        <div>
          <label className="text-sm">Max Length</label>
          <input type="number" className="mt-1 w-full rounded border px-3 py-2 text-sm"
                 value={data.maxLength ?? 1000}
                 onChange={(e)=>setData({...data, maxLength: Number(e.target.value)})}/>
        </div>
      </div>

      <button className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm" onClick={()=>save()} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
