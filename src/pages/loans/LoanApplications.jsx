// src/pages/loans/LoanApplications.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api";
import {
  Save, PlusCircle, X, Calendar, User, FileUp, Upload, Building2, Landmark, Wallet, ShieldCheck,
} from "lucide-react";

/* ---------------- helpers ---------------- */
const today = () => new Date().toISOString().slice(0, 10);
const clsInput =
  "w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all";
const card = "bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-5 md:p-7"; // slightly larger card, not bulky

// normalize any backend list shape to an array
const toArray = (data) =>
  Array.isArray(data) ? data
  : Array.isArray(data?.items) ? data.items
  : Array.isArray(data?.rows) ? data.rows
  : Array.isArray(data?.results) ? data.results
  : [];

const INTEREST_METHODS = [
  { value: "flat", label: "Flat rate" },
  { value: "reducing_equal_installments", label: "Reduced balance — equal installments" },
  { value: "reducing_equal_principal", label: "Reduced balance — equal principal" },
  { value: "interest_only", label: "Interest only" },
  { value: "compound_accrued", label: "Compound interest (accrued)" },
  { value: "compound_equal_installments", label: "Compound interest — equal installments" },
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

const REPAYMENT_CYCLES = [
  { value: "weekly", label: "Weekly", perMonth: 4 },
  { value: "biweekly", label: "Bi-weekly", perMonth: 2 },
  { value: "monthly", label: "Monthly", perMonth: 1 },
  { value: "custom", label: "Custom" },
];

const DISBURSE_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "other", label: "Other" },
];

const STATUS_LABELS = [
  "new loan",
  "open",
  "top-up",
  "defaulted",
];

