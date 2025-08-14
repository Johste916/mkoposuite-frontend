import React from "react";
import { SettingsAPI } from "../../api/settings";
import { useSettingsResource } from "../../hooks/useSettingsResource";

const DEFAULTS = {
  gatewayUrl: "",
  senderId: "",
  apiKey: "",
  enableSmsNotifications: true,
  messageTemplate: "Hello {name}, your repayment of {amount} is due on {date}."
};

export default function BulkSmsSettings() {
  const { data, setData, loading, saving, error, success, save } =
    useSettingsResource(SettingsAPI.getBulkSms, SettingsAPI.saveBulkSms, DEFAULTS);

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;

  return (
    <div className="space-y-4">
      <header className="bg-white dark:bg-slate-900 border rounded-2xl p-4">
        <h1 className="text-xl font-semibold">Bulk SMS Settings</h1>
        <p className="text-sm text-slate-500">Configure your SMS gateway and templates.</p>
      </header>

      <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-4">
        {error && <div className="text-sm text-rose-600">{error}</div>}
        {success && <div className="text-sm text-emerald-600">{success}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm">Gateway URL</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              value={data.gatewayUrl || ""}
              onChange={(e) => setData({ ...data, gatewayUrl: e.target.value })}
              placeholder="https://api.smsgateway.example/send"
            />
          </div>
          <div>
            <label className="text-sm">Sender ID</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              value={data.senderId || ""}
              onChange={(e) => setData({ ...data, senderId: e.target.value })}
              placeholder="MKOPOSUITE"
            />
          </div>
          <div>
            <label className="text-sm">API Key</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              value={data.apiKey || ""}
              onChange={(e) => setData({ ...data, apiKey: e.target.value })}
              placeholder="••••••"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="enableSmsNotifications"
              type="checkbox"
              checked={!!data.enableSmsNotifications}
              onChange={(e) => setData({ ...data, enableSmsNotifications: e.target.checked })}
            />
            <label htmlFor="enableSmsNotifications" className="text-sm">Enable auto-SMS notifications</label>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm">Default Message Template</label>
            <textarea
              className="mt-1 w-full rounded border px-3 py-2 text-sm h-28"
              value={data.messageTemplate || ""}
              onChange={(e) => setData({ ...data, messageTemplate: e.target.value })}
            />
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
