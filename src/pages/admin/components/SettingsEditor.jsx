import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api";

function Field({ f, value, onChange }) {
  const common = "w-full border rounded px-2 py-1 text-sm";
  if (f.type === "boolean") {
    return (
      <label className="inline-flex items-center gap-2">
        <input type="checkbox" checked={!!value} onChange={(e)=>onChange(e.target.checked)} />
        <span>{f.label}</span>
      </label>
    );
  }
  if (f.type === "select") {
    return (
      <select className={common} value={value ?? ""} onChange={(e)=>onChange(e.target.value || null)}>
        <option value="">—</option>
        {(f.options||[]).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }
  if (f.type === "json") {
    return (
      <textarea rows={6} className={common}
        value={typeof value === "string" ? value : JSON.stringify(value ?? {}, null, 2)}
        onChange={(e)=>{
          const t = e.target.value;
          try { onChange(JSON.parse(t)); } catch { onChange(t); }
        }} />
    );
  }
  return (
    <input
      className={common}
      type={f.type === "number" ? "number" : f.type === "secret" ? "password" : "text"}
      value={value ?? ""}
      onChange={(e)=>onChange(f.type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value)}
      placeholder={f.placeholder || ""}
    />
  );
}

/**
 * props:
 * - title: string
 * - prefix: string (e.g. "sms." or "email.smtp.")
 * - fields: [{key,label,type,help,options?,placeholder?}]
 */
export default function SettingsEditor({ title, prefix, fields }) {
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setErr("");
      try {
        // NOTE: this matches your backend mount at /api/settings
        const { data } = await api.get("/settings");
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        setErr(e?.response?.data?.error || e.message);
      }
    })();
  }, []);

  const values = useMemo(() => {
    const out = {};
    for (const f of fields) {
      const full = prefix ? `${prefix}${f.key}` : f.key;
      const row = rows.find(r => r.key === full);
      out[f.key] = row ? row.value : (f.default ?? null);
    }
    return out;
  }, [rows, fields, prefix]);

  const setValue = (k, v) => {
    const fullKey = prefix ? `${prefix}${k}` : k;
    setRows(prev => {
      const i = prev.findIndex(r => r.key === fullKey);
      if (i >= 0) {
        const copy = [...prev]; copy[i] = { ...copy[i], value: v }; return copy;
      }
      return [...prev, { key: fullKey, value: v }];
    });
  };

  const save = async () => {
    setSaving(true); setErr("");
    try {
      const payload = fields.map(f => ({ key: prefix ? `${prefix}${f.key}` : f.key, value: values[f.key] }));
      // NOTE: this matches your backend mount at /api/settings
      await api.put("/settings", payload);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    }
    setSaving(false);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{title}</h1>
        <button onClick={save} disabled={saving} className="px-3 py-2 border rounded bg-white">
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      {err && <div className="text-sm text-rose-600">{err}</div>}

      <div className="grid md:grid-cols-2 gap-4">
        {fields.map(f => (
          <div key={f.key}>
            <label className="block text-xs font-semibold mb-1">{f.label}</label>
            <Field f={f} value={values[f.key]} onChange={(v)=>setValue(f.key, v)} />
            {f.help && <div className="text-[12px] text-slate-500 mt-1">{f.help}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
