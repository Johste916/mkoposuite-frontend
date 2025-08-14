// src/pages/admin/LoanApprovals.jsx
import React from "react";
import { useSettingsResource } from "../../hooks/useSettingsResource";
import { SettingsAPI } from "../../api/settings";

// Small client-side ID helper (no external deps)
const makeId = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export default function LoanApprovals() {
  const { data, setData, loading, saving, error, success, save } = useSettingsResource(
    SettingsAPI.getLoanApprovals,   // ensure these exist in SettingsAPI
    SettingsAPI.saveLoanApprovals,  // getLoanApprovals / saveLoanApprovals
    { workflows: [] }
  );

  const add = () =>
    setData((p) => ({
      ...p,
      workflows: [
        ...(p.workflows || []),
        {
          id: makeId(),
          name: "Default flow",
          mode: "straight",             // "straight" | "approval"
          productIds: [],
          branchIds: [],
          approverRoles: ["manager"],
          minAmount: null,
          maxAmount: null,
          active: true,
        },
      ],
    }));

  const update = (id, patch) =>
    setData((p) => ({
      ...p,
      workflows: (p.workflows || []).map((w) => (w.id === id ? { ...w, ...patch } : w)),
    }));

  const remove = (id) =>
    setData((p) => ({
      ...p,
      workflows: (p.workflows || []).filter((w) => w.id !== id),
    }));

  const parseIds = (value) =>
    value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((n) => Number(n))
      .filter((n) => !Number.isNaN(n));

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;

  return (
    <div className="space-y-4">
      <header className="bg-white dark:bg-slate-900 border rounded-2xl p-4">
        <h1 className="text-xl font-semibold">Manage Loan Status and Approvals</h1>
        <p className="text-sm text-slate-500">
          Define approval flows per product/branch and amount ranges.
        </p>
      </header>

      {error && <div className="text-sm text-rose-600">{error}</div>}
      {success && <div className="text-sm text-emerald-600">{success}</div>}

      <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3">
        <button className="px-3 py-1.5 rounded bg-slate-100" onClick={add}>
          Add Workflow
        </button>

        {(data.workflows || []).length === 0 ? (
          <div className="text-sm text-slate-500">No workflows yet.</div>
        ) : (
          <div className="space-y-3">
            {data.workflows.map((w) => (
              <div
                key={w.id}
                className="p-3 border rounded-lg grid grid-cols-1 md:grid-cols-7 gap-2"
              >
                {/* Name */}
                <input
                  className="rounded border px-3 py-2 text-sm"
                  placeholder="Name"
                  value={w.name || ""}
                  onChange={(e) => update(w.id, { name: e.target.value })}
                />

                {/* Mode */}
                <select
                  className="rounded border px-3 py-2 text-sm"
                  value={w.mode || "straight"}
                  onChange={(e) => update(w.id, { mode: e.target.value })}
                >
                  <option value="straight">Straight (auto)</option>
                  <option value="approval">Requires approval</option>
                </select>

                {/* Product IDs */}
                <input
                  className="rounded border px-3 py-2 text-sm"
                  placeholder="Product IDs (comma)"
                  value={(w.productIds || []).join(",")}
                  onChange={(e) => update(w.id, { productIds: parseIds(e.target.value) })}
                />

                {/* Branch IDs */}
                <input
                  className="rounded border px-3 py-2 text-sm"
                  placeholder="Branch IDs (comma)"
                  value={(w.branchIds || []).join(",")}
                  onChange={(e) => update(w.id, { branchIds: parseIds(e.target.value) })}
                />

                {/* Approver roles */}
                <input
                  className="rounded border px-3 py-2 text-sm"
                  placeholder="Approver roles (comma)"
                  value={(w.approverRoles || []).join(",")}
                  onChange={(e) =>
                    update(w.id, {
                      approverRoles: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />

                {/* Min / Max amounts */}
                <input
                  type="number"
                  className="rounded border px-3 py-2 text-sm"
                  placeholder="Min amount"
                  value={w.minAmount ?? ""}
                  onChange={(e) =>
                    update(w.id, {
                      minAmount: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
                <input
                  type="number"
                  className="rounded border px-3 py-2 text-sm"
                  placeholder="Max amount"
                  value={w.maxAmount ?? ""}
                  onChange={(e) =>
                    update(w.id, {
                      maxAmount: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />

                {/* Active */}
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!w.active}
                    onChange={(e) => update(w.id, { active: e.target.checked })}
                  />
                  Active
                </label>

                {/* Actions */}
                <div className="md:col-span-7 flex items-center gap-2">
                  <button
                    className="px-3 py-1.5 rounded bg-rose-50 text-rose-700"
                    onClick={() => remove(w.id)}
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
