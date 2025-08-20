// src/pages/loans/LoanApplications.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api";
import {
  Save, PlusCircle, X, Calendar, Wallet, Building2, Landmark, Upload, ShieldCheck, User, FileUp,
} from "lucide-react";

const today = () => new Date().toISOString().slice(0, 10);
const card = "bg-white rounded-2xl shadow-sm ring-1 ring-indigo-950/5 p-4 md:p-6";
const header = "flex items-center gap-2 mb-4";
const chip = "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-indigo-700 bg-indigo-50 border-indigo-200";
const input =
  "w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all";

const INTEREST_METHODS = [
  { value: "flat", label: "Flat rate" },
  { value: "reducing_equal_installments", label: "Reduced balance — equal installments" },
  { value: "reducing_equal_principal", label: "Reduced balance — equal principal" },
  { value: "interest_only", label: "Interest only" },
  { value: "compound_accrued", label: "Compound interest (accrued)" },
  { value: "compound_equal_installments", label: "Compound interest — equal installments" },
];

const REPAYMENT_CYCLES = [
  { value: "weekly", label: "Weekly", perMonth: 4 },
  { value: "biweekly", label: "Bi-weekly", perMonth: 2 },
  { value: "monthly", label: "Monthly", perMonth: 1 },
  { value: "custom", label: "Custom" },
];

const COLLATERAL_TYPES = [
  "None",
  "Household Items",
  "Vehicle (Logbook)",
  "Land Title",
  "Business Stock",
  "Electronics",
  "Salary Assignment",
  "Other",
];

const STATUS_LABELS = ["new loan", "open", "top-up", "defaulted"];

