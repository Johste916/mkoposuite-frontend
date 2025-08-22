import React, { useEffect, useState } from "react";
import repaymentsApi from "../../api/repayments";
import { Link } from "react-router-dom";

const money = (v) => Number(v || 0).toLocaleString();

function PaymentInstructions({ loan }) {
  if (!loan) return null;
  const ref = loan.reference || `L-${loan.id}`;
  const borrower = loan.Borrower?.name || "";
  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); } catch {}
  };
  return (
    <div className="mt-3 text-xs space-y-2 bg-gray-50 dark:bg-gray-900 border rounded p-3">
      <p className="font-medium">Payment Instructions</p>
      <div className="space-y-2">
        <div>
          <p>Mobile Money:</p>
          <code className="block p-2 bg-white dark:bg-black rounded border">
            Use reference: {ref} (borrower: {borrower})
          </code>
          <button className="mt-1 text-blue-600" onClick={() => copy(ref)}>Copy Ref</button>
        </div>
        <div>
          <p>Bank Deposit:</p>
          <code className="block p-2 bg-white dark:bg-black rounded border">
            Include narration "{ref}" in the transfer memo
          </code>
          <button className="mt-1 text-blue-600" onClick={() => copy(ref)}>Copy Ref</button>
        </div>
      </div>
    </div>
  );
}

export default function ApproveRepayments() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState(null);
  const [preview, setPreview] = useState({}); // id -> {allocations, totals}

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await repaymentsApi.pendingApprovals();
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
      alert("Failed to fetch pending repayments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const doApprove = async (id) => {
    if (!confirm("Approve this repayment?")) return;
    setActingId(id);
    try {
      await repaymentsApi.approve(id);
      setRows((r) => r.filter((x) => x.id !== id));
    } catch (e) {
      alert(e?.response?.data?.error || "Approve failed");
    } finally {
      setActingId(null);
    }
  };

  const doReject = async (id) => {
    const why = prompt("Reason (optional):") || "";
    setActingId(id);
    try {
      await repaymentsApi.reject(id, why);
      setRows((r) => r.filter((x) => x.id !== id));
    } catch (e) {
      alert(e?.response?.data?.error || "Reject failed");
    } finally {
      setActingId(null);
    }
  };

  const doPreview = async (row) => {
    const id = row.id;
    // if allocation already present on row, show that; else compute
    if (row.allocation?.length) {
      setPreview((p) => ({ ...p, [id]: { allocations: row.allocation, totals: {} } }));
      return;
    }
    try {
      const amount = Number(row.amount ?? row.amountPaid ?? 0);
      const date = (row.date || row.paymentDate || row.paidAt || new Date().toISOString()).slice(0,10);
      const { data } = await repaymentsApi.previewAllocation({
        loanId: row.loanId || row.Loan?.id,
        amount,
        date,
      });
      setPreview((p) => ({ ...p, [id]: { allocations: data.allocations || [], totals: data.totals || {} } }));
    } catch {
      alert("Failed to preview allocation");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 border rounded-xl shadow p-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Approve Repayments</h2>
          <p className="text-sm text-gray-500">Review & approve pending repayment entries.</p>
        </div>
        <button onClick={load} className="px-3 py-2 rounded border hover:bg-gray-50" disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 border rounded-xl shadow p-6">
        <div className="overflow-x-auto border rounded-xl">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Amount</th>
                <th className="text-left p-3">Method</th>
                <th className="text-left p-3">Ref</th>
                <th className="text-left p-3">Borrower</th>
                <th className="text-left p-3">Loan</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-4 text-gray-500">No pending repayments.</td>
                </tr>
              )}
              {rows.map((r) => {
                const loan = r.Loan || {};
                const br = loan.Borrower || {};
                const date =
                  r.date || r.paymentDate || r.paidAt || r.createdAt || "";
                const currency = r.currency || loan.currency || "TZS";
                const pv = preview[r.id];

                return (
                  <React.Fragment key={r.id}>
                    <tr className="border-t">
                      <td className="p-3">{String(date).slice(0, 10)}</td>
                      <td className="p-3">{currency} {money(r.amount ?? r.amountPaid)}</td>
                      <td className="p-3">{r.method || "—"}</td>
                      <td className="p-3">{r.reference || "—"}</td>
                      <td className="p-3">{br.name || "—"}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span>{loan.reference || `L-${loan.id}`}</span>
                          {!!loan.id && (
                            <Link
                              to={`/loans/${loan.id}`}
                              target="_blank"
                              className="text-blue-600 hover:underline"
                            >
                              open
                            </Link>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            className="px-3 py-1.5 rounded border hover:bg-gray-50"
                            onClick={() => doPreview(r)}
                          >
                            Preview Allocation
                          </button>
                          <button
                            className="px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                            onClick={() => doApprove(r.id)}
                            disabled={actingId === r.id}
                          >
                            {actingId === r.id ? "Working…" : "Approve"}
                          </button>
                          <button
                            className="px-3 py-1.5 rounded border hover:bg-gray-50 disabled:opacity-60"
                            onClick={() => doReject(r.id)}
                            disabled={actingId === r.id}
                          >
                            Reject
                          </button>
                          {/* Optional receipt link (works once approved; still fine for pending to preview) */}
                          <Link
                            to={`/repayments/receipts?id=${r.id}`}
                            className="px-3 py-1.5 rounded border hover:bg-gray-50"
                            target="_blank"
                          >
                            View Receipt
                          </Link>
                        </div>
                      </td>
                    </tr>
                    {pv && (
                      <tr className="bg-gray-50/60">
                        <td colSpan={7} className="p-3">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <p className="font-medium text-sm mb-2">Allocation</p>
                              <div className="overflow-x-auto border rounded">
                                <table className="min-w-full text-xs">
                                  <thead>
                                    <tr className="bg-gray-50">
                                      <th className="p-2 text-left">Period</th>
                                      <th className="p-2 text-right">Principal</th>
                                      <th className="p-2 text-right">Interest</th>
                                      <th className="p-2 text-right">Fees</th>
                                      <th className="p-2 text-right">Penalties</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(pv.allocations || []).map((a, i) => (
                                      <tr key={i} className="border-t">
                                        <td className="p-2">{a.period}</td>
                                        <td className="p-2 text-right">{money(a.principal)}</td>
                                        <td className="p-2 text-right">{money(a.interest)}</td>
                                        <td className="p-2 text-right">{money(a.fees)}</td>
                                        <td className="p-2 text-right">{money(a.penalties)}</td>
                                      </tr>
                                    ))}
                                    {!pv.allocations?.length && (
                                      <tr><td className="p-2" colSpan={5}>No allocation needed.</td></tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                            <div>
                              <p className="font-medium text-sm mb-2">Helper</p>
                              <PaymentInstructions loan={loan} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {loading && (
                <tr>
                  <td colSpan={7} className="p-4">Loading…</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
