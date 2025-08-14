import React from "react";
import { useSettingsResource } from "../../hooks/useSettingsResource";
import { SettingsAPI } from "../../api/settings";

export default function CommentSettings() {
  const { data, setData, loading, saving, error, success, save } =
    useSettingsResource(SettingsAPI.getCommentSettings, SettingsAPI.saveCommentSettings, {
      enableInternalNotes:true, notifyOnNewComment:false
    });

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;
  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3">
      <h1 className="text-xl font-semibold">Comment Settings</h1>
      {error && <div className="text-sm text-rose-600">{error}</div>}
      {success && <div className="text-sm text-emerald-600">{success}</div>}
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={!!data.enableInternalNotes}
               onChange={(e)=>setData({...data, enableInternalNotes:e.target.checked})}/>
        <span className="text-sm">Enable internal notes</span>
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={!!data.notifyOnNewComment}
               onChange={(e)=>setData({...data, notifyOnNewComment:e.target.checked})}/>
        <span className="text-sm">Send email on new comment</span>
      </label>
      <button className="mt-2 px-3 py-1.5 rounded bg-blue-600 text-white text-sm" onClick={()=>save()} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
