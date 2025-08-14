// src/pages/admin/LoanReminderSettings.jsx
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

export default function LoanReminderSettings() {
  const { data, setData, loading, saving, error, success, save } =
    useSettingsResource(
      SettingsAPI.getLoanReminders,  // make sure these exist in SettingsAPI
      SettingsAPI.saveLoanReminders, // getLoanReminders / saveLoanReminders
      { rules: [] }
    );

  const add = () =>
    setData((p) => ({
      ...p,
      rules: [
        ...(p.rules || []),
        {
          id: makeId(),
          name: "Due in 3 days",
          offsetDays: -3, // negative means before due date, positive after
          channels: ["sms"], // sms | email | push
          productIds: [],
          active: true,
        },
      ],
    }));

  const update = (id, patch) =>
    setData((p) => ({
      ...p,
      rules: (p.rules || []).map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));

  const remove = (id) =>
    setData((p) => ({
      ...p,
      rules: (p.rules || []).filter((r) => r.id !== id),
    }));

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;

  return (
    <div className="space-y-4">
      <header className="bg-white dark:bg-slate-900 border rounded-2xl p-4">
        <h1 className="text-xl font-semibold">Loan Reminder Settings</h1>
        <p className="text-sm text-slate-500">
          Define reminder rules per loan product or category.
        </p>
      </header>

      {error && <div className="text-sm text-rose-600">{error}</div>}
      {success && <div className="text-sm text-emerald-600">{success}</div>}

      <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3">
        <button
          className="px-3 py-1.5 rounded bg-slate-100"
          onClick={add}
        >
          Add Rule
        </button>

        {(data.rules || []).length === 0 ? (
          <div className="text-sm text-slate-500">No rules yet.</div>
        ) : (
          <div className="space-y-3">
            {data.rules.map((r) => (
              <div
                key={r.id}
                className="p-3 border rounded-lg grid grid-cols-1 md:grid-cols-7 gap-2"
              >
                {/* Name */}
                <input
                  className="rounded border px-3 py-2 text-sm"
                  placeholder="Name"
                  value={r.name || ""}
                  onChange={(e) => update(r.id, { name: e.target.value })}
                />

                {/* Offset days */}
                <input
                  type="number"
                  className="rounded border px-3 py-2 text-sm"
                  placeholder="Offset days (e.g. -3)"
                  value={r.offsetDays ?? -3}
                  onChange={(e) =>
                    update(r.id, { offsetDays: toInt(e.target.value, -3) })
                  }
                />

                {/* Channels */}
                <select
                  multiple
                  className="rounded border px-3 py-2 text-sm"
                  value={r.channels || []}
                  onChange={(e) =>
                    update(r.id, {
                      channels: [...e.target.selectedOptions].map((o) => o.value),
                    })
                  }
                >
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                  <option value="push">Push</option>
                </select>

                {/* Product IDs */}
                <input
                  className="rounded border px-3 py-2 text-sm"
                  placeholder="Product IDs (comma)"
                  value={(r.productIds || []).join(",")}
                  onChange={(e) =>
                    update(r.id, {
                      productIds: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .map(Number),
                    })
                  }
                />

                {/* Active */}
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!r.active}
                    onChange={(e) => update(r.id, { active: e.target.checked })}
                  />
                  Active
                </label>

                {/* Actions */}
                <div className="md:col-span-2 flex items-center gap-2">
                  <button
                    className="px-3 py-1.5 rounded bg-rose-50 text-rose-700"
                    onClick={() => remove(r.id)}
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
