import React from "react";
import { useSettingsResource } from "../../hooks/useSettingsResource";
import { SettingsAPI } from "../../api/settings";

export default function PayrollSettings() {
  const { data, setData, loading, saving, error, success, save } =
    useSettingsResource(SettingsAPI.getPayrollSettings, SettingsAPI.savePayrollSettings, {
      defaultPayDay: 25,
      currency: "TZS",
      enableOvertime: true,
    });

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;
  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3">
      <h1 className="text-xl font-semibold">Payroll Settings</h1>
      {error && <div className="text-sm text-rose-600">{error}</div>}
      {success && <div className="text-sm text-emerald-600">{success}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="text-sm">Default Pay Day</label>
          <input type="number" min={1} max={31} className="mt-1 w-full rounded border px-3 py-2 text-sm"
                 value={data.defaultPayDay ?? 25}
                 onChange={(e)=>setData({...data, defaultPayDay: Number(e.target.value)})}/>
        </div>
        <div><label className="text-sm">Currency</label>
          <input className="mt-1 w-full rounded border px-3 py-2 text-sm"
                 value={data.currency || "TZS"}
                 onChange={(e)=>setData({...data, currency: e.target.value})}/>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox"
                 checked={!!data.enableOvertime}
                 onChange={(e)=>setData({...data, enableOvertime: e.target.checked})}/>
          <span className="text-sm">Enable Overtime</span>
        </label>
      </div>

      <button className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm" onClick={()=>save()} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
