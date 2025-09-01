import React from "react";
import { useSettingsResource } from "../../hooks/useSettingsResource";
import { SettingsAPI } from "../../api/settings";

export default function PenaltySettings() {
  const { data, setData, loading, saving, error, success, save } =
    useSettingsResource(SettingsAPI.getPenaltySettings, SettingsAPI.savePenaltySettings, {
      lateFeeFlat: 0,
      lateFeeRate: 0,        // percent
      applyAfterDays: 0,
    });

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;
  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3">
      <h1 className="text-xl font-semibold">Penalty Settings</h1>
      {error && <div className="text-sm text-rose-600">{error}</div>}
      {success && <div className="text-sm text-emerald-600">{success}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="text-sm">Flat Late Fee</label>
          <input type="number" className="mt-1 w-full rounded border px-3 py-2 text-sm"
                 value={data.lateFeeFlat ?? 0}
                 onChange={(e)=>setData({...data, lateFeeFlat: Number(e.target.value)})}/>
        </div>
        <div><label className="text-sm">Late Fee Rate (%)</label>
          <input type="number" className="mt-1 w-full rounded border px-3 py-2 text-sm"
                 value={data.lateFeeRate ?? 0}
                 onChange={(e)=>setData({...data, lateFeeRate: Number(e.target.value)})}/>
        </div>
        <div><label className="text-sm">Apply After (days)</label>
          <input type="number" className="mt-1 w-full rounded border px-3 py-2 text-sm"
                 value={data.applyAfterDays ?? 0}
                 onChange={(e)=>setData({...data, applyAfterDays: Number(e.target.value)})}/>
        </div>
      </div>

      <button className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm" onClick={()=>save()} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
