import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  BadgePlus,
  Calendar,
  Percent,
  FolderOpen,
  Upload,
  Save,
} from "lucide-react";
import api from "../../api";

/**
 * Add Loan — single page, clean layout.
 * Flow reminder (shown under the title):
 * Loan Officer submits → Branch Manager reviews → Compliance checks → Accountant disburses.
 *
 * Key change requested:
 *  - Borrower is selected FIRST, then the loan product.
 *  - Loan # auto-calculates once borrower is chosen (count of loans for that borrower + 1).
 */

const classInput =
  "w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all";
const sectionCard = "bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-4 md:p-6";

const interestMethods = [
  { value: "flat", label: "Flat Rate" },
  { value: "rb_equal_installments", label: "Reduced Balance — Equal Installments" },
  { value: "rb_equal_principal", label: "Reduced Balance — Equal Principal" },
  { value: "interest_only", label: "Interest Only" },
  { value: "compound_accrued", label: "Compound Interest (Accrued)" },
  { value: "compound_equal_installments", label: "Compound Interest — Equal Installments" },
];

const repaymentCycles = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
];

const today = () => new Date().toISOString().slice(0, 10);

export default function LoanApplications() {
  const navigate = useNavigate();

  // reference data
  const [borrowers, setBorrowers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingRefs, setLoadingRefs] = useState(true);

  // select/search state
  const [borrowerId, setBorrowerId] = useState("");
  const [productId, setProductId] = useState("");

  // computed/derived
  const [autoNumber, setAutoNumber] = useState(""); // Loan # (auto) once borrower is chosen
  const selectedBorrower = useMemo(
    () => borrowers.find((b) => String(b.id) === String(borrowerId)),
    [borrowers, borrowerId]
  );
  const selectedProduct = useMemo(
    () => products.find((p) => String(p.id) === String(productId)),
    [products, productId]
  );

  // form basics
  const [form, setForm] = useState({
    principal: "",
    releaseDate: today(),
    collateralType: "",
    collateralAmount: "",
    durationMonths: "",
    interestMethod: "",
    interestRate: "",
    interestAmount: "",

    // fees (dynamic)
    fees: [],

    // repayments
    repaymentCycle: "monthly",
    numberOfRepayments: "",

    // plan only; disbursement is separate page
    plannedDisbursementMethod: "",

    // meta
    status: "pending", // submit puts it into workflow; admins can alter later
  });

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const pushToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* ---------- load reference lists ---------- */
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const [b, p] = await Promise.all([
          // keep it light; supports quick typing with q in the future
          api.get("/borrowers", { signal: ac.signal, params: { pageSize: 50 } }),
          api.get("/loan-products", { signal: ac.signal }),
        ]);
        setBorrowers(b.data?.items || b.data || []);
        setProducts(p.data || []);
      } catch {
        pushToast("Failed to load borrowers/products", "error");
      } finally {
        setLoadingRefs(false);
      }
    })();
    return () => ac.abort();
  }, []);

  /* ---------- when product changes, adopt sensible defaults ---------- */
  useEffect(() => {
    if (!selectedProduct) return;
    setForm((f) => ({
      ...f,
      interestMethod: f.interestMethod || selectedProduct.interestMethod || "flat",
      interestRate:
        f.interestRate ||
        selectedProduct.interestRate ||
        selectedProduct.defaultInterestRate ||
        "",
      durationMonths:
        f.durationMonths ||
        selectedProduct.defaultTermMonths ||
        selectedProduct.minTermMonths ||
        "",
    }));
  }, [selectedProduct]);

  /* ---------- compute next Loan # after borrower chosen ---------- */
  useEffect(() => {
    if (!borrowerId) {
      setAutoNumber("");
      return;
    }
    (async () => {
      try {
        // Preferred endpoint:
        // GET /loans/borrower/:id/count -> { count: number }
        const { data } = await api
          .get(`/loans/borrower/${borrowerId}/count`)
          .catch(() => ({ data: null }));

        let count = data?.count;
        if (typeof count !== "number") {
          // Fallback: count current loans by list query (first page is ok for typical volumes)
          const res = await api.get("/loans", { params: { borrowerId, pageSize: 1 } });
          count = (res.data?.total ?? 0);
        }

        const next = String((count || 0) + 1).padStart(2, "0");
        const prefix =
          selectedBorrower?.code ||
          selectedBorrower?.shortCode ||
          `B${selectedBorrower?.id || ""}`;
        setAutoNumber(`${prefix}-${next}`);
      } catch {
        setAutoNumber("");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [borrowerId]);

  /* ---------- fees helpers ---------- */
  const addFee = () =>
    setForm((f) => ({
      ...f,
      fees: [...(f.fees || []), { name: "", amount: "", paid: true }],
    }));
  const updateFee = (idx, patch) =>
    setForm((f) => {
      const fees = [...(f.fees || [])];
      fees[idx] = { ...fees[idx], ...patch };
      return { ...f, fees };
    });
  const removeFee = (idx) =>
    setForm((f) => {
      const fees = [...(f.fees || [])];
      fees.splice(idx, 1);
      return { ...f, fees };
    });

  /* ---------- submit ---------- */
  const canSubmit =
    borrowerId &&
    productId &&
    Number(form.principal) > 0 &&
    form.releaseDate &&
    Number(form.durationMonths) > 0 &&
    form.interestMethod &&
    (form.interestRate === "" || Number(form.interestRate) >= 0);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) {
      pushToast("Fill the required fields before submitting.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        borrowerId,
        productId,
        loanNumber: autoNumber || undefined,

        principal: Number(form.principal),
        releaseDate: form.releaseDate,

        collateralType: form.collateralType || null,
        collateralAmount:
          form.collateralAmount !== "" ? Number(form.collateralAmount) : null,

        durationMonths: Number(form.durationMonths),

        interestMethod: form.interestMethod,
        interestRate:
          form.interestRate !== "" ? Number(form.interestRate) : null,
        interestAmount:
          form.interestAmount !== "" ? Number(form.interestAmount) : null,

        fees:
          (form.fees || [])
            .filter((f) => f.name && Number(f.amount) > 0)
            .map((f) => ({ ...f, amount: Number(f.amount) })) || [],

        repaymentCycle: form.repaymentCycle,
        numberOfRepayments:
                  form.numberOfRepayments !== ""
            ? Number(form.numberOfRepayments)
            : null,

        plannedDisbursementMethod:
          form.plannedDisbursementMethod || null,

        status: "pending", // always start in pending; workflow will route it
      };

      const { data } = await api.post("/loans", payload);
      pushToast("Loan submitted.", "success");
      // Send into review flow (optional endpoint). If not available, ignore.
      try {
        await api.post(`/loans/${data?.id}/workflow`, { action: "submit" });
      } catch {
        /* ignore optional */
      }
      navigate(`/loans/${data?.id}`);
    } catch (e) {
      console.error(e);
      pushToast("Failed to submit loan.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-4 top-4 z-50 px-3 py-2 rounded shadow text-sm text-white ${
            toast.type === "error"
              ? "bg-rose-600"
              : toast.type === "success"
              ? "bg-emerald-600"
              : "bg-slate-800"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Add Loan
          </h1>
          <p className="text-xs md:text-sm text-gray-500">
            Loan Officer submits → Branch Manager reviews → Compliance checks → Accountant disburses.
          </p>
        </div>
        <Link to="/loans" className="text-indigo-600 hover:underline text-sm">
          Back to Loans
        </Link>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Borrower & Product — borrower FIRST */}
        <section className={sectionCard}>
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold text-lg">Borrower & Product</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Borrower FIRST */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-600">Borrower</label>
                <select
                  className={classInput}
                  value={borrowerId}
                  onChange={(e) => setBorrowerId(e.target.value)}
                  required
                >
                  <option value="">Select borrower…</option>
                  {borrowers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name || b.fullName || `Borrower #${b.id}`}
                    </option>
                  ))}
                </select>
              </div>
              <Link
                to="/borrowers/add"
                className="px-3 py-2 rounded-lg border hover:bg-gray-50 inline-flex items-center gap-2"
                title="Add borrower"
              >
                <BadgePlus className="h-4 w-4" /> Add
              </Link>
            </div>

            {/* Product SECOND */}
            <div>
              <label className="text-xs text-gray-600">Loan Product</label>
              <select
                className={classInput}
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                required
              >
                <option value="">Select product…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Auto Loan # */}
            <div className="md:col-span-2">
              <label className="text-xs text-gray-600">Loan # (auto)</label>
              <input
                className={classInput}
                value={autoNumber || "—"}
                disabled
                readOnly
              />
            </div>
          </div>
        </section>

        {/* Terms */}
        <section className={sectionCard}>
          <div className="flex items-center gap-2 mb-4">
            <FolderOpen className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold text-lg">Loan Terms</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-600">Principal Amount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={classInput}
                value={form.principal}
                onChange={(e) =>
                  setForm((f) => ({ ...f, principal: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Loan Release Date
              </label>
              <input
                type="date"
                className={classInput}
                value={form.releaseDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, releaseDate: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Collateral Type</label>
              <input
                className={classInput}
                value={form.collateralType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, collateralType: e.target.value }))
                }
                placeholder="e.g. Car logbook, title deed, equipment…"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Collateral Amount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={classInput}
                value={form.collateralAmount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, collateralAmount: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Loan Duration (months)</label>
              <input
                type="number"
                min="1"
                className={classInput}
                value={form.durationMonths}
                onChange={(e) =>
                  setForm((f) => ({ ...f, durationMonths: e.target.value }))
                }
                required
              />
            </div>
          </div>
        </section>

        {/* Interest */}
        <section className={sectionCard}>
          <div className="flex items-center gap-2 mb-4">
            <Percent className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold text-lg">Interest</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-600">Interest Method</label>
              <select
                className={classInput}
                value={form.interestMethod}
                onChange={(e) =>
                  setForm((f) => ({ ...f, interestMethod: e.target.value }))
                }
                required
              >
                <option value="">Select method…</option>
                {interestMethods.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">Interest Rate (%)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={classInput}
                value={form.interestRate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, interestRate: e.target.value }))
                }
                placeholder={selectedProduct?.interestRate ?? ""}
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Interest Amount (optional)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={classInput}
                value={form.interestAmount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, interestAmount: e.target.value }))
                }
                placeholder="If you prefer to set a fixed interest amount"
              />
            </div>
          </div>
        </section>

        {/* Fees */}
        <section className={sectionCard}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-indigo-600" />
              <h2 className="font-semibold text-lg">Loan Fees</h2>
            </div>
            <button
              type="button"
              onClick={addFee}
              className="px-3 py-1.5 rounded-lg border hover:bg-gray-50"
            >
              + Add fee
            </button>
          </div>
          {(form.fees || []).length === 0 ? (
            <p className="text-sm text-gray-500">No fees added.</p>
          ) : (
            <div className="space-y-3">
              {form.fees.map((f, idx) => (
                <div
                  key={idx}
                  className="grid md:grid-cols-[1fr_160px_120px_80px] gap-3 items-center"
                >
                  <input
                    className={classInput}
                    placeholder="Fee name (e.g. Application Fee)"
                    value={f.name}
                    onChange={(e) => updateFee(idx, { name: e.target.value })}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={classInput}
                    placeholder="Amount"
                    value={f.amount}
                    onChange={(e) => updateFee(idx, { amount: e.target.value })}
                  />
                  <select
                    className={classInput}
                    value={f.paid ? "paid" : "unpaid"}
                    onChange={(e) => updateFee(idx, { paid: e.target.value === "paid" })}
                  >
                    <option value="paid">Paid</option>
                    <option value="unpaid">Not paid</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeFee(idx)}
                    className="px-3 py-2 rounded-lg border hover:bg-gray-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-gray-500 mt-2">
            Unpaid fees will be integrated into the schedule by the backend.
          </p>
        </section>

        {/* Repayments */}
        <section className={sectionCard}>
          <div className="flex items-center gap-2 mb-4">
            <FolderOpen className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold text-lg">Repayments</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-600">Repayment Cycle</label>
              <select
                className={classInput}
                value={form.repaymentCycle}
                onChange={(e) =>
                  setForm((f) => ({ ...f, repaymentCycle: e.target.value }))
                }
              >
                {repaymentCycles.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">Number of Repayments</label>
              <input
                type="number"
                min="1"
                className={classInput}
                value={form.numberOfRepayments}
                onChange={(e) =>
                  setForm((f) => ({ ...f, numberOfRepayments: e.target.value }))
                }
                placeholder="Auto by product if left empty"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Planned Disbursement Method (optional)</label>
              <select
                className={classInput}
                value={form.plannedDisbursementMethod}
                onChange={(e) =>
                  setForm((f) => ({ ...f, plannedDisbursementMethod: e.target.value }))
                }
              >
                <option value="">—</option>
                <option value="cash">Cash</option>
                <option value="bank">Bank</option>
                <option value="mobile">Mobile Money</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </section>

        {/* Attachments (simple picker, backend decides which are mandatory) */}
        <section className={sectionCard}>
          <div className="flex items-center gap-2 mb-4">
            <Upload className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold text-lg">Attachments</h2>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            You can upload documents after submit on the loan details page as well (Loan form, Village letter,
            fee receipts, IDs, business licence, TIN, employment docs, spouse consent, guarantor IDs, etc.).
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <input type="file" className="block w-full text-sm" multiple />
            <div className="text-[11px] text-gray-500">
              Files selected here will be uploaded on submit (if your backend accepts multipart create).
              If not supported, you can attach them from the loan page after submission.
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            disabled={!canSubmit || submitting}
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            <Save className="h-4 w-4" />
            {submitting ? "Submitting…" : "Submit"}
          </button>
          <Link to="/loans" className="px-4 py-2 rounded-xl border hover:bg-gray-50">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
