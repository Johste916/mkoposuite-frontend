import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { getUserRole } from "../utils/auth";
import LoanScheduleModal from "../components/LoanScheduleModal";
import RepaymentModal from "../components/RepaymentModal";
import api from "../api";

/* ---------------- Utilities ---------------- */
const safeNum = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const money = (v) => `TZS ${safeNum(v).toLocaleString()}`;

/** Default country code for phone normalisation */
const DEFAULT_CC = "+255";
function formatPhoneWithCC(raw, cc = DEFAULT_CC) {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (s.startsWith("+")) return s;
  if (s.startsWith("00")) return `+${s.slice(2)}`;
  if (/^0\d{6,}$/.test(s)) return `${cc}${s.slice(1)}`;
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

const displayBranch = (b, list = []) =>
  firstFilled(
    b?.branchName,
    b?.Branch?.name,
    b?.branch?.name,
    b?.branch,
    list.find((x) => eqId(x.id, b?.branchId))?.name,
    b?.branchId
  ) || "—";

const displayOfficer = (b, list = []) =>
  firstFilled(
    b?.officerName,
    b?.loanOfficerName,
    b?.officer?.name,
    b?.loanOfficer?.name,
    b?.loanOfficer,
    list.find((x) => eqId(x.id, officerIdFromBorrower(b)))?.name
  ) || "—";

const displayGroup = (b, list = []) =>
  firstFilled(
    b?.groupName,
    b?.group?.name,
    b?.Group?.name,
    b?.groupTitle,
    list.find((x) => eqId(x.id, b?.groupId))?.name,
    b?.groupId
  ) || "—";

const initials = (nameLike) => {
  const s = String(nameLike || "").trim();
  if (!s) return "U";
  const p = s.split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || s[0].toUpperCase();
};

const chip = (status) => {
  const base =
    "px-2 py-0.5 text-[11px] font-bold uppercase rounded-full border-2 ring-1 ring-inset shadow-sm";
  const s = String(status || "").toLowerCase();
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
      return `${base} bg-gray-100 border-gray-300 ring-gray-200 text-gray-900`;
    case "disabled":
      return `${base} bg-slate-100 border-slate-300 ring-slate-200 text-slate-900`;
    case "blacklisted":
      return `${base} bg-red-100 border-red-300 ring-red-200 text-red-900`;
    case "closed":
      return `${base} bg-gray-100 border-gray-300 ring-gray-200 text-gray-900`;
    default:
      return `${base} bg-gray-100 border-gray-300 ring-gray-200 text-gray-900`;
  }
};

/* GET with graceful fallbacks (uses api.getFirst which also tries /api variants) */
const tryGET = async (paths = [], opts = {}) => api.getFirst(paths, opts);

/* tenant helpers */
const withTenant = (tenantId) => (tenantId ? { headers: { "x-tenant-id": tenantId } } : {});
const effectiveTenantId = (borrowerTenant, urlTenant) =>
  borrowerTenant || urlTenant || (typeof api.getTenantId === "function" ? api.getTenantId() : null);

const eqId = (a, b) => String(a ?? "") === String(b ?? "");
const officerIdFromBorrower = (b) =>
  firstFilled(b?.loanOfficerId, b?.officerId, b?.loanOfficer?.id,b?.assignedOfficerId,b?.loanOfficerUserId, b?.officer?.id, b?.loanOfficer?.userId,"");

const branchIdFromBorrower = (b) =>
  firstFilled(b?.branchId, b?.branch?.id, b?.Branch?.id, b?.branchCode, "");

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
    <div className="text-[12px] font-semibold uppercase tracking-wider text-slate-900">
      {label}
    </div>
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
        <Field key={`${it.label}-${i}`} label={it.label}>
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

