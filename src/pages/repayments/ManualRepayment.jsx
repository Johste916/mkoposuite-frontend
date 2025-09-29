import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api";

const money = (v) => Number(v || 0).toLocaleString();

/** Simple client-side allocator fallback */
function localPreviewAllocation(
  schedule = [],
  amount = 0,
  strategy = "oldest_due_first",
  customOrder = "penalties,interest,fees,principal",
  waivePenalties = false
) {
  const amt = Number(amount || 0);
  if (!amt || schedule.length === 0)
    return { allocations: [], totals: { principal: 0, interest: 0, fees: 0, penalties: 0 } };

  // Determine category order
  let order;
  if (strategy === "principal_first") order = ["principal", "interest", "fees", "penalties"];
  else if (strategy === "interest_first") order = ["interest", "fees", "penalties", "principal"];
  else if (strategy === "fees_first") order = ["fees", "interest", "penalties", "principal"];
  else if (strategy === "custom") order = customOrder.split(",").map((s) => s.trim()).filter(Boolean);
  else order = ["penalties", "interest", "fees", "principal"]; // default

  if (waivePenalties) order = order.filter((x) => x !== "penalties");

  // Build simplified “remaining” per installment
  const rows = schedule.map((s, idx) => {
    const principalDue = Math.max(0, Number(s.principal ?? 0) - Number(s.principalPaid ?? 0));
    const interestDue = Math.max(0, Number(s.interest ?? 0) - Number(s.interestPaid ?? 0));
    const feesDue = Math.max(0, Number(s.fees ?? 0) - Number(s.feesPaid ?? 0));
    const penDue = Math.max(0, Number(s.penalties ?? s.penalty ?? 0) - Number(s.penaltiesPaid ?? 0));

    let remaining = {
      principal: Number.isFinite(principalDue) ? principalDue : 0,
      interest: Number.isFinite(interestDue) ? interestDue : 0,
      fees: Number.isFinite(feesDue) ? feesDue : 0,
      penalties: waivePenalties ? 0 : Number.isFinite(penDue) ? penDue : 0,
    };

    // Heuristic if totals exist but parts are 0
    const totalLeft = Math.max(0, Number(s.total || 0) - Number(s.paid || 0));
    const sumParts = Object.values(remaining).reduce((a, b) => a + b, 0);
    if (totalLeft > 0 && sumParts === 0) {
      remaining.interest = Math.min(totalLeft, Number(s.interest || 0));
      remaining.principal = Math.max(0, totalLeft - remaining.interest);
    }

    return { period: s.period ?? idx + 1, remaining };
  });

  let left = Number(amt);
  const allocations = [];
  const totals = { principal: 0, interest: 0, fees: 0, penalties: 0 };

  for (const r of rows) {
    if (left <= 0) break;
    const lineAlloc = { period: r.period, principal: 0, interest: 0, fees: 0, penalties: 0 };

    for (const cat of order) {
      if (left <= 0) break;
      const need = Math.max(0, r.remaining[cat] || 0);
      if (!need) continue;
      const take = Math.min(need, left);
      lineAlloc[cat] += take;
      totals[cat] += take;
      left -= take;
    }

    if (lineAlloc.principal || lineAlloc.interest || lineAlloc.fees || lineAlloc.penalties) {
      allocations.push(lineAlloc);
    }
  }

  return { allocations, totals };
}

/** Helper: get remaining amount on the first unpaid installment */
const getNextDueRemaining = (sch = []) => {
  for (const s of sch) {
    const totalParts =
      Number(s.principal || 0) +
      Number(s.interest || 0) +
      Number(s.fees || 0) +
      Number(s.penalties ?? s.penalty ?? 0);

    const total = Number(s.total ?? totalParts);
    const paid = Number(s.paid || 0);
    const remain = Math.max(0, total - paid);

    const isPaid = String(s.status || "").toLowerCase() === "paid";
    if (!isPaid && remain > 0) {
      return { amount: remain, dueDate: s.dueDate, period: s.period };
    }
  }
  return null;
};