/* ---------------- page ---------------- */
export default function LoanApplications() {
  const navigate = useNavigate();

  // refs / options
  const [products, setProducts] = useState([]);
  const [borrowers, setBorrowers] = useState([]);
  const [banks, setBanks] = useState([]);

  // ui
  const [submitting, setSubmitting] = useState(false);
  const [loadingCounts, setLoadingCounts] = useState(false);

  // form
  const [form, setForm] = useState({
    productId: "",
    borrowerId: "",

    // auto
    loanNumber: "",

    // terms
    principal: "",
    releaseDate: today(),
    durationMonths: "",
    collateralType: "",
    collateralAmount: "",

    // interest
    interestMethod: "flat",
    interestRate: "",
    interestAmount: "",

    // fees (array)
    fees: [], // {name, amount, paid:boolean}

    // repayments
    repaymentCycle: "monthly",
    numberOfRepayments: "",

    // status label (UI)
    statusLabel: "new loan",

    // disbursement
    disbursementMethod: "cash",
    disbursementBankId: "",
    disbursementReference: "",

    // guarantors
    guarantors: [],

    // spouse (optional)
    spouseName: "",
    spouseOccupation: "",
    spouseIdNumber: "",
    spouseConsentNote: "",
    spousePhone: "",

    // attachments meta (files are separate)
    attachmentsMeta: [], // {type, note, fileKey}
  });

  // files store; key -> File
  const filesRef = useRef({}); // {fileKey: File}

  /* ----------- fetch dropdowns ----------- */
  useEffect(() => {
    (async () => {
      try {
        const [p, bws] = await Promise.all([
          api.get("/loan-products"),
          api.get("/borrowers", { params: { page: 1, pageSize: 500 } }).catch(() => ({ data: { items: [] } })),
        ]);
        setProducts(toArray(p.data));
        setBorrowers(toArray(bws.data));
      } catch (e) {
        console.warn("Failed to load products/borrowers", e);
        setProducts([]);
        setBorrowers([]);
      }
      // optional banks list
      try {
        const r = await api.get("/banks");
        setBanks(toArray(r.data));
      } catch {
        setBanks([]);
      }
    })();
  }, []);

  // safe lists for .find/.map
  const productList = useMemo(() => (Array.isArray(products) ? products : []), [products]);
  const borrowerList = useMemo(() => (Array.isArray(borrowers) ? borrowers : []), [borrowers]);

  /* ----------- compute loan # when borrower changes ----------- */
  useEffect(() => {
    if (!form.borrowerId) return;
    setLoadingCounts(true);
    (async () => {
      try {
        // Try borrower loans endpoint first; fallback to loans query
        let total = 0;
        try {
          const r = await api.get(`/borrowers/${form.borrowerId}/loans`);
          total = Array.isArray(r.data) ? r.data.length : (r.data?.items?.length || 0);
        } catch {
          const r2 = await api.get("/loans", { params: { borrowerId: form.borrowerId, page: 1, pageSize: 1 } });
          total = r2.data?.total || 0;
        }
        const next = (total + 1).toString().padStart(3, "0");
        setForm(f => ({ ...f, loanNumber: next }));
      } catch {
        setForm(f => ({ ...f, loanNumber: "" }));
      } finally {
        setLoadingCounts(false);
      }
    })();
  }, [form.borrowerId]);

  /* ----------- auto-calc numberOfRepayments ----------- */
  useEffect(() => {
    if (form.repaymentCycle === "custom") return; // user will set manually
    const cycle = REPAYMENT_CYCLES.find(c => c.value === form.repaymentCycle);
    const months = Number(form.durationMonths || 0);
    if (!cycle || months <= 0) return;
    const count = months * (cycle.perMonth || 1);
    setForm(f => ({ ...f, numberOfRepayments: String(count) }));
  }, [form.repaymentCycle, form.durationMonths]);

  /* ----------- fees handlers ----------- */
  const addFee = () =>
    setForm(f => ({ ...f, fees: [...f.fees, { name: "", amount: "", paid: false }] }));
  const updateFee = (idx, patch) =>
    setForm(f => ({
      ...f,
      fees: f.fees.map((x, i) => (i === idx ? { ...x, ...patch } : x)),
    }));
  const removeFee = (idx) =>
    setForm(f => ({ ...f, fees: f.fees.filter((_, i) => i !== idx) }));

  /* ----------- guarantors ----------- */
  const addGuarantor = () =>
    setForm(f => ({
      ...f,
      guarantors: [...f.guarantors, { type: "existing", borrowerId: "", name: "", occupation: "", residence: "", contacts: "", verification: "" }],
    }));
  const updateGuarantor = (idx, patch) =>
    setForm(f => ({
      ...f,
      guarantors: f.guarantors.map((g, i) => (i === idx ? { ...g, ...patch } : g)),
    }));
  const removeGuarantor = (idx) =>
    setForm(f => ({ ...f, guarantors: f.guarantors.filter((_, i) => i !== idx) }));

  /* ----------- attachments ----------- */
  const addAttachment = (typeLabel) => {
    const key = Math.random().toString(36).slice(2);
    setForm(f => ({
      ...f,
      attachmentsMeta: [...f.attachmentsMeta, { type: typeLabel || "other", note: "", fileKey: key }],
    }));
  };
  const setFile = (fileKey, file) => {
    filesRef.current[fileKey] = file || undefined;
  };
  const updateAttachment = (idx, patch) =>
    setForm(f => ({
      ...f,
      attachmentsMeta: f.attachmentsMeta.map((a, i) => (i === idx ? { ...a, ...patch } : a)),
    }));
  const removeAttachment = (idx) =>
    setForm(f => ({
      ...f,
      attachmentsMeta: f.attachmentsMeta.filter((_, i) => i !== idx),
    }));

  /* ----------- submit ----------- */
  const onSubmit = async (e) => {
    e.preventDefault();

    // minimal validations
    if (!form.borrowerId) return alert("Select a borrower");
    if (!form.productId) return alert("Select a loan product");
    if (!form.principal || Number(form.principal) <= 0) return alert("Enter a principal amount");
    if (!form.durationMonths) return alert("Enter loan duration (months)");

    setSubmitting(true);
    try {
      const payload = {
        // core
        productId: form.productId,
        borrowerId: form.borrowerId,
        loanNumber: form.loanNumber || null,

        // terms
        amount: form.principal,
        currency: "TZS",
        releaseDate: form.releaseDate || today(),
        durationMonths: form.durationMonths,
        collateralType: form.collateralType || null,
        collateralAmount: form.collateralAmount || null,

        // interest
        interestMethod: form.interestMethod,
        interestRate: form.interestRate || null,
        interestAmount: form.interestAmount || null,

        // fees + repayments + disbursement
        fees: form.fees,
        repaymentCycle: form.repaymentCycle,
        numberOfRepayments: form.numberOfRepayments,
        disbursementMethod: form.disbursementMethod,
        disbursementBankId: form.disbursementBankId || null,
        disbursementReference: form.disbursementReference || null,

        // guarantors
        guarantors: form.guarantors,

        // spouse
        spouse: {
          name: form.spouseName || "",
          occupation: form.spouseOccupation || "",
          idNumber: form.spouseIdNumber || "",
          consentNote: form.spouseConsentNote || "",
          phone: form.spousePhone || "",
        },

        // DB status stays pending on create
        status: "pending",
        statusLabel: form.statusLabel,
      };

      const fd = new FormData();
      fd.append("payload", JSON.stringify(payload));
      // pack files
      for (const meta of form.attachmentsMeta) {
        const file = filesRef.current[meta.fileKey];
        if (file) {
          fd.append("files", file, file.name);
          fd.append("filesMeta", JSON.stringify({ type: meta.type, note: meta.note, name: file.name }));
        }
      }

      const res = await api.post("/loans", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("Loan application submitted");
      navigate(`/loans/${res.data?.id || ""}`);
    } catch (err) {
      console.error(err);
      alert("Failed to submit loan application");
    } finally {
      setSubmitting(false);
    }
  };

  /* ----------- derived ----------- */
  const selectedProduct = useMemo(
    () => productList.find((p) => String(p.id) === String(form.productId)),
    [productList, form.productId]
  );

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Add Loan</h1>
          <p className="text-sm text-gray-500">Follow the steps below. Start by selecting a borrower, then continue down the page.</p>
        </div>
        <Link to="/loans" className="text-indigo-600 hover:underline text-sm">Back to Loans</Link>
      </div>

      {/* single-column guided form */}
      <form onSubmit={onSubmit} className="max-w-6xl mx-auto space-y-5 md:space-y-6">
        {/* 1. Borrower & Product */}
        <section className={card}>
          <div className="flex items-center gap-2 mb-5">
            <Wallet className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold text-lg">1) Borrower & Product</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Borrower first */}
            <div>
              <label className="text-xs text-gray-600">Borrower</label>
              <div className="flex gap-2">
                <select
                  className={`${clsInput} flex-1`}
                  value={form.borrowerId}
                  onChange={(e) => setForm({ ...form, borrowerId: e.target.value })}
                  required
                >
                  <option value="">Select borrower…</option>
                  {borrowerList.map(b => (
                    <option key={b.id} value={b.id}>{b.name} {b.phone ? `— ${b.phone}` : ""}</option>
                  ))}
                </select>
                <Link target="_blank" to="/borrowers/add" className="px-3 py-2 rounded-lg border hover:bg-gray-50 inline-flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" /> Add
                </Link>
              </div>
            </div>

            {/* Product second */}
            <div>
              <label className="text-xs text-gray-600">Loan Product</label>
              <select
                className={clsInput}
                value={form.productId}
                onChange={(e) => {
                  const id = e.target.value;
                  const prod = productList.find((p) => String(p.id) === String(id));
                  setForm({
                    ...form,
                    productId: id,
                    // apply defaults if available
                    interestMethod: prod?.interestMethod || form.interestMethod,
                    interestRate: prod?.interestRate ?? form.interestRate,
                  });
                }}
                required
              >
                <option value="">Select product…</option>
                {productList.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.code ? ` (${p.code})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-600">Loan # (auto)</label>
              <input className={clsInput} value={loadingCounts ? "…" : (form.loanNumber || "—")} readOnly />
            </div>
          </div>
        </section>

        {/* 2. Loan Terms */}
        <section className={card}>
          <div className="flex items-center gap-2 mb-5">
            <Building2 className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold text-lg">2) Loan Terms</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-600">Principal Amount</label>
              <input type="number" className={clsInput} value={form.principal} onChange={(e)=>setForm({...form, principal:e.target.value})} required />
            </div>
            <div>
              <label className="text-xs text-gray-600 flex items-center gap-1"><Calendar className="h-3.5 w-3.5"/> Loan Release Date</label>
              <input type="date" className={clsInput} value={form.releaseDate} onChange={(e)=>setForm({...form, releaseDate:e.target.value})} required />
            </div>
            <div>
              <label className="text-xs text-gray-600">Collateral Type</label>
              <select className={clsInput} value={form.collateralType} onChange={(e)=>setForm({...form, collateralType:e.target.value})}>
                <option value="">Select…</option>
                {COLLATERAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">Collateral Amount</label>
              <input type="number" className={clsInput} value={form.collateralAmount} onChange={(e)=>setForm({...form, collateralAmount:e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-gray-600">Loan Duration (months)</label>
              <input type="number" className={clsInput} value={form.durationMonths} onChange={(e)=>setForm({...form, durationMonths:e.target.value})} required />
            </div>
          </div>
        </section>

        {/* 3. Interest */}
        <section className={card}>
          <div className="flex items-center gap-2 mb-5">
            <Landmark className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold text-lg">3) Interest</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs text-gray-600">Interest Method</label>
              <select className={clsInput} value={form.interestMethod} onChange={(e)=>setForm({...form, interestMethod:e.target.value})}>
                {INTEREST_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">Interest Rate (%)</label>
              <input
                type="number"
                step="0.01"
                className={clsInput}
                value={form.interestRate}
                onChange={(e)=>setForm({...form, interestRate:e.target.value})}
                placeholder={selectedProduct?.interestRate ? String(selectedProduct.interestRate) : "e.g. 3"}
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Interest Amount (optional)</label>
              <input type="number" className={clsInput} value={form.interestAmount} onChange={(e)=>setForm({...form, interestAmount:e.target.value})} />
            </div>
          </div>
        </section>

        {/* 4. Repayments */}
        <section className={card}>
          <div className="flex items-center gap-2 mb-5">
            <Calendar className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold text-lg">4) Repayments</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-600">Repayment Cycle</label>
              <select className={clsInput} value={form.repaymentCycle} onChange={(e)=>setForm({...form, repaymentCycle:e.target.value})}>
                {REPAYMENT_CYCLES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600"># of Repayments</label>
              <input type="number" className={clsInput} value={form.numberOfRepayments} onChange={(e)=>setForm({...form, numberOfRepayments:e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-gray-600">Loan Status (label)</label>
              <select className={clsInput} value={form.statusLabel} onChange={(e)=>setForm({...form, statusLabel:e.target.value})}>
                {STATUS_LABELS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <p className="text-[11px] text-gray-500 mt-1">DB status stays “pending” on create.</p>
            </div>
          </div>
        </section>

        {/* 5. Fees */}
        <section className={card}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <FileUp className="h-5 w-5 text-indigo-600" />
              <h2 className="font-semibold text-lg">5) Loan Fees</h2>
            </div>
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
                  <input className={clsInput} placeholder="Fee name (e.g. Processing)" value={fee.name} onChange={(e)=>updateFee(i, {name: e.target.value})} />
                  <input type="number" className={clsInput} placeholder="Amount" value={fee.amount} onChange={(e)=>updateFee(i, {amount: e.target.value})} />
                  <select className={clsInput} value={fee.paid ? "paid" : "not_paid"} onChange={(e)=>updateFee(i, {paid: e.target.value === "paid"})}>
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

        {/* 6. Guarantors */}
        <section className={card}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-600" />
              <h2 className="font-semibold text-lg">6) Guarantors</h2>
            </div>
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
                    <div className="text-sm font-medium text-gray-800">Guarantor #{i+1}</div>
                    <button type="button" onClick={()=>removeGuarantor(i)} className="p-1 rounded hover:bg-gray-50">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid gap-3">
                    <div>
                      <label className="text-xs text-gray-600">Source</label>
                      <select className={clsInput} value={g.type} onChange={(e)=>updateGuarantor(i, { type: e.target.value })}>
                        <option value="existing">Select from borrowers</option>
                        <option value="manual">Enter manually</option>
                      </select>
                    </div>

                    {g.type === "existing" ? (
                      <div>
                        <label className="text-xs text-gray-600">Borrower</label>
                        <select className={clsInput} value={g.borrowerId || ""} onChange={(e)=>updateGuarantor(i, { borrowerId: e.target.value })}>
                          <option value="">Select borrower…</option>
                          {borrowerList.map(b => <option key={b.id} value={b.id}>{b.name} {b.phone ? `— ${b.phone}` : ""}</option>)}
                        </select>
                      </div>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-3">
                        <input className={clsInput} placeholder="Full name" value={g.name} onChange={(e)=>updateGuarantor(i, {name: e.target.value})}/>
                        <input className={clsInput} placeholder="Occupation" value={g.occupation} onChange={(e)=>updateGuarantor(i, {occupation: e.target.value})}/>
                        <input className={clsInput} placeholder="Residence" value={g.residence} onChange={(e)=>updateGuarantor(i, {residence: e.target.value})}/>
                        <input className={clsInput} placeholder="Contacts" value={g.contacts} onChange={(e)=>updateGuarantor(i, {contacts: e.target.value})}/>
                        <input className={clsInput} placeholder="Verification (ID #, etc.)" value={g.verification} onChange={(e)=>updateGuarantor(i, {verification: e.target.value})}/>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 7. Attachments */}
        <section className={card}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-indigo-600" />
              <h2 className="font-semibold text-lg">7) Attachments</h2>
            </div>
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
              ].map((lbl) => (
                <button
                  key={lbl}
                  type="button"
                  onClick={() => addAttachment(lbl)}
                  className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
                >
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
                    <input
                      className={clsInput}
                      value={a.type}
                      onChange={(e)=>updateAttachment(i, { type: e.target.value })}
                    />
                    <input
                      className={clsInput}
                      placeholder="Note (optional)"
                      value={a.note}
                      onChange={(e)=>updateAttachment(i, { note: e.target.value })}
                    />
                  </div>
                  <input
                    type="file"
                    className={clsInput}
                    onChange={(e)=>setFile(a.fileKey, e.target.files?.[0])}
                  />
                  <button type="button" onClick={()=>removeAttachment(i)} className="p-2 rounded hover:bg-gray-50">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-2">Accepted images/PDFs as supported by your backend.</p>
        </section>

        {/* 8. Disbursement */}
        <section className={card}>
          <div className="flex items-center gap-2 mb-5">
            <Wallet className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold text-lg">8) Disbursement</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-600">Method</label>
              <select className={clsInput} value={form.disbursementMethod} onChange={(e)=>setForm({...form, disbursementMethod:e.target.value})}>
                {DISBURSE_METHODS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            {form.disbursementMethod === "bank" && (
              <>
                <div>
                  <label className="text-xs text-gray-600">Bank</label>
                  <select className={clsInput} value={form.disbursementBankId} onChange={(e)=>setForm({...form, disbursementBankId:e.target.value})}>
                    <option value="">Select bank…</option>
                    {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-600">Reference (optional)</label>
                  <input className={clsInput} value={form.disbursementReference} onChange={(e)=>setForm({...form, disbursementReference:e.target.value})} placeholder="Txn ref / slip #" />
                </div>
              </>
            )}
          </div>
        </section>

        {/* 9. Spouse (optional) */}
        <section className={card}>
          <div className="flex items-center gap-2 mb-5">
            <User className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold text-lg">9) Spouse (optional)</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <input className={clsInput} placeholder="Name" value={form.spouseName} onChange={(e)=>setForm({...form, spouseName:e.target.value})} />
            <input className={clsInput} placeholder="Occupation" value={form.spouseOccupation} onChange={(e)=>setForm({...form, spouseOccupation:e.target.value})} />
            <input className={clsInput} placeholder="ID Number" value={form.spouseIdNumber} onChange={(e)=>setForm({...form, spouseIdNumber:e.target.value})} />
            <input className={clsInput} placeholder="Phone" value={form.spousePhone} onChange={(e)=>setForm({...form, spousePhone:e.target.value})} />
            <div className="md:col-span-2">
              <textarea className={`${clsInput} min-h-[84px]`} placeholder="Consent / declaration note" value={form.spouseConsentNote} onChange={(e)=>setForm({...form, spouseConsentNote:e.target.value})}/>
            </div>
          </div>
        </section>

        {/* sticky bottom actions */}
        <div className="sticky bottom-0 inset-x-0 z-20 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-t">
          <div className="max-w-6xl mx-auto px-4 py-3 flex justify-end gap-3">
            <Link to="/loans" className="px-4 py-2 rounded-xl border hover:bg-gray-50">Cancel</Link>
            <button
              disabled={submitting}
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            >
              <Save className="h-4 w-4"/>
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
