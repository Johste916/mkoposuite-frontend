// src/pages/admin/SmsSettings.jsx
import React from "react";
import { useSettingsResource } from "../../hooks/useSettingsResource";
import { SettingsAPI } from "../../api/settings";

export default function SmsSettings() {
  const { data, setData, loading, saving, error, success, save } =
    useSettingsResource(SettingsAPI.getSms, SettingsAPI.saveSms, {
      provider: "africastalking",
      apiKey: "",
      username: "",
      senderId: "",
    });

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;
  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3">
      <h1 className="text-xl font-semibold">SMS Settings</h1>
      {error && <div className="text-sm text-rose-600">{error}</div>}
      {success && <div className="text-sm text-emerald-600">{success}</div>}
      <div className="grid md:grid-cols-2 gap-4">
        <div><label className="text-sm">Provider</label>
          <select className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  value={data.provider} onChange={(e)=>setData({...data, provider:e.target.value})}>
            <option value="africastalking">Africa's Talking</option>
            <option value="twilio">Twilio</option>
            <option value="nexmo">Vonage (Nexmo)</option>
          </select>
        </div>
        <div><label className="text-sm">Sender ID</label>
          <input className="mt-1 w-full rounded border px-3 py-2 text-sm"
                 value={data.senderId || ""} onChange={(e)=>setData({...data, senderId:e.target.value})}/>
        </div>
        <div><label className="text-sm">API Key</label>
          <input className="mt-1 w-full rounded border px-3 py-2 text-sm"
                 value={data.apiKey || ""} onChange={(e)=>setData({...data, apiKey:e.target.value})}/>
        </div>
        <div><label className="text-sm">Username / Account SID</label>
          <input className="mt-1 w-full rounded border px-3 py-2 text-sm"
                 value={data.username || ""} onChange={(e)=>setData({...data, username:e.target.value})}/>
        </div>
      </div>
      <button className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm" onClick={()=>save()} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
