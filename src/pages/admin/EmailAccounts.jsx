import React from "react";
import { SettingsAPI } from "../../api/settings";
import { useSettingsResource } from "../../hooks/useSettingsResource";

const DEFAULTS = {
  provider: "smtp",
  smtpHost: "",
  smtpPort: 587,
  username: "",
  password: "",
  fromName: "MkopoSuite",
  fromEmail: "",
  secure: false
};

export default function EmailAccounts() {
  const { data, setData, loading, saving, error, success, save } =
    useSettingsResource(SettingsAPI.getEmail, SettingsAPI.saveEmail, DEFAULTS);

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;

  return (
    <div className="space-y-4">
      <header className="bg-white dark:bg-slate-900 border rounded-2xl p-4">
        <h1 className="text-xl font-semibold">Email Settings</h1>
        <p className="text-sm text-slate-500">Configure outgoing email (SMTP).</p>
      </header>

      <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-4">
        {error && <div className="text-sm text-rose-600">{error}</div>}
        {success && <div className="text-sm text-emerald-600">{success}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm">SMTP Host</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              value={data.smtpHost || ""}
              onChange={(e) => setData({ ...data, smtpHost: e.target.value })}
              placeholder="smtp.yourhost.com"
            />
          </div>
          <div>
            <label className="text-sm">SMTP Port</label>
            <input
              type="number"
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              value={data.smtpPort ?? 587}
              onChange={(e) => setData({ ...data, smtpPort: Number(e.target.value) })}
              placeholder="587"
            />
          </div>
          <div>
            <label className="text-sm">Username</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              value={data.username || ""}
              onChange={(e) => setData({ ...data, username: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm">Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              value={data.password || ""}
              onChange={(e) => setData({ ...data, password: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm">From Name</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              value={data.fromName || ""}
              onChange={(e) => setData({ ...data, fromName: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm">From Email</label>
            <input
              type="email"
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              value={data.fromEmail || ""}
              onChange={(e) => setData({ ...data, fromEmail: e.target.value })}
              placeholder="no-reply@yourdomain.com"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="secure"
              type="checkbox"
              checked={!!data.secure}
              onChange={(e) => setData({ ...data, secure: e.target.checked })}
            />
            <label htmlFor="secure" className="text-sm">Use TLS/SSL</label>
          </div>
        </div>

        <button
          className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm"
          onClick={save}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
