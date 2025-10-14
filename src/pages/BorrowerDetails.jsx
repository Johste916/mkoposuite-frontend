// BorrowerDetails.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { getUserRole } from "../utils/auth";
import LoanScheduleModal from "../components/LoanScheduleModal";
import RepaymentModal from "../components/RepaymentModal";
import api from "../api";

/* ---------------- Utilities ---------------- */
const parseNum = (v) => {
  if (v === null || v === undefined) return NaN;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : NaN;
};
const safeNum = (v, d = 0) => {
  const n = parseNum(v);
  return Number.isFinite(n) ? n : d;
};

const money = (v) =>
  `TZS ${safeNum(v).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

/** Default country code for phone normalisation */
const DEFAULT_CC = "+255";
/** Make phone display always start with +country code */
function formatPhoneWithCC(raw, cc = DEFAULT_CC) {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (s.startsWith("+")) return s;
  if (s.startsWith("00")) return `+${s.slice(2)}`;
  // local leading 0 → convert to international
  if (/^0\d{6,}$/.test(s)) return `${cc}${s.slice(1)}`;
  // plain digits without + (e.g. 2557…)
  if (/^\d+$/.test(s)) return `+${s}`;
  return s;
}

const displayName = (b) =>
  firstFilled(
    b?.name,
    [b?.firstName, b?.lastName].filter(Boolean).join(" "),
    b?.fullName,
    b?.customerName,
    b?.businessName
  ) || "—";

const displayBranch = (b) =>
  firstFilled(b?.branchName, b?.Branch?.name, b?.branch?.name, b?.branch) || "—";

const displayOfficer = (b) =>
  firstFilled(b?.officerName, b?.officer?.name, b?.loanOfficer?.name, b?.loanOfficer) || "—";

const initials = (nameLike) => {
  const s = String(nameLike || "").trim();
  if (!s) return "U";
  const p = s.split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || s[0].toUpperCase();
};

/** Status/type chip styling for both borrower/loan statuses & savings tx types */
const chip = (status) => {
  const base =
    "px-2 py-0.5 text-[11px] font-bold uppercase rounded-full border-2 ring-1 ring-inset shadow-sm";
  const s = String(status || "").toLowerCase();

  // Savings transaction types
  if (s === "deposit") return `${base} bg-emerald-100 border-emerald-300 ring-emerald-200 text-emerald-900`;
  if (s === "withdrawal") return `${base} bg-orange-100 border-orange-300 ring-orange-200 text-orange-900`;
  if (s === "charge") return `${base} bg-rose-100 border-rose-300 ring-rose-200 text-rose-900`;
  if (s === "interest") return `${base} bg-indigo-100 border-indigo-300 ring-indigo-200 text-indigo-900`;

  // Loan/borrower statuses
  switch (s) {
    case "pending":
    case "pending_kyc":
      return `${base} bg-amber-100 border-amber-300 ring-amber-200 text-amber-900`;
    case "approved":
      return `${base} bg-emerald-100 border-emerald-300 ring-emerald-200 text-emerald-900`;
    case "rejected":
      return `${base} bg-rose-100 border-rose-300 ring-rose-200 text-rose-900`;
    case "active":
      return `${base} bg-blue-100 border-blue-300 ring-blue-200 text-blue-900`;
    case "inactive":
      return `${base} bg-slate-100 border-slate-300 ring-slate-200 text-slate-900`;
    case "disabled":
      return `${base} bg-slate-100 border-slate-300 ring-slate-200 text-slate-900`;
    case "blacklisted":
      return `${base} bg-red-100 border-red-300 ring-red-200 text-red-900`;
    case "due":
      return `${base} bg-amber-100 border-amber-300 ring-amber-200 text-amber-900`;
    case "overdue":
      return `${base} bg-rose-100 border-rose-300 ring-rose-200 text-rose-900`;
    case "paid":
    case "settled":
      return `${base} bg-emerald-100 border-emerald-300 ring-emerald-200 text-emerald-900`;
    case "disbursed":
    case "pending_disbursement":
      return `${base} bg-cyan-100 border-cyan-300 ring-cyan-200 text-cyan-900`;
    case "closed":
      return `${base} bg-gray-100 border-gray-300 ring-gray-200 text-gray-900`;
    default:
      return `${base} bg-gray-100 border-gray-300 ring-gray-200 text-gray-900`;
  }
};

/* GET with graceful fallbacks (supports AbortSignal) */
const tryGET = async (paths = [], opts = {}) => {
  let lastErr;
  for (const p of paths) {
    try {
      const res = await api.get(p, opts);
      return res?.data;
    } catch (e) {
      lastErr = e;
      // If aborted, stop trying
      if (e?.name === "CanceledError" || e?.message === "canceled") throw e;
    }
  }
  throw lastErr || new Error(`All endpoints failed: ${paths.join(", ")}`);
};

const withTenant = (tenantId, extra = {}) =>
  tenantId ? { ...extra, headers: { ...(extra.headers || {}), "x-tenant-id": tenantId } } : extra;

/* Small visual helpers */
const strongLink =
  "inline-flex items-center gap-1 text-indigo-700 font-bold underline decoration-2 underline-offset-4 hover:text-indigo-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded";

const Card = ({ title, icon, children, className = "" }) => (
  <section
    className={`rounded-2xl border-2 border-slate-400 bg-white shadow-lg p-4 md:p-5 ${className}`}
  >
    {title && (
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tight">{title}</h2>
      </div>
    )}
    {children}
  </section>
);

const Field = ({ label, children }) => (
  <div className="min-w-0">
    <div className="text-[12px] font-semibold uppercase tracking-wider text-slate-900">{label}</div>
    <div className="mt-1 text-[15px] text-slate-900 break-words">
      {isEmpty(children) ? "—" : children}
    </div>
  </div>
);

const DlGrid = ({ items, cols = 3 }) => {
  const colCls = cols === 2 ? "lg:grid-cols-2" : cols === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3";
  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${colCls}`}>
      {items.map((it, i) => (
        <Field key={i} label={it.label}>
          {isEmpty(it.value) ? "—" : it.value}
        </Field>
      ))}
    </div>
  );
};

