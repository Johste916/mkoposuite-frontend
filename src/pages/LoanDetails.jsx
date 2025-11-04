// src/pages/LoanDetails.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api";
import ScheduleTable from "../components/ScheduleTable";
import {
  fmtMoney,
  asDate,
  asDateTime,
  asISO,
  normalizeSchedule,
  computeScheduleTotals,
  downloadScheduleCSV,
  downloadSchedulePDF,
} from "../utils/loanSchedule";

/* ---------- token-aware UI ---------- */
const ui = {
  page: "w-full px-4 md:px-6 py-6 space-y-6 bg-[var(--bg)] text-[var(--fg)]",
  h1: "text-4xl font-extrabold tracking-tight",
  sub: "text-sm text-[var(--muted)]",
  card:
    "card rounded-2xl border-2 border-[var(--border-strong)] bg-[var(--card)] shadow",
  cardHead:
    "px-6 py-4 border-b-2 border-[var(--border)] bg-[var(--table-head-bg)] flex items-center justify-between rounded-t-2xl",
  cardBody: "px-6 py-6",
  cardBodyDense: "px-6 py-4",
  label: "text-[12px] uppercase tracking-wide text-[var(--muted)] font-semibold",
  actionLink:
    "inline-flex items-center gap-1 font-extrabold text-[var(--primary)] underline underline-offset-4 decoration-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
  chip:
    "inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase ring-2 ring-[var(--border)] bg-[var(--badge-bg)] text-[var(--badge-fg)]",
  btn:
    "inline-flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg font-semibold " +
    "border-2 border-[var(--border-strong)] bg-[var(--card)] text-[var(--fg)] hover:bg-[var(--chip-soft)] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
  primary:
    "inline-flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg font-semibold " +
    "bg-[var(--primary)] text-[var(--primary-contrast)] hover:opacity-90 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-0 disabled:opacity-60",
  input:
    "w-full rounded-lg border-2 px-3 py-2 outline-none " +
    "bg-[var(--input-bg)] text-[var(--input-fg)] border-[var(--input-border)] " +
    "placeholder:text-[var(--input-placeholder)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
  tableWrap:
    "overflow-x-auto rounded-xl border-2 border-[var(--border-strong)] bg-[var(--card)]",
  th:
    "bg-[var(--table-head-bg)] text-left text-[12px] uppercase tracking-wide font-semibold " +
    "px-3 py-2 border border-[var(--border)] text-[var(--fg)]/90",
  td: "px-3 py-2 border border-[var(--border)] text-sm text-[var(--fg)]",
};

/* Section shell */
const SectionCard = ({ title, subtitle, right, children, dense = false }) => (
  <div className={ui.card}>
    {(title || subtitle || right) && (
      <div className={ui.cardHead}>
        <div className="min-w-0">
          {title && <h3 className="text-xl md:text-2xl font-extrabold tracking-tight">{title}</h3>}
          {/* use div (not <p>) so we can pass elements safely */}
          {subtitle && <div className={ui.sub}>{subtitle}</div>}
        </div>
        {right}
      </div>
    )}
    <div className={dense ? ui.cardBodyDense : ui.cardBody}>{children}</div>
  </div>
);

const Label = ({ children }) => <div className={ui.label}>{children}</div>;

/* role helpers */
const roleOf = () => {
  try {
    const r = (JSON.parse(localStorage.getItem("user") || "{}").role || "").toLowerCase();
    return r;
  } catch {
    return "";
  }
};
const isAdmin = (r) => r === "admin" || r === "director" || r === "superadmin";
const isBM = (r) => ["branch_manager", "manager", "bm"].includes(r) || isAdmin(r);
const isCompliance = (r) => ["compliance", "compliance_officer", "legal"].includes(r) || isAdmin(r);
const isAccountant = (r) => ["accountant", "finance"].includes(r) || isAdmin(r);
const isOfficer = (r) => ["loan_officer", "officer"].includes(r) && !isAdmin(r);

/* If backend has no stage, derive a sensible label off status. */
function deriveStageFromStatus(status) {
  if (!status) return "";
  const s = String(status).toLowerCase();
  if (s === "pending") return "submitted";
  if (s === "approved") return "accounting";
  return "";
}

/* Status tone helper for the chip */
function statusTone(s = "") {
  const k = String(s).toLowerCase();
  if (["approved", "disbursed", "active"].includes(k)) return "bg-emerald-600 text-white ring-0";
  if (["pending", "submitted"].includes(k)) return "bg-amber-500 text-white ring-0";
  if (["rejected"].includes(k)) return "bg-rose-600 text-white ring-0";
  if (["closed"].includes(k)) return "bg-slate-700 text-white ring-0";
  return "";
}

/* ---------------- helpers for safe ownership updates ---------------- */
function normalizeId(v) {
  if (v === "" || v == null) return undefined;
  if (typeof v === "number") return v;
  const s = String(v).trim();
  return /^\d+$/.test(s) ? Number(s) : s;
}

