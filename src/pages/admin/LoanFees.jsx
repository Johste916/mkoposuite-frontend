// src/pages/admin/LoanFees.jsx
import React from "react";
import { useSettingsResource } from "../../hooks/useSettingsResource";
import { SettingsAPI } from "../../api/settings";

// Safe ID generator: prefers crypto.randomUUID(), falls back to a simple unique string
const makeId = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export default function LoanFees() {
  const { data, setData, loading, saving, error, success, save } =
    useSettingsResource(
      SettingsAPI.getLoanFees,   // pass function reference
      SettingsAPI.saveLoanFees,  // pass function reference
      { fees: [] }
    );

  const add = () =>
    setData((prev) => ({
      ...prev,
      fees: [
        ...(prev.fees || []),
        {
          id: makeId(),
          name: "",
          mode: "fixed", // "fixed" | "percent"
          amount: 0,
          productIds: [],
          active: true,
        },
      ],
    }));

  const update = (id, patch) =>
    setData((prev) => ({
      ...prev,
      fees: (prev.fees || []).map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }));

  const remove = (id) =>
    setData((prev) => ({
      ...prev,
      fees: (prev.fees || []).filter((f) => f.id !== id),
    }));

  const parseAmount = (val) => {
    if (val === "" || val === null || typeof val === "undefined") return 0;
    const n = Number(val);
    return Number.isFinite(n) ? n : 0;
  };

  if (loading) {
    return <div className="p-4 text-sm text-slate-500">Loading…</div>;
  }

  return (
    <div className="space-y-4">
      <header className="bg-white dark:bg-slate-900 border rounded-2xl p-4">
        <h1 className="text-xl font-semibold">Loan Fees</h1>
        <p className="text-sm text-slate-500">
          Configure fixed/percent fees and link them to products.
        </p>
      </header>

      {error && <div className="text-sm text-rose-600">{error}</div>}
      {success && <div className="text-sm text-emerald-600">{success}</div>}

      <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3">
        <button className="px-3 py-1.5 rounded bg-slate-100" onClick={add}>
          Add Fee
        </button>

        {(data.fees || []).length === 0 ? (
          <div className="text-sm text-slate-500">No fees yet.</div>
        ) : (
          <div className="space-y-3">
            {data.fees.map((f) => (
              <div
                key={f.id}
                className="p-3 border rounded-lg grid grid-cols-1 md:grid-cols-6 gap-2"
              >
                {/* Name */}
                <input
                  className="rounded border px-3 py-2 text-sm"
                  placeholder="Name"
                  value={f.name || ""}
                  onChange={(e) => update(f.id, { name: e.target.value })}
                />

                {/* Mode */}
                <select
                  className="rounded border px-3 py-2 text-sm"
                  value={f.mode || "fixed"}
                  onChange={(e) => update(f.id, { mode: e.target.value })}
                >
                  <option value="fixed">Fixed (amount)</option>
                  <option value="percent">Percent (%)</option>
                </select>

                {/* Amount / % */}
                <input
                  type="number"
                  className="rounded border px-3 py-2 text-sm"
                  placeholder="Amount / %"
                  value={f.amount ?? 0}
                  onChange={(e) => update(f.id, { amount: parseAmount(e.target.value) })}
                />

                {/* Product IDs (comma-separated) */}
                <input
                  className="rounded border px-3 py-2 text-sm"
                  placeholder="Product IDs (comma)"
                  value={(f.productIds || []).join(",")}
                  onChange={(e) =>
                    update(f.id, {
                      productIds: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .map((n) => Number(n))
                        .filter((n) => Number.isFinite(n)),
                    })
                  }
                />

                {/* Active */}
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!f.active}
                    onChange={(e) => update(f.id, { active: e.target.checked })}
                  />
                  Active
                </label>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    className="px-3 py-1.5 rounded bg-rose-50 text-rose-700"
                    onClick={() => remove(f.id)}
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