function splitNameParts(full) {
  const s = String(full || "").trim();
  if (!s) return { firstName: "", lastName: "" };
  const parts = s.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

/* ---------------- Per-tenant caches ---------------- */
const _tenantCache = {
  officers: new Map(), // tenantId -> [{id, name, email}]
  groups: new Map(),   // tenantId -> [{id, name}]
  branches: new Map(), // tenantId -> [{id, name}]
};


/* tiny label helper */
const placeholderFrom = (status, okText, emptyText = "No options") => {
  switch (status) {
    case "loading":
      return "Loading…";
    case "error":
      return "Failed to load — Retry";
    case "empty":
      return emptyText;
    default:
      return okText;
  }
};

/* ---------- Component ---------- */
const BorrowerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const userRole = getUserRole();
  const [searchParams] = useSearchParams();

  // Prefer explicit tenant from URL; fallback to stored/active tenant if your api util provides it.
  const tenantIdParam = searchParams.get("tenantId") || undefined;

  const [borrower, setBorrower] = useState(null);
  const [loans, setLoans] = useState([]);
  const [repayments, setRepayments] = useState([]);
  const [comments, setComments] = useState([]);

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

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

  // NEW: officers & groups for assignment UI (+ statuses)
  const [officers, setOfficers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [officersStatus, setOfficersStatus] = useState("loading"); // loading | ok | empty | error
  const [groupsStatus, setGroupsStatus] = useState("loading"); // loading | ok | empty | error
  const [reloadOfficersKey, setReloadOfficersKey] = useState(0);
  const [reloadGroupsKey, setReloadGroupsKey] = useState(0);
  const [branches, setBranches] = useState([]);
  const [branchesStatus, setBranchesStatus] = useState("loading"); // loading | ok | empty | error
  const [reloadBranchesKey, setReloadBranchesKey] = useState(0);


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
  idNumber: firstFilled(b?.idNumber, b?.nationalId, b?.nid),
  idIssuedDate: firstFilled(b?.idIssuedDate, b?.idIssueDate, b?.idDateIssued),
  idExpiryDate: firstFilled(b?.idExpiryDate, b?.idExpireDate, b?.idDateExpiry),
  nextKinName: firstFilled(b?.nextKinName, b?.nextOfKinName, b?.kinName, b?.emergencyContactName),
  nextKinPhone: firstFilled(b?.nextKinPhone, b?.nextOfKinPhone, b?.kinPhone, b?.emergencyContactPhone),
  nextOfKinRelationship: firstFilled(b?.nextOfKinRelationship, b?.kinRelationship, b?.relationship),
  status: b?.status ?? "active",
  maritalStatus: firstFilled(b?.maritalStatus, b?.marriageStatus),
  educationLevel: firstFilled(b?.educationLevel, b?.education, b?.educationStatus),
  customerNumber: firstFilled(b?.customerNumber, b?.accountNumber, b?.clientNumber),
  tin: firstFilled(b?.tin, b?.TIN, b?.taxId),
  nationality: firstFilled(b?.nationality, b?.country),
  groupId: firstFilled(b?.groupId, b?.group?.id, b?.Group?.id, b?.group, b?.groupCode),
  loanType: firstFilled(b?.loanType, b?.productType, "individual"),
  regDate: firstFilled(b?.regDate, b?.registrationDate),
  tenantId: b?.tenantId,
  loanOfficerId: officerIdFromBorrower(b),
  branchId: branchIdFromBorrower(b),            // <-- add this line
});

  const fetchBorrowerBundle = async () => {
    setErrors({ loans: null, savings: null });
    const { signal, cancel } = api.withAbort();
    try {
      const firstTenant = effectiveTenantId(null, tenantIdParam);
      const firstOpt = withTenant(firstTenant);
      const firstQuery = firstTenant ? `?tenantId=${encodeURIComponent(firstTenant)}` : "";

      let b = null;
      try {
        b = await tryGET([`/borrowers/${id}${firstQuery}`], { ...firstOpt, signal });
      } catch {
        b = await tryGET([`/borrowers/${id}`], { signal });
      }

      setBorrower(b);
      setForm(mapBorrowerToForm(b));

      const tId = effectiveTenantId(b?.tenantId, tenantIdParam);
      const qTenant = tId ? `&tenantId=${encodeURIComponent(tId)}` : "";
      const opt = { ...withTenant(tId), signal };

      const [loanData, repayData, commentData, savingsData] = await Promise.all([
        tryGET(
          [
            `/loans?borrowerId=${id}${qTenant}`,
            `/borrowers/${id}/loans`,
            `/loans/borrower/${id}`,
            `/v1/borrowers/${id}/loans`,
            `/v1/loans?borrowerId=${id}${qTenant}`,
          ],
          opt
        ).catch(() => {
          setErrors((x) => ({ ...x, loans: "Couldn’t load loans." }));
          return [];
        }),
        tryGET(
          [
            `/repayments?borrowerId=${id}${qTenant}`,
            `/borrowers/${id}/repayments`,
            `/repayments/borrower/${id}`,
            `/v1/borrowers/${id}/repayments`,
            `/v1/repayments?borrowerId=${id}${qTenant}`,
          ],
          opt
        ).catch(() => []),
        tryGET(
          [`/borrowers/${id}/comments`, `/comments/borrower/${id}`, `/v1/borrowers/${id}/comments`],
          opt
        ).catch(() => []),
        tryGET(
          [`/borrowers/${id}/savings`, `/savings/borrower/${id}`, `/v1/borrowers/${id}/savings`],
          opt
        ).catch(() => {
          setErrors((x) => ({ ...x, savings: "Couldn’t load savings." }));
          return {};
        }),
      ]);

      const rawLoans = Array.isArray(loanData) ? loanData : loanData?.items || [];
      const mine = rawLoans.filter((l) => {
        const ownerId = firstFilled(
          l.borrowerId,
          l.clientId,
          l.customerId,
          l.memberId,
          l.borrower?.id,
          l.client?.id,
          l.customer?.id
        );
        return String(ownerId ?? "") === String(id);
      });
      setLoans(mine);

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
    return () => cancel();
  };

  useEffect(() => {
    let cleanup = () => {};
    (async () => {
      cleanup = await fetchBorrowerBundle();
    })();
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, tenantIdParam]);

  useEffect(() => {
    const onUpdated = () => fetchBorrowerBundle();
    window.addEventListener("loan:updated", onUpdated);
    window.addEventListener("borrower:updated", onUpdated);
    return () => {
      window.removeEventListener("loan:updated", onUpdated);
      window.removeEventListener("borrower:updated", onUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, tenantIdParam]);

  useEffect(() => {
    if (filterType === "all") setFilteredSavings(savings);
    else setFilteredSavings(savings.filter((tx) => tx.type === filterType));
  }, [filterType, savings]);

  /* -------- Loan officers: statusful, tenant-aware, cached -------- */
 /* -------- Branches: statusful, tenant-aware, cached -------- */
useEffect(() => {
  const t = effectiveTenantId(borrower?.tenantId, tenantIdParam);
  if (!t) {
    setBranchesStatus("error");
    return;
  }

  const cached = _tenantCache.branches.get(t);
  if (cached) {
    setBranches(cached);
    setBranchesStatus(cached.length ? "ok" : "empty");
    return;
  }

  let ignore = false;
  setBranchesStatus("loading");
  (async () => {
    try {
      const opt = withTenant(t);
      const data = await tryGET(
        [
          "/branches",
          "/v1/branches",
          "/loan-branches",
          "/v1/loan-branches",
          `/tenants/${t}/branches`,
          `/v1/tenants/${t}/branches`,
        ],
        opt
      );

      const arr = Array.isArray(data) ? data : data?.items || data?.data || data?.rows || [];
      const mapped =
        arr.map((br) => ({
          id: br.id ?? br.code ?? br.uuid ?? br.branchId ?? br.slug,
          name: br.name ?? br.branchName ?? br.title ?? (br.code ? String(br.code) : "—"),
        })) || [];

      if (!ignore) {
        setBranches(mapped);
        setBranchesStatus(mapped.length ? "ok" : "empty");
        _tenantCache.branches.set(t, mapped);
      }
    } catch (e) {
      if (!ignore) {
        setBranches([]);
        setBranchesStatus("error");
      }
    }
  })();

  return () => {
    ignore = true;
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [borrower?.tenantId, tenantIdParam, reloadBranchesKey]);

/* -------- Officers: statusful, tenant-aware, cached -------- */
useEffect(() => {
  // Try with tenant if we have it; otherwise fetch without a tenant header.
  const t = effectiveTenantId(borrower?.tenantId, tenantIdParam);
  const cacheKey = t || "__no_tenant__";

  const cached = _tenantCache.officers.get(cacheKey);
  if (cached) {
    setOfficers(cached);
    setOfficersStatus(cached.length ? "ok" : "empty");
    return;
  }

  let ignore = false;
  setOfficersStatus("loading");

  (async () => {
    try {
      const opt = withTenant(t); // {} when no tenant
      const paths = [
        "/officers",
        "/loan-officers",
        "/v1/officers",
        t ? `/tenants/${t}/officers` : null,
        "/users?role=officer",
        "/users?role=loan_officer",
        "/v1/users?role=officer",
      ].filter(Boolean);

      const data = await tryGET(paths, opt);

      const arr =
        (Array.isArray(data) && data) ||
        data?.items ||
        data?.data ||
        data?.rows ||
        data?.results ||
        [];

      const mapped = (arr || []).map((o) => ({
        id: o.id ?? o.userId ?? o.uuid ?? o.code ?? o.employeeId,
        // use helper to avoid ?? / || precedence issue and blank strings
        name: firstFilled(
          o.name,
          o.fullName,
          [o.firstName, o.lastName].filter(Boolean).join(" "),
          o.email,
          String(o.id)
        ),
      }));

      if (!ignore) {
        setOfficers(mapped);
        setOfficersStatus(mapped.length ? "ok" : "empty");
        _tenantCache.officers.set(cacheKey, mapped);
      }
    } catch (e) {
      console.error("[officers] load failed:", e);
      if (!ignore) {
        setOfficers([]);
        setOfficersStatus("error");
      }
    }
  })();

  return () => {
    ignore = true;
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [borrower?.tenantId, tenantIdParam, reloadOfficersKey]);

  /* -------- Groups: statusful, tenant-aware, cached -------- */
  useEffect(() => {
    const t = effectiveTenantId(borrower?.tenantId, tenantIdParam);
    if (!t) {
      setGroupsStatus("error");
      return;
    }

    const cached = _tenantCache.groups.get(t);
    if (cached) {
      setGroups(cached);
      setGroupsStatus(cached.length ? "ok" : "empty");
      return;
    }

    let ignore = false;
    setGroupsStatus("loading");
    (async () => {
      try {
        const opt = withTenant(t);
        const data = await tryGET(
          [
            "/groups",
            "/v1/groups",
            "/borrowers/groups",
            "/v1/borrowers/groups",
            "/loan-groups",
            "/v1/loan-groups",
            `/tenants/${t}/groups`,
            `/v1/tenants/${t}/groups`,
          ],
          opt
        );
        const arr = Array.isArray(data) ? data : data?.items || data?.data || data?.rows || [];
        const mapped =
          arr.map((g) => ({
            id: g.id ?? g.code ?? g.uuid ?? g.groupId ?? g.slug,
            name: g.name ?? g.title ?? g.groupName ?? (g.code ? String(g.code) : "—"),
          })) || [];

        if (!ignore) {
          setGroups(mapped);
          setGroupsStatus(mapped.length ? "ok" : "empty");
          _tenantCache.groups.set(t, mapped);
        }
      } catch (e) {
        if (!ignore) {
          setGroups([]);
          setGroupsStatus("error");
        }
      }
    })();

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [borrower?.tenantId, tenantIdParam, reloadGroupsKey]);

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
      const opt = withTenant(effectiveTenantId(borrower?.tenantId, tenantIdParam));
      const data = await tryGET(
        [`/loans/${loanId}/schedule`, `/loan/${loanId}/schedule`, `/v1/loans/${loanId}/schedule`],
        opt
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
      const tId = effectiveTenantId(borrower?.tenantId, tenantIdParam);
      const opt = withTenant(tId);
      const repay = await tryGET(
        [
          `/repayments?borrowerId=${id}${tId ? `&tenantId=${encodeURIComponent(tId)}` : ""}`,
          `/borrowers/${id}/repayments`,
          `/v1/borrowers/${id}/repayments`,
        ],
        opt
      );
      setRepayments(Array.isArray(repay) ? repay : repay?.items || []);
    } catch {}
    await fetchBorrowerBundle();
    window.dispatchEvent(
      new CustomEvent("loan:updated", { detail: { id: selectedLoanForRepayment?.id } })
    );
    window.dispatchEvent(new CustomEvent("borrower:updated", { detail: { id } }));
  };

  const onChange = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const buildUpdatePayload = (f) => {
    const { firstName, lastName } = splitNameParts(f.name);
    return {
      name: f.name || `${firstName} ${lastName}`.trim(),
      firstName: firstName || null,
      lastName: lastName || null,
      phone: f.phone || null,
      msisdn: f.phone || null,
      email: f.email || null,
      addressLine: f.addressLine || null,
      address: f.addressLine || null,
      status: f.status,
      nationalId: f.nationalId || f.idNumber || null,
      idNumber: f.idNumber || f.nationalId || null,
      idType: f.idType || null,
      idIssuedDate: f.idIssuedDate || null,
      idExpiryDate: f.idExpiryDate || null,
      nextKinName: f.nextKinName || null,
      nextKinPhone: f.nextKinPhone || null,
      nextOfKinRelationship: f.nextOfKinRelationship || null,
      employmentStatus: f.employmentStatus || null,
      occupation: f.occupation || null,
      birthDate: f.birthDate || null,
      gender: f.gender || null,
      maritalStatus: f.maritalStatus || null,
      educationLevel: f.educationLevel || null,
      customerNumber: f.customerNumber || null,
      tin: f.tin || null,
      nationality: f.nationality || null,
      groupId: f.groupId || null,
      loanType: f.loanType || null,
      regDate: f.regDate || null,
      branchId: f.branchId || null,
    };
  };

  const saveUpdates = async () => {
    if (!form?.id) return;
    setSaving(true);
    try {
      const payload = buildUpdatePayload(form);
      await api.patch(`/borrowers/${form.id}`, payload, withTenant(borrower?.tenantId));

      // Assign / unassign officer if changed (with fallbacks)
      try {
        const prevOfficerId = officerIdFromBorrower(borrower);
        if (!eqId(form.loanOfficerId, prevOfficerId)) {
          const opt = withTenant(borrower?.tenantId);
          if (form.loanOfficerId) {
            await api
              .post(`/borrowers/${form.id}/officer`, { loanOfficerId: form.loanOfficerId }, opt)
              .catch(() =>
                api.post(
                  `/borrowers/${form.id}/assign-officer`,
                  { officerId: form.loanOfficerId },
                  opt
                )
              )
              .catch(() =>
                api.patch(`/borrowers/${form.id}`, { loanOfficerId: form.loanOfficerId }, opt)
              );
          } else {
            await api
              .delete(`/borrowers/${form.id}/officer`, opt)
              .catch(() => api.post(`/borrowers/${form.id}/unassign-officer`, {}, opt))
              .catch(() => api.patch(`/borrowers/${form.id}`, { loanOfficerId: null }, opt));
          }
        }
      } catch (err) {
        console.warn("Officer assign/unassign failed:", err?.response?.data || err);
      }
      // Assign / unassign branch if changed (with fallbacks)
      try {
        const prevBranchId = branchIdFromBorrower(borrower);
        if (!eqId(form.branchId, prevBranchId)) {
          const opt = withTenant(borrower?.tenantId);
          if (form.branchId) {
            await api
              .post(`/borrowers/${form.id}/branch`, { branchId: form.branchId }, opt)
              .catch(() =>
                api.post(`/borrowers/${form.id}/assign-branch`, { branchId: form.branchId }, opt)
              )
              .catch(() => api.patch(`/borrowers/${form.id}`, { branchId: form.branchId }, opt));
          } else {
            await api
              .delete(`/borrowers/${form.id}/branch`, opt)
              .catch(() => api.post(`/borrowers/${form.id}/unassign-branch`, {}, opt))
              .catch(() => api.patch(`/borrowers/${form.id}`, { branchId: null }, opt));
          }
        }
      } catch (err) {
        console.warn("Branch assign/unassign failed:", err?.response?.data || err);
      }

      await fetchBorrowerBundle();
      setIsEditing(false);
      window.dispatchEvent(new CustomEvent("borrower:updated", { detail: { id: form.id } }));
      alert("Borrower updated.");
    } catch (e) {
      alert("Couldn’t update borrower.");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

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

      const rawOutstanding = l.outstanding ?? l.outstandingTotal ?? l.outstandingAmount ?? null;

      const outstanding =
        rawOutstanding != null ? safeNum(rawOutstanding) : Math.max(0, safeNum(l.amount) - paidTotal);

      const future = rows
        .filter((r) => r.dueDate && new Date(r.dueDate) >= today)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      const next = future[0] || null;
      const nextDueDate = next?.dueDate || l.nextDueDate || l.nextInstallmentDate || null;
      const nextDueAmount = next
        ? safeNum((next.amount ?? 0) - (next.amountPaid ?? 0))
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
      return due && due < today && !paid && (status === "overdue" || status === "due" || status === "");
    }).length;
  }, [repayments]);

  if (!borrower || !form) {
    return <div className="w-full px-6 py-6 min-h-screen bg-white text-slate-900">Loading...</div>;
  }

  const bName = displayName(borrower);
  const tenantQuery = borrower?.tenantId
    ? `?tenantId=${encodeURIComponent(borrower.tenantId)}`
    : "";
  const visibleComments = showAllComments ? comments : comments.slice(0, 3);

  const tel = (p) => (p ? `tel:${p}` : undefined);
  const sms = (p) => (p ? `sms:${p}` : undefined);
  const wa = (p) => (p ? `https://wa.me/${String(p).replace(/[^\d]/g, "")}` : undefined);
  const mail = (e) => (e ? `mailto:${e}` : undefined);

  const deposits = savings.reduce((s, t) => (t.type === "deposit" ? s + safeNum(t.amount) : s), 0);
  const withdrawals = savings.reduce(
    (s, t) => (t.type === "withdrawal" ? s + safeNum(t.amount) : s),
    0
  );
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
  const idIssued = firstFilled(
    borrower.idIssuedDate,
    borrower.idIssueDate,
    borrower.idDateIssued
  );
  const idExpiry = firstFilled(
    borrower.idExpiryDate,
    borrower.idExpireDate,
    borrower.idDateExpiry
  );
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
  const LOANTYPE_OPTS = [
    { v: "individual", t: "Individual" },
    { v: "group", t: "Group" },
  ];

  const officerPlaceholder = placeholderFrom(
    officersStatus,
    "Select loan officer…",
    "No officers"
  );
  const groupPlaceholder = placeholderFrom(groupsStatus, "Select group…", "No groups");
  const branchPlaceholder = placeholderFrom(branchesStatus, "Select branch…", "No branches");

  const canRetryOfficers = officersStatus === "error";
  const canRetryGroups = groupsStatus === "error";
  const canRetryBranches = branchesStatus === "error";


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
                  setForm(mapBorrowerToForm(borrower));
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
                  <span className="text-xs text-slate-700">
                    Tenant: {borrower.tenantId || "—"}
                  </span>
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

            <hr className="my-4 border-2 border-slate-300" />

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
                      dmy(dob)
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
                            className="text-sm border-2 border-slate-400 rounded-lg px-2 py-1"
                          />
                        ) : (
                          dmy(idExpiry)
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
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-[12px] font-semibold uppercase tracking-wider text-slate-900">
                      &nbsp;
                    </div>
                    <div className="flex gap-2">
                      {canRetryOfficers && (
                        <button
                          className="text-xs px-2 py-1 rounded border-2 border-slate-400 hover:bg-slate-50"
                          onClick={() => setReloadOfficersKey((k) => k + 1)}
                          title="Retry loading officers"
                        >
                          Retry officers
                        </button>
                      )}
                      {canRetryGroups && (
                        <button
                          className="text-xs px-2 py-1 rounded border-2 border-slate-400 hover:bg-slate-50"
                          onClick={() => setReloadGroupsKey((k) => k + 1)}
                          title="Retry loading groups"
                        >
                          Retry groups
                        </button>
                      )}
                    </div>
                  </div>

                  <DlGrid
                    cols={2}
                    items={[
                      {
  label: "Branch",
  value: isEditing ? (
    <select
      value={form.branchId ?? ""}
      onChange={(e) => onChange("branchId", e.target.value || null)}
      className="text-sm border-2 border-slate-400 rounded-lg px-2 py-1"
    >
      <option value="">{branchPlaceholder}</option>
      {branches.map((br) => (
        <option key={br.id} value={br.id}>
          {br.name} ({br.id})
        </option>
      ))}
    </select>
  ) : (
    displayBranch(borrower,branches)
  ),
},                
                      
                      {
                        label: "Loan Officer",
                        value: isEditing ? (
                          <select
                            value={form.loanOfficerId ?? ""}
                            onChange={(e) => onChange("loanOfficerId", e.target.value || null)}
                            className="text-sm border-2 border-slate-400 rounded-lg px-2 py-1"
                          >
                            <option value="">{officerPlaceholder}</option>
                            {officers.map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          displayOfficer(borrower,officers) || "—"
                        ),
                      },
                      {
                        label: "Loan Type",
                        value: isEditing ? (
                          <select
                            value={form.loanType ?? "individual"}
                            onChange={(e) => onChange("loanType", e.target.value)}
                            className="text-sm border-2 border-slate-400 rounded-lg px-2 py-1"
                          >
                            {LOANTYPE_OPTS.map((o) => (
                              <option key={o.v} value={o.v}>
                                {o.t}
                              </option>
                            ))}
                          </select>
                        ) : (
                          firstFilled(borrower.loanType, borrower.productType, "individual")
                        ),
                      },
                      {
                        label: "Group",
                        value: isEditing ? (
                          <select
                            value={form.groupId ?? ""}
                            onChange={(e) => onChange("groupId", e.target.value || null)}
                            className="text-sm border-2 border-slate-400 rounded-lg px-2 py-1"
                          >
                            <option value="">{groupPlaceholder}</option>
                            {groups.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.name} ({g.id})
                              </option>
                            ))}
                          </select>
                        ) : displayGroup(borrower,groups) ? (
                          `${displayGroup(borrower,groups)}${
                            borrower.groupId ? ` (${borrower.groupId})` : ""
                          }`
                        ) : (
                          "—"
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
                          dmy(registrationDate)
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
              <div
                key={`${c.k}-${i}`}
                className="rounded-2xl p-4 border-2 bg-white border-slate-400 shadow-sm"
              >
                <div className="text-[12px] font-semibold uppercase tracking-wider text-slate-900">
                  {c.k}
                </div>
                <div className="mt-1 text-2xl font-extrabold text-slate-900 tabular-nums">
                  {c.v}
                </div>
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
                          key={`loan-${l.id}`}
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
                        <span key={`status-${l.id}`} className={chip(l.status)}>
                          {String(l.status || "—")}
                        </span>,
                        <div key={`amount-${l.id}`} className="text-right tabular-nums">
                          {money(l.amount)}
                        </div>,
                        <div key={`outstanding-${l.id}`} className="text-right tabular-nums">
                          {l.outstanding == null ? "—" : money(l.outstanding)}
                        </div>,
                        l.nextDueDate ? (
                          <div key={`next-${l.id}`} className="text-right">
                            {new Date(l.nextDueDate).toLocaleDateString()}
                            {l.nextDueAmount ? (
                              <span className="ml-1 font-bold">{money(l.nextDueAmount)}</span>
                            ) : null}
                          </div>
                        ) : (
                          "—"
                        ),
                        <div key={`actions-${l.id}`} className="flex gap-2 justify-end">
                          <button
                            className="px-3 py-1.5 rounded-lg border-2 border-slate-400 text-slate-900 hover:bg-slate-50 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                            onClick={() => handleViewSchedule(l.id)}
                          >
                            Schedule
                          </button>
                          {String(userRole || "").toLowerCase() === "admin" &&
                            (String(l.status).toLowerCase() === "active" ||
                              String(l.status).toLowerCase() === "disbursed") && (
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

              {activeTab === "repayments" && (
                <>
                  {repayments.length === 0 ? (
                    <Empty text="No repayments recorded for this borrower." />
                  ) : (
                    <Table
                      head={["Due Date", "Amount Due", "Paid", "Balance", "Status", "Loan"]}
                      rows={repayments.map((r, idx) => {
                        const due = r.dueDate || r.date || r.createdAt || null;
                        const amt = safeNum(r.amount);
                        const paid = safeNum(r.amountPaid ?? r.paidAmount);
                        const bal = Math.max(0, amt - paid);
                        return [
                          due ? new Date(due).toLocaleDateString() : "—",
                          <div key={`amt-${idx}`} className="text-right tabular-nums">
                            {money(amt)}
                          </div>,
                          <div key={`paid-${idx}`} className="text-right tabular-nums">
                            {money(paid)}
                          </div>,
                          <div key={`bal-${idx}`} className="text-right tabular-nums">
                            {money(bal)}
                          </div>,
                          <span key={`st-${idx}`} className={chip(r.status)}>
                            {r.status || "—"}
                          </span>,
                          r.loanId ? (
                            <Link
                              key={`lnk-${idx}`}
                              to={`/loans/${encodeURIComponent(r.loanId)}${
                                borrower?.tenantId
                                  ? `?tenantId=${encodeURIComponent(borrower.tenantId)}`
                                  : ""
                              }`}
                              className={strongLink}
                            >
                              {r.loanId}
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

              {activeTab === "savings" && (
                <>
                  {errors.savings && (
                    <div className="mb-3 text-sm text-rose-700 font-semibold">{errors.savings}</div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-3 text-sm">
                    <BadgeCard label="Deposits" value={money(deposits)} tone="emerald" />
                    <BadgeCard label="Withdrawals" value={money(withdrawals)} tone="amber" />
                    <BadgeCard label="Interest" value={money(interest)} tone="sky" />
                    <BadgeCard label="Charges" value={money(charges)} tone="rose" />
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-900">Filter:</span>
                      <label className="relative z-50">
                        <select
                          value={filterType}
                          onChange={(e) => setFilterType(e.target.value)}
                          className="text-sm border-2 border-slate-400 rounded-lg px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
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
                      to={`/savings${tenantQuery}${tenantQuery ? "&" : "?"}borrowerId=${encodeURIComponent(
                        borrower.id
                      )}`}
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
                      rows={filteredSavings.map((tx, i) => [
                        tx.date ? new Date(tx.date).toLocaleDateString() : "—",
                        <span key={`type-${i}`} className="capitalize">
                          {tx.type}
                        </span>,
                        <div key={`amt-${i}`} className="text-right tabular-nums">
                          {money(tx.amount)}
                        </div>,
                        tx.notes || "—",
                      ])}
                    />
                  )}
                </>
              )}

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

              {activeTab === "activity" && (
                <ActivityTimeline
                  loans={loansEnriched}
                  repayments={repayments}
                  savings={savings}
                  comments={comments}
                  canAddRepayment={String(userRole || "").toLowerCase() === "admin"}
                  onAddRepayment={() => {
                    const active =
                      loansEnriched.find((l) => String(l.status).toLowerCase() === "active") ||
                      loansEnriched[0];
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
        <aside className="lg:col-span-1 space-y-6">
          <Card title="Notes">
            <input
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddComment(e.currentTarget.value);
                  e.currentTarget.value = "";
                }
              }}
              placeholder="Add a note and press Enter…"
              className="w-full text-sm mb-3 border-2 border-slate-400 rounded-lg px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            />
            {comments.length === 0 ? (
              <div className="text-xs text-slate-900">No notes yet.</div>
            ) : (
              <>
                <ul className="space-y-2">
                  {visibleComments.map((c, i) => (
                    <li
                      key={`${i}-${c.createdAt || Math.random().toString(36).slice(2)}`}
                      className="p-2 text-xs rounded-lg border-2 border-slate-400 bg-white"
                    >
                      <div className="text-slate-900 break-words">{c.content}</div>
                      <div className="text-[10px] text-slate-700 mt-1">
                        {c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}
                      </div>
                    </li>
                  ))}
                </ul>
                {comments.length > 3 && (
                  <button
                    onClick={() => setShowAllComments((s) => !s)}
                    className="mt-3 w-full text-xs px-3 py-1.5 rounded-lg border-2 border-slate-400 text-slate-900 hover:bg-slate-50 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
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
  <div className="p-6 text-sm rounded-2xl border-2 border-dashed border-slate-400 text-slate-900 bg-white">
    {text}
  </div>
);

const Table = ({ head = [], rows = [] }) => (
  <div className="overflow-x-auto rounded-xl border-2 border-slate-400 bg-white">
    <table className="min-w-full table-fixed text-[15px]">
      <thead className="bg-slate-100 text-slate-900">
        <tr className="text-left">
          {head.map((h, i) => (
            <th
              key={`${h}-${i}`}
              className={`px-3 py-2 font-bold border border-slate-400 ${
                i === head.length - 1 ? "text-right" : ""
              }`}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={`row-${i}`} className={i % 2 ? "bg-slate-50" : "bg-white"}>
            {r.map((c, j) => (
              <td
                key={`cell-${i}-${j}`}
                className={`px-3 py-2 align-top border border-slate-300 break-words ${
                  j === head.length - 1 ? "text-right" : ""
                }`}
              >
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
    emerald: "bg-emerald-50 text-emerald-900 border-2 border-emerald-200",
    amber: "bg-amber-50 text-amber-900 border-2 border-amber-200",
    sky: "bg-sky-50 text-sky-900 border-2 border-sky-200",
    rose: "bg-rose-50 text-rose-900 border-2 border-rose-200",
  };
  return (
    <div className={`p-3 rounded-xl text-sm ${toneMap[tone]} shadow-sm`}>
      {label}: <strong>{value}</strong>
    </div>
  );
};

const ActivityTimeline = ({
  loans,
  repayments,
  savings,
  comments,
  canAddRepayment,
  onAddRepayment,
}) => {
  const items = [];
  loans.forEach((l) =>
    items.push({
      type: "loan",
      date: l.createdAt || l.disbursedAt || l.updatedAt || new Date().toISOString(),
      text: `Loan ${l.id} • ${String(l.status || "").toUpperCase()} • Outstanding ${money(
        l.outstanding ?? 0
      )}`,
    })
  );
  repayments.forEach((r) =>
    items.push({
      type: "repayment",
      date: r.date || r.createdAt || new Date().toISOString(),
      text: `Repayment • ${money(r.amountPaid ?? r.paidAmount ?? r.amount)} • Loan ${
        r.loanId || "—"
      }`,
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
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-bold text-slate-900">Recent activity</div>
        {canAddRepayment && (
          <button
            onClick={onAddRepayment}
            className="px-3 py-1.5 rounded-lg border-2 border-slate-400 text-slate-900 hover:bg-slate-50 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            Add repayment
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <Empty text="No recent activity yet." />
      ) : (
        <ul className="space-y-2">
          {items.map((it, i) => (
            <li
              key={i}
              className="flex items-start gap-3 p-2 rounded-lg border-2 border-slate-300 bg-white"
            >
              <span
                className={`mt-1 inline-block h-2.5 w-2.5 rounded-full ${
                  it.type === "loan"
                    ? "bg-indigo-500"
                    : it.type === "repayment"
                    ? "bg-emerald-500"
                    : it.type === "savings"
                    ? "bg-sky-500"
                    : "bg-slate-400"
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-900 break-words">{it.text}</div>
                <div className="text-[11px] text-slate-700">
                  {new Date(it.date).toLocaleString()}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default BorrowerDetails;
