// src/pages/admin/LoanRepaymentCycles.jsx
import React from "react";
import { useSettingsResource } from "../../hooks/useSettingsResource";
import { SettingsAPI } from "../../api/settings";

// Safe ID generator
const makeId = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const toInt = (v, fallback = 0) => {
  if (v === "" || v === null || typeof v === "undefined") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export default function LoanRepaymentCycles() {
  const { data, setData, loading, saving, error, success, save } =
    useSettingsResource(
      SettingsAPI.getLoanCycles,   // make sure these exist in SettingsAPI
      SettingsAPI.saveLoanCycles,  // getLoanCycles / saveLoanCycles
      { cycles: [] }
    );

  const add = () =>
    setData((p) => ({
      ...p,
      cycles: [
        ...(p.cycles || []),
        {
          id: makeId(),
          name: "Monthly",
          frequency: "monthly", // weekly | monthly | custom
          interval: 1,          // every N weeks/months for weekly/monthly; days for custom
          graceDays: 0,
          active: true,
        },
      ],
    }));

  const update = (id, patch) =>
    setData((p) => ({
      ...p,
      cycles: (p.cycles || []).map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));

  const remove = (id) =>
    setData((p) => ({
      ...p,
      cycles: (p.cycles || []).filter((c) => c.id !== id),
    }));

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;

  return (
    <div className="space-y-4">
      <header className="bg-white dark:bg-slate-900 border rounded-2xl p-4">
        <h1 className="text-xl font-semibold">Loan Repayment Cycles</h1>
        <p className="text-sm text-slate-500">
          Define cycles available when creating loans.
        </p>
      </header>

      {error && <div className="text-sm text-rose-600">{error}</div>}
      {success && <div className="text-sm text-emerald-600">{success}</div>}

      <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3">
        <button className="px-3 py-1.5 rounded bg-slate-100" onClick={add}>
          Add Cycle
        </button>

        {(data.cycles || []).length === 0 ? (
          <div className="text-sm text-slate-500">No cycles yet.</div>
        ) : (
          <div className="space-y-3">
            {data.cycles.map((c) => (
              <div
                key={c.id}
                className="p-3 border rounded-lg grid grid-cols-1 md:grid-cols-6 gap-2"
              >
                {/* Name */}
                <input
                  className="rounded border px-3 py-2 text-sm"
                  placeholder="Name"
                  value={c.name || ""}
                  onChange={(e) => update(c.id, { name: e.target.value })}
                />

                {/* Frequency */}
                <select
                  className="rounded border px-3 py-2 text-sm"
                  value={c.frequency || "monthly"}
                  onChange={(e) => update(c.id, { frequency: e.target.value })}
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom</option>
                </select>

                {/* Interval */}
                <input
                  type="number"
                  className="rounded border px-3 py-2 text-sm"
                  placeholder="Interval"
                  value={c.interval ?? 1}
                  onChange={(e) => update(c.id, { interval: toInt(e.target.value, 1) })}
                />

                {/* Grace days */}
                <input
                  type="number"
                  className="rounded border px-3 py-2 text-sm"
                  placeholder="Grace days"
                  value={c.graceDays ?? 0}
                  onChange={(e) => update(c.id, { graceDays: toInt(e.target.value, 0) })}
                />

                {/* Active */}
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!c.active}
                    onChange={(e) => update(c.id, { active: e.target.checked })}
                  />
                  Active
                </label>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    className="px-3 py-1.5 rounded bg-rose-50 text-rose-700"
                    onClick={() => remove(c.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm"
        disabled={saving}
        onClick={() => save()}
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