// Normalize any date-ish value to "YYYY-MM-DD" for <input type="date" />
const toDateInputValue = (val) => {
  if (!val) return "";
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const d = new Date(val);
  if (isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export default function ManualRepayment() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const qpLoanId = sp.get("loanId");

  // loan selection
  const [loanQuery, setLoanQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [loan, setLoan] = useState(null); // { id, reference, borrowerName, currency, outstanding }

  // schedule snapshot
  const [schedule, setSchedule] = useState([]);
  const [loadingLoan, setLoadingLoan] = useState(false);

  // payment form
  const [form, setForm] = useState({
    loanId: "",
    date: new Date().toISOString().slice(0, 10),
    amount: "",
    method: "cash",
    reference: "",
    notes: "",
    allocateStrategy: "oldest_due_first",
    customOrder: "penalties,interest,fees,principal",
    waivePenalties: false,
    issueReceipt: true,
  });

  // preview
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [posting, setPosting] = useState(false);

  const canPreview = useMemo(
    () => form.loanId && Number(form.amount) > 0 && form.date,
    [form.loanId, form.amount, form.date]
  );

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({
      ...f,
      [name]: type === "checkbox" ? checked : type === "number" ? Number(value) : value,
    }));
  };
  const setVal = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  // ---- Loan search / load ----
  const searchLoans = async (e) => {
    e?.preventDefault?.();
    if (!loanQuery.trim()) return;
    setSearching(true);
    try {
      // ✅ align with backend: /loans?q=...&page=1&pageSize=10
      const { data } = await api.get("/loans", {
        params: { q: loanQuery.trim(), page: 1, pageSize: 10 },
      });
      const items = Array.isArray(data) ? data : data?.items || [];
      setResults(items);
    } catch {
      alert("Search failed");
    } finally {
      setSearching(false);
    }
  };

  const pickLoan = async (l) => {
    setLoan(l);
    setForm((f) => ({ ...f, loanId: l.id, reference: l.reference || f.reference }));
    await fetchSchedule(l.id);
    setPreview(null);
  };

  const fetchSchedule = async (loanId) => {
    setLoadingLoan(true);
    try {
      const { data } = await api.get(`/loans/${loanId}/schedule`);
      setSchedule(Array.isArray(data) ? data : []);
    } catch {
      setSchedule([]);
    } finally {
      setLoadingLoan(false);
    }
  };

  const loadLoanById = async (id) => {
    if (!id) return;
    setLoadingLoan(true);
    try {
      const { data } = await api.get(`/loans/${id}`);
      if (data) {
        setLoan(data);
        setForm((f) => ({ ...f, loanId: data.id, reference: data.reference || f.reference }));
        await fetchSchedule(data.id);
      } else {
        alert("Loan not found");
      }
    } catch {
      alert("Failed to load loan");
    } finally {
      setLoadingLoan(false);
    }
  };

  useEffect(() => {
    if (qpLoanId) loadLoanById(qpLoanId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qpLoanId]);

  // ---- Use Next Due Amount (and date) ----
  const useNextDue = () => {
    if (!schedule?.length) {
      alert("Load a loan first");
      return;
    }
    const next = getNextDueRemaining(schedule);
    if (!next) {
      alert("No unpaid installment found");
      return;
    }

    const nextDate = toDateInputValue(next.dueDate);
    setForm((f) => ({
      ...f,
      amount: Number(next.amount).toFixed(2),
      date: nextDate || f.date,
    }));
  };

  // ---- Preview allocation ----
  const getPreview = async () => {
    if (!canPreview) return;
    setPreviewing(true);
    try {
      const payload = {
        loanId: form.loanId,
        amount: Number(form.amount),
        date: form.date,
        strategy: form.allocateStrategy,
        customOrder: form.allocateStrategy === "custom" ? form.customOrder : undefined,
        waivePenalties: !!form.waivePenalties,
      };
      const { data } = await api.post("/repayments/preview-allocation", payload);
      setPreview(data || null);
    } catch {
      const local = localPreviewAllocation(
        schedule,
        Number(form.amount),
        form.allocateStrategy,
        form.customOrder,
        !!form.waivePenalties
      );
      setPreview(local);
      alert("Server preview unavailable — used local preview.");
    } finally {
      setPreviewing(false);
    }
  };

  // ---- Submit repayment ----
  const submitPayment = async () => {
    if (!canPreview) return alert("Fill amount, date, and select a loan");
    setPosting(true);
    try {
      const payload = {
        loanId: form.loanId,
        amount: Number(form.amount),
        date: form.date,
        method: form.method,
        reference: form.reference || undefined,
        notes: form.notes || undefined,
        strategy: form.allocateStrategy,
        customOrder: form.allocateStrategy === "custom" ? form.customOrder : undefined,
        waivePenalties: !!form.waivePenalties,
        issueReceipt: !!form.issueReceipt,
      };
      const { data } = await api.post("/repayments/manual", payload);

      // 🔔 Notify the whole app a repayment has been posted so lists/schedules refresh
      try {
        window.dispatchEvent(
          new CustomEvent("repayment:posted", { detail: { loanId: form.loanId } })
        );
      } catch {
        // ignore if CustomEvent not supported
      }

      // UX: go to receipts (or back to schedule) as you already had
      if (data?.repaymentId) {
        alert("Repayment posted");
        navigate("/repayments/receipts");
      } else {
        alert("Repayment posted");
        navigate("/repayments");
      }
    } catch (e) {
      const msg = e?.response?.data?.error || "Failed to post repayment";
      alert(msg);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border shadow">
        <div className="p-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Manual Repayment</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Search a loan, enter payment details, preview allocation, and post.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="inline-flex items-center rounded-md px-3 py-2 text-sm border hover:bg-gray-50 dark:hover:bg-gray-700"
              onClick={() => navigate("/repayments")}
            >
              Back to Schedule
            </button>
          </div>
        </div>
      </div>

      {/* Loan selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border shadow">
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Select Loan</h3>

          <form onSubmit={searchLoans} className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Search (Borrower / Loan Ref / Phone)</label>
              <input
                className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-900"
                value={loanQuery}
                onChange={(e) => setLoanQuery(e.target.value)}
                placeholder="e.g., Juma / L-000123 / +2557…"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={searching}
                className="inline-flex items-center rounded-md px-3 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {searching ? "Searching…" : "Search"}
              </button>
            </div>
          </form>

          {results.length > 0 && (
            <div className="overflow-x-auto border rounded-xl">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700 text-left">
                    <th className="p-3">Loan Ref</th>
                    <th className="p-3">Borrower</th>
                    <th className="p-3">Outstanding</th>
                    <th className="p-3">Next Due</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((l) => (
                    <tr key={l.id} className="border-t">
                      <td className="p-3">{l.reference || `L-${l.id}`}</td>
                      <td className="p-3">{l.borrowerName || l.Borrower?.name}</td>
                      <td className="p-3">
                        {l.currency || "TZS"} {money(l.outstanding ?? l.balance ?? 0)}
                      </td>
                      <td className="p-3">{l.nextDueDate || "—"}</td>
                      <td className="p-3 text-right">
                        <button
                          className="inline-flex items-center rounded-md px-3 py-1.5 text-sm border hover:bg-gray-50 dark:hover:bg-gray-700"
                          onClick={() => pickLoan(l)}
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {loan && (
            <div className="border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{loan.borrowerName || loan.Borrower?.name}</p>
                  <p className="text-sm text-gray-500">{loan.reference || `L-${loan.id}`}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Outstanding</p>
                  <p className="font-semibold">
                    {loan.currency || "TZS"} {money(loan.outstanding ?? loan.balance ?? 0)}
                  </p>
                </div>
              </div>

              <hr className="my-3" />

              <div className="overflow-x-auto border rounded-xl">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-700 text-left">
                      <th className="p-3">#</th>
                      <th className="p-3">Due Date</th>
                      <th className="p-3">Total</th>
                      <th className="p-3">Paid</th>
                      <th className="p-3">Penalty</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingLoan && (
                      <tr>
                        <td colSpan={6} className="p-4">
                          Loading schedule…
                        </td>
                      </tr>
                    )}
                    {!loadingLoan && schedule.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-4 text-gray-500">
                          No schedule items.
                        </td>
                      </tr>
                    )}
                    {schedule.map((s, idx) => (
                      <tr key={`${s.period}-${s.dueDate}`} className="border-t">
                        <td className="p-3">{s.period ?? idx + 1}</td>
                        <td className="p-3">{s.dueDate}</td>
                        <td className="p-3">
                          {loan.currency || "TZS"} {money(s.total)}
                        </td>
                        <td className="p-3">
                          {loan.currency || "TZS"} {money(s.paid)}
                        </td>
                        <td className="p-3">
                          {s.penalty ? `${loan.currency || "TZS"} ${money(s.penalty)}` : "—"}
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                              s.status === "overdue" ? "bg-red-600 text-white" : "border"
                            }`}
                          >
                            {(s.status || "upcoming").toString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border shadow">
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Payment Details</h3>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-900"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Amount</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  name="amount"
                  value={form.amount}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-900"
                />
                <button
                  type="button"
                  className="inline-flex items-center rounded-md px-3 py-2 text-sm border hover:bg-gray-50 dark:hover:bg-gray-700"
                  onClick={useNextDue}
                >
                  Use Next Due Amount
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Method</label>
              <select
                value={form.method}
                onChange={(e) => setVal("method")(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-900"
              >
                <option value="cash">Cash</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="bank">Bank</option>
                <option value="card">Card</option>
                <option value="adjustment">Adjustment</option>
              </select>
            </div>

            <div className="space-y-2 md:col-span-3">
              <label className="text-sm font-medium">Reference (optional)</label>
              <input
                name="reference"
                value={form.reference}
                onChange={handleChange}
                placeholder="e.g., MPESA-123ABC / BankTxn#..."
                className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-900"
              />
            </div>

            <div className="space-y-2 md:col-span-3">
              <label className="text-sm font-medium">Notes (optional)</label>
              <textarea
                rows={2}
                name="notes"
                value={form.notes}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-900"
              />
            </div>
          </div>

          <hr />

          <h4 className="font-medium">Allocation Strategy</h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Strategy</label>
              <select
                value={form.allocateStrategy}
                onChange={(e) => setVal("allocateStrategy")(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-900"
              >
                <option value="oldest_due_first">Oldest Due First</option>
                <option value="principal_first">Principal First</option>
                <option value="interest_first">Interest First</option>
                <option value="fees_first">Fees First</option>
                <option value="custom">Custom Order</option>
              </select>
            </div>

            <div
              className={`${
                form.allocateStrategy === "custom" ? "" : "opacity-60 pointer-events-none"
              } space-y-2 md:col-span-2`}
            >
              <label className="text-sm font-medium">Custom Order</label>
              <input
                name="customOrder"
                value={form.customOrder}
                onChange={handleChange}
                placeholder="penalties,interest,fees,principal"
                className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-900"
              />
              <p className="text-xs text-gray-500">
                Comma-separated among: penalties, interest, fees, principal.
              </p>
            </div>

            <div className="flex items-end">
              <div className="w-full">
                <label className="block mb-2 text-sm font-medium">Options</label>
                <div className="flex gap-6 text-sm">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!form.waivePenalties}
                      onChange={(e) => setVal("waivePenalties")(e.target.checked)}
                    />
                    Waive penalties
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!form.issueReceipt}
                      onChange={(e) => setVal("issueReceipt")(e.target.checked)}
                    />
                    Issue receipt
                  </label>
                </div>
              </div>
            </div>

            <div className="md:col-span-3 flex justify-end gap-2">
              <button
                type="button"
                disabled={!canPreview || previewing}
                onClick={getPreview}
                className="inline-flex items-center rounded-md px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 disabled:opacity-60"
              >
                {previewing ? "Previewing…" : "Preview Allocation"}
              </button>
              <button
                type="button"
                disabled={!canPreview || posting}
                onClick={submitPayment}
                className="inline-flex items-center rounded-md px-3 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {posting ? "Posting…" : "Post Repayment"}
              </button>
            </div>
          </div>

          {/* Preview table */}
          {preview && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Allocation Preview</h4>
              <div className="overflow-x-auto border rounded-xl">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-700 text-left">
                      <th className="p-3">Period</th>
                      <th className="p-3">Principal</th>
                      <th className="p-3">Interest</th>
                      <th className="p-3">Fees</th>
                      <th className="p-3">Penalties</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.allocations?.length ? (
                      preview.allocations.map((a) => (
                        <tr key={a.period} className="border-t">
                          <td className="p-3">{a.period}</td>
                          <td className="p-3">{loan?.currency || "TZS"} {money(a.principal)}</td>
                          <td className="p-3">{loan?.currency || "TZS"} {money(a.interest)}</td>
                          <td className="p-3">{loan?.currency || "TZS"} {money(a.fees)}</td>
                          <td className="p-3">{loan?.currency || "TZS"} {money(a.penalties)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-4 text-gray-500">
                          No allocation details.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {preview.totals && (
                    <tfoot>
                      <tr className="border-t">
                        <td className="p-3 font-medium">Totals</td>
                        <td className="p-3 font-medium">
                          {loan?.currency || "TZS"} {money(preview.totals.principal)}
                        </td>
                        <td className="p-3 font-medium">
                          {loan?.currency || "TZS"} {money(preview.totals.interest)}
                        </td>
                        <td className="p-3 font-medium">
                          {loan?.currency || "TZS"} {money(preview.totals.fees)}
                        </td>
                        <td className="p-3 font-medium">
                          {loan?.currency || "TZS"} {money(preview.totals.penalties)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
