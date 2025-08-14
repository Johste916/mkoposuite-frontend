// src/pages/admin/LoanPenaltySettings.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../api";

const empty = {
  method: "percentage", // percentage | flat
  percent: 2,           // if percentage
  flatAmount: 0,        // if flat
  graceDays: 0,
  capPercentOfPrincipal: 100, // cap as % of principal
  applyOn: "installment", // installment | total
};

export default function LoanPenaltySettings() {
  const [data, setData] = useState(empty);
  const [initial, setInitial] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const dirty = useMemo(() => JSON.stringify(data) !== JSON.stringify(initial), [data, initial]);

  useEffect(() => {
    const before = (e) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [dirty]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/admin/loan-penalty-settings");
        const val = { ...empty, ...(res.data || {}) };
        setData(val);
        setInitial(val);
      } catch {
        // defaults
      }
    })();
  }, []);

  const show = (msg, type = "info") => {
    setToast({ id: Date.now(), msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const save = async () => {
    if (data.method === "percentage" && (data.percent < 0 || data.percent > 100)) {
      return show("Percentage must be between 0 and 100.", "error");
    }
    if (data.method === "flat" && data.flatAmount < 0) {
      return show("Flat amount cannot be negative.", "error");
    }
    if (data.graceDays < 0) {
      return show("Grace days cannot be negative.", "error");
    }
    setSaving(true);
    try {
      await api.put("/admin/loan-penalty-settings", data);
      setInitial(data);
      show("Penalty settings saved", "success");
    } catch {
      show("Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => setData(initial);

  return (
    <div className="space-y-4">
      {toast && (
        <div
          className={`px-3 py-2 rounded text-white text-sm ${
            toast.type === "error" ? "bg-rose-600" : toast.type === "success" ? "bg-emerald-600" : "bg-slate-800"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <h1 className="text-xl font-semibold mb-1">Loan Penalty Settings</h1>
        <p className="text-sm text-slate-500">Configure late-payment penalties and grace rules.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="text-xs font-medium text-slate-500">Method *</label>
            <select
              value={data.method}
              onChange={(e) => setData((d) => ({ ...d, method: e.target.value }))}
              className="mt-1 w-full border rounded px-3 py-2 text-sm"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="flat">Flat Amount</option>
            </select>
          </div>

          {data.method === "percentage" ? (
            <div>
              <label className="text-xs font-medium text-slate-500">Percent % *</label>
              <input
                type="number"
                value={data.percent}
                onChange={(e) => setData((d) => ({ ...d, percent: Number(e.target.value) }))}
                className="mt-1 w-full border rounded px-3 py-2 text-sm"
                min={0}
                max={100}
              />
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-slate-500">Flat Amount *</label>
              <input
                type="number"
                value={data.flatAmount}
                onChange={(e) => setData((d) => ({ ...d, flatAmount: Number(e.target.value) }))}
                className="mt-1 w-full border rounded px-3 py-2 text-sm"
                min={0}
              />
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-slate-500">Grace Days *</label>
            <input
              type="number"
              value={data.graceDays}
              onChange={(e) => setData((d) => ({ ...d, graceDays: Number(e.target.value) }))}
              className="mt-1 w-full border rounded px-3 py-2 text-sm"
              min={0}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500">Cap (% of principal)</label>
            <input
              type="number"
              value={data.capPercentOfPrincipal}
              onChange={(e) =>
                setData((d) => ({ ...d, capPercentOfPrincipal: Number(e.target.value) }))
              }
              className="mt-1 w-full border rounded px-3 py-2 text-sm"
              min={0}
              max={500}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500">Apply On *</label>
            <select
              value={data.applyOn}
              onChange={(e) => setData((d) => ({ ...d, applyOn: e.target.value }))}
              className="mt-1 w-full border rounded px-3 py-2 text-sm"
            >
              <option value="installment">Each installment</option>
              <option value="total">Total outstanding</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-4">
          <button className="px-3 py-2 text-sm border rounded" onClick={cancel} disabled={!dirty}>
            Cancel
          </button>
          <button
            className="px-3 py-2 text-sm rounded bg-blue-600 text-white disabled:opacity-60"
            onClick={save}
            disabled={saving || !dirty}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