export default function LoanApplications() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [borrowers, setBorrowers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingCounts, setLoadingCounts] = useState(false);

  const [form, setForm] = useState({
    productId: "",
    borrowerId: "",
    loanNumber: "",

    principal: "",
    releaseDate: today(),
    durationMonths: "",
    collateralType: "",
    collateralAmount: "",

    interestMethod: "flat",
    interestRate: "",
    interestAmount: "",

    fees: [], // {name, amount, paid}

    repaymentCycle: "monthly",
    numberOfRepayments: "",

    statusLabel: "new loan",

    // guarantors
    guarantors: [], // {type:'existing'|'manual', borrowerId?, name?, occupation?, residence?, contacts?, verification?}

    // spouse (optional)
    spouseName: "",
    spouseOccupation: "",
    spouseIdNumber: "",
    spousePhone: "",
    spouseConsentNote: "",

    // attachments meta
    attachmentsMeta: [], // {type, note, fileKey}
  });

  const filesRef = useRef({}); // fileKey -> File

  useEffect(() => {
    (async () => {
      try {
        const [p, b] = await Promise.all([
          api.get("/loan-products"),
          api.get("/borrowers", { params: { page: 1, pageSize: 500 } }).catch(() => ({ data: { items: [] } })),
        ]);
        setProducts(Array.isArray(p.data) ? p.data : (p.data?.items || []));
        setBorrowers(Array.isArray(b.data) ? b.data : (b.data?.items || []));
      } catch (e) {
        console.warn("Failed to load dropdowns", e);
      }
    })();
  }, []);

  // Auto loan number by counting borrower’s previous loans
  useEffect(() => {
    if (!form.borrowerId) return;
    setLoadingCounts(true);
    (async () => {
      try {
        let total = 0;
        try {
          const r = await api.get(`/borrowers/${form.borrowerId}/loans`);
          total = Array.isArray(r.data) ? r.data.length : (r.data?.items?.length || 0);
        } catch {
          const r2 = await api.get("/loans", { params: { borrowerId: form.borrowerId, page: 1, pageSize: 1 } });
          total = r2.data?.total || 0;
        }
        setForm(f => ({ ...f, loanNumber: String(total + 1).padStart(3, "0") }));
      } catch {
        setForm(f => ({ ...f, loanNumber: "" }));
      } finally {
        setLoadingCounts(false);
      }
    })();
  }, [form.borrowerId]);

  // Auto # of repayments
  useEffect(() => {
    if (form.repaymentCycle === "custom") return;
    const cycle = REPAYMENT_CYCLES.find(c => c.value === form.repaymentCycle);
    const months = Number(form.durationMonths || 0);
    if (!cycle || months <= 0) return;
    setForm(f => ({ ...f, numberOfRepayments: String(months * (cycle.perMonth || 1)) }));
  }, [form.repaymentCycle, form.durationMonths]);

  const selectedProduct = useMemo(
    () => products.find(p => String(p.id) === String(form.productId)),
    [products, form.productId]
  );

  /* fees */
  const addFee = () => setForm(f => ({ ...f, fees: [...f.fees, { name: "", amount: "", paid: false }] }));
  const updateFee = (i, patch) =>
    setForm(f => ({ ...f, fees: f.fees.map((x, idx) => (idx === i ? { ...x, ...patch } : x)) }));
  const removeFee = (i) => setForm(f => ({ ...f, fees: f.fees.filter((_, idx) => idx !== i) }));

  /* guarantors */
  const addGuarantor = () =>
    setForm(f => ({
      ...f,
      guarantors: [
        ...f.guarantors,
        { type: "existing", borrowerId: "", name: "", occupation: "", residence: "", contacts: "", verification: "" },
      ],
    }));
  const updateGuarantor = (i, patch) =>
    setForm(f => ({ ...f, guarantors: f.guarantors.map((g, idx) => (idx === i ? { ...g, ...patch } : g)) }));
  const removeGuarantor = (i) =>
    setForm(f => ({ ...f, guarantors: f.guarantors.filter((_, idx) => idx !== i) }));

  /* attachments */
  const addAttachment = (label) => {
    const key = Math.random().toString(36).slice(2);
    setForm(f => ({ ...f, attachmentsMeta: [...f.attachmentsMeta, { type: label || "Other", note: "", fileKey: key }] }));
  };
  const setFile = (key, file) => (filesRef.current[key] = file || undefined);
  const updateAttachment = (i, patch) =>
    setForm(f => ({ ...f, attachmentsMeta: f.attachmentsMeta.map((a, idx) => (idx === i ? { ...a, ...patch } : a)) }));
  const removeAttachment = (i) =>
    setForm(f => ({ ...f, attachmentsMeta: f.attachmentsMeta.filter((_, idx) => idx !== i) }));

  /* submit (creates + stage=submitted) */
  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.productId) return alert("Select a loan product");
    if (!form.borrowerId) return alert("Select a borrower");
    if (!form.principal || Number(form.principal) <= 0) return alert("Enter a principal amount");
    if (!form.durationMonths) return alert("Enter loan duration (months)");

    setSubmitting(true);
    try {
      const payload = {
        productId: form.productId,
        borrowerId: form.borrowerId,
        loanNumber: form.loanNumber || null,

        amount: form.principal,
        currency: "TZS",
        releaseDate: form.releaseDate || today(),
        durationMonths: form.durationMonths,
        collateralType: form.collateralType || null,
        collateralAmount: form.collateralAmount || null,

        interestMethod: form.interestMethod,
        interestRate: form.interestRate || null,
        interestAmount: form.interestAmount || null,

        fees: form.fees,
        repaymentCycle: form.repaymentCycle,
        numberOfRepayments: form.numberOfRepayments,

        spouse: {
          name: form.spouseName || "",
          occupation: form.spouseOccupation || "",
          idNumber: form.spouseIdNumber || "",
          phone: form.spousePhone || "",
          consentNote: form.spouseConsentNote || "",
        },

        guarantors: form.guarantors,

        // DB enum safe:
        status: "pending",
        // For your multi-stage workflow:
        workflowStage: "submitted",  // Loan Officer submits → BM review → Compliance → Accountant
        statusLabel: form.statusLabel,
      };

      const fd = new FormData();
      fd.append("payload", JSON.stringify(payload));
      for (const meta of form.attachmentsMeta) {
        const file = filesRef.current[meta.fileKey];
        if (file) {
          fd.append("files", file, file.name);
          fd.append("filesMeta", JSON.stringify({ type: meta.type, note: meta.note, name: file.name }));
        }
      }

      const res = await api.post("/loans", fd, { headers: { "Content-Type": "multipart/form-data" } });
      alert("Loan submitted");
      navigate(`/loans/${res.data?.id || ""}`);
    } catch (e) {
      console.error(e);
      alert("Failed to submit loan");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Add Loan</h1>
          <p className="text-sm text-gray-500">
            Loan Officer submits → <span className="font-medium">Branch Manager</span> reviews →
            <span className="font-medium"> Compliance</span> checks → <span className="font-medium">Accountant</span> disburses.
          </p>
        </div>
        <Link to="/loans" className="text-indigo-600 hover:underline text-sm">Back to Loans</Link>
      </div>

      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-6">
        {/* Product & Borrower */}
        <section className={card}>
          <div className={header}>
            <span className={chip}><Wallet className="h-4 w-4" /> Product & Borrower</span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-600">Loan Product</label>
              <select className={input} value={form.productId} onChange={(e)=>setForm({...form, productId:e.target.value})} required>
                <option value="">Select product…</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}{p.code ? ` (${p.code})` : ""}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">Borrower</label>
              <div className="flex gap-2">
                <select className={`${input} flex-1`} value={form.borrowerId} onChange={(e)=>setForm({...form, borrowerId:e.target.value})} required>
                  <option value="">Select borrower…</option>
                  {borrowers.map(b => <option key={b.id} value={b.id}>{b.name}{b.phone ? ` — ${b.phone}` : ""}</option>)}
                </select>
                <Link to="/borrowers/add" target="_blank" className="px-3 py-2 rounded-lg border hover:bg-gray-50 inline-flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" /> Add
                </Link>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-600">Loan # (auto)</label>
              <input className={input} readOnly value={loadingCounts ? "…" : (form.loanNumber || "—")} />
            </div>
          </div>
        </section>

        {/* Terms */}
        <section className={card}>
          <div className={header}>
            <span className={chip}><Building2 className="h-4 w-4" /> Loan Terms</span>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-600">Principal Amount</label>
              <input type="number" className={input} value={form.principal} onChange={(e)=>setForm({...form, principal:e.target.value})} required />
            </div>
            <div>
              <label className="text-xs text-gray-600 flex items-center gap-1"><Calendar className="h-3.5 w-3.5"/> Release Date</label>
              <input type="date" className={input} value={form.releaseDate} onChange={(e)=>setForm({...form, releaseDate:e.target.value})} required />
            </div>
            <div>
              <label className="text-xs text-gray-600">Collateral Type</label>
              <select className={input} value={form.collateralType} onChange={(e)=>setForm({...form, collateralType:e.target.value})}>
                <option value="">Select…</option>
                {COLLATERAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">Collateral Amount</label>
              <input type="number" className={input} value={form.collateralAmount} onChange={(e)=>setForm({...form, collateralAmount:e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-gray-600">Loan Duration (months)</label>
              <input type="number" className={input} value={form.durationMonths} onChange={(e)=>setForm({...form, durationMonths:e.target.value})} required />
            </div>
          </div>
        </section>

        {/* Interest */}
        <section className={card}>
          <div className={header}>
            <span className={chip}><Landmark className="h-4 w-4" /> Interest</span>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs text-gray-600">Interest Method</label>
              <select className={input} value={form.interestMethod} onChange={(e)=>setForm({...form, interestMethod:e.target.value})}>
                {INTEREST_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">Interest Rate (%)</label>
              <input type="number" step="0.01" className={input} placeholder={selectedProduct?.interestRate ? String(selectedProduct.interestRate) : "e.g. 3"} value={form.interestRate} onChange={(e)=>setForm({...form, interestRate:e.target.value})}/>
            </div>
            <div>
              <label className="text-xs text-gray-600">Interest Amount (optional)</label>
              <input type="number" className={input} value={form.interestAmount} onChange={(e)=>setForm({...form, interestAmount:e.target.value})}/>
            </div>
          </div>
        </section>

        {/* Fees */}
        <section className={card}>
          <div className="flex items-center justify-between mb-4">
            <span className={chip}><FileUp className="h-4 w-4" /> Loan Fees</span>
            <button type="button" onClick={addFee} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50">
              <PlusCircle className="h-4 w-4" /> Add Fee
            </button>
          </div>
          {form.fees.length === 0 ? (
            <p className="text-sm text-gray-500">No fees added.</p>
          ) : (
            <div className="space-y-3">
              {form.fees.map((fee, i) => (
                <div key={i} className="grid md:grid-cols-[2fr_1fr_1fr_auto] gap-3 items-center">
                  <input className={input} placeholder="Fee name (Processing, Insurance…)" value={fee.name} onChange={(e)=>updateFee(i,{name:e.target.value})}/>
                  <input type="number" className={input} placeholder="Amount" value={fee.amount} onChange={(e)=>updateFee(i,{amount:e.target.value})}/>
                  <select className={input} value={fee.paid ? "paid" : "not_paid"} onChange={(e)=>updateFee(i,{paid:e.target.value==="paid"})}>
                    <option value="paid">Paid</option>
                    <option value="not_paid">Not paid</option>
                  </select>
                  <button type="button" onClick={()=>removeFee(i)} className="p-2 rounded hover:bg-gray-50">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-2">Unpaid fees will be included in the repayment schedule.</p>
        </section>

        {/* Repayments */}
        <section className={card}>
          <div className={header}>
            <span className={chip}><Calendar className="h-4 w-4" /> Repayments</span>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-600">Repayment Cycle</label>
              <select className={input} value={form.repaymentCycle} onChange={(e)=>setForm({...form, repaymentCycle:e.target.value})}>
                {REPAYMENT_CYCLES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600"># of Repayments</label>
              <input type="number" className={input} value={form.numberOfRepayments} onChange={(e)=>setForm({...form, numberOfRepayments:e.target.value})}/>
            </div>
            <div>
              <label className="text-xs text-gray-600">Loan Status (label)</label>
              <select className={input} value={form.statusLabel} onChange={(e)=>setForm({...form, statusLabel:e.target.value})}>
                {STATUS_LABELS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <p className="text-[11px] text-gray-500 mt-1">DB status remains “pending” at submission.</p>
            </div>
          </div>
        </section>

        {/* Guarantors */}
        <section className={card}>
          <div className="flex items-center justify-between mb-4">
            <span className={chip}><ShieldCheck className="h-4 w-4" /> Guarantors</span>
            <button type="button" onClick={addGuarantor} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50">
              <PlusCircle className="h-4 w-4" /> Add Guarantor
            </button>
          </div>
          {form.guarantors.length === 0 ? (
            <p className="text-sm text-gray-500">No guarantors added.</p>
          ) : (
            <div className="space-y-4">
              {form.guarantors.map((g, i) => (
                <div key={i} className="border rounded-xl p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-800">Guarantor #{i + 1}</div>
                    <button type="button" onClick={()=>removeGuarantor(i)} className="p-1 rounded hover:bg-gray-50">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid gap-3">
                    <div>
                      <label className="text-xs text-gray-600">Source</label>
                      <select className={input} value={g.type} onChange={(e)=>updateGuarantor(i,{type:e.target.value})}>
                        <option value="existing">Select from borrowers</option>
                        <option value="manual">Enter manually</option>
                      </select>
                    </div>
                    {g.type === "existing" ? (
                      <div>
                        <label className="text-xs text-gray-600">Borrower</label>
                        <select className={input} value={g.borrowerId || ""} onChange={(e)=>updateGuarantor(i,{borrowerId:e.target.value})}>
                          <option value="">Select borrower…</option>
                          {borrowers.map(b => <option key={b.id} value={b.id}>{b.name}{b.phone ? ` — ${b.phone}` : ""}</option>)}
                        </select>
                      </div>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-3">
                        <input className={input} placeholder="Full name" value={g.name} onChange={(e)=>updateGuarantor(i,{name:e.target.value})}/>
                        <input className={input} placeholder="Occupation" value={g.occupation} onChange={(e)=>updateGuarantor(i,{occupation:e.target.value})}/>
                        <input className={input} placeholder="Residence" value={g.residence} onChange={(e)=>updateGuarantor(i,{residence:e.target.value})}/>
                        <input className={input} placeholder="Contacts" value={g.contacts} onChange={(e)=>updateGuarantor(i,{contacts:e.target.value})}/>
                        <input className={input} placeholder="Verification (ID #, etc.)" value={g.verification} onChange={(e)=>updateGuarantor(i,{verification:e.target.value})}/>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Spouse (optional) */}
        <section className={card}>
          <div className={header}>
            <span className={chip}><User className="h-4 w-4" /> Spouse (optional)</span>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <input className={input} placeholder="Name" value={form.spouseName} onChange={(e)=>setForm({...form, spouseName:e.target.value})}/>
            <input className={input} placeholder="Occupation" value={form.spouseOccupation} onChange={(e)=>setForm({...form, spouseOccupation:e.target.value})}/>
            <input className={input} placeholder="ID Number" value={form.spouseIdNumber} onChange={(e)=>setForm({...form, spouseIdNumber:e.target.value})}/>
            <input className={input} placeholder="Phone" value={form.spousePhone} onChange={(e)=>setForm({...form, spousePhone:e.target.value})}/>
            <div className="md:col-span-2">
              <textarea className={`${input} min-h-[84px]`} placeholder="Consent / declaration note" value={form.spouseConsentNote} onChange={(e)=>setForm({...form, spouseConsentNote:e.target.value})}/>
            </div>
          </div>
        </section>

        {/* Attachments */}
        <section className={card}>
          <div className="flex items-center justify-between mb-4">
            <span className={chip}><Upload className="h-4 w-4" /> Attachments</span>
            <div className="flex gap-2 flex-wrap">
              {[
                "Borrower: Loan form",
                "Borrower: Village introduction",
                "Borrower: Fee receipt",
                "Borrower: ID",
                "Borrower: Business licence",
                "Borrower: TIN",
                "Borrower: Employment contract",
                "Borrower: Salary slips",
                "Borrower: Employer letter",
                "Guarantor: ID",
                "Guarantor: Village introduction",
                "Other",
              ].map(lbl => (
                <button key={lbl} type="button" onClick={()=>addAttachment(lbl)} className="text-xs px-2 py-1 rounded border hover:bg-gray-50">
                  + {lbl.replace(/Borrower: |Guarantor: /g, "")}
                </button>
              ))}
            </div>
          </div>
          {form.attachmentsMeta.length === 0 ? (
            <p className="text-sm text-gray-500">No files attached.</p>
          ) : (
            <div className="space-y-3">
              {form.attachmentsMeta.map((a, i) => (
                <div key={a.fileKey} className="grid md:grid-cols-[2fr_1fr_auto] gap-3 items-center">
                  <div className="grid gap-2">
                    <input className={input} value={a.type} onChange={(e)=>updateAttachment(i,{type:e.target.value})}/>
                    <input className={input} placeholder="Note (optional)" value={a.note} onChange={(e)=>updateAttachment(i,{note:e.target.value})}/>
                  </div>
                  <input type="file" className={input} onChange={(e)=>setFile(a.fileKey, e.target.files?.[0])}/>
                  <button type="button" onClick={()=>removeAttachment(i)} className="p-2 rounded hover:bg-gray-50"><X className="h-4 w-4"/></button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Sticky actions */}
        <div className="sticky bottom-0 inset-x-0 z-20 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-t">
          <div className="max-w-screen-2xl mx-auto px-4 py-3 flex justify-end gap-3">
            <Link to="/loans" className="px-4 py-2 rounded-xl border hover:bg-gray-50">Cancel</Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            >
              <Save className="h-4 w-4" />
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
