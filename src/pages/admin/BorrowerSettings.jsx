import React from "react";
import { useSettingsResource } from "../../hooks/useSettingsResource";
import { SettingsAPI } from "../../api/settings";

export default function BorrowerSettings() {
  const { data, setData, loading, saving, error, success, save } =
    useSettingsResource(SettingsAPI.getBorrowerSettings, SettingsAPI.saveBorrowerSettings, {
      requireNationalId: true,
      minAge: 18,
      maxConcurrentLoans: 1,
    });

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;
  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3">
      <h1 className="text-xl font-semibold">Borrower Settings</h1>
      {error && <div className="text-sm text-rose-600">{error}</div>}
      {success && <div className="text-sm text-emerald-600">{success}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex items-center gap-2 md:col-span-2">
          <input type="checkbox"
                 checked={!!data.requireNationalId}
                 onChange={(e)=>setData({...data, requireNationalId: e.target.checked})}/>
          <span className="text-sm">Require National ID on onboarding</span>
        </label>
        <div><label className="text-sm">Minimum Age</label>
          <input type="number" className="mt-1 w-full rounded border px-3 py-2 text-sm"
                 value={data.minAge ?? 18}
                 onChange={(e)=>setData({...data, minAge: Number(e.target.value)})}/>
        </div>
        <div><label className="text-sm">Max Concurrent Loans</label>
          <input type="number" className="mt-1 w-full rounded border px-3 py-2 text-sm"
                 value={data.maxConcurrentLoans ?? 1}
                 onChange={(e)=>setData({...data, maxConcurrentLoans: Number(e.target.value)})}/>
        </div>
      </div>

      <button className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm" onClick={()=>save()} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
