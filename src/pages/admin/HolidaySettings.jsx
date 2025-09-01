import React from "react";
import { useSettingsResource } from "../../hooks/useSettingsResource";
import { SettingsAPI } from "../../api/settings";

export default function HolidaySettings() {
  const { data, setData, loading, saving, error, success, save } =
    useSettingsResource(SettingsAPI.getHolidaySettings, SettingsAPI.saveHolidaySettings, {
      holidays: [], // [{ date:'2025-12-25', name:'Christmas' }]
      observeOnWeekday: true,
    });

  const [raw, setRaw] = React.useState("");
  React.useEffect(()=>{ setRaw(JSON.stringify(data ?? {}, null, 2)); }, [data]);
  const onRawChange = (t)=>{ setRaw(t); try { setData(JSON.parse(t)); } catch {} };

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;
  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3">
      <h1 className="text-xl font-semibold">Holiday Settings</h1>
      {error && <div className="text-sm text-rose-600">{error}</div>}
      {success && <div className="text-sm text-emerald-600">{success}</div>}

      <p className="text-xs text-slate-500">Edit JSON list of holidays. Example:
      <code className="ml-1">[{"{ \"date\":\"2025-12-25\", \"name\":\"Christmas\" }"}]</code></p>

      <textarea rows={14} className="w-full rounded border px-3 py-2 text-sm font-mono"
                value={raw} onChange={(e)=>onRawChange(e.target.value)} />

      <button className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm" onClick={()=>save()} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
