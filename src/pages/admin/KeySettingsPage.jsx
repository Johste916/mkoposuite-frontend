// src/pages/admin/KeySettingsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../api";

function tryParse(json) {
  try { return [JSON.parse(json), null]; } catch (e) { return [null, e.message]; }
}

export default function KeySettingsPage({ title, keyName, defaults = {} }) {
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [data, setData]         = useState(defaults);

  const pretty = useMemo(() => JSON.stringify(data ?? {}, null, 2), [data]);
  const [editor, setEditor] = useState(pretty);

  useEffect(() => setEditor(pretty), [pretty]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      setSuccess("");
      try {
        // prefer /api/settings/:key; fallback to /api/settings?key=
        const { data: v1 } = await api.get(`/api/settings/${encodeURIComponent(keyName)}`);
        if (mounted) setData(v1 ?? defaults);
      } catch (e1) {
        try {
          const { data: v2 } = await api.get(`/api/settings`, { params: { key: keyName } });
          if (mounted) setData(v2 ?? defaults);
        } catch (e2) {
          // If not found, start with defaults (empty object is OK)
          if (e2?.response?.status === 404) {
            if (mounted) setData(defaults);
          } else {
            setError(e2?.response?.data?.error || e2.message || "Failed to load settings");
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [keyName]);

  async function save() {
    setSaving(true);
    setError("");
    setSuccess("");
    const [val, parseErr] = tryParse(editor);
    if (parseErr) {
      setSaving(false);
      setError(`Invalid JSON: ${parseErr}`);
      return;
    }
    try {
      // accept both shapes: PUT /:key with raw value, OR PUT / (key,value)
      await api.put(`/api/settings/${encodeURIComponent(keyName)}`, val);
      setData(val);
      setSuccess("Saved.");
    } catch (e1) {
      try {
        await api.put(`/api/settings`, { key: keyName, value: val });
        setData(val);
        setSuccess("Saved.");
      } catch (e2) {
        setError(e2?.response?.data?.error || e2.message || "Failed to save settings");
      }
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(""), 2000);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">{title}</h1>
          <div className="text-[11px] text-slate-500">
            <code>/api/settings/{keyName}</code>
          </div>
        </div>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Configure <span className="font-medium">{title}</span>. This page edits a JSON config stored under the key <code>{keyName}</code>.
          You can keep it simple now and replace with a tailored form later.
        </p>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-700 border border-rose-200 rounded-lg p-3 text-sm">{error}</div>
      )}
      {success && (
        <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg p-3 text-sm">{success}</div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">JSON</div>
          <button
            className="text-xs px-2 py-1 rounded border hover:bg-slate-50 dark:hover:bg-slate-800"
            onClick={() => setEditor(pretty)}
            disabled={loading || saving}
          >
            Reformat
          </button>
        </div>
        {loading ? (
          <div className="text-sm text-slate-500">Loading…</div>
        ) : (
          <textarea
            rows={18}
            className="w-full font-mono text-[12px] rounded border px-3 py-2 bg-white dark:bg-slate-900 dark:border-slate-700"
            value={editor}
            onChange={(e) => setEditor(e.target.value)}
            spellCheck={false}
          />
        )}

        <div className="mt-3 flex gap-2">
          <button
            onClick={save}
            disabled={saving || loading}
            className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <button
            onClick={() => setEditor(pretty)}
            disabled={saving || loading}
            className="px-3 py-1.5 rounded border text-sm"
          >
            Reset edits
          </button>
        </div>
      </div>

      <div className="text-[12px] text-slate-500">
        Tip: JSON must be valid. Example for renaming/hiding columns:
        <pre className="mt-1 p-2 rounded bg-slate-50 dark:bg-slate-800 overflow-x-auto">
{`{
  "renameColumns": { "full_name": "Borrower Name", "phone": "Phone" },
  "hideColumns": ["internal_id", "created_at"]
}`}
        </pre>
      </div>
    </div>
  );
}
