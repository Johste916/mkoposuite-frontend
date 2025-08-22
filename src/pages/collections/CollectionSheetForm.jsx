import React from "react";

/**
 * Reusable form for Create/Edit CollectionSheet
 * Props:
 *  - value: { date, type, collector, loanOfficer, status }
 *  - onChange: (patch) => void
 *  - onSubmit: (e) => void
 *  - submitting: boolean
 */
export default function CollectionSheetForm({ value, onChange, onSubmit, submitting }) {
  const v = value || {};
  const patch = (k) => (e) => onChange({ [k]: e.target.value });

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-xl">
      <div>
        <label className="block text-sm font-medium">Date</label>
        <input
          type="date"
          className="border rounded px-3 py-2 w-full"
          value={v.date || ""}
          onChange={patch("date")}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Type</label>
          <select className="border rounded px-3 py-2 w-full" value={v.type || ""} onChange={patch("type")} required>
            <option value="">Select</option>
            <option value="FIELD">FIELD</option>
            <option value="OFFICE">OFFICE</option>
            <option value="AGENCY">AGENCY</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Status</label>
          <select className="border rounded px-3 py-2 w-full" value={v.status || ""} onChange={patch("status")} required>
            <option value="">Select</option>
            <option value="PENDING">PENDING</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Collector</label>
          <input className="border rounded px-3 py-2 w-full" value={v.collector || ""} onChange={patch("collector")} />
        </div>
        <div>
          <label className="block text-sm font-medium">Loan Officer</label>
          <input className="border rounded px-3 py-2 w-full" value={v.loanOfficer || ""} onChange={patch("loanOfficer")} />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {submitting ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
