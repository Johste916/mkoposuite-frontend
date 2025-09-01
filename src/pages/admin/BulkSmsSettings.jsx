import React from "react";
import { useSettingsResource } from "../../hooks/useSettingsResource";
import { SettingsAPI } from "../../api/settings";

export default function BulkSmsSettings() {
  const { data, setData, loading, saving, error, success, save } =
    useSettingsResource(SettingsAPI.getBulkSms, SettingsAPI.saveBulkSms, {
      defaultSenderId: "",
      rateLimitPerMinute: 120,
      templatePrefix: "[MkopoSuite]",
    });

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;
  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3">
      <h1 className="text-xl font-semibold">Bulk SMS Settings</h1>
      {error && <div className="text-sm text-rose-600">{error}</div>}
      {success && <div className="text-sm text-emerald-600">{success}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="text-sm">Default Sender ID</label>
          <input className="mt-1 w-full rounded border px-3 py-2 text-sm"
                 value={data.defaultSenderId || ""}
                 onChange={(e)=>setData({...data, defaultSenderId: e.target.value})}/>
        </div>
        <div><label className="text-sm">Rate Limit (per minute)</label>
          <input type="number" className="mt-1 w-full rounded border px-3 py-2 text-sm"
                 value={data.rateLimitPerMinute ?? 120}
                 onChange={(e)=>setData({...data, rateLimitPerMinute: Number(e.target.value)})}/>
        </div>
        <div className="md:col-span-2"><label className="text-sm">Template Prefix</label>
          <input className="mt-1 w-full rounded border px-3 py-2 text-sm"
                 value={data.templatePrefix || ""}
                 onChange={(e)=>setData({...data, templatePrefix: e.target.value})}/>
        </div>
      </div>

      <button className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm" onClick={()=>save()} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
