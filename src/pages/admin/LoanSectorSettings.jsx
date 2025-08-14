import React from "react";
import { useSettingsResource } from "../../hooks/useSettingsResource";
import { SettingsAPI } from "../../api/settings";

export default function LoanSectorSettings() {
  const { data, setData, loading, saving, error, success, save } =
    useSettingsResource(SettingsAPI.getLoanSectorSettings, SettingsAPI.saveLoanSectorSettings, { sectors: [] });

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;
  const add = ()=> setData({...data, sectors:[...(data.sectors||[]), ""]});
  const set = (i,v)=> setData({...data, sectors: data.sectors.map((s,idx)=> idx===i?v:s)});
  const del = (i)=> setData({...data, sectors: data.sectors.filter((_,idx)=> idx!==i)});

  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3">
      <h1 className="text-xl font-semibold">Loan Sector Settings</h1>
      {error && <div className="text-sm text-rose-600">{error}</div>}
      {success && <div className="text-sm text-emerald-600">{success}</div>}
      <div className="space-y-2">
        {(data.sectors||[]).map((s,i)=>(
          <div key={i} className="flex gap-2">
            <input className="flex-1 rounded border px-3 py-2 text-sm" value={s} onChange={(e)=>set(i,e.target.value)} />
            <button className="px-2 rounded bg-slate-100 text-sm" onClick={()=>del(i)}>Remove</button>
          </div>
        ))}
        <button className="px-3 py-1.5 rounded bg-slate-100 text-sm" onClick={add}>Add Sector</button>
      </div>
      <button className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm" onClick={()=>save()} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
