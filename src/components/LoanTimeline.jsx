import React from "react";

const safeNum = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const fmtMoney = (n, ccy = "TZS") => `${ccy} ${safeNum(n).toLocaleString()}`;
const fmtDT = (d) => (d ? new Date(d).toLocaleString() : "");

const chip = (k) =>
  ({
    status: "bg-indigo-100 text-indigo-800",
    repayment: "bg-emerald-100 text-emerald-800",
    comment: "bg-gray-100 text-gray-700",
    audit: "bg-yellow-100 text-yellow-800",
  }[k] || "bg-slate-100 text-slate-800");

export default function LoanTimeline({
  loan,
  comments = [],
  repayments = [],
  audits = [],
}) {
  const currency = loan?.currency || "TZS";
  const items = [];

  if (loan?.createdAt)
    items.push({ t: loan.createdAt, kind: "status", label: "Created" });
  if (loan?.approvalDate)
    items.push({
      t: loan.approvalDate,
      kind: "status",
      label: `Approved${loan.approvedBy ? ` • by ${loan.approvedBy}` : ""}`,
    });
  if (loan?.disbursementDate)
    items.push({
      t: loan.disbursementDate,
      kind: "status",
      label: `Disbursed${loan.disbursedBy ? ` • by ${loan.disbursedBy}` : ""}`,
    });
  if (loan?.closedDate)
    items.push({
      t: loan.closedDate,
      kind: "status",
      label: `Closed${loan.closeReason ? ` • ${loan.closeReason}` : ""}`,
    });

  repayments.forEach((r) =>
    items.push({
      t: r.date || r.createdAt,
      kind: "repayment",
      label: `Repayment • ${fmtMoney(
        r.amountPaid ?? r.paidAmount ?? r.amount,
        currency
      )}${r.method ? ` • ${r.method}` : ""}`,
    })
  );
  comments.forEach((c) =>
    items.push({
      t: c.createdAt,
      kind: "comment",
      label: c.content,
    })
  );
  audits.forEach((a) =>
    items.push({
      t: a.createdAt,
      kind: "audit",
      label: `${a.action}`,
    })
  );

  items.sort((a, b) => new Date(a.t) - new Date(b.t));

  return (
    <div className="bg-white dark:bg-slate-900 rounded shadow p-4 border border-slate-200 dark:border-slate-800">
      <h3 className="text-lg font-semibold mb-3">Timeline</h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">No activity yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <span className={`px-2 py-0.5 rounded text-xs ${chip(it.kind)}`}>
                {it.kind}
              </span>
              <div>
                <div className="text-sm">{it.label}</div>
                <div className="text-xs text-gray-500 dark:text-slate-400">
                  {fmtDT(it.t)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
