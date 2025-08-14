import React from "react";
import { useSettingsResource } from "../../hooks/useSettingsResource";
import { SettingsAPI } from "../../api/settings";

export default function LoanSettings() {
  const { data, setData, loading, saving, error, success, save } =
    useSettingsResource(SettingsAPI.getLoanSettings, SettingsAPI.saveLoanSettings, {
      defaultInterestRate: 12, allowMidtermAdjustments: false, gracePeriodDays: 0
    });

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;
  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3">
      <h1 className="text-xl font-semibold">Loan Settings</h1>
      {error && <div className="text-sm text-rose-600">{error}</div>}
      {success && <div className="text-sm text-emerald-600">{success}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="text-sm">Default Interest Rate (%)</label>
          <input type="number" className="mt-1 w-full rounded border px-3 py-2 text-sm"
                 value={data.defaultInterestRate ?? 0}
                 onChange={(e)=>setData({...data, defaultInterestRate:Number(e.target.value)})}/>
        </div>
        <div><label className="text-sm">Grace Period (days)</label>
          <input type="number" className="mt-1 w-full rounded border px-3 py-2 text-sm"
                 value={data.gracePeriodDays ?? 0}
                 onChange={(e)=>setData({...data, gracePeriodDays:Number(e.target.value)})}/>
        </div>
        <label className="flex items-center gap-2 md:col-span-2">
          <input type="checkbox" checked={!!data.allowMidtermAdjustments}
                 onChange={(e)=>setData({...data, allowMidtermAdjustments:e.target.checked})}/>
          <span className="text-sm">Allow mid-term interest adjustments</span>
        </label>
      </div>
      <button className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm" onClick={()=>save()} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