function isoDateOrEmpty(v) {
  if (!v) return "";
  const s = typeof v === "string" ? v : new Date(v).toISOString();
  const mm = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return mm ? mm[1] : new Date(s).toISOString().slice(0, 10);
}

function cleanNumber(n) {
  if (n === "" || n == null) return undefined;
  const x = Number(n);
  return Number.isFinite(x) ? x : undefined;
}

/** Send both canonical and alias keys (server whitelists real cols anyway) */
function buildLoanUpdatePayload(editForm) {
  const amount = cleanNumber(editForm.amount);
  const interestRate = cleanNumber(editForm.interestRate);
  const termMonths = cleanNumber(editForm.termMonths);
  const startDate = isoDateOrEmpty(editForm.startDate);

  const canonical = {
    ...(amount !== undefined ? { amount } : {}),
    ...(interestRate !== undefined ? { interestRate } : {}),
    ...(termMonths !== undefined ? { termMonths } : {}),
    ...(startDate ? { startDate } : {}),
  };

  const aliases = {
    ...(amount !== undefined ? { principal: amount } : {}),
    ...(termMonths !== undefined ? { durationMonths: termMonths } : {}),
    ...(startDate ? { releaseDate: startDate } : {}),
  };

  return { ...aliases, ...canonical };
}

function extractApiError(err) {
  const d = err?.response?.data;
  if (!d) return err?.message || "Request failed.";
  if (typeof d === "string") return d;
  if (d.error) return d.error;
  if (d.message) return d.message;
  if (d.detail) return d.detail;
  try { return JSON.stringify(d); } catch { return String(d); }
}

// Only use the canonical endpoint and only send changed fields.
async function patchLoanOwnership({ id, payload }) {
  const body = {};
  if (payload.officerId !== undefined) body.loanOfficerId = normalizeId(payload.officerId);
  if (payload.branchId !== undefined) body.branchId = normalizeId(payload.branchId);
  if (payload.borrowerId !== undefined) body.borrowerId = normalizeId(payload.borrowerId);

  for (const k of Object.keys(body)) {
    if (body[k] === undefined) delete body[k];
  }
  if (!Object.keys(body).length) return;

  await api.patch(`/loans/${id}`, body);
}
/* ------------------------------------------------------------------- */

