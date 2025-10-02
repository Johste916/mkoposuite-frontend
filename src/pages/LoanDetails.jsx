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

/* ---------- status & UI helpers ---------- */
const statusColors = {
  pending: "bg-yellow-100 text-yellow-900 ring-yellow-300",
  approved: "bg-blue-100 text-blue-900 ring-blue-300",
  rejected: "bg-gray-200 text-gray-900 ring-gray-300",
  disbursed: "bg-indigo-100 text-indigo-900 ring-indigo-300",
  active: "bg-emerald-100 text-emerald-900 ring-emerald-300",
  closed: "bg-slate-200 text-slate-900 ring-slate-300",
};

const chip =
  "inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ring-2 ring-inset";

/* highly-visible link */
const actionLink =
  "inline-flex items-center gap-1 text-blue-700 font-bold underline underline-offset-4 decoration-2 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded";

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

/* -------------- light UI helpers (no external deps) -------------- */
const SectionCard = ({ title, subtitle, right, children, dense = false }) => (
  <div className="bg-white border-2 border-slate-400 rounded-2xl shadow-lg w-full">
    <div
      className={`px-6 ${
        dense ? "py-3" : "py-4"
      } border-b-2 border-slate-300 bg-slate-100 flex items-center justify-between`}
    >
      <div className="min-w-0">
        {title && (
          <h3 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900">
            {title}
          </h3>
        )}
        {subtitle && <p className="text-sm text-slate-800 mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
    <div className={`px-6 ${dense ? "py-4" : "py-6"} text-[15px] text-slate-900`}>{children}</div>
  </div>
);

const Label = ({ children }) => (
  <div className="text-[12px] uppercase tracking-wide text-slate-900 font-semibold">{children}</div>
);

/* --------------------------- component --------------------------- */
export default function LoanDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loan, setLoan] = useState(null);
  const [product, setProduct] = useState(null);
  const [repayments, setRepayments] = useState([]);
  const [comments, setComments] = useState([]);
  const [schedule, setSchedule] = useState(null);

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
  const statusBadge = statusColors[loan?.status] || "bg-slate-100 text-slate-900 ring-slate-300";

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

  const loadLoan = async () => {
    setLoading(true);
    setErrs(null);
    try {
      const { data: l } = await api.get(`/loans/${id}`);
      setLoan(l);
      setSuggestedAmount(String(l?.amount ?? ""));

      const tasks = [
        api
          .get(`/repayments/loan/${id}`)
          .then((r) => setRepayments(r.data || []))
          .catch(() => setRepayments([]))
          .finally(() => setLoadingRepayments(false)),

        api
          .get(`/comments/loan/${id}`)
          .then((r) => setComments(Array.isArray(r.data) ? r.data : []))
          .catch((e) => {
            console.warn("Comments fetch failed:", e?.response?.data || e?.message);
            setComments([]);
          })
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

  /* ---------- render ---------- */
  if (loading) return <div className="w-full px-6 py-6">Loading loan…</div>;
  if (errs) return <div className="w-full px-6 py-6 text-red-700 font-semibold">{errs}</div>;
  if (!loan) return <div className="w-full px-6 py-6">Loan not found.</div>;

  return (
    <div className="w-full px-4 md:px-6 py-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-4xl font-extrabold tracking-tight text-slate-900">Loan Details</h2>
          <span className={`${chip} ${statusBadge}`}>{loan.status}</span>
          {workflowStage && (
            <span className={`${chip} bg-indigo-50 text-indigo-900 ring-indigo-300`}>
              Stage: {workflowStage.replaceAll("_", " ")}
            </span>
          )}
        </div>
        <button onClick={() => navigate(-1)} className={actionLink}>
          &larr; Back
        </button>
      </div>

      {/* SUMMARY */}
      <SectionCard>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
          <div className="col-span-2 min-w-0">
            <Label>Borrower</Label>
            <Link
              className={`${actionLink} text-lg md:text-xl truncate`}
              to={`/borrowers/${loan.borrowerId}`}
              title={loan.Borrower?.name || loan.borrowerName || "N/A"}
            >
              {loan.Borrower?.name || loan.borrowerName || "N/A"} <span>›</span>
            </Link>
          </div>

          <div>
            <Label>Amount</Label>
            <div className="text-2xl font-extrabold">{fmtMoney(loan.amount, currency)}</div>
          </div>

          <div>
            <Label>Interest</Label>
            <div className="text-base">
              <span className="font-bold">{loan.interestRate}%</span>{" "}
              <span className="text-slate-900">· {loan.interestMethod || "—"}</span>
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
            <div className="md:col-span-2 lg:col-span-3 xl:col-span-4">
              <Label>Product</Label>
              <div className="text-base">
                <span className="font-extrabold">
                  {product.name}
                  {product.code ? ` (${product.code})` : ""}
                </span>
                <div className="text-slate-900 text-sm mt-0.5">
                  Defaults: {product.interestMethod} @{" "}
                  {product.interestRate ?? product.defaultInterestRate}% · Limits:{" "}
                  {fmtMoney(product.minPrincipal, currency)} –{" "}
                  {fmtMoney(product.maxPrincipal, currency)}, {product.minTermMonths}-
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
              className="rounded-xl border-2 border-slate-400 p-3 bg-white shadow-sm"
            >
              <div className="text-[11px] uppercase tracking-wide text-slate-900 font-semibold">
                {label}
              </div>
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
              <p className="text-sm text-slate-900">
                Update the application and attach missing documents, then{" "}
                <strong>Resubmit</strong>. Add a short note if helpful.
              </p>
              <label className="block text-xs text-slate-900 font-semibold">Comment (optional)</label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="border-2 border-slate-400 rounded-lg px-3 py-2 w-full min-h-[44px]"
                placeholder="What did you fix / add?"
              />
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => workflowAction("resubmit")}
                  disabled={acting}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-60 font-semibold shadow-sm"
                  title="Send for review again"
                >
                  {acting ? "Submitting…" : "Resubmit for Review"}
                </button>
                <Link
                  to="/loans/applications"
                  className="px-4 py-2 rounded-lg border-2 border-slate-400 hover:bg-slate-50 font-semibold"
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
                  <label className="block text-xs text-slate-900 font-semibold">
                    Suggested Principal
                  </label>
                  <input
                    type="number"
                    className="border-2 border-slate-400 rounded-lg px-3 py-2 w-full"
                    value={suggestedAmount}
                    onChange={(e) => setSuggestedAmount(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                  <p className="text-[11px] text-slate-700 mt-1">
                    Save a suggestion or approve with a different amount.
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-slate-900 font-semibold">Comment</label>
                  <textarea
                    className="border-2 border-slate-400 rounded-lg px-3 py-2 w-full min-h-[44px]"
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
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-60 font-semibold shadow-sm"
                >
                  {acting ? "Working…" : "Approve"}
                </button>
                <button
                  onClick={() => workflowAction("request_changes")}
                  disabled={acting}
                  className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 disabled:opacity-60 font-semibold shadow-sm"
                  title="Send back to Loan Officer with requested changes"
                >
                  {acting ? "Working…" : "Request Changes"}
                </button>
                <button
                  onClick={() => workflowAction("reject")}
                  disabled={acting}
                  className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 disabled:opacity-60 font-semibold shadow-sm"
                >
                  {acting ? "Working…" : "Reject"}
                </button>
                <button
                  onClick={saveSuggestion}
                  disabled={acting}
                  className="px-4 py-2 rounded-lg border-2 border-slate-400 hover:bg-slate-50 disabled:opacity-60 font-semibold"
                >
                  {acting ? "Saving…" : "Save Suggestion"}
                </button>
              </div>
            </>
          )}

          {showDisburse && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-900">
                This loan is approved. Proceed to disbursement to finalize payout.
              </p>
              <Link
                to={`/loans/${id}/disburse`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-semibold shadow-sm"
              >
                Disburse
              </Link>
            </div>
          )}
        </SectionCard>
      )}

      {/* QUICK ACTIONS */}
      <div className="flex flex-wrap gap-3">
        <Link
          to={`/loans`}
          className="px-3 md:px-4 py-2 rounded-lg border-2 border-slate-400 hover:bg-slate-50 font-semibold"
        >
          Back to Loans
        </Link>

        <button
          onClick={() => setOpenSchedule(true)}
          className="px-3 md:px-4 py-2 rounded-lg border-2 border-slate-400 hover:bg-slate-50 font-semibold"
        >
          View Schedule
        </button>

        <button
          onClick={() => downloadScheduleCSV({ loan, schedule: schedule || [], currency })}
          className="px-3 md:px-4 py-2 rounded-lg border-2 border-slate-400 hover:bg-slate-50 font-semibold"
          disabled={!Array.isArray(schedule) || !schedule.length}
        >
          Export CSV
        </button>
        <button
          onClick={() => downloadSchedulePDF({ loan, schedule: schedule || [], currency })}
          className="px-3 md:px-4 py-2 rounded-lg border-2 border-slate-400 hover:bg-slate-50 font-semibold"
          disabled={!Array.isArray(schedule) || !schedule.length}
        >
          Export PDF
        </button>

        {canPostRepayment && (
          <button
            onClick={() => setOpenRepay(true)}
            className="px-3 md:px-4 py-2 rounded-lg border-2 border-slate-400 hover:bg-slate-50 font-semibold"
          >
            Post Repayment
          </button>
        )}

        {canEdit && (
          <>
            <button
              onClick={openEditModal}
              className="px-3 md:px-4 py-2 rounded-lg border-2 border-slate-400 hover:bg-slate-50 font-semibold"
            >
              Edit Loan
            </button>
            <button
              onClick={openRescheduleModal}
              className="px-3 md:px-4 py-2 rounded-lg border-2 border-slate-400 hover:bg-slate-50 font-semibold"
            >
              Reschedule
            </button>
          </>
        )}

        <button
          onClick={reissueLoan}
          className="px-3 md:px-4 py-2 rounded-lg border-2 border-slate-400 hover:bg-slate-50 font-semibold"
        >
          Reissue
        </button>

        {canDelete && (
          <button
            onClick={deleteLoan}
            className="bg-red-600 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-red-700 font-semibold shadow-sm"
          >
            Delete
          </button>
        )}

        {loan.status !== "closed" && (
          <button
            onClick={closeLoan}
            className="bg-red-50 text-red-700 px-3 md:px-4 py-2 rounded-lg border-2 border-red-300 hover:bg-red-100 font-semibold"
          >
            Close Loan
          </button>
        )}
      </div>

      {/* REPAYMENTS */}
      <SectionCard
        title="Repayments"
        right={
          <div className="text-sm text-slate-900 font-semibold">
            {repayTotals.count} record{repayTotals.count === 1 ? "" : "s"} · Total{" "}
            <span className="font-extrabold">{fmtMoney(repayTotals.sum, currency)}</span>
          </div>
        }
      >
        {loadingRepayments ? (
          <p>Loading repayments…</p>
        ) : repayments.length === 0 ? (
          <div className="text-sm text-slate-900">No repayments found.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border-2 border-slate-400">
            <table className="min-w-full table-fixed">
              <thead className="bg-slate-100 sticky top-0 z-10">
                <tr className="text-left">
                  {["#", "Date", "Amount", "Method", "Notes"].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-3 border border-slate-400 font-bold text-slate-900"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {repayments.map((r, i) => (
                  <tr key={r.id || i} className={i % 2 ? "bg-slate-50" : "bg-white"}>
                    <td className="px-3 py-2 border border-slate-300 whitespace-nowrap">{i + 1}</td>
                    <td className="px-3 py-2 border border-slate-300 whitespace-nowrap">
                      {asDate(r.date)}
                    </td>
                    <td className="px-3 py-2 border border-slate-300 text-right whitespace-nowrap">
                      {fmtMoney(r.amount, currency)}
                    </td>
                    <td className="px-3 py-2 border border-slate-300 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-900 ring-1 ring-slate-300">
                        {r.method || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 border border-slate-300 break-words">{r.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100">
                  <td className="px-3 py-3 border-t-2 border-slate-400 text-sm font-bold" colSpan={2}>
                    Total
                  </td>
                  <td className="px-3 py-3 border-t-2 border-slate-400 text-right text-base font-extrabold">
                    {fmtMoney(repayTotals.sum, currency)}
                  </td>
                  <td className="px-3 py-3 border-t-2 border-slate-400" colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </SectionCard>

      {/* COMMENTS */}
      <SectionCard title="Comments">
        {loadingComments ? (
          <p>Loading comments…</p>
        ) : comments.length === 0 ? (
          <div className="text-sm text-slate-900">No comments yet.</div>
        ) : (
          <div className="space-y-3 max-h-72 overflow-auto pr-1">
            {comments.map((c, i) => (
              <div key={c.id || i} className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-900 flex items-center justify-center text-xs font-extrabold select-none">
                  {(c.author?.name || "U").slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 border-b-2 border-slate-300 pb-2">
                  <div className="flex justify-between text-xs text-slate-700">
                    <span className="font-bold text-slate-900">{c.author?.name || "User"}</span>
                    <span>{asDateTime(c.createdAt)}</span>
                  </div>
                  <p className="text-sm mt-0.5 break-words">{c.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-start gap-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="border-2 border-slate-400 rounded-lg px-3 py-2 w-full min-h-[44px]"
            placeholder="Add a comment"
          />
          <button
            onClick={addComment}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold shadow-sm"
          >
            Post
          </button>
        </div>
      </SectionCard>

      {/* REPAYMENT MODAL */}
      {openRepay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 border-2 border-slate-400">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-2xl font-extrabold">Post Repayment</h4>
              <button onClick={() => setOpenRepay(false)} className="text-slate-700 hover:text-slate-900">
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-slate-900 font-semibold">Amount</label>
                <input
                  type="number"
                  value={repForm.amount}
                  onChange={(e) => setRepForm((s) => ({ ...s, amount: e.target.value }))}
                  className="border-2 border-slate-400 rounded-lg px-3 py-2 w-full"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-900 font-semibold">Date</label>
                <input
                  type="date"
                  value={repForm.date}
                  onChange={(e) => setRepForm((s) => ({ ...s, date: e.target.value }))}
                  className="border-2 border-slate-400 rounded-lg px-3 py-2 w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-900 font-semibold">Method</label>
                <select
                  value={repForm.method}
                  onChange={(e) => setRepForm((s) => ({ ...s, method: e.target.value }))}
                  className="border-2 border-slate-400 rounded-lg px-3 py-2 w-full"
                >
                  <option value="cash">Cash</option>
                  <option value="mobile">Mobile Money</option>
                  <option value="bank">Bank</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-900 font-semibold">Notes (optional)</label>
                <input
                  type="text"
                  value={repForm.notes}
                  onChange={(e) => setRepForm((s) => ({ ...s, notes: e.target.value }))}
                  className="border-2 border-slate-400 rounded-lg px-3 py-2 w-full"
                  placeholder="Receipt no., reference, etc."
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setOpenRepay(false)}
                className="px-4 py-2 rounded-lg border-2 border-slate-400 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handlePostRepayment}
                disabled={postLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60 font-semibold shadow-sm"
              >
                {postLoading ? "Posting…" : "Post"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULE MODAL */}
      {openSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl p-6 border-2 border-slate-400">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-2xl font-extrabold">Repayment Schedule</h4>
              <button
                onClick={() => setOpenSchedule(false)}
                className="text-slate-700 hover:text-slate-900"
              >
                ✕
              </button>
            </div>

            {loadingSchedule ? (
              <p>Loading schedule…</p>
            ) : !Array.isArray(schedule) || schedule.length === 0 ? (
              <p>No schedule available.</p>
            ) : (
              <>
                {/* Disbursed/Start & Next due */}
                <div className="mb-3 text-sm text-slate-900 space-y-1">
                  <div>
                    <b>Disbursed:</b> {asDate(loan?.releaseDate || loan?.startDate) || "—"}
                  </div>
                  <div>
                    Next installment:&nbsp;
                    {nextDue ? (
                      <>
                        <b>#{nextDue.idx}</b> on {asDate(nextDue.date)} —{" "}
                        <b>{fmtMoney(nextDue.amount, currency)}</b>
                      </>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>

                <div className="max-h-[75vh] overflow-auto rounded-xl border-2 border-slate-400">
                  <ScheduleTable schedule={schedule || []} currency={currency} />
                </div>
              </>
            )}

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setOpenSchedule(false)}
                className="px-4 py-2 rounded-lg border-2 border-slate-400 font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {openEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 border-2 border-slate-400">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-2xl font-extrabold">Edit Loan</h4>
              <button onClick={() => setOpenEdit(false)} className="text-slate-700 hover:text-slate-900">
                ✕
              </button>
            </div>
            <div className="grid gap-3">
              <div>
                <label className="block text-sm text-slate-900 font-semibold">Amount</label>
                <input
                  type="number"
                  value={editForm.amount}
                  onChange={(e) => setEditForm((s) => ({ ...s, amount: e.target.value }))}
                  className="border-2 border-slate-400 rounded-lg px-3 py-2 w-full"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-900 font-semibold">Interest Rate (%)</label>
                <input
                  type="number"
                  value={editForm.interestRate}
                  onChange={(e) => setEditForm((s) => ({ ...s, interestRate: e.target.value }))}
                  className="border-2 border-slate-400 rounded-lg px-3 py-2 w-full"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-900 font-semibold">Term (months)</label>
                <input
                  type="number"
                  value={editForm.termMonths}
                  onChange={(e) => setEditForm((s) => ({ ...s, termMonths: e.target.value }))}
                  className="border-2 border-slate-400 rounded-lg px-3 py-2 w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-900 font-semibold">Start Date</label>
                <input
                  type="date"
                  value={editForm.startDate}
                  onChange={(e) => setEditForm((s) => ({ ...s, startDate: e.target.value }))}
                  className="border-2 border-slate-400 rounded-lg px-3 py-2 w-full"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setOpenEdit(false)}
                className="px-4 py-2 rounded-lg border-2 border-slate-400 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={savingEdit}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-60 font-semibold shadow-sm"
              >
                {savingEdit ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESCHEDULE MODAL */}
      {openReschedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 border-2 border-slate-400">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-2xl font-extrabold">Reschedule Loan</h4>
              <button
                onClick={() => setOpenReschedule(false)}
                className="text-slate-700 hover:text-slate-900"
              >
                ✕
              </button>
            </div>
            <div className="grid gap-3">
              <div>
                <label className="block text-sm text-slate-900 font-semibold">New Term (months)</label>
                <input
                  type="number"
                  value={rescheduleForm.termMonths}
                  onChange={(e) =>
                    setRescheduleForm((s) => ({ ...s, termMonths: e.target.value }))
                  }
                  className="border-2 border-slate-400 rounded-lg px-3 py-2 w-full"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-900 font-semibold">New Start Date</label>
                <input
                  type="date"
                  value={rescheduleForm.startDate}
                  onChange={(e) =>
                    setRescheduleForm((s) => ({ ...s, startDate: e.target.value }))
                  }
                  className="border-2 border-slate-400 rounded-lg px-3 py-2 w-full"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                <input
                  type="checkbox"
                  checked={rescheduleForm.previewOnly}
                  onChange={(e) =>
                    setRescheduleForm((s) => ({ ...s, previewOnly: e.target.checked }))
                  }
                />
                Preview only (don’t save)
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setOpenReschedule(false)}
                className="px-4 py-2 rounded-lg border-2 border-slate-400 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={submitReschedule}
                disabled={savingReschedule}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-60 font-semibold shadow-sm"
              >
                {savingReschedule ? "Working…" : rescheduleForm.previewOnly ? "Preview" : "Reschedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
