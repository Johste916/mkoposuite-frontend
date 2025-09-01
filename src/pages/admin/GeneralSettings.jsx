// src/pages/admin/GeneralSettings.jsx
'use strict';

import React, { useState } from "react";
import api from "../../api"; // axios instance
import { useSettingsResource } from "../../hooks/useSettingsResource";
// Keeping this import in case other parts of your app rely on it.
// If unused, your bundler will tree-shake it.
import { SettingsAPI } from "../../api/settings";

export default function GeneralSettings() {
  // Use URL form so it works with the shared hook:
  // GET /api/settings/general, PUT /api/settings/general
  const {
    data,
    setData,
    loading,
    saving,
    error,
    save,
    reload,
  } = useSettingsResource({
    getUrl: "/settings/general",
    putUrl: "/settings/general",
    initial: {
      company: {
        name: "MkopoSuite",
        email: "info@example.com",
        phone: "+255700000000",
        website: "https://example.com",
        address1: "",
        address2: "",
        city: "",
        country: "Tanzania",
        logoUrl: "",
        profileImageUrl: "",
      },
      branding: { primaryColor: "#1d4ed8", secondaryColor: "#0ea5e9" },
      locale: {
        currency: "TZS",
        timezone: "Africa/Dar_es_Salaam",
        language: "en",
        currencyInWords: "Shillings",
        dateFormat: "dd/mm/yyyy",
      },
      numberFormats: {
        thousandSeparator: ",",
        decimalSeparator: ".",
        currencyPosition: "prefix",
      },
      dashboard: { landingWidgets: ["kpis", "recent-activity", "collections"], showTicker: true },
    },
  });

  // Local success banner (the shared hook doesn’t emit a success string)
  const [success, setSuccess] = useState("");

  const onSave = async () => {
    try {
      await save();
      setSuccess("Settings saved successfully.");
      // auto-clear after a bit
      window.clearTimeout((onSave._t || 0));
      onSave._t = window.setTimeout(() => setSuccess(""), 2500);
    } catch {
      // error banner already handled by the hook’s `error`
      setSuccess("");
    }
  };

  const uploadImage = async (file, fieldPath) => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const res = await api.post("/uploads/image", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    const url = res.data?.url || "";
    // set nested path e.g. "company.logoUrl"
    setData((prev) => {
      const next = clone(prev);
      const parts = fieldPath.split(".");
      let ref = next;
      for (let i = 0; i < parts.length - 1; i++) ref = (ref[parts[i]] ||= {});
      ref[parts.at(-1)] = url;
      return next;
    });
  };

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;

  return (
    <div className="space-y-4">
      <header className="bg-white dark:bg-slate-900 border rounded-2xl p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold">General Settings</h1>
            <p className="text-sm text-slate-500">Branding, company info, locale and formats.</p>
          </div>
          <div className="flex gap-2">
            <button
              className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50 text-sm"
              onClick={reload}
              disabled={loading || saving}
            >
              Reload
            </button>
            <button
              className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm disabled:opacity-60"
              disabled={saving}
              onClick={onSave}
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-rose-50 text-rose-700 border border-rose-200 rounded-lg p-3 text-sm">{error}</div>
      )}
      {success && (
        <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg p-3 text-sm">
          {success}
        </div>
      )}

      {/* Company — logo/profile + info */}
      <section className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-4">
        <h2 className="font-semibold">Company</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          <div className="space-y-2">
            <label className="text-sm font-medium">Logo</label>
            <div className="flex items-center gap-3">
              <img
                src={data.company?.logoUrl || "https://via.placeholder.com/80x80?text=Logo"}
                alt="Logo"
                className="w-16 h-16 rounded bg-slate-100 object-cover"
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => uploadImage(e.target.files?.[0], "company.logoUrl")}
                className="text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Profile Image (optional)</label>
            <div className="flex items-center gap-3">
              <img
                src={data.company?.profileImageUrl || "https://via.placeholder.com/80x80?text=Img"}
                alt="Profile"
                className="w-16 h-16 rounded bg-slate-100 object-cover"
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => uploadImage(e.target.files?.[0], "company.profileImageUrl")}
                className="text-sm"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            ["Company Name", "company.name", "text", "MkopoSuite"],
            ["Email", "company.email", "email", "info@example.com"],
            ["Phone", "company.phone", "tel", "+255700000000"],
            ["Website", "company.website", "url", "https://example.com"],
            ["Address line 1", "company.address1", "text", ""],
            ["Address line 2", "company.address2", "text", ""],
            ["City", "company.city", "text", ""],
            ["Country", "company.country", "text", "Tanzania"],
          ].map(([label, path, type, ph]) => (
            <InputField
              key={path}
              label={label}
              type={type}
              placeholder={ph}
              value={getPath(data, path) || ""}
              onChange={(v) => setPath(setData, path, v)}
            />
          ))}
        </div>
      </section>

      {/* Branding */}
      <section className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-4">
        <h2 className="font-semibold">Branding</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ColorField
            label="Primary Color"
            value={data.branding?.primaryColor || "#1d4ed8"}
            onChange={(v) => setPath(setData, "branding.primaryColor", v)}
          />
          <ColorField
            label="Secondary Color"
            value={data.branding?.secondaryColor || "#0ea5e9"}
            onChange={(v) => setPath(setData, "branding.secondaryColor", v)}
          />
        </div>
      </section>

      {/* Locale & Number formats */}
      <section className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-4">
        <h2 className="font-semibold">Locale & Formats</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            ["Currency", "locale.currency", "text", "TZS"],
            ["Currency in Words", "locale.currencyInWords", "text", "Shillings"],
            ["Timezone", "locale.timezone", "text", "Africa/Dar_es_Salaam"],
            ["Language", "locale.language", "text", "en"],
            ["Date Format", "locale.dateFormat", "text", "dd/mm/yyyy"],
            ["Thousand Separator", "numberFormats.thousandSeparator", "text", ","],
            ["Decimal Separator", "numberFormats.decimalSeparator", "text", "."],
          ].map(([label, path, type, ph]) => (
            <InputField
              key={path}
              label={label}
              type={type}
              placeholder={ph}
              value={getPath(data, path) ?? ""}
              onChange={(v) => setPath(setData, path, v)}
            />
          ))}

          <div>
            <label className="text-sm">Currency Position</label>
            <select
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              value={data.numberFormats?.currencyPosition || "prefix"}
              onChange={(e) => setPath(setData, "numberFormats.currencyPosition", e.target.value)}
            >
              <option value="prefix">Prefix (TZS 1,000)</option>
              <option value="suffix">Suffix (1,000 TZS)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Raw JSON fallback (keep optional) */}
      <section className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-2">
        <h2 className="font-semibold">Advanced</h2>
        <label className="text-xs text-gray-500">Raw Settings (JSON)</label>
        <textarea
          className="w-full h-48 border rounded p-2 text-sm font-mono"
          value={safeStringify(data)}
          onChange={(e) => {
            try {
              const next = JSON.parse(e.target.value || "{}");
              setData(next);
            } catch {
              // ignore malformed JSON while typing
            }
          }}
        />
        <div className="text-[11px] text-slate-500">
          You can edit the JSON directly; all keys will be saved.
        </div>
      </section>

      <div className="flex gap-2">
        <button
          className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm"
          disabled={saving}
          onClick={onSave}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

/* ---------- small helpers & inputs ---------- */
function getPath(obj, path) {
  return path.split(".").reduce((acc, k) => (acc ? acc[k] : undefined), obj);
}

function setPath(setter, path, value) {
  setter((prev) => {
    const next = clone(prev);
    const parts = path.split(".");
    let ref = next;
    for (let i = 0; i < parts.length - 1; i++) ref = (ref[parts[i]] ||= {});
    ref[parts.at(-1)] = value;
    return next;
  });
}

function InputField({ label, type = "text", value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-sm">{label}</label>
      <input
        type={type}
        className="mt-1 w-full rounded border px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <div>
      <label className="text-sm">{label}</label>
      <div className="mt-1 flex items-center gap-3">
        <input
          type="color"
          className="w-10 h-10 rounded border"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="text"
          className="flex-1 rounded border px-3 py-2 text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#1d4ed8"
        />
      </div>
    </div>
  );
}

function safeStringify(obj) {
  try {
    return JSON.stringify(obj ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

// Safer clone (structuredClone fallback)
function clone(v) {
  if (typeof structuredClone === "function") return structuredClone(v);
  return JSON.parse(JSON.stringify(v ?? {}));
}
