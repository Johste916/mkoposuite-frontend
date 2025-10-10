import React, { useMemo } from "react";
import { mapScheduleRows, fmtMoney } from "../utils/loanSchedule";

/**
 * Simple, normalized schedule table.
 * Expects:
 *  - schedule: raw schedule array (any backend shape)
 *  - currency: currency code (e.g., 'TZS')
 */
export default function ScheduleTable({ schedule = [], currency = "TZS" }) {
  const rows = useMemo(() => mapScheduleRows(schedule || []), [schedule, currency]);

  if (!rows.length) {
    return <div className="text-sm text-gray-600 dark:text-slate-300">No schedule available.</div>;
  }

  return (
    <div className="overflow-x-auto bg-white dark:bg-slate-900">
      <table className="min-w-full text-base">
        <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10">
          <tr className="text-left dark:text-slate-200">
            <th className="px-3 py-3 border-b-2 border-slate-200 dark:border-slate-700">#</th>
            <th className="px-3 py-3 border-b-2 border-slate-200 dark:border-slate-700">Due Date</th>
            <th className="px-3 py-3 border-b-2 border-slate-200 dark:border-slate-700 text-right">Principal</th>
            <th className="px-3 py-3 border-b-2 border-slate-200 dark:border-slate-700 text-right">Interest</th>
            <th className="px-3 py-3 border-b-2 border-slate-200 dark:border-slate-700 text-right">Total P&amp;I</th>
            <th className="px-3 py-3 border-b-2 border-slate-200 dark:border-slate-700 text-right">Penalty</th>
            <th className="px-3 py-3 border-b-2 border-slate-200 dark:border-slate-700 text-right">Fees</th>
            <th className="px-3 py-3 border-b-2 border-slate-200 dark:border-slate-700 text-right">Paid Principal</th>
            <th className="px-3 py-3 border-b-2 border-slate-200 dark:border-slate-700 text-right">Paid Interest</th>
            <th className="px-3 py-3 border-b-2 border-slate-200 dark:border-slate-700 text-right">Outstanding</th>
            <th className="px-3 py-3 border-b-2 border-slate-200 dark:border-slate-700">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-800 dark:text-slate-100">
              <td className="px-3 py-2 whitespace-nowrap">{r.idx}</td>
              <td className="px-3 py-2 whitespace-nowrap">{r.dueDateISO}</td>
              <td className="px-3 py-2 whitespace-nowrap text-right">{fmtMoney(r.principal, currency)}</td>
              <td className="px-3 py-2 whitespace-nowrap text-right">{fmtMoney(r.interest, currency)}</td>
              <td className="px-3 py-2 whitespace-nowrap text-right">{fmtMoney(r.pi, currency)}</td>
              <td className="px-3 py-2 whitespace-nowrap text-right">{fmtMoney(r.penalty, currency)}</td>
              <td className="px-3 py-2 whitespace-nowrap text-right">{fmtMoney(r.fees, currency)}</td>
              <td className="px-3 py-2 whitespace-nowrap text-right">
                {r.paidP == null ? "—" : fmtMoney(r.paidP, currency)}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-right">
                {r.paidI == null ? "—" : fmtMoney(r.paidI, currency)}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-right">{fmtMoney(r.outstanding, currency)}</td>
              <td className="px-3 py-2 whitespace-nowrap">
                {r.status === "Settled" ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-900">
                    Settled
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-900">
                    Pending
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
