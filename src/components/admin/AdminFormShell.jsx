import { useState, useEffect } from "react";

export default function AdminFormShell({ title, subtitle, load, save, render }) {
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await load();
        if (mounted) setData(res || {});
      } catch (e) {
        if (mounted) setError(e?.response?.data?.message || e.message || "Failed to load");
      }
    })();
    return () => { mounted = false; };
  }, [load]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      await save(data || {});
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>

      <form onSubmit={onSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
        {error && <div className="text-sm text-rose-600">{error}</div>}
        {data ? render({ data, setData, saving }) : <div className="text-sm text-slate-500">Loading…</div>}
        <div className="pt-2">
          <button
            disabled={saving || !data}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
