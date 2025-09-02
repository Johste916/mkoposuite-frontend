import React from "react";
import { useSettingsResource } from "../../hooks/useSettingsResource";
import { SettingsAPI } from "../../api/settings";

export default function BorrowerSettings() {
  const { data, setData, loading, saving, error, success, save } =
    useSettingsResource(
      SettingsAPI.getBorrowerSettings,   // ✅ pass the function
      SettingsAPI.saveBorrowerSettings,  // ✅ pass the function
      { requireKyc: true, allowBlacklist: true, defaultCountry: "TZ" } // defaults
    );

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;
  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3">
      <h1 className="text-xl font-semibold">Borrower Settings</h1>
      {error && <div className="text-sm text-rose-600">{error}</div>}
      {success && <div className="text-sm text-emerald-600">{success}</div>}

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={!!data.requireKyc}
               onChange={(e)=>setData({...data, requireKyc:e.target.checked})}/>
        <span className="text-sm">Require KYC for new borrowers</span>
      </label>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={!!data.allowBlacklist}
               onChange={(e)=>setData({...data, allowBlacklist:e.target.checked})}/>
        <span className="text-sm">Allow blacklist</span>
      </label>

      <div>
        <label className="text-sm">Default Country</label>
        <input className="mt-1 w-full rounded border px-3 py-2 text-sm"
               value={data.defaultCountry ?? ""}
               onChange={(e)=>setData({...data, defaultCountry:e.target.value})}/>
      </div>

      <button className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm"
              onClick={()=>save()} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
