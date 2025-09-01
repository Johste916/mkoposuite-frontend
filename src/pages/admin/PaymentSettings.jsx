import React from "react";
import { useSettingsResource } from "../../hooks/useSettingsResource";
import { SettingsAPI } from "../../api/settings";

export default function PaymentSettings() {
  const { data, setData, loading, saving, error, success, save } =
    useSettingsResource(SettingsAPI.getPaymentSettings, SettingsAPI.savePaymentSettings, {
      allowCash: true,
      allowBankTransfer: true,
      allowMobileMoney: true,
      defaultMethod: "cash",
    });

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;
  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3">
      <h1 className="text-xl font-semibold">Payment Settings</h1>
      {error && <div className="text-sm text-rose-600">{error}</div>}
      {success && <div className="text-sm text-emerald-600">{success}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex items-center gap-2">
          <input type="checkbox"
                 checked={!!data.allowCash}
                 onChange={(e)=>setData({...data, allowCash: e.target.checked})}/>
          <span className="text-sm">Allow Cash</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox"
                 checked={!!data.allowBankTransfer}
                 onChange={(e)=>setData({...data, allowBankTransfer: e.target.checked})}/>
          <span className="text-sm">Allow Bank Transfer</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox"
                 checked={!!data.allowMobileMoney}
                 onChange={(e)=>setData({...data, allowMobileMoney: e.target.checked})}/>
          <span className="text-sm">Allow Mobile Money</span>
        </label>
        <div>
          <label className="text-sm">Default Method</label>
          <select className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  value={data.defaultMethod || "cash"}
                  onChange={(e)=>setData({...data, defaultMethod: e.target.value})}>
            <option value="cash">Cash</option>
            <option value="bank">Bank Transfer</option>
            <option value="mobile">Mobile Money</option>
          </select>
        </div>
      </div>

      <button className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm" onClick={()=>save()} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
