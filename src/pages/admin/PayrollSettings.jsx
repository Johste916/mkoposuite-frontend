import React from "react";
import { useSettingsResource } from "../../hooks/useSettingsResource";
import { SettingsAPI } from "../../api/settings";

export default function PayrollSettings() {
  const { data, setData, loading, saving, error, success, save } =
    useSettingsResource(SettingsAPI.getPayrollSettings, SettingsAPI.savePayrollSettings, {
      paySchedule:"monthly", baseCurrency:"TZS", enablePayslips:true
    });

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;
  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3">
      <h1 className="text-xl font-semibold">Payroll Settings</h1>
      {error && <div className="text-sm text-rose-600">{error}</div>}
      {success && <div className="text-sm text-emerald-600">{success}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="text-sm">Pay Schedule</label>
          <select className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  value={data.paySchedule || "monthly"}
                  onChange={(e)=>setData({...data, paySchedule:e.target.value})}>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Bi-Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div><label className="text-sm">Base Currency</label>
          <input className="mt-1 w-full rounded border px-3 py-2 text-sm"
                 value={data.baseCurrency || ""} onChange={(e)=>setData({...data, baseCurrency:e.target.value})}/>
        </div>
        <label className="flex items-center gap-2 md:col-span-2">
          <input type="checkbox" checked={!!data.enablePayslips}
                 onChange={(e)=>setData({...data, enablePayslips:e.target.checked})}/>
          <span className="text-sm">Enable Payslips</span>
        </label>
      </div>
      <button className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm" onClick={()=>save()} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
