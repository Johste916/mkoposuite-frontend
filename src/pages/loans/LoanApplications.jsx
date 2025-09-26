// src/pages/loans/LoanApplications.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api";
import {
  Save, PlusCircle, X, Calendar, User, FileUp, Upload, Building2, Landmark, Wallet, ShieldCheck,
} from "lucide-react";

/* ---------------- helpers ---------------- */
const today = () => new Date().toLocaleDateString("en-CA"); // local YYYY-MM-DD
const clsInput = "input text-black dark:text-white placeholder-black/60 dark:placeholder-white/70";

/* Stronger, high-contrast borders & dividers */
const strongBorder = "border-2 border-black/20 dark:border-white/30";
const strongRing = "ring-2 ring-black/10 dark:ring-white/20";
const strongDivide = "divide-y-2 divide-black/10 dark:divide-white/20";

/* Card shell with stronger borders */
const card = `bg-white dark:bg-slate-900/40 rounded-2xl shadow-sm ${strongRing} ${strongBorder} p-5 md:p-7`;

/* Table-like row container for lists */
const rowShell = "grid items-center gap-3 p-3 md:p-4";
const listShell = `rounded-xl overflow-hidden ${strongBorder}`;
const listHead =
  "bg-slate-50/80 dark:bg-slate-800/60 text-xs font-bold text-black dark:text-white grid gap-3 p-3 md:p-3.5";
const listBody = `${strongDivide}`;

/* normalize any backend list shape to an array */
const toArray = (data) =>
  Array.isArray(data) ? data
  : Array.isArray(data?.items) ? data.items
  : Array.isArray(data?.rows) ? data.rows
  : Array.isArray(data?.results) ? data.results
  : [];

/* money format helpers (commas while typing) */
const unformatMoney = (v) => (v ?? "").toString().replace(/[^\d.]/g, "");
const formatMoney = (v) => {
  const s = unformatMoney(v);
  if (!s) return "";
  const [int, dec] = s.split(".");
  const withCommas = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return dec ? `${withCommas}.${dec.slice(0, 2)}` : withCommas;
};
const currency = (n) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Number(n || 0));

/* try many possible shapes for principal bounds coming from products */
const getPrincipalBounds = (p = {}) => {
  const pick = (...keys) => keys.map((k) => k.split(".").reduce((o, kk) => (o ? o[kk] : undefined), p)).find((v) => v != null);
  const min =
    pick("minPrincipal", "minimumPrincipal", "minAmount", "minimumAmount", "rules.principal.min", "limits.principal.min") ??
    pick("principalMin", "amountMin", "rules.amount.min");
  const max =
    pick("maxPrincipal", "maximumPrincipal", "maxAmount", "maximumAmount", "rules.principal.max", "limits.principal.max") ??
    pick("principalMax", "amountMax", "rules.amount.max");
  const toNum = (v) => (v == null || v === "" ? null : Number(v));
  const minN = toNum(min);
  const maxN = toNum(max);
  return {
    min: Number.isFinite(minN) ? minN : null,
    max: Number.isFinite(maxN) ? maxN : null,
  };
};

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

const MOBILE_PROVIDERS = [
  { value: "mpesa", label: "M-Pesa" },
  { value: "tigopesa", label: "Tigo Pesa" },
  { value: "airtelmoney", label: "Airtel Money" },
  { value: "halopesa", label: "HaloPesa" },
  { value: "ttclpesa", label: "TTCL Pesa" },
  { value: "other", label: "Other" },
];

const STATUS_LABELS = ["new loan", "open", "top-up", "defaulted"];

