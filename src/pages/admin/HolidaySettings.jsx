import React from "react";
import { useSettingsResource } from "../../hooks/useSettingsResource";
import { SettingsAPI } from "../../api/settings";

export default function HolidaySettings() {
  const { data, setData, loading, saving, error, success, save } =
    useSettingsResource(SettingsAPI.getHolidaySettings, SettingsAPI.saveHolidaySettings, { holidays: [] });

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;
  const add = ()=> setData({...data, holidays:[...(data.holidays||[]), {date:"", name:""}]});
  const set = (i,key,val)=> setData({...data, holidays: data.holidays.map((h,idx)=> idx===i? {...h,[key]:val}:h)});
  const del = (i)=> setData({...data, holidays: data.holidays.filter((_,idx)=> idx!==i)});

  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3">
      <h1 className="text-xl font-semibold">Holiday Settings</h1>
      {error && <div className="text-sm text-rose-600">{error}</div>}
      {success && <div className="text-sm text-emerald-600">{success}</div>}
      <div className="space-y-2">
        {(data.holidays||[]).map((h,i)=>(
          <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input className="rounded border px-3 py-2 text-sm" placeholder="YYYY-MM-DD" value={h.date || ""} onChange={(e)=>set(i,"date",e.target.value)} />
            <input className="rounded border px-3 py-2 text-sm" placeholder="Name" value={h.name || ""} onChange={(e)=>set(i,"name",e.target.value)} />
            <button className="px-2 rounded bg-slate-100 text-sm" onClick={()=>del(i)}>Remove</button>
          </div>
        ))}
        <button className="px-3 py-1.5 rounded bg-slate-100 text-sm" onClick={add}>Add Holiday</button>
      </div>
      <button className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm" onClick={()=>save()} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
