import React from "react";
import { useSettingsResource } from "../../hooks/useSettingsResource";
import { SettingsAPI } from "../../api/settings";

export default function EmailAccounts() {
  const { data, setData, loading, saving, error, success, save } =
    useSettingsResource(SettingsAPI.getEmail, SettingsAPI.saveEmail, {
      smtpHost: "", smtpPort: 587, smtpUser: "", smtpPass: "",
      fromName: "", fromEmail: "", useTLS: true,
    });

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;
  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3">
      <h1 className="text-xl font-semibold">Email Accounts</h1>
      {error && <div className="text-sm text-rose-600">{error}</div>}
      {success && <div className="text-sm text-emerald-600">{success}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="text-sm">SMTP Host</label>
          <input className="mt-1 w-full rounded border px-3 py-2 text-sm"
                 value={data.smtpHost || ""}
                 onChange={(e)=>setData({...data, smtpHost: e.target.value})}/>
        </div>
        <div><label className="text-sm">SMTP Port</label>
          <input type="number" className="mt-1 w-full rounded border px-3 py-2 text-sm"
                 value={data.smtpPort ?? 587}
                 onChange={(e)=>setData({...data, smtpPort: Number(e.target.value)})}/>
        </div>
        <div><label className="text-sm">SMTP User</label>
          <input className="mt-1 w-full rounded border px-3 py-2 text-sm"
                 value={data.smtpUser || ""}
                 onChange={(e)=>setData({...data, smtpUser: e.target.value})}/>
        </div>
        <div><label className="text-sm">SMTP Password</label>
          <input type="password" className="mt-1 w-full rounded border px-3 py-2 text-sm"
                 value={data.smtpPass || ""}
                 onChange={(e)=>setData({...data, smtpPass: e.target.value})}/>
        </div>
        <div><label className="text-sm">From Name</label>
          <input className="mt-1 w-full rounded border px-3 py-2 text-sm"
                 value={data.fromName || ""}
                 onChange={(e)=>setData({...data, fromName: e.target.value})}/>
        </div>
        <div><label className="text-sm">From Email</label>
          <input className="mt-1 w-full rounded border px-3 py-2 text-sm"
                 value={data.fromEmail || ""}
                 onChange={(e)=>setData({...data, fromEmail: e.target.value})}/>
        </div>
        <label className="flex items-center gap-2 md:col-span-2">
          <input type="checkbox"
                 checked={!!data.useTLS}
                 onChange={(e)=>setData({...data, useTLS: e.target.checked})}/>
          <span className="text-sm">Use TLS</span>
        </label>
      </div>

      <button className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm" onClick={()=>save()} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
