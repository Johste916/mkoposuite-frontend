import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";

export default function AddPayroll() {
  const nav = useNavigate();
  const [branches, setBranches] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    period: "",           // YYYY-MM
    staffCount: "",
    total: "",
    branchId: "",
    notes: "",
    processedAt: "",
    paidAt: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/branches");
        setBranches(Array.isArray(data) ? data : data?.data || []);
      } catch {}
    })();
  }, []);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr("");
    setMsg("");
    try {
      const payload = {
        period: form.period,
        staffCount: Number(form.staffCount) || 0,
        total: Number(form.total) || 0,
        branchId: form.branchId || null,
        notes: form.notes || "",
        processedAt: form.processedAt || null,
        paidAt: form.paidAt || null,
      };
      await api.post("/payroll", payload);
      setMsg("Payroll saved.");
      setTimeout(() => nav("/payroll"), 600);
    } catch (e2) {
      setErr(e2?.response?.data?.error || e2?.message || "Failed to save payroll.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add Payroll</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">Create a payroll period.</p>

      {msg && <div className="mt-3 text-sm text-emerald-600">{msg}</div>}
      {err && <div className="mt-3 text-sm text-rose-600">{err}</div>}

      <form onSubmit={submit} className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-sm">
          <div className="mb-1">Period (YYYY-MM)</div>
          <input
            required
            placeholder="2025-08"
            value={form.period}
            onChange={(e) => set("period", e.target.value)}
            className="w-full border rounded px-3 py-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          />
        </label>

        <label className="text-sm">
          <div className="mb-1">Branch</div>
          <select
            value={form.branchId}
            onChange={(e) => set("branchId", e.target.value)}
            className="w-full border rounded px-3 py-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          >
            <option value="">—</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <div className="mb-1">Staff Count</div>
          <input
            type="number"
            min="0"
            value={form.staffCount}
            onChange={(e) => set("staffCount", e.target.value)}
            className="w-full border rounded px-3 py-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          />
        </label>

        <label className="text-sm">
          <div className="mb-1">Total (TZS)</div>
          <input
            type="number"
            min="0"
            step="1"
            value={form.total}
            onChange={(e) => set("total", e.target.value)}
            className="w-full border rounded px-3 py-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          />
        </label>

        <label className="text-sm">
          <div className="mb-1">Processed At (ISO)</div>
          <input
            placeholder="2025-08-30"
            value={form.processedAt}
            onChange={(e) => set("processedAt", e.target.value)}
            className="w-full border rounded px-3 py-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          />
        </label>

        <label className="text-sm">
          <div className="mb-1">Paid At (ISO)</div>
          <input
            placeholder="2025-09-01"
            value={form.paidAt}
            onChange={(e) => set("paidAt", e.target.value)}
            className="w-full border rounded px-3 py-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          />
        </label>

        <label className="text-sm sm:col-span-2">
          <div className="mb-1">Notes</div>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            className="w-full border rounded px-3 py-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          />
        </label>

        <div className="sm:col-span-2 mt-1">
          <button
            type="submit"
            disabled={saving}
            className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Payroll"}
          </button>
        </div>
      </form>
    </div>
  );
}
