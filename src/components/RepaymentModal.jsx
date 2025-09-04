import React, { useEffect, useMemo, useState } from "react";
import client from "../api/client";
import * as repaymentsApi from "../api/repayments";

const money = (v) => Number(v || 0).toLocaleString();

const MethodBadge = ({ value }) => {
  const map = {
    cash: "bg-gray-100 text-gray-800",
    mobile_money: "bg-emerald-50 text-emerald-800 border border-emerald-200",
    bank: "bg-indigo-50 text-indigo-800 border border-indigo-200",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${map[value] || "bg-gray-100"}`}>
      {String(value || "cash").replace("_", " ")}
    </span>
  );
};

const AllocationTable = ({ currency = "TZS", allocation = [] }) => {
  if (!allocation?.length) return null;
  return (
    <div className="border rounded-lg overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left p-2">Period</th>
            <th className="text-right p-2">Principal</th>
            <th className="text-right p-2">Interest</th>
            <th className="text-right p-2">Fees</th>
            <th className="text-right p-2">Penalties</th>
          </tr>
        </thead>
        <tbody>
          {allocation.map((a, idx) => (
            <tr key={`${a.period}-${idx}`} className="border-t">
              <td className="p-2">{a.period}</td>
              <td className="p-2 text-right">{currency} {money(a.principal)}</td>
              <td className="p-2 text-right">{currency} {money(a.interest)}</td>
              <td className="p-2 text-right">{currency} {money(a.fees)}</td>
              <td className="p-2 text-right">{currency} {money(a.penalties)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Safe API shims (don’t break if a named export is missing)
const previewAllocationFn =
  repaymentsApi.previewAllocation ||
  (async () => { throw new Error("Preview API not available (export previewAllocation in src/api/repayments.js)."); });

const createRepaymentFn =
  repaymentsApi.createRepayment ||
  (async (payload) => {
    // Fallback aligns with how other parts of the app post repayments
    const { data } = await client.post("/repayments", payload);
    return data;
  });

/**
 * Props:
 * - isOpen, onClose
 * - loan: { id, reference, currency, Borrower?.name }  (preferred) OR loanId
 * - onSaved: () => void
 */
const RepaymentModal = ({ isOpen, onClose, loan: loanProp, loanId: loanIdProp, onSaved }) => {
  const [loan, setLoan] = useState(loanProp || null);
  const loanId = loan?.id || loanIdProp;

  const [form, setForm] = useState({
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    method: "cash", // cash | mobile_money | bank
    reference: "",
    waivePenalties: false,
  });
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState("");

  const canPreview = useMemo(
    () => loanId && Number(form.amount) > 0 && form.date,
    [loanId, form.amount, form.date]
  );

  useEffect(() => {
    if (loan) {
      setForm((f) => ({ ...f, reference: loan.reference || f.reference }));
    }
  }, [loan]);

  // Fetch loan details if only loanId provided
  useEffect(() => {
    const fetchLoan = async () => {
      if (!loanId || loan) return;
      try {
        const { data } = await client.get(`/loans/${loanId}`);
        setLoan(data);
        setForm((f) => ({ ...f, reference: data.reference || f.reference }));
      } catch {
        // ignore missing
      }
    };
    fetchLoan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loanId]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const doPreview = async () => {
    if (!canPreview) return;
    setError("");
    setPreviewing(true);
    try {
      const data = await previewAllocationFn({
        loanId,
        amount: Number(form.amount),
        date: form.date,
        strategy: "oldest_due_first",
        waivePenalties: !!form.waivePenalties,
      });
      setPreview(data);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Preview failed");
    } finally {
      setPreviewing(false);
    }
  };

  const handleSave = async () => {
    if (!loanId || !form.amount || !form.date) {
      setError("Please fill amount and date.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await createRepaymentFn({
        loanId,
        amount: Number(form.amount),
        date: form.date,
        method: form.method,
        reference: form.reference || loan?.reference || undefined,
        waivePenalties: !!form.waivePenalties,
        issueReceipt: true,
      });
      onSaved?.();
      onClose?.();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Failed to save repayment");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currency = loan?.currency || "TZS";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-md w-full max-w-xl space-y-4"
      >
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-bold">Add Repayment</h2>
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">Close</button>
        </div>

        {loan && (
          <div className="text-sm p-3 rounded-lg border bg-gray-50 dark:bg-slate-800/40 dark:border-slate-700">
            <div className="flex flex-wrap gap-3 items-center">
              <div><span className="text-gray-500 mr-1">Loan:</span> {loan.reference || `L-${loan.id}`}</div>
              <div><span className="text-gray-500 mr-1">Borrower:</span> {loan.Borrower?.name || loan.borrowerName || "—"}</div>
              <div><span className="text-gray-500 mr-1">Repay Ref:</span>
                <code className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border rounded ml-1">{loan.reference || `L-${loan.id}`}</code>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm">Amount</label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              className="w-full border px-3 py-2 rounded dark:bg-slate-900 dark:border-slate-700"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm">Date</label>
            <input
              type="date"
              className="w-full border px-3 py-2 rounded dark:bg-slate-900 dark:border-slate-700"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm">Method</label>
            <select
              className="w-full border px-3 py-2 rounded dark:bg-slate-900 dark:border-slate-700"
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
            >
              <option value="cash">Cash</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="bank">Bank Transfer</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm">Repayment Reference (auto)</label>
            <input
              className="w-full border px-3 py-2 rounded dark:bg-slate-900 dark:border-slate-700"
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              placeholder="Use the loan reference when paying"
            />
          </div>
          <label className="col-span-2 inline-flex items-center gap-2 mt-1">
            <input
              type="checkbox"
              checked={form.waivePenalties}
              onChange={(e) => setForm({ ...form, waivePenalties: e.target.checked })}
            />
            <span className="text-sm">Waive penalties for this repayment</span>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={doPreview}
            disabled={!canPreview || previewing}
            className="px-3 py-2 rounded border hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-60"
          >
            {previewing ? "Previewing…" : "Preview Allocation"}
          </button>
          <div className="text-xs">
            Method: <MethodBadge value={form.method} />
          </div>
        </div>

        {!!preview?.allocations?.length && (
          <>
            <AllocationTable currency={currency} allocation={preview.allocations} />
            <div className="text-sm text-gray-600 dark:text-slate-300">
              Totals • Principal: {currency} {money(preview.totals?.principal)} • Interest: {currency} {money(preview.totals?.interest)} • Fees: {currency} {money(preview.totals?.fees)} • Penalties: {currency} {money(preview.totals?.penalties)}
            </div>
          </>
        )}

        {!!error && <div className="text-sm text-red-600">{error}</div>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-slate-800 rounded">Cancel</button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Saving…" : "Save Repayment"}
          </button>
        </div>

        {/* Payer instructions for mobile money & bank */}
        {loan && (
          <div className="mt-2 text-xs text-gray-500 dark:text-slate-400">
            <p className="font-medium text-gray-700 dark:text-slate-200">Payment instructions:</p>
            <ul className="list-disc ml-5 mt-1 space-y-1">
              <li>
                <b>Mobile Money:</b> Use the reference <code>{loan.reference || `L-${loan.id}`}</code> in the “Reason/Ref” field.
              </li>
              <li>
                <b>Bank Transfer:</b> Add the same reference <code>{loan.reference || `L-${loan.id}`}</code> in the “Narration/Ref”.
              </li>
              <li>
                You’ll receive an SMS confirmation once funds post to the loan.
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default RepaymentModal;
