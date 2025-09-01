import React from "react";
import { useSettingsResource } from "../../hooks/useSettingsResource";
import { SettingsAPI } from "../../api/settings";

export default function DashboardSettings() {
  const { data, setData, loading, saving, error, success, save } =
    useSettingsResource(SettingsAPI.getDashboardSettings, SettingsAPI.saveDashboardSettings, {
      showCollectionsWidget: true,
      defaultRange: "30d", // "7d" | "30d" | "90d"
    });

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;
  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3">
      <h1 className="text-xl font-semibold">Dashboard Settings</h1>
      {error && <div className="text-sm text-rose-600">{error}</div>}
      {success && <div className="text-sm text-emerald-600">{success}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex items-center gap-2">
          <input type="checkbox"
                 checked={!!data.showCollectionsWidget}
                 onChange={(e)=>setData({...data, showCollectionsWidget: e.target.checked})}/>
          <span className="text-sm">Show Collections widget</span>
        </label>

        <div>
          <label className="text-sm">Default Range</label>
          <select className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  value={data.defaultRange || "30d"}
                  onChange={(e)=>setData({...data, defaultRange: e.target.value})}>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      <button className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm" onClick={()=>save()} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