export default function LoanDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loan, setLoan] = useState(null);
  const [product, setProduct] = useState(null);
  const [repayments, setRepayments] = useState([]);
  const [comments, setComments] = useState([]);
  const [schedule, setSchedule] = useState(null);

  // people/ownership data
  const [borrower, setBorrower] = useState(null);
  const [officer, setOfficer] = useState(null);
  const [officers, setOfficers] = useState([]);
  const [branches, setBranches] = useState([]);

  // edit officer/branch
  const [editOwnership, setEditOwnership] = useState(false);
  const [ownershipForm, setOwnershipForm] = useState({
    officerId: "",
    branchId: "",
  });
  const [savingOwnership, setSavingOwnership] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingRepayments, setLoadingRepayments] = useState(true);
  const [loadingComments, setLoadingComments] = useState(true);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  const [errs, setErrs] = useState(null);

  // review state
  const [reviewComment, setReviewComment] = useState("");
  const [suggestedAmount, setSuggestedAmount] = useState("");
  const [acting, setActing] = useState(false);

  // general comments box
  const [newComment, setNewComment] = useState("");

  // repay modal
  const [openRepay, setOpenRepay] = useState(false);
  const [postLoading, setPostLoading] = useState(false);
  const [repForm, setRepForm] = useState({
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    method: "cash",
    notes: "",
  });

  // schedule modal
  const [openSchedule, setOpenSchedule] = useState(false);

  // edit modal
  const [openEdit, setOpenEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    amount: "",
    interestRate: "",
    termMonths: "",
    startDate: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // reschedule modal
  const [openReschedule, setOpenReschedule] = useState(false);
  const [rescheduleForm, setRescheduleForm] = useState({
    termMonths: "",
    startDate: "",
    previewOnly: false,
  });
  const [savingReschedule, setSavingReschedule] = useState(false);

  const currency = loan?.currency || "TZS";
  const statusBadge = ui.chip;

  const role = roleOf();
  const canBM = isBM(role);
  const canCO = isCompliance(role);
  const canACC = isAccountant(role);
  const canOFF = isOfficer(role);
  const canEdit = isAdmin(role) || canBM || canCO;
  const canDelete = isAdmin(role) || canBM;

  const workflowStage = loan?.workflowStage || deriveStageFromStatus(loan?.status);

  const showLOTB =
    canOFF &&
    [
      "changes_requested",
      "bm_changes_requested",
      "compliance_changes_requested",
      "returned_to_officer",
      "request_changes",
    ].includes(workflowStage);

  const showBMToolbar =
    canBM && ["submitted", "bm_review", "changes_resubmitted"].includes(workflowStage);

  const showCOToolbar = canCO && ["compliance", "compliance_review"].includes(workflowStage);

  const showDisburse = canACC && (loan?.status === "approved" || workflowStage === "accounting");

  /* ---------- load ---------- */
  const lastLoadedId = useRef(null);

  const loadAuxLists = async () => {
    try {
      const rOff = await api.get("/users", { params: { role: "loan_officer", pageSize: 500 } });
      const offItems = Array.isArray(rOff.data) ? rOff.data : rOff.data?.items || [];
      setOfficers(offItems);
    } catch {
      setOfficers([]);
    }
    try {
      const rBr = await api.get("/branches", { params: { pageSize: 500 } });
      const brItems = Array.isArray(rBr.data) ? rBr.data : rBr.data?.items || [];
      setBranches(brItems);
    } catch {
      setBranches([]);
    }
  };

  const loadLoan = async () => {
    setLoading(true);
    setErrs(null);
    try {
      const { data: l } = await api.get(`/loans/${id}`);
      setLoan(l);
      setSuggestedAmount(String(l?.amount ?? ""));

      // borrower
      const bId = l?.borrowerId ?? l?.Borrower?.id ?? l?.borrower?.id;
      if (bId) {
        try {
          const rb = await api.get(`/borrowers/${bId}`);
          setBorrower(rb.data || null);
        } catch {
          setBorrower(null);
        }
      } else {
        setBorrower(null);
      }

      // officer
      const oId =
        l?.officerId ??
        l?.loanOfficerId ??
        l?.assignedOfficerId ??
        l?.disbursedBy ??
        l?.disbursed_by ??
        l?.officer?.id;
      if (oId) {
        try {
          const ro = await api.get(`/users/${oId}`);
          setOfficer(ro.data || null);
        } catch {
          setOfficer(null);
        }
      } else {
        setOfficer(null);
      }

      // parallel fetches
      const tasks = [
        api
          .get(`/repayments/loan/${id}`)
          .then((r) => setRepayments(r.data || []))
          .catch(() => setRepayments([]))
          .finally(() => setLoadingRepayments(false)),

        api
          .get(`/comments/loan/${id}`)
          .then((r) => setComments(Array.isArray(r.data) ? r.data : []))
          .catch(() => setComments([]))
          .finally(() => setLoadingComments(false)),
      ];

      if (l?.productId) {
        tasks.push(
          api
            .get(`/loan-products/${l.productId}`)
            .then((r) => setProduct(r.data))
            .catch(() => setProduct(null))
        );
      }

      setLoadingSchedule(true);
      tasks.push(
        api
          .get(`/loans/${id}/schedule`)
          .then((r) => setSchedule(normalizeSchedule(r.data)))
          .catch(() => setSchedule(null))
          .finally(() => setLoadingSchedule(false))
      );

      await Promise.all(tasks);

      setOwnershipForm({
        officerId: oId ? String(oId) : "",
        branchId: l?.branchId ? String(l.branchId) : "",
      });
    } catch (e) {
      console.error(e);
      setErrs("Failed to fetch loan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (lastLoadedId.current === id) return;
    lastLoadedId.current = id;

    setSchedule(null);
    setReviewComment("");
    setNewComment("");
    setLoadingRepayments(true);
    setLoadingComments(true);

    loadAuxLists();
    loadLoan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const onFocus = () => loadLoan();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  useEffect(() => {
    const onUpdated = (e) => {
      if (String(e?.detail?.id) === String(id)) loadLoan();
    };
    window.addEventListener("loan:updated", onUpdated);
    return () => window.removeEventListener("loan:updated", onUpdated);
  }, [id]);

  /* ---------- comments ---------- */
  async function postCommentInline(content) {
    try {
      await api.post(`/comments`, { loanId: id, content });
      const r = await api.get(`/comments/loan/${id}`);
      setComments(Array.isArray(r.data) ? r.data : []);
    } catch {
      /* ignore */
    }
  }

  /* ---------- workflow actions ---------- */
  async function workflowAction(action, extra = {}) {
    setActing(true);
    try {
      await api.post(`/loans/${id}/workflow`, {
        action,
        comment: reviewComment?.trim() || undefined,
        suggestedAmount:
          extra.suggestedAmount != null && extra.suggestedAmount !== ""
            ? Number(extra.suggestedAmount)
            : undefined,
      });
      await loadLoan();
      setReviewComment("");
      alert("Action applied.");
    } catch (e) {
      try {
        if (action === "bm_approve" || action === "compliance_approve") {
          await api.patch(`/loans/${id}/status`, { status: "approved" });
          if (reviewComment.trim()) await postCommentInline(reviewComment.trim());
        } else if (action === "reject") {
          await api.patch(`/loans/${id}/status`, { status: "rejected" });
          if (reviewComment.trim()) await postCommentInline(reviewComment.trim());
        } else if (action === "request_changes") {
          if (reviewComment.trim())
            await postCommentInline(`Changes requested: ${reviewComment.trim()}`);
        } else if (action === "resubmit") {
          await api.patch(`/loans/${id}/status`, { status: "pending" });
          if (reviewComment.trim())
            await postCommentInline(`Resubmitted: ${reviewComment.trim()}`);
        }
        await loadLoan();
        setReviewComment("");
        alert("Action applied (fallback).");
      } catch (ee) {
        console.error(ee);
        alert("Failed to apply action.");
      }
    } finally {
      setActing(false);
    }
  }

  async function disburseLoan() {
    setActing(true);
    try {
      try {
        await api.post(`/loans/${id}/disburse`);
      } catch {
        try {
          await api.patch(`/loans/${id}/status`, { status: "disbursed" });
        } catch {
          await api.put(`/loans/${id}/status`, { status: "disbursed" });
        }
      }
      await loadLoan();
      window.dispatchEvent(new CustomEvent("loan:updated", { detail: { id } }));
      alert("Loan disbursed.");
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.error || "Failed to disburse loan.");
    } finally {
      setActing(false);
    }
  }

  async function saveSuggestion() {
    if (!suggestedAmount || Number(suggestedAmount) <= 0) {
      alert("Enter a valid amount.");
      return;
    }
    setActing(true);
    try {
      await api.patch(`/loans/${id}`, { amount: Number(suggestedAmount) });
      if (reviewComment.trim())
        await postCommentInline(
          `Suggested amount: ${fmtMoney(suggestedAmount, currency)} — ${reviewComment.trim()}`
        );
      await loadLoan();
      alert("Suggestion saved.");
    } catch (e) {
      console.error(e);
      alert("Failed to save suggestion.");
    } finally {
      setActing(false);
    }
  }

  // Close loan (legacy)
  const closeLoan = async () => {
    const remaining = Number(outstanding || 0);
    if (remaining > 0 && !window.confirm("Outstanding > 0. Close anyway?")) return;
    try {
      await api.patch(`/loans/${id}/status`, {
        status: "closed",
        override: remaining > 0,
      });
      await loadLoan();
      alert("Loan closed.");
    } catch (e) {
      console.error(e);
      alert("Failed to close loan.");
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;
    try {
      const res = await api.post(`/comments`, {
        loanId: id,
        content: newComment,
      });
      setComments((prev) => [res.data, ...prev]);
      setNewComment("");
    } catch (e) {
      console.error(e);
      alert("Failed to add comment.");
    }
  };

  /* ---------- repayments ---------- */
  const handlePostRepayment = async () => {
    const amt = Number(repForm.amount);
    if (!amt || amt <= 0) return alert("Enter a valid amount.");
    setPostLoading(true);
    try {
      await api.post(`/repayments`, { loanId: id, ...repForm, amount: amt });

      if (loan?.status && !["active", "closed"].includes(String(loan.status).toLowerCase())) {
        try {
          await api.patch(`/loans/${id}/status`, { status: "active" });
        } catch {
          /* ignore */
        }
      }

      await loadLoan();
      setOpenRepay(false);
      setRepForm({
        amount: "",
        date: new Date().toISOString().slice(0, 10),
        method: "cash",
        notes: "",
      });

      window.dispatchEvent(new CustomEvent("loan:updated", { detail: { id } }));

      alert("Repayment posted.");
    } catch (e) {
      console.error(e);
      alert("Failed to post repayment.");
    } finally {
      setPostLoading(false);
    }
  };

  /* ---------- Edit / Delete / Reissue / Reschedule ---------- */
  const openEditModal = () => {
    setEditForm({
      amount: loan?.amount ?? "",
      interestRate: loan?.interestRate ?? "",
      termMonths: loan?.termMonths ?? loan?.durationMonths ?? "",
      startDate: asISO(loan?.startDate || loan?.releaseDate),
    });
    setOpenEdit(true);
  };

  const saveEdit = async () => {
    const body = {
      amount: editForm.amount === "" ? undefined : Number(editForm.amount),
      interestRate: editForm.interestRate === "" ? undefined : Number(editForm.interestRate),
      termMonths: editForm.termMonths === "" ? undefined : Number(editForm.termMonths),
      startDate: editForm.startDate || undefined,
    };
    if (Number.isFinite(body.amount) && body.amount <= 0) return alert("Amount must be > 0");
    if (Number.isFinite(body.termMonths) && body.termMonths <= 0) return alert("Term must be > 0");

    setSavingEdit(true);
    try {
      await api.patch(`/loans/${id}`, body);
      setOpenEdit(false);
      await loadLoan();
      alert("Loan updated.");
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.error || "Failed to update loan.");
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteLoan = async () => {
    if (!window.confirm("This will permanently delete this loan. Continue?")) return;
    try {
      await api.delete(`/loans/${id}`);
      alert("Loan deleted.");
      navigate("/loans");
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.error || "Failed to delete loan.");
    }
  };

  const openRescheduleModal = () => {
    setRescheduleForm({
      termMonths: loan?.termMonths ?? "",
      startDate: asISO(loan?.startDate || loan?.releaseDate),
      previewOnly: false,
    });
    setOpenReschedule(true);
  };

  const submitReschedule = async () => {
    const body = {
      termMonths:
        rescheduleForm.termMonths === "" ? undefined : Number(rescheduleForm.termMonths),
      startDate: rescheduleForm.startDate || undefined,
      previewOnly: !!rescheduleForm.previewOnly,
    };
    if (Number.isFinite(body.termMonths) && body.termMonths <= 0) {
      return alert("Term must be > 0");
    }
    setSavingReschedule(true);
    try {
      const { data } = await api.post(`/loans/${id}/reschedule`, body);
      if (Array.isArray(data?.schedule)) {
        setSchedule(data.schedule);
      }
      setOpenReschedule(false);
      await loadLoan();
      alert(data?.message || "Schedule updated.");
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.error || "Failed to reschedule.");
    } finally {
      setSavingReschedule(false);
    }
  };

  // save officer/branch ownership — robust & type-safe
  const saveOwnership = async () => {
    const currentOfficerId =
      loan?.officerId ??
      loan?.loanOfficerId ??
      loan?.assignedOfficerId ??
      loan?.disbursedBy ??
      loan?.disbursed_by ??
      loan?.officer?.id ??
      "";

    const payload = {};
    if (ownershipForm.officerId !== "" && String(ownershipForm.officerId) !== String(currentOfficerId)) {
      payload.officerId = ownershipForm.officerId;
    }
    if (ownershipForm.branchId !== "" && String(ownershipForm.branchId) !== String(loan?.branchId ?? "")) {
      payload.branchId = ownershipForm.branchId;
    }

    if (!Object.keys(payload).length) {
      setEditOwnership(false);
      return;
    }

    setSavingOwnership(true);
    try {
      await patchLoanOwnership({ id, payload });
      setEditOwnership(false);
      await loadLoan();
      window.dispatchEvent(new CustomEvent("loan:updated", { detail: { id } }));
      alert("Assignment saved.");
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.error || e?.message || "Failed to save assignment.");
    } finally {
      setSavingOwnership(false);
    }
  };

  const reissueLoan = async () => {
    if (!window.confirm("Reissue creates a new pending loan cloned from this one. Continue?"))
      return;
    try {
      const { data } = await api.post(`/loans/${id}/reissue`);
      const newId = data?.loan?.id || data?.id;
      alert("New loan created.");
      if (newId) navigate(`/loans/${newId}`);
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.error || "Failed to reissue loan.");
    }
  };

  /* ---------- quick stats & aggregates ---------- */
  const totals = useMemo(
    () => computeScheduleTotals(schedule || [], repayments || []),
    [schedule, repayments]
  );

  const scheduleReady = Array.isArray(schedule) && schedule.length > 0;

  const outstanding =
    loan?.status === "closed" ? 0 : scheduleReady ? totals.outstanding : loan?.outstanding ?? null;

  const nextDue = scheduleReady ? totals.nextDue : null;

  const repayTotals = useMemo(() => {
    const count = repayments.length || 0;
    const sum = repayments.reduce((a, r) => a + Number(r.amount || 0), 0);
    return { count, sum };
  }, [repayments]);

  const canPostRepayment = loan?.status !== "closed" && Number(outstanding || 0) > 0;

  /* ---------- compact identity helpers ---------- */
  const officersById = useMemo(() => {
    const map = {};
    for (const o of officers || []) {
      const label = o.name || o.email || o.phone || "";
      if (label) map[String(o.id)] = { name: label, phone: o.phone || "", email: o.email || "" };
    }
    return map;
  }, [officers]);

  const branchesById = useMemo(() => {
    const map = {};
    for (const b of branches || []) {
      map[String(b.id)] = b.name || b.code || `Branch ${b.id}`;
    }
    return map;
  }, [branches]);

  // Resolve officer
  const resolvedOfficerId =
    loan?.officerId ??
    loan?.loanOfficerId ??
    loan?.assignedOfficerId ??
    loan?.disbursedBy ??
    loan?.disbursed_by ??
    loan?.officer?.id ??
    "";

  const officerNameDirect =
    loan?.officer?.name ||
    loan?.officerName ||
    loan?.loanOfficerName ||
    loan?.disbursedByName ||
    loan?.disbursed_by_name ||
    "";

  const officerFromList = resolvedOfficerId ? officersById[String(resolvedOfficerId)] : null;

  const officerName =
    officer?.name ||
    (officerNameDirect && !/^Officer\s*#\s*/i.test(officerNameDirect) ? officerNameDirect : "") ||
    officerFromList?.name ||
    "—";

  const officerPhone = officer?.phone || officerFromList?.phone || "";
  const officerEmail = officer?.email || officerFromList?.email || "";

  // Resolve branch
  const resolvedBranchId = loan?.branchId ?? loan?.Branch?.id ?? loan?.branch?.id ?? "";
  const branchName =
    loan?.branchName ||
    loan?.Branch?.name ||
    loan?.branch?.name ||
    (resolvedBranchId ? branchesById[String(resolvedBranchId)] : "") ||
    "—";

  const borrowerName =
    borrower?.name || loan?.Borrower?.name || loan?.borrowerName || "—";

  /* ---------- render ---------- */
  if (loading) return <div className="w-full px-6 py-6 text-[var(--fg)]">Loading loan…</div>;
  if (errs) return <div className="w-full px-6 py-6 text-[var(--fg)]">{errs}</div>;
  if (!loan) return <div className="w-full px-6 py-6 text-[var(--fg)]">Loan not found.</div>;

  return (
    <div className={ui.page}>
      {/* BREADCRUMB */}
      <div className="text-xs text-[var(--muted)] mb-1">
        Loans <span className="opacity-60">›</span> #{id}
      </div>

      {/* HERO SUMMARY — Borrower, Status, Officer, Branch, Contacts (Card) */}
      <SectionCard
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight truncate">
              {borrowerName}
            </span>
            <span
              className={`${statusBadge} ${statusTone(loan.status)} text-[12px] md:text-[12px]`}
              aria-label={`status ${loan.status}`}
            >
              {loan.status}
            </span>
            {workflowStage ? (
              <span className={`${ui.chip} text-[11px]`} aria-label="workflow stage">
                Stage: {workflowStage.replaceAll("_", " ")}
              </span>
            ) : null}
          </div>
        }
        subtitle={
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="font-semibold">Loan #{id}</span>
            {product ? (
              <>
                <span className="opacity-50">•</span>
                <span className="font-semibold">
                  Product: {product.code || product.name}
                </span>
              </>
            ) : null}
            {loan.accountNumber ? (
              <>
                <span className="opacity-50">•</span>
                <span className="font-semibold">Acct: {loan.accountNumber}</span>
              </>
            ) : null}
          </div>
        }
        right={
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className={ui.actionLink} aria-label="Go back">
              &larr; Back
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Officer */}
          <div className="space-y-2">
            <Label>Officer</Label>
            {!editOwnership ? (
              <>
                <div className="text-lg font-extrabold">{officerName}</div>
                <div className="text-sm space-y-0.5">
                  {officerPhone ? <div>📞 {officerPhone}</div> : null}
                  {officerEmail ? <div>✉️ {officerEmail}</div> : null}
                </div>
              </>
            ) : (
              <select
                className={ui.input}
                value={ownershipForm.officerId}
                onChange={(e) => setOwnershipForm((s) => ({ ...s, officerId: e.target.value }))}
                aria-label="Select loan officer"
              >
                <option value="">— Select Officer —</option>
                {officers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name || o.email || `Officer #${o.id}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Branch */}
          <div className="space-y-2">
            <Label>Branch</Label>
            {!editOwnership ? (
              <div className="text-lg font-extrabold">{branchName}</div>
            ) : (
              <select
                className={ui.input}
                value={ownershipForm.branchId}
                onChange={(e) => setOwnershipForm((s) => ({ ...s, branchId: e.target.value }))}
                aria-label="Select branch"
              >
                <option value="">— Select Branch —</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name || b.code || `Branch #${b.id}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Borrower Contacts */}
          <div className="space-y-2">
            <Label>Borrower Contacts</Label>
            <div className="text-base space-y-1">
              {borrower?.phone ? (
                <div className="flex items-center gap-4">
                  <span>📞</span>
                  <a className="underline underline-offset-4 decoration-1" href={`tel:${borrower.phone}`}>
                    {borrower.phone}
                  </a>
                </div>
              ) : (
                <div className="text-sm text-[var(--muted)]">—</div>
              )}
              {borrower?.nationalId ? (
                <div className="flex items-center gap-2">
                  <span>ID:</span>
                  <span>{borrower.nationalId}</span>
                </div>
              ) : null}
              {borrower?.email ? (
                <div className="flex items-center gap-2">
                  <span>✉️</span>
                  <a className="underline underline-offset-4 decoration-1 break-all" href={`mailto:${borrower.email}`}>
                    {borrower.email}
                  </a>
                </div>
              ) : null}
              {loan.borrowerId ? (
                <div className="pt-1">
                  <Link
                    className={`${ui.actionLink} text`}
                    to={`/borrowers/${loan.borrowerId}`}
                    title="BORROWER PROFILE"
                  >
                    BORROWER PROFILE <span></span>
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {(canBM || isAdmin(role)) && (
          <div className="mt-6 flex flex-wrap gap-2">
            {!editOwnership ? (
              <button onClick={() => setEditOwnership(true)} className={ui.btn}>
                Edit Assignment
              </button>
            ) : (
              <>
                <button onClick={() => setEditOwnership(false)} className={ui.btn}>
                  Cancel
                </button>
                <button onClick={saveOwnership} disabled={savingOwnership} className={ui.primary}>
                  {savingOwnership ? "Saving…" : "Save Assignment"}
                </button>
              </>
            )}
          </div>
        )}
      </SectionCard>

      {/* SUMMARY */}
      <SectionCard>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
          <div>
            <Label>Amount</Label>
            <div className="text-2xl font-extrabold">{fmtMoney(loan.amount, currency)}</div>
          </div>

          <div>
            <Label>Interest</Label>
            <div className="text-base">
              <span className="font-bold">{loan.interestRate}%</span>{" "}
              <span>· {loan.interestMethod || "—"}</span>
            </div>
          </div>

          <div>
            <Label>Term</Label>
            <div className="text-base font-semibold">
              {loan.termMonths || loan.durationMonths} months
            </div>
          </div>

          <div>
            <Label>Start / Release</Label>
            <div className="text-base font-semibold">
              {asDate(loan.startDate || loan.releaseDate)}
            </div>
          </div>

          <div>
            <Label>Repayment Frequency</Label>
            <div className="text-base font-semibold capitalize">
              {loan.repaymentFrequency || loan.frequency || "—"}
            </div>
          </div>

          <div>
            <Label>Outstanding</Label>
            <div className="text-2xl font-extrabold">
              {outstanding == null ? "—" : fmtMoney(outstanding, currency)}
            </div>
          </div>

          <div>
            <Label>Next Due</Label>
            <div className="text-base font-semibold">
              {nextDue ? (
                <>
                  {asDate(nextDue.date)} ·{" "}
                  <span className="font-extrabold">{fmtMoney(nextDue.amount, currency)}</span>
                </>
              ) : (
                "—"
              )}
            </div>
          </div>

          {product && (
            <div className="md:col-span-2 lg:col-span-3 xl:col-span-4 min-w-0">
              <Label>Product</Label>
              <div className="text-base">
                <span className="font-extrabold">
                  {product.name}
                  {product.code ? ` (${product.code})` : ""}
                </span>
                <div className="text-sm mt-0.5">
                  Defaults: {product.interestMethod} @ {product.interestRate ?? product.defaultInterestRate}% · Limits:{" "}
                  {fmtMoney(product.minPrincipal, currency)} – {fmtMoney(product.maxPrincipal, currency)}, {product.minTermMonths}-
                  {product.maxTermMonths} months
                </div>
              </div>
            </div>
          )}
        </div>

        {/* At a glance */}
        <div className="mt-6 grid sm:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
          {[
            ["Paid Principal", totals.paidPrincipal],
            ["Paid Interest", totals.paidInterest],
            ["Paid Penalties", totals.paidPenalty],
            ["Paid Fees", totals.paidFees],
            ["Total Paid", totals.totalPaid],
            ["Total Scheduled", totals.scheduledTotal],
          ].map(([label, val]) => (
            <div
              key={label}
              className="rounded-xl border-2 border-[var(--border-strong)] p-3 bg-[var(--card)] shadow-sm"
            >
              <div className={ui.label}>{label}</div>
              <div className="font-bold text-lg">
                {scheduleReady ? fmtMoney(val, currency) : "—"}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* REVIEW / DISBURSE TOOLBARS */}
      {(showLOTB || showBMToolbar || showCOToolbar || showDisburse) && (
        <SectionCard dense>
          {showLOTB && (
            <>
              <h3 className="text-lg font-extrabold">Changes Requested</h3>
              <p className="text-sm">
                Update the application and attach missing documents, then <strong>Resubmit</strong>. Add a short note if helpful.
              </p>
              <label className="block text-xs font-semibold">Comment (optional)</label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className={`${ui.input} min-h-[44px]`}
                placeholder="What did you fix / add?"
              />
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => workflowAction("resubmit")}
                  disabled={acting}
                  className={ui.primary}
                  title="Send for review again"
                >
                  {acting ? "Submitting…" : "Resubmit for Review"}
                </button>
                <Link
                  to="/loans/applications"
                  className={ui.btn}
                  title="Open applications to edit details/attachments"
                >
                  Edit Application
                </Link>
              </div>
            </>
          )}

          {(showBMToolbar || showCOToolbar) && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-extrabold">
                  {showBMToolbar ? "Branch Manager Review" : "Compliance Review"}
                </h3>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold">Suggested Principal</label>
                  <input
                    type="number"
                    className={ui.input}
                    value={suggestedAmount}
                    onChange={(e) => setSuggestedAmount(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                  <p className="text-[11px] text-[var(--muted)] mt-1">
                    Save a suggestion or approve with a different amount.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold">Comment</label>
                  <textarea
                    className={`${ui.input} min-h-[44px]`}
                    placeholder="Why approving / changes / rejection?"
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() =>
                    workflowAction(showBMToolbar ? "bm_approve" : "compliance_approve", {
                      suggestedAmount,
                    })
                  }
                  disabled={acting}
                  className={ui.primary}
                >
                  {acting ? "Working…" : "Approve"}
                </button>
                <button
                  onClick={() => workflowAction("request_changes")}
                  disabled={acting}
                  className={ui.btn}
                  title="Send back to Loan Officer with requested changes"
                >
                  {acting ? "Working…" : "Request Changes"}
                </button>
                <button
                  onClick={() => workflowAction("reject")}
                  disabled={acting}
                  className={ui.btn}
                >
                  {acting ? "Working…" : "Reject"}
                </button>
                <button onClick={saveSuggestion} disabled={acting} className={ui.btn}>
                  {acting ? "Saving…" : "Save Suggestion"}
                </button>
              </div>
            </>
          )}

          {showDisburse && (
            <div className="flex items-center justify-between">
              <p className="text-sm">This loan is approved. Proceed to disbursement to finalize payout.</p>
              <button onClick={disburseLoan} className={ui.primary} disabled={acting}>
                {acting ? "Working…" : "Disburse"}
              </button>
            </div>
          )}
        </SectionCard>
      )}

      {/* QUICK ACTIONS — sticky toolbar */}
      <div className="ms-sticky-actions">
        <div className="flex flex-wrap gap-3">
          <Link to={`/loans`} className={ui.btn}>
            Back to Loans
          </Link>

          <button onClick={() => setOpenSchedule(true)} className={ui.btn}>
            View Schedule
          </button>

          <button
            onClick={() => downloadScheduleCSV({ loan, schedule: schedule || [], currency })}
            className={ui.btn}
            disabled={!Array.isArray(schedule) || !schedule.length}
          >
            Export CSV
          </button>
          <button
            onClick={() => downloadSchedulePDF({ loan, schedule: schedule || [], currency })}
            className={ui.btn}
            disabled={!Array.isArray(schedule) || !schedule.length}
          >
            Export PDF
          </button>

          {canPostRepayment && (
            <button onClick={() => setOpenRepay(true)} className={ui.btn}>
              Post Repayment
            </button>
          )}

          {canEdit && (
            <>
              <button onClick={openEditModal} className={ui.btn}>
                Edit Loan
              </button>
              <button onClick={openRescheduleModal} className={ui.btn}>
                Reschedule
              </button>
            </>
          )}

          <button onClick={reissueLoan} className={ui.btn}>
            Reissue
          </button>

          {canDelete && (
            <button
              onClick={deleteLoan}
              className="px-3 md:px-4 py-2 rounded-lg font-semibold bg-red-600 text-white hover:bg-red-700 shadow-sm"
              aria-label="Delete loan"
            >
              Delete
            </button>
          )}

          {loan.status !== "closed" && (
            <button onClick={closeLoan} className={ui.btn}>
              Close Loan
            </button>
          )}
        </div>
      </div>

      {/* REPAYMENTS */}
      <SectionCard
        title="Repayments"
        right={
          <div className="text-sm font-semibold">
            {repayTotals.count} record{repayTotals.count === 1 ? "" : "s"} · Total{" "}
            <span className="font-extrabold">{fmtMoney(repayTotals.sum, currency)}</span>
          </div>
        }
      >
        {loadingRepayments ? (
          <p>Loading repayments…</p>
        ) : repayments.length === 0 ? (
          <div className="text-sm">No repayments found.</div>
        ) : (
          <div className={ui.tableWrap}>
            <table className="min-w-full table-fixed">
              <thead>
                <tr className="text-left sticky top-0 z-10">
                  {["#", "Date", "Amount", "Method", "Notes"].map((h) => (
                    <th key={h} className={ui.th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {repayments.map((r, i) => (
                  <tr
                    key={r.id || i}
                    className={`${i % 2 === 0 ? "bg-[var(--table-row-even)]" : "bg-[var(--table-row-odd)]"} hover:bg-[var(--chip-soft)] transition-colors`}
                  >
                    <td className={ui.td}>{i + 1}</td>
                    <td className={ui.td}>{asDate(r.paymentDate || r.date || r.createdAt)}</td>
                    <td className={`${ui.td} text-right tabular-nums`}>{fmtMoney(r.amount, currency)}</td>
                    <td className={ui.td}>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--badge-bg)] text-[var(--badge-fg)] ring-1 ring-[var(--border)]">
                        {r.method || "—"}
                      </span>
                    </td>
                    <td className={`${ui.td} break-words`}>{r.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className={`${ui.td} font-bold`} colSpan={2}>
                    Total
                  </td>
                  <td className={`${ui.td} text-right text-base font-extrabold`}>
                    {fmtMoney(repayTotals.sum, currency)}
                  </td>
                  <td className={ui.td} colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