const PillTabs = ({ tabs, active, onChange }) => (
  <div className="flex flex-wrap gap-2 border-b-2 px-2 pt-2 border-slate-400 bg-white rounded-t-2xl">
    {tabs.map((t) => {
      const is = active === t.key;
      return (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-3 py-1.5 text-sm rounded-full border-2 transition font-semibold ${
            is
              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
              : "bg-white text-slate-900 hover:bg-slate-50 border-slate-400"
          } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400`}
        >
          {t.label}
          {typeof t.count === "number" && (
            <span
              className={`ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full text-xs px-1.5 ${
                is ? "bg-white/20 text-white" : "bg-slate-100 text-slate-900"
              }`}
            >
              {t.count}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

/* ---------- Value normalization helpers ---------- */
function firstFilled(...vals) {
  for (const v of vals.flat()) {
    if (v === 0) return 0;
    if (v === false) continue;
    if (v == null) continue;
    const s = typeof v === "string" ? v.trim() : v;
    if (Array.isArray(s)) {
      if (s.filter(Boolean).length) return s;
    } else if (s !== "" && s !== "null" && s !== "undefined") {
      return s;
    }
  }
  return "";
}
function isEmpty(v) {
  const val = firstFilled(v);
  return val === "" || (Array.isArray(val) && val.length === 0);
}
const fmtDate = (v) => (v ? new Date(v).toLocaleDateString() : "—");
function isoDateOnly(v) {
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return "";
  }
}
// ⬇️ helpers used by saveUpdates
const toNull = (v) => (v === "" || v === undefined ? null : v);
const trim = (v) => (typeof v === "string" ? v.trim() : v);
const asISO = (v) => (v ? isoDateOnly(v) : null);
const normalizePhone = (v) => formatPhoneWithCC(v || "");

const branchNameById = (id, list) => list.find((b) => String(b.id) === String(id))?.name || "";
const officerNameById = (id, list) => list.find((o) => String(o.id) === String(id))?.name || "";

/* ---------- Component ---------- */
const BorrowerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const tenantFromURL = search.get("tenantId") || undefined;
  const userRole = getUserRole();

  // Pin tenant from URL immediately so the first request includes it
  useEffect(() => {
    if (tenantFromURL) api.setTenantId(tenantFromURL);
  }, [tenantFromURL]);

  const [borrower, setBorrower] = useState(null);
  const [loans, setLoans] = useState([]);
  const [repayments, setRepayments] = useState([]);
  const [comments, setComments] = useState([]);

  // Inline edit state
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  // Option lists (dropdowns)
  const [branches, setBranches] = useState([]);
  const [officers, setOfficers] = useState([]);

  const [showRepaymentModal, setShowRepaymentModal] = useState(false);
  const [selectedLoanForRepayment, setSelectedLoanForRepayment] = useState(null);

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);

  const [savings, setSavings] = useState([]);
  const [filteredSavings, setFilteredSavings] = useState([]);
  const [filterType, setFilterType] = useState("all");

  const [activeTab, setActiveTab] = useState("loans");
  const [errors, setErrors] = useState({ loans: null, savings: null });

  const [showAllComments, setShowAllComments] = useState(false);

  const mapBorrowerToForm = useCallback(
    (b) => ({
      id: b?.id,
      name: firstFilled(b?.name, b?.fullName),
      phone: firstFilled(b?.phone, b?.msisdn, b?.mobile, b?.primaryPhone),
      email: firstFilled(b?.email, b?.mail),
      addressLine: firstFilled(
        b?.addressLine,
        [b?.street, b?.houseNumber, b?.ward, b?.district, b?.city].filter(Boolean).join(", "),
        [b?.address, b?.town, b?.region, b?.country].filter(Boolean).join(", ")
      ),
      gender: firstFilled(b?.gender, b?.sex),
      birthDate: firstFilled(b?.birthDate, b?.dateOfBirth, b?.dob, b?.birth_date),
      employmentStatus: firstFilled(b?.employmentStatus, b?.employment, b?.employmentType, b?.employment_status),
      idType: firstFilled(b?.idType, b?.identificationType, b?.id_type),
      nationalId: firstFilled(b?.nationalId, b?.nid, b?.idNumber, b?.national_id),
      idIssuedDate: firstFilled(b?.idIssuedDate, b?.idIssueDate, b?.idDateIssued, b?.id_issued_date),
      idExpiryDate: firstFilled(b?.idExpiryDate, b?.idExpireDate, b?.idDateExpiry, b?.id_expiry_date),
      nextKinName: firstFilled(b?.nextKinName, b?.nextOfKinName, b?.kinName, b?.emergencyContactName, b?.next_of_kin_name),
      nextKinPhone: firstFilled(b?.nextKinPhone, b?.nextOfKinPhone, b?.kinPhone, b?.emergencyContactPhone, b?.next_of_kin_phone),
      nextOfKinRelationship: firstFilled(b?.nextOfKinRelationship, b?.kinRelationship, b?.relationship, b?.next_of_kin_relationship),
      maritalStatus: firstFilled(b?.maritalStatus, b?.marriageStatus, b?.marital_status),
      educationLevel: firstFilled(b?.educationLevel, b?.education, b?.educationStatus, b?.education_level),
      customerNumber: firstFilled(b?.customerNumber, b?.accountNumber, b?.clientNumber, b?.customer_number),
      groupId: firstFilled(b?.groupId, b?.group, b?.groupCode, b?.group_id),
      loanType: firstFilled(b?.loanType, b?.productType, b?.loan_type, "individual"),
      regDate: firstFilled(b?.regDate, b?.registrationDate, b?.reg_date),
    }),
    []
  );

  // Fetch borrower + bundle (abortable)
  const fetchBorrowerBundle = useCallback(
    async (signal) => {
      setErrors({ loans: null, savings: null });
      try {
        const initialTenant = tenantFromURL || api.getTenantId();
        const b = await tryGET(
          [
            initialTenant
              ? `/borrowers/${id}?tenantId=${encodeURIComponent(initialTenant)}`
              : `/borrowers/${id}`,
            `/borrowers/${id}`,
          ],
          withTenant(initialTenant, { signal })
        );
        setBorrower(b);
        setForm(mapBorrowerToForm(b));

        const qTenant = b?.tenantId ? `&tenantId=${encodeURIComponent(b.tenantId)}` : "";

        const [loanData, repayData, commentData, savingsData] = await Promise.all([
          tryGET(
            [`/loans?borrowerId=${id}${qTenant}`, `/borrowers/${id}/loans`, `/loans/borrower/${id}`],
            { signal, ...withTenant(b?.tenantId) }
          ).catch(() => {
            setErrors((x) => ({ ...x, loans: "Couldn’t load loans." }));
            return [];
          }),
          tryGET(
            [
              `/repayments?borrowerId=${id}${qTenant}`,
              `/borrowers/${id}/repayments`,
              `/repayments/borrower/${id}`,
            ],
            { signal, ...withTenant(b?.tenantId) }
          ).catch(() => []),
          tryGET([`/borrowers/${id}/comments`, `/comments/borrower/${id}`], {
            signal,
            ...withTenant(b?.tenantId),
          }).catch(() => []),
          tryGET([`/borrowers/${id}/savings`, `/savings/borrower/${id}`], {
            signal,
            ...withTenant(b?.tenantId),
          }).catch(() => {
            setErrors((x) => ({ ...x, savings: "Couldn’t load savings." }));
            return {};
          }),
        ]);

        setLoans(Array.isArray(loanData) ? loanData : loanData?.items || []);
        setRepayments(Array.isArray(repayData) ? repayData : repayData?.items || []);
        setComments(Array.isArray(commentData) ? commentData : commentData?.items || []);

        const txs = Array.isArray(savingsData?.transactions)
          ? savingsData.transactions
          : Array.isArray(savingsData)
          ? savingsData
          : [];

        // sort savings newest first; normalize amounts to number
        const sorted = [...txs].sort((a, b) => {
          const da = new Date(a.date || a.createdAt || 0).getTime();
          const db = new Date(b.date || b.createdAt || 0).getTime();
          return db - da;
        });
        setSavings(sorted);
        setFilteredSavings(sorted);
      } catch (err) {
        if (err?.name === "CanceledError" || err?.message === "canceled") return;
        console.error("Fetch borrower bundle failed:", err?.message || err);
      }
    },
    [id, mapBorrowerToForm, tenantFromURL]
  );

  // load dropdown options (branches, officers)
  const fetchOptionLists = useCallback(async (tenantId, signal) => {
    try {
      const opt = withTenant(tenantId, { signal });
      const [branchRes, officerRes] = await Promise.all([
        tryGET(["/branches", "/org/branches", "/branch"], opt).catch(() => []),
        tryGET(
          [
            "/users?role=officer",
            "/users?role=loan_officer",
            "/officers",
            "/users/loan-officers",
            "/staff?role=loan_officer",
          ],
          opt
        ).catch(() => []),
      ]);

      const brs = Array.isArray(branchRes?.items)
        ? branchRes.items
        : Array.isArray(branchRes)
        ? branchRes
        : [];
      const ofs = Array.isArray(officerRes?.items)
        ? officerRes.items
        : Array.isArray(officerRes)
        ? officerRes
        : [];

      setBranches(
        brs.map((b) => ({
          id: b.id ?? b._id ?? b.code ?? b.uuid,
          name: b.name ?? b.title ?? b.code ?? "—",
        }))
      );
      setOfficers(
        (Array.isArray(ofs) ? ofs : []).map((u) => ({
          id: firstFilled(u.id, u._id, u.userId, u.email),
          name:
            firstFilled(u.name, [u.firstName, u.lastName].filter(Boolean).join(" "), u.email) ||
            "—",
        }))
      );
    } catch (e) {
      if (e?.name === "CanceledError" || e?.message === "canceled") return;
      console.warn("Option list fetch failed", e?.message || e);
    }
  }, []);

  // initial + id-change fetch, with abort
  useEffect(() => {
    const ctrl = new AbortController();
    fetchBorrowerBundle(ctrl.signal);
    return () => ctrl.abort();
  }, [id, fetchBorrowerBundle]);

  // refresh option lists when borrower (tenant) known
  useEffect(() => {
    if (borrower?.tenantId !== undefined) {
      const ctrl = new AbortController();
      fetchOptionLists(borrower?.tenantId, ctrl.signal);
      return () => ctrl.abort();
    }
  }, [borrower?.tenantId, fetchOptionLists]);

  // auto-refresh on broadcast
  useEffect(() => {
    const onUpdated = () => fetchBorrowerBundle();
    window.addEventListener("loan:updated", onUpdated);
    window.addEventListener("borrower:updated", onUpdated);
    return () => {
      window.removeEventListener("loan:updated", onUpdated);
      window.removeEventListener("borrower:updated", onUpdated);
    };
  }, [id, fetchBorrowerBundle]);

  useEffect(() => {
    if (filterType === "all") setFilteredSavings(savings);
    else
      setFilteredSavings(
        savings.filter((tx) => String(tx.type || "").toLowerCase() === filterType)
      );
  }, [filterType, savings]);

  const handleAddComment = async (textRaw) => {
    const content = String(textRaw || "").trim();
    if (!content) return;
    try {
      await api.post(`/borrowers/${id}/comments`, { content }, withTenant(borrower?.tenantId));
      setComments((prev) => [{ content, createdAt: new Date().toISOString() }, ...prev]);
    } catch (err) {
      console.error("Error adding comment", err);
    }
  };

  const normalizeSchedule = (arr) => {
    const items = Array.isArray(arr) ? arr : [];
    return items.map((it, i) => ({
      installment: it.installment ?? it.no ?? i + 1,
      dueDate: it.dueDate ?? it.date ?? it.scheduledDate ?? null,
      principal: safeNum(it.principal ?? it.principalAmount),
      interest: safeNum(it.interest ?? it.interestAmount),
      amount: safeNum(it.amount ?? it.installmentAmount ?? it.total),
      balance: safeNum(
        it.balance ?? it.remaining ?? safeNum(it.balancePrincipal) + safeNum(it.balanceInterest)
      ),
      status: it.status ?? "",
      paid: safeNum(it.amountPaid ?? it.paid ?? 0),
    }));
  };

  const handleViewSchedule = async (loanId) => {
    try {
      const data = await tryGET(
        [`/loans/${loanId}/schedule`, `/loan/${loanId}/schedule`],
        withTenant(borrower?.tenantId)
      );
      setSelectedSchedule(normalizeSchedule(Array.isArray(data) ? data : data?.items || []));
      const loan = loans.find((l) => String(l.id) === String(loanId)) || null;
      setSelectedLoan(loan);
      setShowScheduleModal(true);
    } catch (err) {
      console.error("Error fetching loan schedule:", err);
    }
  };

  const handleRepaymentSaved = async () => {
    try {
      const repay = await tryGET(
        [
          `/repayments?borrowerId=${id}${
            borrower?.tenantId ? `&tenantId=${encodeURIComponent(borrower.tenantId)}` : ""
          }`,
          `/borrowers/${id}/repayments`,
        ],
        withTenant(borrower?.tenantId)
      );
      setRepayments(Array.isArray(repay) ? repay : repay?.items || []);
    } catch {}
    await fetchBorrowerBundle();
    window.dispatchEvent(
      new CustomEvent("loan:updated", { detail: { id: selectedLoanForRepayment?.id } })
    );
    window.dispatchEvent(new CustomEvent("borrower:updated", { detail: { id } }));
  };

  // Inline edit handlers
  const onChange = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const saveUpdates = async () => {
  if (!form?.id) return;
  setSaving(true);

  // base (camelCase)
  const base = {
    name: trim(form.name),
    phone: normalizePhone(trim(form.phone || "")),
    email: trim(form.email),

    // send both to satisfy old/new backends
    addressLine: trim(form.addressLine),
    address: trim(form.addressLine),

    status: trim(form.status),
    nationalId: trim(form.nationalId),

    branchId: toNull(form.branchId),
    officerId: toNull(form.officerId),
    loanOfficerId: toNull(form.officerId),

    idType: trim(form.idType),
    idIssuedDate: asISO(form.idIssuedDate),
    idExpiryDate: asISO(form.idExpiryDate),

    nextKinName: trim(form.nextKinName),
    nextKinPhone: normalizePhone(form.nextKinPhone),
    nextOfKinRelationship: trim(form.nextOfKinRelationship),

    employmentStatus: trim(form.employmentStatus),
    occupation: trim(form.occupation),
    birthDate: asISO(form.birthDate),
    gender: trim(form.gender),
    maritalStatus: trim(form.maritalStatus),
    educationLevel: trim(form.educationLevel),
    customerNumber: trim(form.customerNumber),
    tin: trim(form.tin),
    nationality: trim(form.nationality),
    groupId: trim(form.groupId),
    loanType: trim(form.loanType),
    regDate: asISO(form.regDate),
  };

  // snake_case aliases (for stricter APIs)
  const snake = {
    branch_id: base.branchId,
    officer_id: base.officerId,
    loan_officer_id: base.officerId,
    address_line: base.addressLine,
    id_type: base.idType,
    id_issued_date: base.idIssuedDate,
    id_expiry_date: base.idExpiryDate,
    national_id: base.nationalId,
    next_of_kin_name: base.nextKinName,
    next_of_kin_phone: base.nextKinPhone,
    next_of_kin_relationship: base.nextOfKinRelationship,
    employment_status: base.employmentStatus,
    birth_date: base.birthDate,
    marital_status: base.maritalStatus,   // ✅ fixed
    education_level: base.educationLevel,
    customer_number: base.customerNumber,
    reg_date: base.regDate,               // ✅ fixed
    loan_type: base.loanType,
    group_id: base.groupId,
  };

  // drop undefined (keep nulls to explicitly clear)
  const payload = Object.fromEntries(
    Object.entries({ ...base, ...snake }).filter(([, v]) => v !== undefined)
  );

  // Compute branch change intent
  const prevBranchId = firstFilled(
    borrower?.branchId,
    borrower?.Branch?.id,
    borrower?.branch?.id,
    null
  );
  const newBranchId = base.branchId; // may be null to CLEAR

  try {
    const opt = withTenant(borrower?.tenantId);

    // If changing or clearing branch, unassign first (DELETE) as the API requires.
    if (
      prevBranchId != null &&
      (newBranchId == null || String(newBranchId) !== String(prevBranchId))
    ) {
      try {
        // server hinted DELETE /borrowers/:id/branch
        await api.deleteFirst(
          [`/borrowers/${form.id}/branch`, `/borrowers/${form.id}/branch/${prevBranchId}`],
          opt
        );
      } catch (e) {
        // allow 404 (already unassigned), rethrow others
        if (e?.response?.status !== 404) throw e;
      }
    }

    // Build the payload we actually PATCH with:
    // If we JUST unassigned (newBranchId == null), do not send branchId=null again in PATCH.
    const payloadToSend =
      prevBranchId != null && newBranchId == null
        ? (() => {
            const p = { ...payload };
            delete p.branchId;
            delete p.branch_id;
            return p;
          })()
        : payload;

    // optimistic local update so UI shows labels immediately
    setBorrower((b) => ({
      ...b,
      ...payloadToSend,
      phone: base.phone,
      email: base.email,
      address: base.address,
      addressLine: base.addressLine,
      ...(newBranchId != null
        ? {
            branchId: newBranchId,
            Branch: { ...(b?.Branch || {}), id: newBranchId, name: branchNameById(newBranchId, branches) },
            branchName: branchNameById(newBranchId, branches) || b?.branchName,
          }
        : {
            // cleared
            branchId: null,
            Branch: null,
            branchName: undefined,
          }),
      officerId: base.officerId,
      loanOfficerId: base.officerId,
      ...(base.officerId != null
        ? {
            officer: { ...(b?.officer || {}), id: base.officerId, name: officerNameById(base.officerId, officers) },
            loanOfficer: { ...(b?.loanOfficer || {}), id: base.officerId, name: officerNameById(base.officerId, officers) },
            officerName: officerNameById(base.officerId, officers) || b?.officerName,
          }
        : {}),
    }));

    // persist (PATCH → fallback to PUT), with a 409-safe retry that honors server hint
    const doPatch = async () => {
      try {
        await api.patch(`/borrowers/${form.id}`, payloadToSend, opt);
      } catch (e) {
        if (e?.response?.status === 409 && e?.response?.data?.unassignUrl) {
          // backend insists we unassign first — do it now then retry once
          try {
            await api.delete(e.response.data.unassignUrl, opt);
          } catch {}
          await api.patch(`/borrowers/${form.id}`, payloadToSend, opt);
        } else {
          // try PUT only if not a strict-409 case
          if (e?.response?.status !== 409) {
            await api.put(`/borrowers/${form.id}`, payloadToSend, opt);
          } else {
            throw e;
          }
        }
      }
    };

    await doPatch();

    await fetchBorrowerBundle();
    setIsEditing(false);
    window.dispatchEvent(new CustomEvent("borrower:updated", { detail: { id: form.id } }));
  } catch (e) {
    console.error(e);
    alert(
      e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.normalizedMessage ||
        "Couldn’t update borrower."
    );
  } finally {
    setSaving(false);
  }
};


  // Admin actions
  const handleDisable = async () => {
    if (
      !window.confirm(
        "Disable this borrower? They will not be able to apply or receive disbursements."
      )
    )
      return;
    try {
      await api.post(`/borrowers/${id}/disable`, {}, withTenant(borrower?.tenantId));
      setBorrower((b) => ({ ...b, status: "disabled" }));
      window.dispatchEvent(new CustomEvent("borrower:updated", { detail: { id } }));
    } catch {
      try {
        await api.patch(`/borrowers/${id}`, { status: "disabled" }, withTenant(borrower?.tenantId));
        setBorrower((b) => ({ ...b, status: "disabled" }));
        window.dispatchEvent(new CustomEvent("borrower:updated", { detail: { id } }));
      } catch {
        alert("Could not disable borrower.");
      }
    }
  };

  const handleBlacklist = async () => {
    if (!window.confirm("Blacklist this borrower? This will block all new loans.")) return;
    try {
      await api.post(`/borrowers/${id}/blacklist`, {}, withTenant(borrower?.tenantId));
      setBorrower((b) => ({ ...b, status: "blacklisted" }));
      window.dispatchEvent(new CustomEvent("borrower:updated", { detail: { id } }));
    } catch {
      try {
        await api.patch(
          `/borrowers/${id}`,
          { status: "blacklisted" },
          withTenant(borrower?.tenantId)
        );
        setBorrower((b) => ({ ...b, status: "blacklisted" }));
        window.dispatchEvent(new CustomEvent("borrower:updated", { detail: { id } }));
      } catch {
        alert("Could not blacklist borrower.");
      }
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        "Permanently delete this borrower and their client profile? This cannot be undone."
      )
    )
      return;
    try {
      await api.delete(`/borrowers/${id}`, withTenant(borrower?.tenantId));
      navigate("/borrowers");
      window.dispatchEvent(new CustomEvent("borrower:updated", { detail: { id } }));
    } catch {
      alert("Could not delete borrower.");
    }
  };

  // Enrich loans from repayments (derived metrics)
  const loansEnriched = useMemo(() => {
    const byLoan = new Map();
    repayments.forEach((r) => {
      const k = r.loanId ?? r.loan?.id;
      if (!k) return;
      if (!byLoan.has(k)) byLoan.set(k, []);
      byLoan.get(k).push(r);
    });

    const today = new Date();

    return (loans || []).map((l) => {
      const rows = byLoan.get(l.id) || [];
      const paidTotal = rows.reduce(
        (s, r) => s + safeNum(r.amountPaid ?? r.paidAmount ?? r.amount ?? 0),
        0
      );

      const rawOutstanding =
        l.outstanding ?? l.outstandingTotal ?? l.outstandingAmount ?? null;

      const outstanding =
        rawOutstanding != null ? safeNum(rawOutstanding) : Math.max(0, safeNum(l.amount) - paidTotal);

      // next due from repayments table if present
      const future = rows
        .filter((r) => r.dueDate && new Date(r.dueDate) >= today)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      const next = future[0] || null;
      const nextDueDate = next?.dueDate || l.nextDueDate || l.nextInstallmentDate || null;
      const nextDueAmount = next
        ? Math.max(0, safeNum(next.amount) - safeNum(next.amountPaid))
        : l.nextDueAmount ?? l.nextInstallmentAmount ?? null;

      const missedInstallments = rows.filter((r) => {
        const due = r.dueDate ? new Date(r.dueDate) : null;
        const status = String(r.status || "").toLowerCase();
        const paid = safeNum(r.amountPaid ?? r.paidAmount) >= safeNum(r.amount);
        return (
          due && due < today && !paid && (status === "overdue" || status === "due" || status === "")
        );
      }).length;

      const lastPaymentDate = rows
        .filter((r) => safeNum(r.amountPaid ?? r.paidAmount) > 0)
        .map((r) => r.date || r.createdAt)
        .sort((a, b) => new Date(b) - new Date(a))[0];

      return {
        ...l,
        paidTotal,
        outstanding,
        nextDueDate,
        nextDueAmount,
        missedInstallments,
        lastPaymentDate,
      };
    });
  }, [loans, repayments]);

  const missedRepayments = useMemo(() => {
    const today = new Date();
    return repayments.filter((r) => {
      const due = r.dueDate ? new Date(r.dueDate) : null;
      const status = String(r.status || "").toLowerCase();
      const paid = safeNum(r.amountPaid ?? r.paidAmount) >= safeNum(r.amount);
      return (
        due && due < today && !paid && (status === "overdue" || status === "due" || status === "")
      );
    }).length;
  }, [repayments]);

  // Savings aggregates (memoized)
  const { deposits, withdrawals, charges, interest, net } = useMemo(() => {
    const agg = { deposits: 0, withdrawals: 0, charges: 0, interest: 0 };
    for (const t of savings) {
      const amt = safeNum(t.amount);
      switch (String(t.type || "").toLowerCase()) {
        case "deposit":
          agg.deposits += amt;
          break;
        case "withdrawal":
          agg.withdrawals += amt;
          break;
        case "charge":
          agg.charges += amt;
          break;
        case "interest":
          agg.interest += amt;
          break;
        default:
          break;
      }
    }
    return { ...agg, net: agg.deposits + agg.interest - agg.withdrawals - agg.charges };
  }, [savings]);

  if (!borrower || !form) {
    return (
      <div className="w-full px-6 py-6 min-h-screen bg-white text-slate-900">
        Loading…
      </div>
    );
  }

  const bName = displayName(borrower);
  const tenantQuery = borrower?.tenantId ? `?tenantId=${encodeURIComponent(borrower.tenantId)}` : "";
  const visibleComments = showAllComments ? comments : comments.slice(0, 3);

  const tel = (p) => (p ? `tel:${p}` : undefined);
  const sms = (p) => (p ? `sms:${p}` : undefined);
  const wa = (p) => (p ? `https://wa.me/${String(p).replace(/[^\d]/g, "")}` : undefined);
  const mail = (e) => (e ? `mailto:${encodeURIComponent(e)}` : undefined);

  const addr = firstFilled(
    borrower.addressLine,
    [borrower.street, borrower.houseNumber, borrower.ward, borrower.district, borrower.city]
      .filter(Boolean)
      .join(", "),
    [borrower.address, borrower.town, borrower.region, borrower.country].filter(Boolean).join(", "),
    borrower.location
  );

  const businessName = firstFilled(borrower.businessName, borrower.tradeName, borrower.shopName);
  const occupation = firstFilled(
    borrower.occupation,
    borrower.businessType,
    borrower.jobTitle,
    borrower.sector
  );
  const employmentStatus = firstFilled(
    borrower.employmentStatus,
    borrower.employment,
    borrower.employmentType
  );
  const nationalId = firstFilled(borrower.nationalId, borrower.nid, borrower.idNumber);
  const idType = firstFilled(borrower.idType, borrower.identificationType);
  const idIssued = firstFilled(borrower.idIssuedDate, borrower.idIssueDate, borrower.idDateIssued);
  const idExpiry = firstFilled(borrower.idExpiryDate, borrower.idExpireDate, borrower.idDateExpiry);
  const maritalStatus = firstFilled(borrower.maritalStatus, borrower.marriageStatus);
  const educationLevel = firstFilled(
    borrower.educationLevel,
    borrower.education,
    borrower.educationStatus
  );
  const customerNumber = firstFilled(
    borrower.customerNumber,
    borrower.accountNumber,
    borrower.clientNumber
  );
  const tin = firstFilled(borrower.tin, borrower.TIN, borrower.taxId);
  const nationality = firstFilled(borrower.nationality, borrower.country);
  const dob = firstFilled(borrower.birthDate, borrower.dateOfBirth, borrower.dob);

  const nextKinName = firstFilled(
    borrower.nextKinName,
    borrower.nextOfKinName,
    borrower.kinName,
    borrower.emergencyContactName
  );
  const nextKinPhone = firstFilled(
    borrower.nextKinPhone,
    borrower.nextOfKinPhone,
    borrower.kinPhone,
    borrower.emergencyContactPhone
  );
  const nextKinRel = firstFilled(
    borrower.nextOfKinRelationship,
    borrower.kinRelationship,
    borrower.relationship
  );

  const registrationDate = firstFilled(
    borrower.regDate,
    borrower.registrationDate,
    borrower.createdAt
  );

  // options for static selects
  const GENDER_OPTS = [
    { v: "", t: "—" },
    { v: "male", t: "Male" },
    { v: "female", t: "Female" },
    { v: "other", t: "Other" },
  ];
  const STATUS_OPTS = [
    { v: "active", t: "Active" },
    { v: "pending_kyc", t: "Pending KYC" },
    { v: "inactive", t: "Inactive" },
    { v: "blacklisted", t: "Blacklisted" },
    { v: "disabled", t: "Disabled" },
  ];
  const EMPLOYMENT_OPTS = [
    { v: "", t: "—" },
    { v: "employed", t: "Employed" },
    { v: "self_employed", t: "Self-employed" },
    { v: "unemployed", t: "Unemployed" },
    { v: "student", t: "Student" },
    { v: "retired", t: "Retired" },
  ];
  const IDTYPE_OPTS = [
    { v: "", t: "—" },
    { v: "national_id", t: "National ID" },
    { v: "passport", t: "Passport" },
    { v: "driver_license", t: "Driver’s License" },
    { v: "voter_id", t: "Voter ID" },
  ];

  return (
    <div className="w-full px-4 md:px-6 py-6 min-h-screen bg-white text-slate-900">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-5">
        <div className="text-sm">
          <Link to={`/borrowers${tenantQuery}`} className={strongLink}>
            Borrowers
          </Link>{" "}
          <span className="text-slate-700">/</span>{" "}
          <span className="font-extrabold tracking-tight">{bName}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="text-slate-900 border-2 border-slate-400 hover:bg-slate-50 px-3 py-1.5 rounded-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              Update info
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setForm(mapBorrowerToForm(borrower)); // reset
                }}
                className="text-slate-900 border-2 border-slate-400 hover:bg-slate-50 px-3 py-1.5 rounded-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                Cancel
              </button>
              <button
                onClick={saveUpdates}
                disabled={saving}
                className="bg-indigo-600 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 shadow-sm"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </>
          )}
          {!isEditing && (
            <>
              <button
                onClick={handleDisable}
                className="text-slate-900 border-2 border-slate-400 hover:bg-slate-50 px-3 py-1.5 rounded-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                Disable
              </button>
              <button
                onClick={handleBlacklist}
                className="bg-rose-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 shadow-sm"
              >
                Blacklist
              </button>
              <button
                onClick={handleDelete}
                className="bg-red-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 shadow-sm"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* MAIN */}
        <div className="lg:col-span-3 space-y-6">
          {/* Profile */}
          <Card>
            <div className="flex gap-5">
              {/* Avatar */}
              <div className="relative shrink-0">
                {borrower.photoUrl ? (
                  <img
                    src={borrower.photoUrl}
                    alt={bName}
                    className="w-24 h-24 rounded-2xl object-cover border-2 border-slate-400"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center text-2xl font-extrabold">
                    {initials(bName)}
                  </div>
                )}
                <span className={`absolute -bottom-2 left-2 ${chip(borrower.status)}`}>
                  {borrower.status || "—"}
                </span>
              </div>

              {/* Name + quick contact */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {isEditing ? (
                    <input
                      value={form.name ?? ""}
                      onChange={(e) => onChange("name", e.target.value)}
                      className="text-3xl font-extrabold tracking-tight border-2 border-slate-400 rounded-lg px-2 py-1"
                      placeholder="Full name"
                    />
                  ) : (
                    <h1 className="text-3xl font-extrabold tracking-tight truncate">{bName}</h1>
                  )}
                  <span className="text-xs text-slate-700">ID: {borrower.id}</span>
                  <span className="text-xs text-slate-700">Tenant: {borrower.tenantId || "—"}</span>
                </div>

                <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Field label="Phone">
                    {isEditing ? (
                      <input
                        value={form.phone ?? ""}
                        onChange={(e) => onChange("phone", e.target.value)}
                        className="w-full text-sm border-2 border-slate-400 rounded-lg px-3 py-2"
                        placeholder="e.g., +2557xxxxxxx"
                      />
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>
                          {formatPhoneWithCC(
                            firstFilled(
                              borrower.phone,
                              borrower.msisdn,
                              borrower.mobile,
                              borrower.primaryPhone
                            )
                          ) || "—"}
                        </span>
                        {firstFilled(
                          borrower.phone,
                          borrower.msisdn,
                          borrower.mobile,
                          borrower.primaryPhone
                        ) && (
                          <>
                            <a
                              className={strongLink}
                              href={tel(
                                formatPhoneWithCC(
                                  borrower.phone ||
                                    borrower.msisdn ||
                                    borrower.mobile ||
                                    borrower.primaryPhone
                                )
                              )}
                            >
                              Call
                            </a>
                            <a
                              className={strongLink}
                              href={sms(
                                formatPhoneWithCC(
                                  borrower.phone ||
                                    borrower.msisdn ||
                                    borrower.mobile ||
                                    borrower.primaryPhone
                                )
                              )}
                            >
                              SMS
                            </a>
                            <a
                              className={strongLink}
                              href={wa(
                                formatPhoneWithCC(
                                  borrower.phone ||
                                    borrower.msisdn ||
                                    borrower.mobile ||
                                    borrower.primaryPhone
                                )
                              )}
                              target="_blank"
                              rel="noreferrer"
                            >
                              WhatsApp
                            </a>
                          </>
                        )}
                      </div>
                    )}
                  </Field>

                  <Field label="Email">
                    {isEditing ? (
                      <input
                        value={form.email ?? ""}
                        onChange={(e) => onChange("email", e.target.value)}
                        className="w-full text-sm border-2 border-slate-400 rounded-lg px-3 py-2"
                        placeholder="e.g., user@email.com"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>{firstFilled(borrower.email, borrower.mail) || "—"}</span>
                        {firstFilled(borrower.email, borrower.mail) && (
                          <a className={strongLink} href={mail(borrower.email || borrower.mail)}>
                            Email
                          </a>
                        )}
                      </div>
                    )}
                  </Field>

                  <Field label="Address">
                    {isEditing ? (
                      <input
                        value={form.addressLine ?? ""}
                        onChange={(e) => onChange("addressLine", e.target.value)}
                        className="w-full text-sm border-2 border-slate-400 rounded-lg px-3 py-2"
                        placeholder="Street, ward, district, city"
                      />
                    ) : (
                      addr || "—"
                    )}
                  </Field>
                </div>
              </div>
            </div>

            {/* Divider */}
            <hr className="my-4 border-2 border-slate-300" />

            {/* Identity mirrors Add Borrower */}
            <div className="grid gap-5">
              <DlGrid
                cols={3}
                items={[
                  {
                    label: "Gender",
                    value: isEditing ? (
                      <select
                        value={form.gender ?? ""}
                        onChange={(e) => onChange("gender", e.target.value)}
                        className="text-sm border-2 border-slate-400 rounded-lg px-2 py-1"
                      >
                        {GENDER_OPTS.map((o) => (
                          <option key={o.v} value={o.v}>
                            {o.t}
                          </option>
                        ))}
                      </select>
                    ) : (
                      firstFilled(borrower.gender, borrower.sex)
                    ),
                  },
                  {
                    label: "Birth Date",
                    value: isEditing ? (
                      <input
                        type="date"
                        value={form.birthDate ? isoDateOnly(form.birthDate) : ""}
                        onChange={(e) => onChange("birthDate", e.target.value)}
                        className="text-sm border-2 border-slate-400 rounded-lg px-2 py-1"
                      />
                    ) : (
                      fmtDate(dob)
                    ),
                  },
                  {
                    label: "Business / Occupation",
                    value: isEditing ? (
                      <input
                        value={form.occupation ?? ""}
                        onChange={(e) => onChange("occupation", e.target.value)}
                        className="text-sm border-2 border-slate-400 rounded-lg px-2 py-1"
                      />
                    ) : (
                      firstFilled(occupation, businessName)
                    ),
                  },
                  {
                    label: "Employment Status",
                    value: isEditing ? (
                      <select
                        value={form.employmentStatus ?? ""}
                        onChange={(e) => onChange("employmentStatus", e.target.value)}
                        className="text-sm border-2 border-slate-400 rounded-lg px-2 py-1"
                      >
                        {EMPLOYMENT_OPTS.map((o) => (
                          <option key={o.v} value={o.v}>
                            {o.t}
                          </option>
                        ))}
                      </select>
                    ) : (
                      employmentStatus
                    ),
                  },
                  {
                    label: "Customer No.",
                    value: isEditing ? (
                      <input
                        value={form.customerNumber ?? ""}
                        onChange={(e) => onChange("customerNumber", e.target.value)}
                        className="text-sm border-2 border-slate-400 rounded-lg px-2 py-1"
                      />
                    ) : (
                      customerNumber
                    ),
                  },
                  {
                    label: "Nationality",
                    value: isEditing ? (
                      <input
                        value={form.nationality ?? ""}
                        onChange={(e) => onChange("nationality", e.target.value)}
                        className="text-sm border-2 border-slate-400 rounded-lg px-2 py-1"
                      />
                    ) : (
                      nationality
                    ),
                  },
                  {
                    label: "Marital Status",
                    value: isEditing ? (
                      <input
                        value={form.maritalStatus ?? ""}
                        onChange={(e) => onChange("maritalStatus", e.target.value)}
                        className="text-sm border-2 border-slate-400 rounded-lg px-2 py-1"
                      />
                    ) : (
                      maritalStatus
                    ),
                  },
                  {
                    label: "Education Level",
                    value: isEditing ? (
                      <input
                        value={form.educationLevel ?? ""}
                        onChange={(e) => onChange("educationLevel", e.target.value)}
                        className="text-sm border-2 border-slate-400 rounded-lg px-2 py-1"
                      />
                    ) : (
                      educationLevel
                    ),
                  },
                  {
                    label: "Status",
                    value: isEditing ? (
                      <select
                        value={form.status ?? "active"}
                        onChange={(e) => onChange("status", e.target.value)}
                        className="text-sm border-2 border-slate-400 rounded-lg px-2 py-1"
                      >
                        {STATUS_OPTS.map((o) => (
                          <option key={o.v} value={o.v}>
                            {o.t}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={chip(borrower.status)}>{borrower.status || "—"}</span>
                    ),
                  },
                ]}
              />

              <div className="grid gap-5 lg:grid-cols-2">
                <Card title="ID Document">
                  <DlGrid
                    cols={2}
                    items={[
                      {
                        label: "ID Type",
                        value: isEditing ? (
                          <select
                            value={form.idType ?? ""}
                            onChange={(e) => onChange("idType", e.target.value)}
                            className="text-sm border-2 border-slate-400 rounded-lg px-2 py-1"
                          >
                            {IDTYPE_OPTS.map((o) => (
                              <option key={o.v} value={o.v}>
                                {o.t}
                              </option>
                            ))}
                          </select>
                        ) : (
                          idType
                        ),
                      },
                      {
                        label: "ID Number",
                        value: isEditing ? (
                          <input
                            value={form.nationalId ?? ""}
                            onChange={(e) => onChange("nationalId", e.target.value)}
                            className="text-sm border-2 border-slate-400 rounded-lg px-2 py-1"
                          />
                        ) : (
                          nationalId || borrower.idNumber
                        ),
                      },
                      {
                        label: "Issued On",
                        value: isEditing ? (
                          <input
                            type="date"
                            value={form.idIssuedDate ? isoDateOnly(form.idIssuedDate) : ""}
                            onChange={(e) => onChange("idIssuedDate", e.target.value)}
                            className="text-sm border-2 border-slate-400 rounded-lg px-2 py-1"
                          />
                        ) : (
                          fmtDate(idIssued)
                        ),
                      },
                      {
                        label: "Expiry Date",
                        value: isEditing ? (
                          <input
                            type="date"
                            value={form.idExpiryDate ? isoDateOnly(form.idExpiryDate) : ""}
                            onChange={(e) => onChange("idExpiryDate", e.target.value)}
                            className="text-sm border-2 border-slate-400 rounded-lg px-2 py-1"
                          />
                        ) : (
                          fmtDate(idExpiry)
                        ),
                      },
                      {
                        label: "TIN",
                        value: isEditing ? (
                          <input
                            value={form.tin ?? ""}
                            onChange={(e) => onChange("tin", e.target.value)}
                            className="text-sm border-2 border-slate-400 rounded-lg px-2 py-1"
                          />
                        ) : (
                          tin
                        ),
                      },
                    ]}
                  />
                </Card>

                <Card title="Assignment & Registration">
                  <DlGrid
                    cols={2}
                    items={[
                      {
                        label: "Branch",
                        value: isEditing ? (
                          branches.length ? (
                            <select
                              value={form.branchId ?? ""}
                              onChange={(e) => onChange("branchId", e.target.value)}
                              className="text-sm border-2 border-slate-400 rounded-lg px-2 py-1"
                            >
                              <option value="">—</option>
                              {branches.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              value={form.branchId ?? ""}
                              onChange={(e) => onChange("branchId", e.target.value)}
                              className="text-sm border-2 border-slate-400 rounded-lg px-2 py-1"
                              placeholder="Branch ID"
                            />
                          )
                        ) : (
                          displayBranch(borrower)
                        ),
                      },
                      {
                        label: "Loan Officer",
                        value: isEditing ? (
                          officers.length ? (
                            <select
                              value={form.officerId ?? ""}
                              onChange={(e) => onChange("officerId", e.target.value)}
                              className="text-sm border-2 border-slate-400 rounded-lg px-2 py-1"
                            >
                              <option value="">—</option>
                              {officers.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              value={form.officerId ?? ""}
                              onChange={(e) => onChange("officerId", e.target.value)}
                              className="text-sm border-2 border-slate-400 rounded-lg px-2 py-1"
                              placeholder="Officer ID"
                            />
                          )
                        ) : (
                          displayOfficer(borrower)
                        ),
                      },
                      {
                        label: "Loan Type",
                        value: isEditing ? (
                          <input
                            value={form.loanType ?? ""}
                            onChange={(e) => onChange("loanType", e.target.value)}
                            className="text-sm border-2 border-slate-400 rounded-lg px-2 py-1"
                          />
                        ) : (
                          firstFilled(borrower.loanType, borrower.productType, "individual")
                        ),
                      },
                      {
                        label: "Group ID",
                        value: isEditing ? (
                          <input
                            value={form.groupId ?? ""}
                            onChange={(e) => onChange("groupId", e.target.value)}
                            className="text-sm border-2 border-slate-400 rounded-lg px-2 py-1"
                          />
                        ) : (
                          firstFilled(borrower.groupId, borrower.group, borrower.groupCode)
                        ),
                      },
                      {
                        label: "Registration Date",
                        value: isEditing ? (
                          <input
                            type="date"
                            value={form.regDate ? isoDateOnly(form.regDate) : ""}
                            onChange={(e) => onChange("regDate", e.target.value)}
                            className="text-sm border-2 border-slate-400 rounded-lg px-2 py-1"
                          />
                        ) : (
                          fmtDate(registrationDate)
                        ),
                      },
                    ]}
                  />
                </Card>
              </div>

              <Card title="Next of Kin">
                <DlGrid
                  cols={3}
                  items={[
                    {
                      label: "Full Name",
                      value: isEditing ? (
                        <input
                          value={form.nextKinName ?? ""}
                          onChange={(e) => onChange("nextKinName", e.target.value)}
                          className="text-sm border-2 border-slate-400 rounded-lg px-2 py-1"
                        />
                      ) : (
                        nextKinName
                      ),
                    },
                    {
                      label: "Phone",
                      value: isEditing ? (
                        <input
                          value={form.nextKinPhone ?? ""}
                          onChange={(e) => onChange("nextKinPhone", e.target.value)}
                          className="text-sm border-2 border-slate-400 rounded-lg px-2 py-1"
                        />
                      ) : (
                        formatPhoneWithCC(nextKinPhone)
                      ),
                    },
                    {
                      label: "Relationship",
                      value: isEditing ? (
                        <input
                          value={form.nextOfKinRelationship ?? ""}
                          onChange={(e) => onChange("nextOfKinRelationship", e.target.value)}
                          className="text-sm border-2 border-slate-400 rounded-lg px-2 py-1"
                        />
                      ) : (
                        nextKinRel
                      ),
                    },
                  ]}
                />
              </Card>
            </div>
          </Card>

          {/* KPI */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              {
                k: "PAR %",
                v: Number.isFinite(Number(borrower.parPercent))
                  ? `${Number(borrower.parPercent).toFixed(2)}%`
                  : "0%",
              },
              {
                k: "Overdue Amount",
                v: money(firstFilled(borrower.overdueAmount, borrower.pastDueAmount, 0)),
              },
              { k: "Missed Repayments", v: missedRepayments },
              { k: "Net Savings", v: money(firstFilled(borrower.netSavings, borrower.savingsNet, 0)) },
            ].map((c, i) => (
              <div key={i} className="rounded-2xl p-4 border-2 bg-white border-slate-400 shadow-sm">
                <div className="text-[12px] font-semibold uppercase tracking-wider text-slate-900">
                  {c.k}
                </div>
                <div className="mt-1 text-2xl font-extrabold text-slate-900 tabular-nums">{c.v}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="rounded-2xl border-2 bg-white border-slate-400 shadow-lg">
            <PillTabs
              active={activeTab}
              onChange={setActiveTab}
              tabs={[
                { key: "loans", label: "Loans", count: loansEnriched.length },
                { key: "repayments", label: "Repayments", count: repayments.length },
                { key: "savings", label: "Savings", count: filteredSavings.length },
                { key: "documents", label: "Documents" },
                { key: "activity", label: "Activity" },
              ]}
            />

            <div className="p-4 md:p-5">
              {/* Loans */}
              {activeTab === "loans" && (
                <>
                  {errors.loans && (
                    <div className="mb-3 text-sm text-rose-700 font-semibold">{errors.loans}</div>
                  )}
                  {loansEnriched.length === 0 ? (
                    <Empty
                      text={
                        <>
                          No loans for this borrower.
                          <Link
                            to={`/loans/applications?borrowerId=${encodeURIComponent(borrower.id)}${
                              borrower?.tenantId
                                ? `&tenantId=${encodeURIComponent(borrower.tenantId)}`
                                : ""
                            }`}
                            className={`ml-1 ${strongLink}`}
                          >
                            Create loan
                          </Link>
                        </>
                      }
                    />
                  ) : (
                    <Table
                      head={[
                        "Loan",
                        "Reference",
                        "Status",
                        "Amount",
                        "Outstanding",
                        "Next Due",
                        "Actions",
                      ]}
                      rows={loansEnriched.map((l) => [
                        <Link
                          to={`/loans/${encodeURIComponent(l.id)}${
                            borrower?.tenantId
                              ? `?tenantId=${encodeURIComponent(borrower.tenantId)}`
                              : ""
                          }`}
                          className={strongLink}
                        >
                          {l.id}
                        </Link>,
                        l.reference || `L-${l.id}`,
                        <span className={chip(l.status)}>{String(l.status || "—")}</span>,
                        <div className="text-right tabular-nums">{money(l.amount)}</div>,
                        <div className="text-right tabular-nums">
                          {l.outstanding == null ? "—" : money(l.outstanding)}
                        </div>,
                        l.nextDueDate ? (
                          <div className="text-right">
                            {new Date(l.nextDueDate).toLocaleDateString()}
                            {l.nextDueAmount ? (
                              <span className="ml-1 font-bold">{money(l.nextDueAmount)}</span>
                            ) : null}
                          </div>
                        ) : (
                          "—"
                        ),
                        <div className="flex gap-2 justify-end">
                          <button
                            className="px-3 py-1.5 rounded-lg border-2 border-slate-400 text-slate-900 hover:bg-slate-50 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                            onClick={() => handleViewSchedule(l.id)}
                          >
                            Schedule
                          </button>
                          {String(userRole || "").toLowerCase() === "admin" && (
                            <button
                              className="px-3 py-1.5 rounded-lg border-2 border-slate-400 text-slate-900 hover:bg-slate-50 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                              onClick={() => {
                                setSelectedLoanForRepayment(l);
                                setShowRepaymentModal(true);
                              }}
                            >
                              Repay
                            </button>
                          )}
                        </div>,
                      ])}
                    />
                  )}
                </>
              )}

              {/* Repayments */}
              {activeTab === "repayments" && (
                <>
                  {repayments.length === 0 ? (
                    <Empty text="No repayments recorded for this borrower." />
                  ) : (
                    <Table
                      head={["Due Date", "Amount Due", "Paid", "Balance", "Status", "Loan"]}
                      rows={repayments.map((r) => {
                        const due = r.dueDate || r.date || r.createdAt || null;
                        const amt = safeNum(r.amount);
                        const paid = safeNum(r.amountPaid ?? r.paidAmount);
                        const bal = Math.max(0, amt - paid);
                        return [
                          due ? new Date(due).toLocaleDateString() : "—",
                          <div className="text-right tabular-nums">{money(amt)}</div>,
                          <div className="text-right tabular-nums">{money(paid)}</div>,
                          <div className="text-right tabular-nums">{money(bal)}</div>,
                          <span className={chip(r.status)}>{r.status || "—"}</span>,
                          r.loanId ? (
                            <Link
                              to={`/loans/${encodeURIComponent(r.loanId)}${
                                borrower?.tenantId
                                  ? `?tenantId=${encodeURIComponent(borrower.tenantId)}`
                                  : ""
                              }`}
                              className={strongLink}
                            >
                              {firstFilled(r.loan?.reference, `L-${r.loanId}`)}
                            </Link>
                          ) : (
                            "—"
                          ),
                        ];
                      })}
                    />
                  )}
                </>
              )}

              {/* Savings */}
              {activeTab === "savings" && (
                <>
                  {errors.savings && (
                    <div className="mb-3 text-sm text-rose-700 font-semibold">{errors.savings}</div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex gap-2">
                      {[
                        { key: "all", label: "All" },
                        { key: "deposit", label: "Deposits" },
                        { key: "withdrawal", label: "Withdrawals" },
                        { key: "charge", label: "Charges" },
                        { key: "interest", label: "Interest" },
                      ].map((f) => (
                        <button
                          key={f.key}
                          onClick={() => setFilterType(f.key)}
                          className={`px-3 py-1.5 rounded-full border-2 font-semibold ${
                            filterType === f.key
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white text-slate-900 border-slate-400 hover:bg-slate-50"
                          } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full md:w-auto">
                      {[
                        { k: "Deposits", v: money(deposits) },
                        { k: "Withdrawals", v: money(withdrawals) },
                        { k: "Charges", v: money(charges) },
                        { k: "Interest", v: money(interest) },
                        {
                          k: "Net",
                          v: money(net),
                        },
                      ].map((c, i) => (
                        <div
                          key={i}
                          className="rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-right"
                        >
                          <div className="text-[11px] font-semibold uppercase text-slate-700">
                            {c.k}
                          </div>
                          <div className="text-[15px] font-extrabold tabular-nums">{c.v}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {filteredSavings.length === 0 ? (
                    <Empty text="No savings transactions found." />
                  ) : (
                    <Table
                      head={["Date", "Type", "Amount", "Note/Ref"]}
                      rows={filteredSavings.map((t) => [
                        t.date || t.createdAt
                          ? new Date(t.date || t.createdAt).toLocaleDateString()
                          : "—",
                        <span className={chip(t.type)}>{t.type || "—"}</span>,
                        <div className="text-right tabular-nums">{money(t.amount)}</div>,
                        firstFilled(t.note, t.reference, t.ref, t.narration, "—"),
                      ])}
                    />
                  )}
                </>
              )}

              {/* Documents (placeholder) */}
              {activeTab === "documents" && (
                <Empty
                  text={
                    <>
                      No documents yet.
                      <Link
                        to={`/borrowers/${encodeURIComponent(borrower.id)}/documents${
                          borrower?.tenantId
                            ? `?tenantId=${encodeURIComponent(borrower.tenantId)}`
                            : ""
                        }`}
                        className={`ml-1 ${strongLink}`}
                      >
                        Manage documents
                      </Link>
                    </>
                  }
                />
              )}

              {/* Activity / Comments */}
              {activeTab === "activity" && (
                <div className="space-y-4">
                  <Card title="Add a note">
                    <AddComment onSubmit={handleAddComment} />
                  </Card>

                  <Card title="Recent notes">
                    {comments.length === 0 ? (
                      <Empty text="No notes yet." />
                    ) : (
                      <>
                        <ul className="space-y-3">
                          {visibleComments.map((c, i) => (
                            <li
                              key={i}
                              className="rounded-xl border-2 border-slate-300 bg-white p-3 shadow-sm"
                            >
                              <div className="text-sm">{c.content}</div>
                              <div className="mt-1 text-[11px] text-slate-600">
                                {c.createdAt ? new Date(c.createdAt).toLocaleString() : "—"}
                              </div>
                            </li>
                          ))}
                        </ul>
                        {comments.length > 3 && (
                          <div className="mt-3">
                            <button
                              onClick={() => setShowAllComments((x) => !x)}
                              className="px-3 py-1.5 rounded-lg border-2 border-slate-400 text-slate-900 hover:bg-slate-50 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                            >
                              {showAllComments ? "Show less" : "Show all"}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="space-y-6">
          <Card title="Account Summary">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border-2 border-slate-300 p-3">
                <div className="text-[11px] font-semibold uppercase text-slate-700">Loans</div>
                <div className="text-2xl font-extrabold">{loans.length}</div>
              </div>
              <div className="rounded-xl border-2 border-slate-300 p-3">
                <div className="text-[11px] font-semibold uppercase text-slate-700">Outstanding</div>
                <div className="text-2xl font-extrabold tabular-nums">
                  {money(
                    loansEnriched.reduce(
                      (s, l) => s + (Number.isFinite(l.outstanding) ? l.outstanding : 0),
                      0
                    )
                  )}
                </div>
              </div>
              <div className="rounded-xl border-2 border-slate-300 p-3">
                <div className="text-[11px] font-semibold uppercase text-slate-700">Deposits</div>
                <div className="text-2xl font-extrabold tabular-nums">{money(deposits)}</div>
              </div>
              <div className="rounded-xl border-2 border-slate-300 p-3">
                <div className="text-[11px] font-semibold uppercase text-slate-700">Net Savings</div>
                <div className="text-2xl font-extrabold tabular-nums">{money(net)}</div>
              </div>
            </div>
          </Card>

          <Card title="Branch & Officer">
            <DlGrid
              cols={1}
              items={[
                { label: "Branch", value: displayBranch(borrower) },
                { label: "Loan Officer", value: displayOfficer(borrower) },
                {
                  label: "Customer No.",
                  value: customerNumber || "—",
                },
              ]}
            />
          </Card>

          <Card title="Quick Actions">
            <div className="flex flex-col gap-2">
              <Link
                to={`/loans/applications?borrowerId=${encodeURIComponent(borrower.id)}${
                  borrower?.tenantId ? `&tenantId=${encodeURIComponent(borrower.tenantId)}` : ""
                }`}
                className="px-3 py-2 rounded-lg bg-indigo-600 text-white font-semibold text-center hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 shadow-sm"
              >
                New Loan
              </Link>
              <a
                href={tel(formatPhoneWithCC(borrower.phone || borrower.msisdn || borrower.mobile))}
                className="px-3 py-2 rounded-lg border-2 border-slate-400 text-slate-900 font-semibold text-center hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                Call Borrower
              </a>
              <a
                href={sms(formatPhoneWithCC(borrower.phone || borrower.msisdn || borrower.mobile))}
                className="px-3 py-2 rounded-lg border-2 border-slate-400 text-slate-900 font-semibold text-center hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                Send SMS
              </a>
            </div>
          </Card>
        </div>
      </div>

      {/* Modals */}
      {showScheduleModal && (
        <LoanScheduleModal
          open={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          schedule={selectedSchedule}
          loan={selectedLoan}
        />
      )}

      {showRepaymentModal && selectedLoanForRepayment && (
        <RepaymentModal
          open={showRepaymentModal}
          onClose={() => setShowRepaymentModal(false)}
          loan={selectedLoanForRepayment}
          borrower={borrower}
          onSaved={handleRepaymentSaved}
        />
      )}
    </div>
  );
};

/* -------- Small primitives used above -------- */
const Empty = ({ text }) => (
  <div className="p-6 rounded-xl border-2 border-slate-300 bg-slate-50 text-slate-700 text-sm">
    {text}
  </div>
);

const Table = ({ head = [], rows = [] }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left">
          {head.map((h, i) => (
            <th key={i} className="px-3 py-2 border-b-2 border-slate-300 font-bold">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="align-top">
            {(Array.isArray(r) ? r : [r]).map((c, j) => (
              <td key={j} className="px-3 py-2 border-b border-slate-200">
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const AddComment = ({ onSubmit }) => {
  const [val, setVal] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const v = val.trim();
        if (!v) return;
        onSubmit?.(v);
        setVal("");
      }}
      className="flex gap-2"
    >
      <textarea
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="Write a quick note..."
        className="flex-1 min-h-[70px] rounded-lg border-2 border-slate-400 px-3 py-2"
      />
      <button
        type="submit"
        className="self-start px-3 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 shadow-sm"
      >
        Add
      </button>
    </form>
  );
};

export default BorrowerDetails;
