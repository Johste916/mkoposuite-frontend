// BorrowerDetails.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { getUserRole } from "../utils/auth";
import LoanScheduleModal from "../components/LoanScheduleModal";
import RepaymentModal from "../components/RepaymentModal";
import api from "../api";

/* ---------------- Utilities ---------------- */
const safeNum = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const money = (v) => `TZS ${safeNum(v).toLocaleString()}`;

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
  firstFilled(
    b?.officerName,
    b?.officer?.name,
    b?.loanOfficer?.name,
    b?.loanOfficer
  ) || "—";

const initials = (nameLike) => {
  const s = String(nameLike || "").trim();
  if (!s) return "U";
  const p = s.split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || s[0].toUpperCase();
};

const chip = (status) => {
  const base = "px-2 py-0.5 text-xs font-semibold rounded-full border shadow-sm";
  const s = String(status || "").toLowerCase();
  switch (s) {
    case "pending":
    case "pending_kyc":
      return `${base} bg-amber-100 border-amber-300 text-amber-800`;
    case "approved":
      return `${base} bg-emerald-100 border-emerald-300 text-emerald-800`;
    case "rejected":
      return `${base} bg-rose-100 border-rose-300 text-rose-800`;
    case "active":
      return `${base} bg-blue-100 border-blue-300 text-blue-800`;
    case "disabled":
      return `${base} bg-slate-100 border-slate-300 text-slate-800`;
    case "blacklisted":
      return `${base} bg-red-100 border-red-300 text-red-800`;
    case "closed":
      return `${base} bg-gray-100 border-gray-300 text-gray-800`;
    default:
      return `${base} bg-gray-100 border-gray-300 text-gray-800`;
  }
};

