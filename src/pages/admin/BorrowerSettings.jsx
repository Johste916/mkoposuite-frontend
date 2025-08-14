import React from "react";
import { SettingsAPI } from "../../api/settings";
import { useSettingsResource } from "../../hooks/useSettingsResource";

const DEFAULTS = {
  minAge: 18,
  maxAge: 65,
  allowMultipleLoans: false,
  requireGuarantors: false,
  requireIDVerification: true,
  defaultEmploymentStatus: "unemployed"
};

export default function BorrowerSettings() {
  const { data, setData, loading, saving, error, success, save } =
    useSettingsResource(SettingsAPI.getBorrower, SettingsAPI.saveBorrower, DEFAULTS);

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;

  return (
    <div className="space-y-4">
      <header className="bg-white dark:bg-slate-900 border rounded-2xl p-4">
        <h1 className="text-xl font-semibold">Borrower Settings</h1>
        <p className="text-sm text-slate-500">Eligibility and capture rules for borrowers.</p>
      </header>

      <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-4">
        {error && <div className="text-sm text-rose-600">{error}</div>}
        {success && <div className="text-sm text-emerald-600">{success}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm">Minimum Age</label>
            <input
              type="number"
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              value={data.minAge ?? 18}
              onChange={(e) => setData({ ...data, minAge: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-sm">Maximum Age</label>
            <input
              type="number"
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              value={data.maxAge ?? 65}
              onChange={(e) => setData({ ...data, maxAge: Number(e.target.value) })}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="allowMultipleLoans"
              type="checkbox"
              checked={!!data.allowMultipleLoans}
              onChange={(e) => setData({ ...data, allowMultipleLoans: e.target.checked })}
            />
            <label htmlFor="allowMultipleLoans" className="text-sm">Allow multiple active loans</label>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="requireGuarantors"
              type="checkbox"
              checked={!!data.requireGuarantors}
              onChange={(e) => setData({ ...data, requireGuarantors: e.target.checked })}
            />
            <label htmlFor="requireGuarantors" className="text-sm">Require guarantors</label>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="requireIDVerification"
              type="checkbox"
              checked={!!data.requireIDVerification}
              onChange={(e) => setData({ ...data, requireIDVerification: e.target.checked })}
            />
            <label htmlFor="requireIDVerification" className="text-sm">Require ID verification</label>
          </div>
          <div>
            <label className="text-sm">Default Employment Status</label>
            <select
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              value={data.defaultEmploymentStatus || "unemployed"}
              onChange={(e) => setData({ ...data, defaultEmploymentStatus: e.target.value })}
            >
              <option value="unemployed">Unemployed</option>
              <option value="employed">Employed</option>
              <option value="self_employed">Self-employed</option>
            </select>
          </div>
        </div>

        <button
          className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm"
          onClick={save}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
