import React from "react";
import { useSettingsResource } from "../../hooks/useSettingsResource";
import { SettingsAPI } from "../../api/settings";

export default function IntegrationSettings() {
  const { data, setData, loading, saving, error, success, save } =
    useSettingsResource(SettingsAPI.getIntegrationSettings, SettingsAPI.saveIntegrationSettings, {
      accounting:"none", crm:"none", webhookUrl:""
    });

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;
  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3">
      <h1 className="text-xl font-semibold">Integration Settings</h1>
      {error && <div className="text-sm text-rose-600">{error}</div>}
      {success && <div className="text-sm text-emerald-600">{success}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="text-sm">Accounting</label>
          <select className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  value={data.accounting || "none"}
                  onChange={(e)=>setData({...data, accounting:e.target.value})}>
            <option value="none">None</option>
            <option value="quickbooks">QuickBooks</option>
            <option value="xero">Xero</option>
          </select>
        </div>
        <div><label className="text-sm">CRM</label>
          <select className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  value={data.crm || "none"}
                  onChange={(e)=>setData({...data, crm:e.target.value})}>
            <option value="none">None</option>
            <option value="hubspot">HubSpot</option>
            <option value="zoho">Zoho</option>
          </select>
        </div>
        <div className="md:col-span-2"><label className="text-sm">Webhook URL</label>
          <input className="mt-1 w-full rounded border px-3 py-2 text-sm"
                 value={data.webhookUrl || ""} onChange={(e)=>setData({...data, webhookUrl:e.target.value})}/>
        </div>
      </div>
      <button className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm" onClick={()=>save()} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
