// src/pages/admin/DashboardSettings.jsx
import React from "react";
import { useSettingsResource } from "../../hooks/useSettingsResource";
import { SettingsAPI } from "../../api/settings";

export default function DashboardSettings() {
  const { data, setData, loading, saving, error, success, save } =
    useSettingsResource(SettingsAPI.getDashboardSettings, SettingsAPI.saveDashboardSettings, {
      showCollections: true,
      showDisbursements: true,
      showAging: false,
      defaultRange: "last_30_days",
    });

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;

  const toggle = (k) => setData({ ...data, [k]: !data[k] });

  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3">
      <h1 className="text-xl font-semibold">Dashboard Settings</h1>
      {error && <div className="text-sm text-rose-600">{error}</div>}
      {success && <div className="text-sm text-emerald-600">{success}</div>}

      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={!!data.showCollections} onChange={() => toggle("showCollections")} />
          <span className="text-sm">Show Collections Widget</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={!!data.showDisbursements} onChange={() => toggle("showDisbursements")} />
          <span className="text-sm">Show Disbursements Widget</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={!!data.showAging} onChange={() => toggle("showAging")} />
          <span className="text-sm">Show Aging Report</span>
        </label>

        <div className="pt-2">
          <label className="text-sm">Default Range</label>
          <select
            className="mt-1 w-full md:w-64 rounded border px-3 py-2 text-sm"
            value={data.defaultRange || "last_30_days"}
            onChange={(e) => setData({ ...data, defaultRange: e.target.value })}
          >
            <option value="today">Today</option>
            <option value="last_7_days">Last 7 Days</option>
            <option value="last_30_days">Last 30 Days</option>
            <option value="this_month">This Month</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm"
          onClick={() => save()}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
