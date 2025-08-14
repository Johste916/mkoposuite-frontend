// src/pages/admin/PaymentSettings.jsx
import React from "react";
import { useSettingsResource } from "../../hooks/useSettingsResource";
import { SettingsAPI } from "../../api/settings";

export default function PaymentSettings() {
  const { data, setData, loading, saving, error, success, save } =
    useSettingsResource(SettingsAPI.getPaymentSettings, SettingsAPI.savePaymentSettings, {
      provider: "mpesa",
      apiKey: "",
      secret: "",
      callbackUrl: "",
      enabled: false,
    });

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;

  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3">
      <h1 className="text-xl font-semibold">Payment Settings</h1>
      {error && <div className="text-sm text-rose-600">{error}</div>}
      {success && <div className="text-sm text-emerald-600">{success}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm">Provider</label>
          <select
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            value={data.provider || ""}
            onChange={(e) => setData({ ...data, provider: e.target.value })}
          >
            <option value="mpesa">M-Pesa</option>
            <option value="tigo">Tigo</option>
            <option value="airtel">Airtel</option>
            <option value="custom">Custom</option>
          </select>
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

        <div>
          <label className="text-sm">Secret</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            value={data.secret || ""}
            onChange={(e) => setData({ ...data, secret: e.target.value })}
            placeholder="••••••"
          />
        </div>

        <div>
          <label className="text-sm">Callback URL</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            value={data.callbackUrl || ""}
            onChange={(e) => setData({ ...data, callbackUrl: e.target.value })}
            placeholder="https://yourapp.com/api/payments/callback"
          />
        </div>

        <label className="flex items-center gap-2 md:col-span-2">
          <input
            type="checkbox"
            checked={!!data.enabled}
            onChange={(e) => setData({ ...data, enabled: e.target.checked })}
          />
          <span className="text-sm">Enable Payments</span>
        </label>
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
