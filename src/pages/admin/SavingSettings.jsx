import React from "react";
import { useSettingsResource } from "../../hooks/useSettingsResource";
import { SettingsAPI } from "../../api/settings";

export default function SavingSettings() {
  const { data, setData, loading, saving, error, success, save } =
    useSettingsResource(SettingsAPI.getSavingSettings, SettingsAPI.saveSavingSettings, {
      defaultProduct: "",
      allowOverdraft: false,
      overdraftRate: 0,
      minBalance: 0,
    });

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;
  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3">
      <h1 className="text-xl font-semibold">Savings Settings</h1>
      {error && <div className="text-sm text-rose-600">{error}</div>}
      {success && <div className="text-sm text-emerald-600">{success}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="text-sm">Default Product</label>
          <input className="mt-1 w-full rounded border px-3 py-2 text-sm"
                 value={data.defaultProduct || ""}
                 onChange={(e)=>setData({...data, defaultProduct: e.target.value})}/>
        </div>
        <div><label className="text-sm">Minimum Balance</label>
          <input type="number" className="mt-1 w-full rounded border px-3 py-2 text-sm"
                 value={data.minBalance ?? 0}
                 onChange={(e)=>setData({...data, minBalance: Number(e.target.value)})}/>
        </div>
        <div><label className="text-sm">Overdraft Rate (%)</label>
          <input type="number" className="mt-1 w-full rounded border px-3 py-2 text-sm"
                 value={data.overdraftRate ?? 0}
                 onChange={(e)=>setData({...data, overdraftRate: Number(e.target.value)})}/>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox"
                 checked={!!data.allowOverdraft}
                 onChange={(e)=>setData({...data, allowOverdraft: e.target.checked})}/>
          <span className="text-sm">Allow Overdraft</span>
        </label>
      </div>

      <button className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm" onClick={()=>save()} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
