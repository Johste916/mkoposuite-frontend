import React from "react";

const fmt = (d) => (d ? new Date(d).toLocaleString() : "");

export default function LoanTimeline({ loan, comments = [], repayments = [], audits = [] }) {
  const items = [];

  if (loan?.createdAt) items.push({ t: loan.createdAt, kind: "status", label: "Created", meta: {} });
  if (loan?.approvalDate) items.push({ t: loan.approvalDate, kind: "status", label: "Approved", meta: { by: loan.approvedBy } });
  if (loan?.disbursementDate) items.push({ t: loan.disbursementDate, kind: "status", label: "Disbursed", meta: { by: loan.disbursedBy } });
  if (loan?.closedDate) items.push({ t: loan.closedDate, kind: "status", label: "Closed", meta: { by: loan.closedBy, reason: loan.closeReason } });

  repayments.forEach(r => items.push({ t: r.date, kind: "repayment", label: `Repayment ${r.amount}`, meta: { method: r.method } }));
  comments.forEach(c => items.push({ t: c.createdAt, kind: "comment", label: c.content, meta: { by: c.userId } }));
  audits.forEach(a => items.push({ t: a.createdAt, kind: "audit", label: `${a.action}`, meta: {} }));

  items.sort((a,b) => new Date(a.t) - new Date(b.t));

  const chip = (k) =>
    ({status:"bg-indigo-100 text-indigo-800",repayment:"bg-emerald-100 text-emerald-800",comment:"bg-gray-100 text-gray-700",audit:"bg-yellow-100 text-yellow-800"}[k] || "bg-slate-100 text-slate-800");

  return (
    <div className="bg-white rounded shadow p-4">
      <h3 className="text-lg font-semibold mb-3">Timeline</h3>
      {items.length === 0 ? <p className="text-sm text-gray-500">No activity yet.</p> : (
        <ul className="space-y-2">
          {items.map((it, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <span className={`px-2 py-0.5 rounded text-xs ${chip(it.kind)}`}>{it.kind}</span>
              <div>
                <div className="text-sm">{it.label}</div>
                <div className="text-xs text-gray-500">{fmt(it.t)}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
