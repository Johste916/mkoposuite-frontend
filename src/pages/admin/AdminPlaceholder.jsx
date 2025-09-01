// src/pages/admin/AdminPlaceholder.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../api";

/**
 * Smart placeholder that makes *every* admin page usable immediately.
 * It persists arbitrary JSON at /api/settings/:key (GET/PUT) and provides a basic editor.
 */
export default function AdminPlaceholder({ keyProp, title }) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const json = useMemo(() => JSON.stringify(data, null, 2), [data]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError("");
      try {
        // Try /api/settings/:key then fallback to /api/settings?key=
        let res;
        try {
          res = await api.get(`/api/settings/${keyProp}`);
        } catch (e) {
          res = await api.get(`/api/settings`, { params: { key: keyProp } });
        }
        if (!cancelled) setData(res.data || {});
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.error || e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [keyProp]);

  const onSave = async () => {
    setSaving(true); setError("");
    try {
      const body = typeof data === "object" ? data : {};
      try {
        await api.put(`/api/settings/${keyProp}`, body);
      } catch {
        await api.put(`/api/settings`, { key: keyProp, value: body });
      }
      try { window.dispatchEvent(new CustomEvent("app:toast", { detail: { type: "success", message: "Saved" } })); } catch {}
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{title}</h1>
        <div className="text-xs text-slate-500">
          <code>/api/settings/{keyProp}</code>
        </div>
      </div>

      {error && <div className="text-sm text-rose-600">{error}</div>}
      {loading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : (
        <>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            This generic editor persists JSON stored under the key <code>{keyProp}</code>. Replace it later with a tailored UI.
          </div>
          <textarea
            className="w-full h-72 font-mono text-xs border rounded-lg p-3 bg-white dark:bg-slate-900 dark:border-slate-700"
            value={json}
            onChange={(e) => {
              try {
                const val = JSON.parse(e.target.value);
                setData(val);
                setError("");
              } catch {
                setError("JSON is invalid — fix formatting before saving.");
              }
            }}
          />
          <div className="flex gap-2">
            <button
              onClick={onSave}
              disabled={saving || !!error}
              className="px-3 py-2 rounded-lg border bg-blue-600 text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => setData({})}
              className="px-3 py-2 rounded-lg border bg-white hover:bg-slate-50"
            >
              Reset to {}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
