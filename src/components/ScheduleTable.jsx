// src/components/ScheduleTable.jsx
import React from "react";
import { SCHEDULE_COLUMNS, mapScheduleRows, fmtMoney, asDate } from "../utils/loanSchedule";

const statusBadge = (status) =>
  status === "Settled"
    ? "px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
    : "px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200";

export default function ScheduleTable({ schedule = [], currency = "TZS" }) {
  const rows = mapScheduleRows(schedule);

  return (
    <div className="overflow-auto rounded border shadow bg-white">
      <table className="min-w-full">
        <thead className="bg-gray-100 sticky top-0 z-10">
          <tr className="text-left text-sm">
            {SCHEDULE_COLUMNS.map((h) => (
              <th key={h} className="p-2 border-b font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="text-sm">
          {rows.map((r, i) => (
            <tr key={i} className={i % 2 ? "bg-gray-50" : ""}>
              <td className="p-2 border">{r.idx}</td>
              <td className="p-2 border whitespace-nowrap">{asDate(r.dueDateISO)}</td>
              <td className="p-2 border text-right">{fmtMoney(r.principal, currency)}</td>
              <td className="p-2 border text-right">{fmtMoney(r.interest,  currency)}</td>
              <td className="p-2 border text-right">{fmtMoney(r.pi,        currency)}</td>
              <td className="p-2 border text-right">{fmtMoney(r.penalty,   currency)}</td>
              <td className="p-2 border text-right">{fmtMoney(r.fees,      currency)}</td>
              <td className="p-2 border text-right">{r.paidP == null ? "—" : fmtMoney(r.paidP, currency)}</td>
              <td className="p-2 border text-right">{r.paidI == null ? "—" : fmtMoney(r.paidI, currency)}</td>
              <td className="p-2 border text-right">{fmtMoney(r.outstanding, currency)}</td>
              <td className="p-2 border"><span className={statusBadge(r.status)}>{r.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