const MARITAL_STATUSES = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "divorced", label: "Divorced" },
  { value: "widow", label: "Widow" },
  { value: "widower", label: "Widower" },
  { value: "not_specified", label: "Not specified" },
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
    loanNumber: "",
    principal: "",            // formatted with commas in UI
    releaseDate: today(),
    durationMonths: "",
    collateralType: "",
    collateralAmount: "",     // formatted with commas in UI
    collateralOther: "",
    interestMethod: "flat",
    interestRate: "",         // auto from product; readOnly if provided
    interestAmount: "",       // formatted with commas in UI
    fees: [],                 // each fee.amount formatted with commas in UI
    repaymentCycle: "monthly",
    numberOfRepayments: "",
    statusLabel: "new loan",
    disbursementMethod: "cash",
    disbursementBankId: "",
    disbursementReference: "",
    mobileProvider: "",
    mobileProviderOther: "",
    mobilePhone: "",
    disbursementOther: "",
    disbursementOtherDetails: "",
    maritalStatus: "not_specified",
    spouseName: "",
    spouseOccupation: "",
    spouseIdNumber: "",
    spousePhone: "",
    attachmentsMeta: [],
    guarantors: [],
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
      } catch {
        setProducts([]);
        setBorrowers([]);
      }
      try {
        const r = await api.get("/banks");
        setBanks(toArray(r.data));
      } catch {
        setBanks([]);
      }
    })();
  }, []);

  const productList = useMemo(() => (Array.isArray(products) ? products : []), [products]);
  const borrowerList = useMemo(() => (Array.isArray(borrowers) ? borrowers : []), [borrowers]);

  /* ----------- compute loan # when borrower changes ----------- */
  useEffect(() => {
    if (!form.borrowerId) return;
    setLoadingCounts(true);
    (async () => {
      try {
        let total = 0;
        try {
          const r = await api.get(`/borrowers/${form.borrowerId}/loans`);
          total = Array.isArray(r.data) ? r.data.length : r.data?.items?.length || 0;
        } catch {
          const r2 = await api.get("/loans", { params: { borrowerId: form.borrowerId, page: 1, pageSize: 1 } });
          total = r2.data?.total || 0;
        }
        const next = (total + 1).toString().padStart(3, "0");
        setForm((f) => ({ ...f, loanNumber: next }));
      } catch {
        setForm((f) => ({ ...f, loanNumber: "" }));
      } finally {
        setLoadingCounts(false);
      }
    })();
  }, [form.borrowerId]);

  /* ----------- auto-calc numberOfRepayments ----------- */
  useEffect(() => {
    if (form.repaymentCycle === "custom") return;
    const cycle = REPAYMENT_CYCLES.find((c) => c.value === form.repaymentCycle);
    const months = Number(form.durationMonths || 0);
    if (!cycle || months <= 0) return;
    const count = months * (cycle.perMonth || 1);
    setForm((f) => ({ ...f, numberOfRepayments: String(count) }));
  }, [form.repaymentCycle, form.durationMonths]);

  /* ----------- attachments helpers ----------- */
  const addAttachment = (typeLabel) => {
    const key = Math.random().toString(36).slice(2);
    setForm((f) => ({
      ...f,
      attachmentsMeta: [...f.attachmentsMeta, { type: typeLabel || "other", note: "", fileKey: key }],
    }));
  };
  const setFile = (fileKey, file) => {
    if (!file) delete filesRef.current[fileKey];
    else filesRef.current[fileKey] = file;
  };
  const updateAttachment = (idx, patch) =>
    setForm((f) => ({
      ...f,
      attachmentsMeta: f.attachmentsMeta.map((a, i) => (i === idx ? { ...a, ...patch } : a)),
    }));
  const removeAttachment = (idx) =>
    setForm((f) => {
      const toRemove = f.attachmentsMeta[idx];
      if (toRemove?.fileKey) delete filesRef.current[toRemove.fileKey];
      return { ...f, attachmentsMeta: f.attachmentsMeta.filter((_, i) => i !== idx) };
    });

  const findSpouseConsentMetaIndex = () =>
    form.attachmentsMeta.findIndex(
      (a) => String(a.type || "").toLowerCase() === "spouse: consent declaration"
    );

  /* ----------- fees handlers ----------- */
  const addFee = () => setForm((f) => ({ ...f, fees: [...f.fees, { name: "", amount: "", paid: false }] }));
  const updateFee = (idx, patch) =>
    setForm((f) => ({
      ...f,
      fees: f.fees.map((x, i) =>
        i === idx
          ? { ...x, ...patch, ...(patch.amount !== undefined ? { amount: formatMoney(patch.amount) } : {}) }
          : x
      ),
    }));
  const removeFee = (idx) => setForm((f) => ({ ...f, fees: f.fees.filter((_, i) => i !== idx) }));

  /* ----------- guarantors handlers ----------- */
  const addGuarantor = () =>
    setForm((f) => ({
      ...f,
      guarantors: [
        ...f.guarantors,
        {
          type: "existing",
          borrowerId: "",
          name: "",
          occupation: "",
          residence: "",
          contacts: "",
          verification: "",
        },
      ],
    }));
  const updateGuarantor = (idx, patch) =>
    setForm((f) => ({ ...f, guarantors: f.guarantors.map((g, i) => (i === idx ? { ...g, ...patch } : g)) }));
  const removeGuarantor = (idx) =>
    setForm((f) => ({ ...f, guarantors: f.guarantors.filter((_, i) => i !== idx) }));

  /* ----------- selected product + bounds ----------- */
  const selectedProduct = useMemo(
    () => productList.find((p) => String(p.id) === String(form.productId)),
    [productList, form.productId]
  );
  const principalBounds = useMemo(() => getPrincipalBounds(selectedProduct), [selectedProduct]);

  // When product changes: auto-pick interest method & rate.
  const onSelectProduct = (id) => {
    const prod = productList.find((p) => String(p.id) === String(id));
    setForm((prev) => ({
      ...prev,
      productId: id,
      interestMethod: prod?.interestMethod || prev.interestMethod,
      interestRate: prod?.interestRate ?? "",
    }));
  };

  const ensureSpouseConsentAttachment = () => {
    const idx = findSpouseConsentMetaIndex();
    if (idx === -1) addAttachment("Spouse: Consent declaration");
  };

  /* ----------- submit ----------- */
  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.borrowerId) return alert("Select a borrower");
    if (!form.productId) return alert("Select a loan product");

    const principalNum = Number(unformatMoney(form.principal));
    if (!principalNum || principalNum <= 0) return alert("Enter a principal amount");
    // NEW: principal bounds validation
    if (principalBounds.min != null && principalNum < principalBounds.min) {
      return alert(`Principal below minimum (min TZS ${currency(principalBounds.min)}).`);
    }
    if (principalBounds.max != null && principalNum > principalBounds.max) {
      return alert(`Principal above maximum (max TZS ${currency(principalBounds.max)}).`);
    }

    if (!form.durationMonths) return alert("Enter loan duration (months)");

    if (form.collateralType === "Other" && !form.collateralOther.trim()) {
      return alert("Please specify the collateral for 'Other'.");
    }
    if (form.disbursementMethod === "other" && !form.disbursementOther.trim()) {
      return alert("Please specify the disbursement method for 'Other'.");
    }
    if (form.disbursementMethod === "mobile_money") {
      if (!form.mobileProvider) return alert("Select a mobile money provider.");
      if (form.mobileProvider === "other" && !form.mobileProviderOther.trim()) {
        return alert("Please specify the mobile money provider.");
      }
      if (!form.mobilePhone.trim()) return alert("Enter the mobile money phone number.");
      const digits = form.mobilePhone.replace(/\D/g, "");
      if (digits.length < 9 || digits.length > 15) return alert("Mobile money phone number looks invalid.");
    }
    if (form.maritalStatus === "married") {
      const i = findSpouseConsentMetaIndex();
      const meta = i >= 0 ? form.attachmentsMeta[i] : null;
      const fileAttached = meta ? !!filesRef.current[meta.fileKey] : false;
      if (!fileAttached) return alert("Please attach the spouse consent declaration (signed).");
    }

    setSubmitting(true);
    try {
      const foldedCollateralType =
        form.collateralType === "Other" && form.collateralOther.trim()
          ? `Other: ${form.collateralOther.trim()}`
          : form.collateralType || null;

      // fold disbursement details into reference
      let disbursementReference = form.disbursementReference?.trim() || "";
      if (form.disbursementMethod === "mobile_money") {
        const providerLabel =
          form.mobileProvider === "other"
            ? form.mobileProviderOther.trim()
            : MOBILE_PROVIDERS.find((p) => p.value === form.mobileProvider)?.label || form.mobileProvider;
        const parts = [
          `Provider: ${providerLabel}`,
          `Phone: ${form.mobilePhone.trim()}`,
          disbursementReference ? `Ref: ${disbursementReference}` : null,
        ].filter(Boolean);
        disbursementReference = parts.join(" | ");
      } else if (form.disbursementMethod === "other") {
        const parts = [
          `Method: ${form.disbursementOther.trim()}`,
          form.disbursementOtherDetails?.trim() ? `Details: ${form.disbursementOtherDetails.trim()}` : null,
          disbursementReference ? `Ref: ${disbursementReference}` : null,
        ].filter(Boolean);
        disbursementReference = parts.join(" | ");
      }

      const payload = {
        productId: form.productId,
        borrowerId: form.borrowerId,
        loanNumber: form.loanNumber || null,
        amount: unformatMoney(form.principal),
        currency: "TZS",
        releaseDate: form.releaseDate || today(),
        durationMonths: String(form.durationMonths).trim(),
        collateralType: foldedCollateralType,
        collateralAmount: unformatMoney(form.collateralAmount) || null,
        interestMethod: form.interestMethod,
        interestRate: form.interestRate || null,
        interestAmount: unformatMoney(form.interestAmount) || null,
        fees: form.fees.map((f) => ({ ...f, amount: unformatMoney(f.amount) })),
        repaymentCycle: form.repaymentCycle,
        numberOfRepayments: String(form.numberOfRepayments || "").trim(),
        disbursementMethod: form.disbursementMethod,
        disbursementBankId: form.disbursementMethod === "bank" ? form.disbursementBankId || null : null,
        disbursementReference: disbursementReference || null,
        spouse:
          form.maritalStatus === "married"
            ? {
                name: form.spouseName || "",
                occupation: form.spouseOccupation || "",
                idNumber: form.spouseIdNumber || "",
                phone: form.spousePhone || "",
              }
            : undefined,
        status: "pending",
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
      alert("Loan application submitted");
      navigate(`/loans/${res.data?.id || ""}`);
    } catch {
      alert("Failed to submit loan application");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 text-black dark:text-white">
      {/* header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Add Loan</h1>
          <p className="text-sm">Follow the steps below. Start by selecting a borrower, then continue down the page.</p>
        </div>
        <Link to="/loans" className="text-black underline text-sm font-semibold">
          Back to Loans
        </Link>
      </div>

      {/* single-column guided form */}
      <form onSubmit={onSubmit} className="max-w-6xl mx-auto space-y-5 md:space-y-6">
        {/* 1) Borrower & Product */}
        <section className={card}>
          <div className="flex items-center gap-2 pb-4 mb-5 border-b-2 border-black/20 dark:border-white/20">
            <Wallet className="h-5 w-5 text-black dark:text-white" />
            <h2 className="font-bold text-lg">1) Borrower & Product</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold">Borrower</label>
              <div className="flex gap-2">
                <select
                  className={`${clsInput} flex-1`}
                  value={form.borrowerId}
                  onChange={(e) => setForm({ ...form, borrowerId: e.target.value })}
                  required
                >
                  <option value="">Select borrower…</option>
                  {borrowerList.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.phone ? `— ${b.phone}` : ""}
                    </option>
                  ))}
                </select>
                <Link
                  target="_blank"
                  to="/borrowers/add"
                  className={`px-3 py-2 rounded-lg hover:bg-gray-50 inline-flex items-center gap-2 ${strongBorder}`}
                >
                  <PlusCircle className="h-4 w-4" /> Add
                </Link>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold">Loan Product</label>
              <select
                className={clsInput}
                value={form.productId}
                onChange={(e) => onSelectProduct(e.target.value)}
                required
              >
                <option value="">Select product…</option>
                {productList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.code ? ` (${p.code})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold">Loan # (auto)</label>
              <input className={clsInput} value={loadingCounts ? "…" : form.loanNumber || "—"} readOnly />
            </div>
          </div>
        </section>

        {/* 2) Loan Terms */}
        <section className={card}>
          <div className="flex items-center gap-2 pb-4 mb-5 border-b-2 border-black/20 dark:border-white/20">
            <Building2 className="h-5 w-5 text-black dark:text-white" />
            <h2 className="font-bold text-lg">2) Loan Terms</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold">Principal Amount</label>
              <input
                type="text"
                inputMode="numeric"
                className={clsInput}
                value={form.principal}
                onChange={(e) => setForm({ ...form, principal: formatMoney(e.target.value) })}
                placeholder="e.g. 1,000,000"
                required
              />
              {/* Bounds hint */}
              {selectedProduct && (principalBounds.min != null || principalBounds.max != null) && (
                <p className="text-[11px] mt-1">
                  {principalBounds.min != null && <>Min: TZS {currency(principalBounds.min)}</>}
                  {principalBounds.min != null && principalBounds.max != null && " • "}
                  {principalBounds.max != null && <>Max: TZS {currency(principalBounds.max)}</>}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Loan Release Date
              </label>
              <input
                type="date"
                className={clsInput}
                value={form.releaseDate}
                onChange={(e) => setForm({ ...form, releaseDate: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold">Collateral Type</label>
              <select
                className={clsInput}
                value={form.collateralType}
                onChange={(e) => setForm({ ...form, collateralType: e.target.value })}
              >
                <option value="">Select…</option>
                {COLLATERAL_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {form.collateralType === "Other" && (
                <div className="mt-2">
                  <input
                    className={clsInput}
                    placeholder="Specify collateral"
                    value={form.collateralOther}
                    onChange={(e) => setForm({ ...form, collateralOther: e.target.value })}
                    required
                  />
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold">Collateral Amount</label>
              <input
                type="text"
                inputMode="numeric"
                className={clsInput}
                value={form.collateralAmount}
                onChange={(e) => setForm({ ...form, collateralAmount: formatMoney(e.target.value) })}
                placeholder="e.g. 500,000"
              />
            </div>
            <div>
              <label className="text-xs font-semibold">Loan Duration (months)</label>
              <input
                type="number"
                inputMode="numeric"
                className={clsInput}
                value={form.durationMonths}
                onChange={(e) => setForm({ ...form, durationMonths: e.target.value })}
                required
              />
            </div>
          </div>
        </section>

        {/* 3) Interest */}
        <section className={card}>
          <div className="flex items-center gap-2 pb-4 mb-5 border-b-2 border-black/20 dark:border-white/20">
            <Landmark className="h-5 w-5 text-black dark:text-white" />
            <h2 className="font-bold text-lg">3) Interest</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold">Interest Method</label>
              <select
                className={clsInput}
                value={form.interestMethod}
                onChange={(e) => setForm({ ...form, interestMethod: e.target.value })}
              >
                {INTEREST_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold">Interest Rate (%)</label>
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                className={clsInput}
                value={form.interestRate}
                onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                placeholder={selectedProduct?.interestRate ? String(selectedProduct.interestRate) : "e.g. 3"}
                readOnly={selectedProduct?.interestRate !== undefined && selectedProduct?.interestRate !== null}
              />
              {selectedProduct?.interestRate != null && (
                <p className="text-[11px] mt-1">Auto-picked from product.</p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold">Interest Amount (optional)</label>
              <input
                type="text"
                inputMode="numeric"
                className={clsInput}
                value={form.interestAmount}
                onChange={(e) => setForm({ ...form, interestAmount: formatMoney(e.target.value) })}
                placeholder="e.g. 120,000"
              />
            </div>
          </div>
        </section>

        {/* 4) Repayments */}
        <section className={card}>
          <div className="flex items-center gap-2 pb-4 mb-5 border-b-2 border-black/20 dark:border-white/20">
            <Calendar className="h-5 w-5 text-black dark:text-white" />
            <h2 className="font-bold text-lg">4) Repayments</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold">Repayment Cycle</label>
              <select
                className={clsInput}
                value={form.repaymentCycle}
                onChange={(e) => setForm({ ...form, repaymentCycle: e.target.value })}
              >
                {REPAYMENT_CYCLES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold"># of Repayments</label>
              <input
                type="number"
                inputMode="numeric"
                className={clsInput}
                value={form.numberOfRepayments}
                onChange={(e) => setForm({ ...form, numberOfRepayments: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold">Loan Status (label)</label>
              <select
                className={clsInput}
                value={form.statusLabel}
                onChange={(e) => setForm({ ...form, statusLabel: e.target.value })}
              >
                {STATUS_LABELS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <p className="text-[11px] mt-1">DB status stays “pending” on create.</p>
            </div>
          </div>
        </section>

        {/* 5) Fees */}
        <section className={card}>
          <div className="flex items-center justify-between pb-4 mb-5 border-b-2 border-black/20 dark:border-white/20">
            <div className="flex items-center gap-2">
              <FileUp className="h-5 w-5 text-black dark:text-white" />
              <h2 className="font-bold text-lg">5) Loan Fees</h2>
            </div>
            <button
              type="button"
              onClick={addFee}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 ${strongBorder}`}
            >
              <PlusCircle className="h-4 w-4" /> Add Fee
            </button>
          </div>

          {form.fees.length === 0 ? (
            <p className="text-sm">No fees added.</p>
          ) : (
            <div className={listShell}>
              <div className={`${listHead} grid-cols-[2fr_1fr_1fr_40px] ${strongBorder}`}>
                <div>Fee Name</div>
                <div>Amount</div>
                <div>Status</div>
                <div className="text-right pr-1">—</div>
              </div>
              <div className={listBody}>
                {form.fees.map((fee, i) => (
                  <div key={i} className={`${rowShell} grid-cols-[2fr_1fr_1fr_40px]`}>
                    <input
                      className={clsInput}
                      placeholder="Fee name (e.g. Processing)"
                      value={fee.name}
                      onChange={(e) => updateFee(i, { name: e.target.value })}
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      className={clsInput}
                      placeholder="Amount"
                      value={fee.amount}
                      onChange={(e) => updateFee(i, { amount: e.target.value })}
                    />
                    <select
                      className={clsInput}
                      value={fee.paid ? "paid" : "not_paid"}
                      onChange={(e) => updateFee(i, { paid: e.target.value === "paid" })}
                    >
                      <option value="paid">Paid</option>
                      <option value="not_paid">Not paid</option>
                    </select>
                    <button type="button" onClick={() => removeFee(i)} className="p-2 rounded hover:bg-gray-50" aria-label="Remove fee">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs mt-2">Unpaid fees will be included in the repayment schedule.</p>
        </section>

        {/* 6) Guarantors */}
        <section className={card}>
          <div className="flex items-center justify-between pb-4 mb-5 border-b-2 border-black/20 dark:border-white/20">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-black dark:text-white" />
              <h2 className="font-bold text-lg">6) Guarantors</h2>
            </div>
            <button
              type="button"
              onClick={addGuarantor}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 ${strongBorder}`}
            >
              <PlusCircle className="h-4 w-4" /> Add Guarantor
            </button>
          </div>

          {form.guarantors.length === 0 ? (
            <p className="text-sm">No guarantors added.</p>
          ) : (
            <div className="space-y-4">
              {form.guarantors.map((g, i) => (
                <div key={i} className={`rounded-xl p-3 md:p-4 space-y-3 ${strongBorder}`}>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold">Guarantor #{i + 1}</div>
                    <button type="button" onClick={() => removeGuarantor(i)} className="p-1 rounded hover:bg-gray-50" aria-label="Remove guarantor">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid gap-3">
                    <div>
                      <label className="text-xs font-semibold">Source</label>
                      <select className={clsInput} value={g.type} onChange={(e) => updateGuarantor(i, { type: e.target.value })}>
                        <option value="existing">Select from borrowers</option>
                        <option value="manual">Enter manually</option>
                      </select>
                    </div>

                    {g.type === "existing" ? (
                      <div>
                        <label className="text-xs font-semibold">Borrower</label>
                        <select
                          className={clsInput}
                          value={g.borrowerId || ""}
                          onChange={(e) => updateGuarantor(i, { borrowerId: e.target.value })}
                        >
                          <option value="">Select borrower…</option>
                          {borrowerList.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name} {b.phone ? `— ${b.phone}` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-3">
                        <input className={clsInput} placeholder="Full name" value={g.name} onChange={(e) => updateGuarantor(i, { name: e.target.value })} />
                        <input className={clsInput} placeholder="Occupation" value={g.occupation} onChange={(e) => updateGuarantor(i, { occupation: e.target.value })} />
                        <input className={clsInput} placeholder="Residence" value={g.residence} onChange={(e) => updateGuarantor(i, { residence: e.target.value })} />
                        <input className={clsInput} placeholder="Contacts" value={g.contacts} onChange={(e) => updateGuarantor(i, { contacts: e.target.value })} />
                        <input className={clsInput} placeholder="Verification (ID #, etc.)" value={g.verification} onChange={(e) => updateGuarantor(i, { verification: e.target.value })} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 7) Attachments */}
        <section className={card}>
          <div className="flex items-center justify-between pb-4 mb-5 border-b-2 border-black/20 dark:border-white/20">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-black dark:text-white" />
              <h2 className="font-bold text-lg">7) Attachments</h2>
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
                "Spouse: Consent declaration",
                "Other",
              ].map((lbl) => (
                <button
                  key={lbl}
                  type="button"
                  onClick={() => addAttachment(lbl)}
                  className={`text-xs px-2 py-1 rounded hover:bg-gray-50 ${strongBorder}`}
                >
                  + {lbl.replace(/Borrower: |Guarantor: |Spouse: /g, "")}
                </button>
              ))}
            </div>
          </div>

          {form.attachmentsMeta.length === 0 ? (
            <p className="text-sm">No files attached.</p>
          ) : (
            <div className={listShell}>
              <div className={`${listHead} grid-cols-[2fr_1fr_40px] ${strongBorder}`}>
                <div>Type & Note</div>
                <div>File</div>
                <div className="text-right pr-1">—</div>
              </div>
              <div className={listBody}>
                {form.attachmentsMeta.map((a, i) => (
                  <div key={a.fileKey} className={`${rowShell} grid-cols-[2fr_1fr_40px]`}>
                    <div className="grid gap-2">
                      <input
                        className={clsInput}
                        value={a.type}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            attachmentsMeta: f.attachmentsMeta.map((x, idx) =>
                              idx === i ? { ...x, type: e.target.value } : x
                            ),
                          }))
                        }
                      />
                      <input
                        className={clsInput}
                        placeholder="Note (optional)"
                        value={a.note}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            attachmentsMeta: f.attachmentsMeta.map((x, idx) =>
                              idx === i ? { ...x, note: e.target.value } : x
                            ),
                          }))
                        }
                      />
                    </div>
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      className={clsInput}
                      onChange={(e) => setFile(a.fileKey, e.target.files?.[0])}
                    />
                    <button type="button" onClick={() => removeAttachment(i)} className="p-2 rounded hover:bg-gray-50" aria-label="Remove attachment">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs mt-2">Accepted images/PDFs as supported by your backend.</p>
        </section>

        {/* 8) Disbursement */}
        <section className={card}>
          <div className="flex items-center gap-2 pb-4 mb-5 border-b-2 border-black/20 dark:border-white/20">
            <Wallet className="h-5 w-5 text-black dark:text-white" />
            <h2 className="font-bold text-lg">8) Disbursement</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold">Method</label>
              <select
                className={clsInput}
                value={form.disbursementMethod}
                onChange={(e) => {
                  const method = e.target.value;
                  setForm({
                    ...form,
                    disbursementMethod: method,
                    disbursementBankId: "",
                    mobileProvider: "",
                    mobileProviderOther: "",
                    mobilePhone: "",
                    disbursementOther: "",
                    disbursementOtherDetails: "",
                  });
                }}
              >
                {DISBURSE_METHODS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold">Reference (optional)</label>
              <input
                className={clsInput}
                value={form.disbursementReference}
                onChange={(e) => setForm({ ...form, disbursementReference: e.target.value })}
                placeholder="Txn ref / slip #"
              />
            </div>

            {form.disbursementMethod === "bank" && (
              <div className="md:col-span-2">
                <label className="text-xs font-semibold">Bank</label>
                <div className="flex gap-2">
                  <select
                    className={`${clsInput} flex-1`}
                    value={form.disbursementBankId}
                    onChange={(e) => setForm({ ...form, disbursementBankId: e.target.value })}
                  >
                    <option value="">Select bank…</option>
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  <Link
                    to="/banks/add"
                    target="_blank"
                    className={`px-3 py-2 rounded-lg hover:bg-gray-50 inline-flex items-center gap-2 ${strongBorder}`}
                  >
                    <PlusCircle className="h-4 w-4" /> Add
                  </Link>
                  <Link to="/banks" target="_blank" className={`px-3 py-2 rounded-lg hover:bg-gray-50 ${strongBorder}`}>
                    Manage
                  </Link>
                </div>
                {banks.length === 0 && (
                  <p className="text-[11px] mt-1">No banks found. Use “Add” to register banks; this list is tenant-scoped via your API.</p>
                )}
              </div>
            )}

            {form.disbursementMethod === "mobile_money" && (
              <>
                <div>
                  <label className="text-xs font-semibold">Provider</label>
                  <select
                    className={clsInput}
                    value={form.mobileProvider}
                    onChange={(e) => setForm({ ...form, mobileProvider: e.target.value })}
                  >
                    <option value="">Select provider…</option>
                    {MOBILE_PROVIDERS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                  {form.mobileProvider === "other" && (
                    <div className="mt-2">
                      <input
                        className={clsInput}
                        placeholder="Specify provider"
                        value={form.mobileProviderOther}
                        onChange={(e) => setForm({ ...form, mobileProviderOther: e.target.value })}
                        required
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold">Phone Number</label>
                  <input
                    className={clsInput}
                    placeholder="e.g. 07xxxxxxxx or +2557xxxxxxxx"
                    value={form.mobilePhone}
                    onChange={(e) => setForm({ ...form, mobilePhone: e.target.value })}
                  />
                </div>
              </>
            )}

            {form.disbursementMethod === "other" && (
              <>
                <div>
                  <label className="text-xs font-semibold">Specify method</label>
                  <input
                    className={clsInput}
                    placeholder="e.g., cheque, voucher, petty cash"
                    value={form.disbursementOther}
                    onChange={(e) => setForm({ ...form, disbursementOther: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold">Details (optional)</label>
                  <input
                    className={clsInput}
                    placeholder="Instructions / place of collection"
                    value={form.disbursementOtherDetails}
                    onChange={(e) => setForm({ ...form, disbursementOtherDetails: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>
        </section>

        {/* 9) Marital status & Spouse */}
        <section className={card}>
          <div className="flex items-center gap-2 pb-4 mb-5 border-b-2 border-black/20 dark:border-white/20">
            <User className="h-5 w-5 text-black dark:text-white" />
            <h2 className="font-bold text-lg">9) Marital Status & Spouse</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold">Marital Status</label>
              <select
                className={clsInput}
                value={form.maritalStatus}
                onChange={(e) => setForm({ ...form, maritalStatus: e.target.value })}
              >
                {MARITAL_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="hidden md:block" />
            {form.maritalStatus === "married" && (
              <>
                <input className={clsInput} placeholder="Spouse Name" value={form.spouseName} onChange={(e) => setForm({ ...form, spouseName: e.target.value })} />
                <input className={clsInput} placeholder="Spouse Occupation" value={form.spouseOccupation} onChange={(e) => setForm({ ...form, spouseOccupation: e.target.value })} />
                <input className={clsInput} placeholder="Spouse ID Number" value={form.spouseIdNumber} onChange={(e) => setForm({ ...form, spouseIdNumber: e.target.value })} />
                <input className={clsInput} placeholder="Spouse Phone" value={form.spousePhone} onChange={(e) => setForm({ ...form, spousePhone: e.target.value })} />

                <div className={`md:col-span-2 rounded-xl p-3 ${strongBorder}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-bold">Spouse Consent Declaration (signed)</div>
                    <button type="button" onClick={ensureSpouseConsentAttachment} className={`text-xs px-2 py-1 rounded hover:bg-gray-50 ${strongBorder}`}>
                      + Add consent upload
                    </button>
                  </div>
                  {(() => {
                    const idx = findSpouseConsentMetaIndex();
                    if (idx === -1) return <p className="text-xs">Click “Add consent upload” to attach the signed declaration.</p>;
                    const meta = form.attachmentsMeta[idx];
                    return (
                      <div className={`${rowShell} grid-cols-[2fr_1fr_40px] p-0`}>
                        <div className="grid gap-2 p-3">
                          <input className={clsInput} value={meta.type} readOnly />
                          <input className={clsInput} placeholder="Note (optional)" value={meta.note} onChange={(e) => updateAttachment(idx, { note: e.target.value })} />
                        </div>
                        <div className="p-3">
                          <input type="file" accept="application/pdf,image/*" className={clsInput} onChange={(e) => setFile(meta.fileKey, e.target.files?.[0])} />
                        </div>
                        <div className="p-3">
                          <button type="button" onClick={() => removeAttachment(idx)} className="p-2 rounded hover:bg-gray-50" aria-label="Remove spouse consent">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                  <p className="text-[11px] mt-2">This replaces the old text field. Upload the signed consent form here.</p>
                </div>
              </>
            )}
          </div>
        </section>

        {/* sticky bottom actions */}
        <div className="sticky bottom-0 inset-x-0 z-20 bg-white/90 backdrop-blur border-t-2 border-black/20">
          <div className="max-w-6xl mx-auto px-4 py-3 flex justify-end gap-3">
            <Link to="/loans" className={`px-4 py-2 rounded-xl hover:bg-gray-50 ${strongBorder}`}>
              Cancel
            </Link>
            <button
              disabled={submitting}
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black text-white hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
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