/* GET with graceful fallbacks */
const tryGET = async (paths = [], opts = {}) => {
  let lastErr;
  for (const p of paths) {
    try {
      const res = await api.get(p, opts);
      return res?.data;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error(`All endpoints failed: ${paths.join(", ")}`);
};

const withTenant = (tenantId) =>
  tenantId ? { headers: { "X-Tenant-Id": tenantId } } : {};

/* Small visual helpers */
const strongLink =
  "text-indigo-700 font-semibold underline decoration-2 underline-offset-2 hover:text-indigo-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded-sm";

const Card = ({ title, icon, children, className = "" }) => (
  <section className={`rounded-2xl border border-gray-300 bg-white shadow-sm p-4 md:p-5 ${className}`}>
    {title && (
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-base md:text-lg font-semibold text-black">{title}</h2>
      </div>
    )}
    {children}
  </section>
);

const Field = ({ label, children }) => (
  <div>
    <div className="text-[12px] font-medium uppercase tracking-wider text-gray-700">
      {label}
    </div>
    <div className="mt-1 text-[15px] text-black">{isEmpty(children) ? "—" : children}</div>
  </div>
);

const DlGrid = ({ items, cols = 3 }) => {
  const colCls =
    cols === 2 ? "lg:grid-cols-2" : cols === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3";
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
  <div className="flex flex-wrap gap-2 border-b px-2 pt-2 border-gray-300">
    {tabs.map((t) => {
      const is = active === t.key;
      return (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-3 py-1.5 text-sm rounded-full border transition ${
            is
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white text-black hover:bg-gray-50 border-gray-300"
          } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400`}
        >
          {t.label}
          {typeof t.count === "number" && (
            <span
              className={`ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full text-xs ${
                is ? "bg-white/20 text-white" : "bg-gray-100 text-gray-800"
              } px-1.5`}
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
    if (v === null || v === undefined) continue;
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
const dmy = (v) => (v ? new Date(v).toLocaleDateString() : "—");
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

/* ---------- Component ---------- */
const BorrowerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const userRole = getUserRole();

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

  const mapBorrowerToForm = (b) => ({
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
    birthDate: firstFilled(b?.birthDate, b?.dateOfBirth, b?.dob),
    employmentStatus: firstFilled(b?.employmentStatus, b?.employment, b?.employmentType),
    occupation: firstFilled(b?.occupation, b?.businessType, b?.jobTitle, b?.sector),
    idType: firstFilled(b?.idType, b?.identificationType),
    nationalId: firstFilled(b?.nationalId, b?.nid, b?.idNumber),
    idIssuedDate: firstFilled(b?.idIssuedDate, b?.idIssueDate, b?.idDateIssued),
    idExpiryDate: firstFilled(b?.idExpiryDate, b?.idExpireDate, b?.idDateExpiry),
    nextKinName: firstFilled(b?.nextKinName, b?.nextOfKinName, b?.kinName, b?.emergencyContactName),
    nextKinPhone: firstFilled(b?.nextKinPhone, b?.nextOfKinPhone, b?.kinPhone, b?.emergencyContactPhone),
    nextOfKinRelationship: firstFilled(b?.nextOfKinRelationship, b?.kinRelationship, b?.relationship),
    branchId: b?.branchId ?? b?.Branch?.id ?? b?.branch?.id ?? "",
    officerId: b?.officerId ?? b?.officer?.id ?? b?.loanOfficer?.id ?? "",
    status: b?.status ?? "active",
  });

  const fetchBorrowerBundle = async () => {
    setErrors({ loans: null, savings: null });
    try {
      const b = await tryGET([`/borrowers/${id}`]);
      setBorrower(b);
      setForm(mapBorrowerToForm(b));

      const qTenant = b?.tenantId ? `&tenantId=${encodeURIComponent(b.tenantId)}` : "";

      const [loanData, repayData, commentData, savingsData] = await Promise.all([
        tryGET([`/loans?borrowerId=${id}${qTenant}`, `/borrowers/${id}/loans`, `/loans/borrower/${id}`]).catch(() => {
          setErrors((x) => ({ ...x, loans: "Couldn’t load loans." }));
          return [];
        }),
        tryGET([`/repayments?borrowerId=${id}${qTenant}`, `/borrowers/${id}/repayments`, `/repayments/borrower/${id}`]).catch(
          () => []
        ),
        tryGET([`/borrowers/${id}/comments`, `/comments/borrower/${id}`]).catch(() => []),
        // prefer borrower route to avoid 404
        tryGET([`/borrowers/${id}/savings`, `/savings/borrower/${id}`]).catch(() => {
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
      setSavings(txs);
      setFilteredSavings(txs);
    } catch (err) {
      console.error("Fetch borrower bundle failed:", err?.message || err);
    }
  };

  // load dropdown options (branches, officers)
  const fetchOptionLists = async (tenantId) => {
    try {
      const opt = withTenant(tenantId);
      const [branchRes, officerRes] = await Promise.all([
        tryGET(
          ["/branches", "/org/branches", "/branch"],
          opt
        ).catch(() => []),
        tryGET(
          ["/users?role=officer", "/officers", "/users/loan-officers"],
          opt
        ).catch(() => []),
      ]);

      const brs = Array.isArray(branchRes?.items) ? branchRes.items : Array.isArray(branchRes) ? branchRes : [];
      const ofs = Array.isArray(officerRes?.items) ? officerRes.items : Array.isArray(officerRes) ? officerRes : [];

      setBranches(
        brs.map((b) => ({
          id: b.id ?? b._id ?? b.code ?? b.uuid,
          name: b.name ?? b.title ?? b.code ?? "—",
        }))
      );
      setOfficers(
  (Array.isArray(ofs) ? ofs : []).map((u) => ({
    id: firstFilled(u.id, u._id, u.userId),
    name:
      firstFilled(
        u.name,
        [u.firstName, u.lastName].filter(Boolean).join(" "),
        u.email
      ) || "—",
  }))
);
    } catch (e) {
      // leave empty; selects will degrade to text
      console.warn("Option list fetch failed", e?.message || e);
    }
  };

  useEffect(() => {
    fetchBorrowerBundle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // refresh option lists when borrower (tenant) known
  useEffect(() => {
    if (borrower?.tenantId !== undefined) {
      fetchOptionLists(borrower?.tenantId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [borrower?.tenantId]);

  // auto-refresh this page when any other page broadcasts a loan update
  useEffect(() => {
    const onUpdated = () => fetchBorrowerBundle();
    window.addEventListener("loan:updated", onUpdated);
    return () => window.removeEventListener("loan:updated", onUpdated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (filterType === "all") setFilteredSavings(savings);
    else setFilteredSavings(savings.filter((tx) => tx.type === filterType));
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

  const handleViewSchedule = async (loanId) => {
    try {
      const data = await tryGET([`/loans/${loanId}/schedule`, `/loan/${loanId}/schedule`]);
      setSelectedSchedule(Array.isArray(data) ? data : data?.items || []);
      const loan = loans.find((l) => String(l.id) === String(loanId)) || null;
      setSelectedLoan(loan);
      setShowScheduleModal(true);
    } catch (err) {
      console.error("Error fetching loan schedule:", err);
    }
  };

  const handleRepaymentSaved = async () => {
    try {
      const repay = await tryGET([
        `/repayments?borrowerId=${id}${borrower?.tenantId ? `&tenantId=${encodeURIComponent(borrower.tenantId)}` : ""}`,
        `/borrowers/${id}/repayments`,
      ]);
      setRepayments(Array.isArray(repay) ? repay : repay?.items || []);
    } catch {}
    await fetchBorrowerBundle();
    window.dispatchEvent(new CustomEvent("loan:updated", { detail: { id: selectedLoanForRepayment?.id } }));
  };

  // Inline edit handlers
  const onChange = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const saveUpdates = async () => {
    if (!form?.id) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        email: form.email,
        address: form.addressLine,
        status: form.status,
        nationalId: form.nationalId,
        branchId: form.branchId || null,
        officerId: form.officerId || null,
        idType: form.idType,
        idIssuedDate: form.idIssuedDate || null,
        idExpiryDate: form.idExpiryDate || null,
        nextKinName: form.nextKinName,
        nextKinPhone: form.nextKinPhone,
        nextOfKinRelationship: form.nextOfKinRelationship,
        employmentStatus: form.employmentStatus,
        occupation: form.occupation,
        birthDate: form.birthDate || null,
        gender: form.gender,
      };

      await api.patch(`/borrowers/${form.id}`, payload, withTenant(borrower?.tenantId));

      // IMPORTANT: Re-fetch canonical borrower to reflect formatting/mirrors from backend
      await fetchBorrowerBundle();
      setIsEditing(false);
    } catch (e) {
      alert("Couldn’t update borrower.");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Admin actions
  const handleDisable = async () => {
    if (!window.confirm("Disable this borrower? They will not be able to apply or receive disbursements.")) return;
    try {
      await api.post(`/borrowers/${id}/disable`, {}, withTenant(borrower?.tenantId));
      setBorrower((b) => ({ ...b, status: "disabled" }));
    } catch {
      try {
        await api.patch(`/borrowers/${id}`, { status: "disabled" }, withTenant(borrower?.tenantId));
        setBorrower((b) => ({ ...b, status: "disabled" }));
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
    } catch {
      try {
        await api.patch(`/borrowers/${id}`, { status: "blacklisted" }, withTenant(borrower?.tenantId));
        setBorrower((b) => ({ ...b, status: "blacklisted" }));
      } catch {
        alert("Could not blacklist borrower.");
      }
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Permanently delete this borrower and their client profile? This cannot be undone.")) return;
    try {
      await api.delete(`/borrowers/${id}`, withTenant(borrower?.tenantId));
      navigate("/borrowers");
    } catch {
      alert("Could not delete borrower.");
    }
  };

  const missedRepayments = useMemo(() => {
    const today = new Date();
    return repayments.filter((r) => {
      const due = r.dueDate ? new Date(r.dueDate) : null;
      const status = String(r.status || "").toLowerCase();
      const paid = safeNum(r.amountPaid ?? r.paidAmount) > 0;
      return due && due < today && !paid && (status === "overdue" || status === "due" || status === "");
    }).length;
  }, [repayments]);

  if (!borrower || !form) {
    return <div className="p-4 min-h-screen bg-white text-black">Loading...</div>;
  }

  const bName = displayName(borrower);
  const tenantQuery = borrower?.tenantId ? `?tenantId=${encodeURIComponent(borrower.tenantId)}` : "";
  const visibleComments = showAllComments ? comments : comments.slice(0, 3);

  const tel = (p) => (p ? `tel:${p}` : undefined);
  const sms = (p) => (p ? `sms:${p}` : undefined);
  const wa = (p) => (p ? `https://wa.me/${String(p).replace(/[^\d]/g, "")}` : undefined);
  const mail = (e) => (e ? `mailto:${e}` : undefined);

  // Savings aggregates
  const deposits = savings.reduce((s, t) => (t.type === "deposit" ? s + safeNum(t.amount) : s), 0);
  const withdrawals = savings.reduce((s, t) => (t.type === "withdrawal" ? s + safeNum(t.amount) : s), 0);
  const charges = savings.reduce((s, t) => (t.type === "charge" ? s + safeNum(t.amount) : s), 0);
  const interest = savings.reduce((s, t) => (t.type === "interest" ? s + safeNum(t.amount) : s), 0);

  const addr = firstFilled(
    borrower.addressLine,
    [borrower.street, borrower.houseNumber, borrower.ward, borrower.district, borrower.city]
      .filter(Boolean)
      .join(", "),
    [borrower.address, borrower.town, borrower.region, borrower.country].filter(Boolean).join(", "),
    borrower.location
  );

  const businessName = firstFilled(borrower.businessName, borrower.tradeName, borrower.shopName);
  const occupation = firstFilled(borrower.occupation, borrower.businessType, borrower.jobTitle, borrower.sector);
  const employmentStatus = firstFilled(borrower.employmentStatus, borrower.employment, borrower.employmentType);
  const nationalId = firstFilled(borrower.nationalId, borrower.nid, borrower.idNumber);
  const idType = firstFilled(borrower.idType, borrower.identificationType);
  const idIssued = firstFilled(borrower.idIssuedDate, borrower.idIssueDate, borrower.idDateIssued);
  const idExpiry = firstFilled(borrower.idExpiryDate, borrower.idExpireDate, borrower.idDateExpiry);
  const maritalStatus = firstFilled(borrower.maritalStatus, borrower.marriageStatus);
  const educationLevel = firstFilled(borrower.educationLevel, borrower.education, borrower.educationStatus);
  const customerNumber = firstFilled(borrower.customerNumber, borrower.accountNumber, borrower.clientNumber);
  const tin = firstFilled(borrower.tin, borrower.TIN, borrower.taxId);
  const nationality = firstFilled(borrower.nationality, borrower.country);
  const dob = firstFilled(borrower.birthDate, borrower.dateOfBirth, borrower.dob);

  const nextKinName = firstFilled(borrower.nextKinName, borrower.nextOfKinName, borrower.kinName, borrower.emergencyContactName);
  const nextKinPhone = firstFilled(borrower.nextKinPhone, borrower.nextOfKinPhone, borrower.kinPhone, borrower.emergencyContactPhone);
  const nextKinRel = firstFilled(borrower.nextOfKinRelationship, borrower.kinRelationship, borrower.relationship);

  const registrationDate = firstFilled(borrower.regDate, borrower.registrationDate, borrower.createdAt);

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
    <div className="p-4 md:p-6 min-h-screen bg-white text-black">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm">
          <Link to={`/borrowers${tenantQuery}`} className={strongLink}>
            Borrowers
          </Link>{" "}
          <span className="text-gray-700">/</span>{" "}
          <span className="font-medium">{bName}</span>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="text-black border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
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
                className="text-black border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                Cancel
              </button>
              <button
                onClick={saveUpdates}
                disabled={saving}
                className="bg-indigo-600 disabled:opacity-60 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </>
          )}
          {!isEditing && (
            <>
              <button
                onClick={handleDisable}
                className="text-black border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                Disable
              </button>
              <button
                onClick={handleBlacklist}
                className="bg-rose-600 text-white px-3 py-1.5 rounded-md hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
              >
                Blacklist
              </button>
              <button
                onClick={handleDelete}
                className="bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* MAIN */}
        <div className="lg:col-span-3 space-y-5">
          {/* Profile */}
          <Card>
            <div className="flex gap-5">
              {/* Avatar */}
              <div className="relative shrink-0">
                {borrower.photoUrl ? (
                  <img
                    src={borrower.photoUrl}
                    alt={bName}
                    className="w-24 h-24 rounded-2xl object-cover border border-gray-300"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center text-2xl font-semibold">
                    {initials(bName)}
                  </div>
                )}
                <span className={`absolute -bottom-2 left-2 ${chip(borrower.status)}`}>
                  {borrower.status || "—"}
                </span>
              </div>

              {/* Name + quick contact */}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {isEditing ? (
                    <input
                      value={form.name ?? ""}
                      onChange={(e) => onChange("name", e.target.value)}
                      className="text-2xl font-bold tracking-tight border border-gray-300 rounded-md px-2 py-1"
                      placeholder="Full name"
                    />
                  ) : (
                    <h1 className="text-2xl font-bold tracking-tight">{bName}</h1>
                  )}
                  <span className="text-xs text-gray-700">ID: {borrower.id}</span>
                  <span className="text-xs text-gray-700">Tenant: {borrower.tenantId || "—"}</span>
                </div>

                <div className="mt-2 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Field label="Phone">
                    {isEditing ? (
                      <input
                        value={form.phone ?? ""}
                        onChange={(e) => onChange("phone", e.target.value)}
                        className="w-full text-sm border border-gray-300 rounded-md px-3 py-2"
                        placeholder="e.g., 2557xxxxxxx"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>
                          {firstFilled(borrower.phone, borrower.msisdn, borrower.mobile, borrower.primaryPhone) ||
                            "—"}
                        </span>
                        {firstFilled(borrower.phone, borrower.msisdn, borrower.mobile, borrower.primaryPhone) && (
                          <>
                            <a className={strongLink} href={tel(borrower.phone || borrower.msisdn || borrower.mobile || borrower.primaryPhone)}>Call</a>
                            <a className={strongLink} href={sms(borrower.phone || borrower.msisdn || borrower.mobile || borrower.primaryPhone)}>SMS</a>
                            <a className={strongLink} href={wa(borrower.phone || borrower.msisdn || borrower.mobile || borrower.primaryPhone)} target="_blank" rel="noreferrer">WhatsApp</a>
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
                        className="w-full text-sm border border-gray-300 rounded-md px-3 py-2"
                        placeholder="e.g., user@email.com"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>{firstFilled(borrower.email, borrower.mail) || "—"}</span>
                        {firstFilled(borrower.email, borrower.mail) && (
                          <a className={strongLink} href={mail(borrower.email || borrower.mail)}>Email</a>
                        )}
                      </div>
                    )}
                  </Field>

                  <Field label="Address">
                    {isEditing ? (
                      <input
                        value={form.addressLine ?? ""}
                        onChange={(e) => onChange("addressLine", e.target.value)}
                        className="w-full text-sm border border-gray-300 rounded-md px-3 py-2"
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
            <hr className="my-4 border-gray-300" />

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
                        className="text-sm border border-gray-300 rounded-md px-2 py-1"
                      >
                        {GENDER_OPTS.map((o) => (
                          <option key={o.v} value={o.v}>{o.t}</option>
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
                        className="text-sm border border-gray-300 rounded-md px-2 py-1"
                      />
                    ) : (
                      dmy(dob)
                    ),
                  },
                  {
                    label: "Business / Occupation",
                    value: isEditing ? (
                      <input
                        value={form.occupation ?? ""}
                        onChange={(e) => onChange("occupation", e.target.value)}
                        className="text-sm border border-gray-300 rounded-md px-2 py-1"
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
                        className="text-sm border border-gray-300 rounded-md px-2 py-1"
                      >
                        {EMPLOYMENT_OPTS.map((o) => (
                          <option key={o.v} value={o.v}>{o.t}</option>
                        ))}
                      </select>
                    ) : (
                      employmentStatus
                    ),
                  },
                  { label: "Customer No.", value: customerNumber },
                  { label: "Nationality", value: nationality },
                  {
                    label: "Status",
                    value: isEditing ? (
                      <select
                        value={form.status ?? "active"}
                        onChange={(e) => onChange("status", e.target.value)}
                        className="text-sm border border-gray-300 rounded-md px-2 py-1"
                      >
                        {STATUS_OPTS.map((o) => (
                          <option key={o.v} value={o.v}>{o.t}</option>
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
                            className="text-sm border border-gray-300 rounded-md px-2 py-1"
                          >
                            {IDTYPE_OPTS.map((o) => (
                              <option key={o.v} value={o.v}>{o.t}</option>
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
                            className="text-sm border border-gray-300 rounded-md px-2 py-1"
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
                            className="text-sm border border-gray-300 rounded-md px-2 py-1"
                          />
                        ) : (
                          dmy(idIssued)
                        ),
                      },
                      {
                        label: "Expiry Date",
                        value: isEditing ? (
                          <input
                            type="date"
                            value={form.idExpiryDate ? isoDateOnly(form.idExpiryDate) : ""}
                            onChange={(e) => onChange("idExpiryDate", e.target.value)}
                            className="text-sm border border-gray-300 rounded-md px-2 py-1"
                          />
                        ) : (
                          dmy(idExpiry)
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
                              className="text-sm border border-gray-300 rounded-md px-2 py-1"
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
                              className="text-sm border border-gray-300 rounded-md px-2 py-1"
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
                              className="text-sm border border-gray-300 rounded-md px-2 py-1"
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
                              className="text-sm border border-gray-300 rounded-md px-2 py-1"
                              placeholder="Officer ID"
                            />
                          )
                        ) : (
                          displayOfficer(borrower)
                        ),
                      },
                      { label: "Loan Type", value: firstFilled(borrower.loanType, borrower.productType, "individual") },
                      { label: "Group ID", value: firstFilled(borrower.groupId, borrower.group, borrower.groupCode) },
                      { label: "Registration Date", value: dmy(registrationDate) },
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
                          className="text-sm border border-gray-300 rounded-md px-2 py-1"
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
                          className="text-sm border border-gray-300 rounded-md px-2 py-1"
                        />
                      ) : (
                        nextKinPhone
                      ),
                    },
                    {
                      label: "Relationship",
                      value: isEditing ? (
                        <input
                          value={form.nextOfKinRelationship ?? ""}
                          onChange={(e) => onChange("nextOfKinRelationship", e.target.value)}
                          className="text-sm border border-gray-300 rounded-md px-2 py-1"
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
              { k: "Overdue Amount", v: money(firstFilled(borrower.overdueAmount, borrower.pastDueAmount, 0)) },
              { k: "Missed Repayments", v: missedRepayments },
              { k: "Net Savings", v: money(firstFilled(borrower.netSavings, borrower.savingsNet, 0)) },
            ].map((c, i) => (
              <div key={i} className="rounded-2xl p-4 border bg-white border-gray-300">
                <div className="text-[12px] font-medium uppercase tracking-wider text-gray-700">{c.k}</div>
                <div className="mt-1 text-2xl font-semibold text-black">{c.v}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="rounded-2xl border bg-white border-gray-300">
            <PillTabs
              active={activeTab}
              onChange={setActiveTab}
              tabs={[
                { key: "loans", label: "Loans", count: loans.length },
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
                  {errors.loans && <div className="mb-3 text-sm text-rose-700 font-medium">{errors.loans}</div>}
                  {loans.length === 0 ? (
                    <Empty
                      text={
                        <>
                          No loans for this borrower.
                          <Link
                            to={`/loans/applications?borrowerId=${encodeURIComponent(borrower.id)}${
                              borrower?.tenantId ? `&tenantId=${encodeURIComponent(borrower.tenantId)}` : ""
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
                      head={["Loan", "Reference", "Status", "Amount", "Outstanding", "Next Due", "Actions"]}
                      rows={loans.map((l) => {
                        const outTotal = l.outstanding ?? l.outstandingTotal ?? l.outstandingAmount ?? null;
                        const nextDate = l.nextDueDate || l.nextInstallmentDate || null;
                        const nextAmt = l.nextDueAmount || l.nextInstallmentAmount || null;

                        return [
                          <Link
                            to={`/loans/${encodeURIComponent(l.id)}${
                              borrower?.tenantId ? `?tenantId=${encodeURIComponent(borrower.tenantId)}` : ""
                            }`}
                            className={strongLink}
                          >
                            {l.id}
                          </Link>,
                          l.reference || `L-${l.id}`,
                          <span className={chip(l.status)}>{String(l.status || "—")}</span>,
                          <div className="text-right tabular-nums">{money(l.amount)}</div>,
                          <div className="text-right tabular-nums">{outTotal == null ? "—" : money(outTotal)}</div>,
                          nextDate ? (
                            <div className="text-right">
                              {new Date(nextDate).toLocaleDateString()}
                              {nextAmt ? <span className="ml-1 font-medium">{money(nextAmt)}</span> : null}
                            </div>
                          ) : (
                            "—"
                          ),
                          <div className="flex gap-2 justify-end">
                            <button
                              className="px-3 py-1.5 rounded-md border border-gray-300 text-black hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                              onClick={() => handleViewSchedule(l.id)}
                            >
                              Schedule
                            </button>
                            {String(userRole || "").toLowerCase() === "admin" && (
                              <button
                                className="px-3 py-1.5 rounded-md border border-gray-300 text-black hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                                onClick={() => {
                                  setSelectedLoanForRepayment(l);
                                  setShowRepaymentModal(true);
                                }}
                              >
                                Repay
                              </button>
                            )}
                          </div>,
                        ];
                      })}
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
                      head={["Date", "Amount", "Loan", "Status"]}
                      rows={repayments.map((r) => [
                        r.date
                          ? new Date(r.date).toLocaleDateString()
                          : r.createdAt
                          ? new Date(r.createdAt).toLocaleDateString()
                          : "—",
                        <div className="text-right tabular-nums">{money(r.amount)}</div>,
                        r.loanId ? (
                          <Link
                            to={`/loans/${encodeURIComponent(r.loanId)}${
                              borrower?.tenantId ? `?tenantId=${encodeURIComponent(borrower.tenantId)}` : ""
                            }`}
                            className={strongLink}
                          >
                            {r.loanId}
                          </Link>
                        ) : (
                          "—"
                        ),
                        <span className={chip(r.status)}>{r.status || "—"}</span>,
                      ])}
                    />
                  )}
                </>
              )}

              {/* Savings */}
              {activeTab === "savings" && (
                <>
                  {errors.savings && <div className="mb-3 text-sm text-rose-700 font-medium">{errors.savings}</div>}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-3 text-sm">
                    <BadgeCard label="Deposits" value={money(deposits)} tone="emerald" />
                    <BadgeCard label="Withdrawals" value={money(withdrawals)} tone="amber" />
                    <BadgeCard label="Interest" value={money(interest)} tone="sky" />
                    <BadgeCard label="Charges" value={money(charges)} tone="rose" />
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-black">Filter:</span>
                      <label className="relative z-50">
                        <select
                          value={filterType}
                          onChange={(e) => setFilterType(e.target.value)}
                          className="text-sm border border-gray-300 rounded-md px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                        >
                          <option value="all">All</option>
                          <option value="deposit">Deposits</option>
                          <option value="withdrawal">Withdrawals</option>
                          <option value="interest">Interest</option>
                          <option value="charge">Charges</option>
                        </select>
                      </label>
                    </div>
                    <Link
                      to={`/savings${tenantQuery}${tenantQuery ? "&" : "?"}borrowerId=${encodeURIComponent(borrower.id)}`}
                      className={`${strongLink} text-sm`}
                    >
                      View savings accounts
                    </Link>
                  </div>

                  {filteredSavings.length === 0 ? (
                    <Empty text="No savings transactions for this borrower." />
                  ) : (
                    <Table
                      head={["Date", "Type", "Amount", "Notes"]}
                      rows={filteredSavings.map((tx) => [
                        tx.date ? new Date(tx.date).toLocaleDateString() : "—",
                        <span className="capitalize">{tx.type}</span>,
                        <div className="text-right tabular-nums">{money(tx.amount)}</div>,
                        tx.notes || "—",
                      ])}
                    />
                  )}
                </>
              )}

              {/* Documents */}
              {activeTab === "documents" && (
                <div className="text-sm">
                  <Link
                    to={`/borrowers/${encodeURIComponent(borrower.id)}/documents${tenantQuery}`}
                    className={strongLink}
                  >
                    Manage KYC documents
                  </Link>
                </div>
              )}

              {/* Activity */}
              {activeTab === "activity" && (
                <ActivityTimeline
                  loans={loans}
                  repayments={repayments}
                  savings={savings}
                  comments={comments}
                  canAddRepayment={String(userRole || "").toLowerCase() === "admin"}
                  onAddRepayment={() => {
                    const active = loans.find((l) => l.status === "active") || loans[0];
                    if (active) {
                      setSelectedLoanForRepayment(active);
                      setShowRepaymentModal(true);
                    }
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* NOTES SIDEBAR */}
        <aside className="lg:col-span-1 space-y-5">
          <Card title="Notes">
            <input
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddComment(e.currentTarget.value);
                  e.currentTarget.value = "";
                }
              }}
              placeholder="Add a note and press Enter…"
              className="w-full text-sm mb-3 border border-gray-300 rounded-md px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            />
            {comments.length === 0 ? (
              <div className="text-xs text-gray-700">No notes yet.</div>
            ) : (
              <>
                <ul className="space-y-2">
                  {visibleComments.map((c, i) => (
                    <li key={`${i}-${c.createdAt}`} className="p-2 text-xs rounded-lg border border-gray-300 bg-white">
                      <div className="text-black">{c.content}</div>
                      <div className="text-[10px] text-gray-700 mt-1">
                        {c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}
                      </div>
                    </li>
                  ))}
                </ul>
                {comments.length > 3 && (
                  <button
                    onClick={() => setShowAllComments((s) => !s)}
                    className="mt-3 w-full text-xs px-3 py-1.5 rounded-md border border-gray-300 text-black hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                  >
                    {showAllComments ? "Show less" : `Show all (${comments.length})`}
                  </button>
                )}
              </>
            )}
          </Card>
        </aside>
      </div>

      {/* Modals */}
      {showScheduleModal && selectedLoan && (
        <LoanScheduleModal
          loan={selectedLoan}
          schedule={selectedSchedule}
          onClose={() => setShowScheduleModal(false)}
        />
      )}

      {showRepaymentModal && selectedLoanForRepayment && (
        <RepaymentModal
          isOpen={showRepaymentModal}
          onClose={() => setShowRepaymentModal(false)}
          loan={selectedLoanForRepayment}
          onSaved={handleRepaymentSaved}
        />
      )}
    </div>
  );
};

/* ---------- Support UI pieces ---------- */
const Empty = ({ text }) => (
  <div className="p-6 text-sm rounded-2xl border border-dashed border-gray-300 text-black bg-white">
    {text}
  </div>
);

const Table = ({ head = [], rows = [] }) => (
  <div className="overflow-auto rounded-xl border border-gray-300 bg-white">
    <table className="min-w-full text-[15px]">
      <thead className="bg-gray-100 text-black">
        <tr className="text-left">
          {head.map((h, i) => (
            <th key={i} className={`px-3 py-2 font-semibold ${i === head.length - 1 ? "text-right" : ""}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="odd:bg-white even:bg-gray-50 hover:bg-gray-100/70">
            {r.map((c, j) => (
              <td key={j} className={`px-3 py-2 align-top ${j === head.length - 1 ? "text-right" : ""}`}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const BadgeCard = ({ label, value, tone = "emerald" }) => {
  const toneMap = {
    emerald: "bg-emerald-50 text-emerald-800 border border-emerald-200",
    amber: "bg-amber-50 text-amber-800 border border-amber-200",
    sky: "bg-sky-50 text-sky-800 border border-sky-200",
    rose: "bg-rose-50 text-rose-800 border border-rose-200",
  };
  return (
    <div className={`p-3 rounded-xl text-sm ${toneMap[tone]}`}>
      {label}: <strong>{value}</strong>
    </div>
  );
};

const ActivityTimeline = ({ loans, repayments, savings, comments, canAddRepayment, onAddRepayment }) => {
  const items = [];
  loans.forEach((l) =>
    items.push({
      type: "loan",
      date: l.createdAt || l.disbursedAt || l.updatedAt || new Date().toISOString(),
      text: `Loan ${l.id} • ${String(l.status || "").toUpperCase()}`,
    })
  );
  repayments.forEach((r) =>
    items.push({
      type: "repayment",
      date: r.date || r.createdAt || new Date().toISOString(),
      text: `Repayment • ${money(r.amount)} • Loan ${r.loanId || "—"}`,
    })
  );
  savings.forEach((s) =>
    items.push({
      type: "savings",
      date: s.date || s.createdAt || new Date().toISOString(),
      text: `${s.type} • ${money(s.amount)}`,
    })
  );
  comments.forEach((c) =>
    items.push({
      type: "comment",
      date: c.createdAt || new Date().toISOString(),
      text: `Note: ${c.content}`,
    })
  );
  items.sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-black">📜 Activity Timeline</h4>
        {canAddRepayment && (
          <button
            onClick={onAddRepayment}
            className="bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            Record Repayment
          </button>
        )}
      </div>
      <ul className="space-y-2 text-sm">
        {items.map((item, i) => (
          <li key={i} className="border-l-4 pl-3 border-gray-300 text-black">
            <span className="text-gray-700">
              {item.date ? new Date(item.date).toLocaleDateString() : "—"}
            </span>{" "}
            – {item.text}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default BorrowerDetails;
