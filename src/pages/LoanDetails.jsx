import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api";

/* ---------- helpers ---------- */
const fmtTZS = (n, currency = "TZS") =>
  `\u200e${currency} ${Number(n || 0).toLocaleString()}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "N/A");
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString() : "");

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 ring-yellow-200",
  approved: "bg-blue-100 text-blue-800 ring-blue-200",
  rejected: "bg-gray-200 text-gray-700 ring-gray-300",
  disbursed: "bg-indigo-100 text-indigo-800 ring-indigo-200",
  active: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  closed: "bg-slate-200 text-slate-700 ring-slate-300",
};

const chip =
  "inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset";

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

/* ---------- component ---------- */
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

  // review state (BM/Compliance + Officer resubmit uses comment too)
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

  const currency = loan?.currency || "TZS";
  const statusBadge = statusColors[loan?.status] || "bg-slate-100 text-slate-800 ring-slate-200";

  const role = roleOf();
  const canBM = isBM(role);
  const canCO = isCompliance(role);
  const canACC = isAccountant(role);
  const canOFF = isOfficer(role);

  const workflowStage = loan?.workflowStage || deriveStageFromStatus(loan?.status);

  // Show bars depending on stage
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
          .then((r) => setComments(r.data || []))
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
      // Try to prefetch schedule for at-a-glance stats (non-blocking)
      tasks.push(
        api
          .get(`/loans/${id}/schedule`)
          .then((r) => setSchedule(r.data || null))
          .catch(() => setSchedule(null))
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
    setSchedule(null);
    setReviewComment("");
    setNewComment("");
    loadLoan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* ---------- comments ---------- */
  async function postCommentInline(content) {
    try {
      await api.post(`/comments`, { loanId: id, content });
      const r = await api.get(`/comments/loan/${id}`);
      setComments(r.data || []);
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
      // Fallbacks to legacy endpoints if /workflow is not available
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
          `Suggested amount: ${fmtTZS(suggestedAmount, currency)} — ${reviewComment.trim()}`
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
    const outstanding = loan?.outstanding ?? 0;
    if (outstanding > 0 && !window.confirm("Outstanding > 0. Close anyway?")) return;
    try {
      await api.patch(`/loans/${id}/status`, {
        status: "closed",
        override: outstanding > 0,
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

  /* ---------- schedule ---------- */
  const openScheduleModal = async () => {
    setOpenSchedule(true);
    if (schedule) return;
    setLoadingSchedule(true);
    try {
      const res = await api.get(`/loans/${id}/schedule`);
      setSchedule(res.data || []);
    } catch (e) {
      console.error(e);
      setSchedule(null);
    } finally {
      setLoadingSchedule(false);
    }
  };

  /* ---------- derive quick stats ---------- */
  const outstanding = loan?.outstanding ?? null;
  const nextDue =
    Array.isArray(schedule) && schedule.length
      ? schedule.find((r) => !r.paid && !r.settled) || schedule[0]
      : null;

  /* ---------- render ---------- */
  if (loading) return <div className="max-w-7xl mx-auto px-6 py-6">Loading loan…</div>;
  if (errs) return <div className="max-w-7xl mx-auto px-6 py-6 text-red-600">{errs}</div>;
  if (!loan) return <div className="max-w-7xl mx-auto px-6 py-6">Loan not found.</div>;

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-3xl font-bold tracking-tight">Loan Details</h2>
          <span className={`${chip} ${statusBadge}`}>{loan.status}</span>
          {workflowStage && (
            <span className={`${chip} bg-indigo-50 text-indigo-700 ring-indigo-200`}>
              Stage: {workflowStage.replaceAll("_", " ")}
            </span>
          )}
        </div>
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline">
          &larr; Back
        </button>
      </div>

      {/* TOP SUMMARY / KEY FACTS */}
      <div className="bg-white border rounded-xl shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
          <div className="col-span-2">
            <div className="text-[11px] uppercase tracking-wider text-gray-500">Borrower</div>
            <Link
              className="text-lg font-semibold text-blue-700 hover:underline"
              to={`/borrowers/${loan.borrowerId}`}
            >
              {loan.Borrower?.name || loan.borrowerName || "N/A"}
            </Link>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider text-gray-500">Amount</div>
            <div className="text-xl font-semibold">{fmtTZS(loan.amount, currency)}</div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider text-gray-500">Interest</div>
            <div className="text-base">
              <span className="font-medium">{loan.interestRate}%</span>{" "}
              <span className="text-gray-600">· {loan.interestMethod}</span>
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider text-gray-500">Term</div>
            <div className="text-base">{loan.termMonths || loan.durationMonths} months</div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider text-gray-500">
              Start / Release
            </div>
            <div className="text-base">{fmtDate(loan.startDate || loan.releaseDate)}</div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider text-gray-500">Outstanding</div>
            <div className="text-xl font-semibold">
              {outstanding == null ? "—" : fmtTZS(outstanding, currency)}
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider text-gray-500">Next Due</div>
            <div className="text-base">
              {nextDue ? (
                <>
                  {fmtDate(nextDue.dueDate)} ·{" "}
                  <span className="font-medium">{fmtTZS(nextDue.total, currency)}</span>
                </>
              ) : (
                "—"
              )}
            </div>
          </div>

          {product && (
            <div className="md:col-span-2 lg:col-span-3 xl:col-span-4">
              <div className="text-[11px] uppercase tracking-wider text-gray-500">Product</div>
              <div className="text-base">
                <span className="font-semibold">
                  {product.name}
                  {product.code ? ` (${product.code})` : ""}
                </span>
                <div className="text-gray-600 text-sm">
                  Defaults: {product.interestMethod} @{" "}
                  {product.interestRate ?? product.defaultInterestRate}% · Limits:{" "}
                  {fmtTZS(product.minPrincipal, currency)} –{" "}
                  {fmtTZS(product.maxPrincipal, currency)},{" "}
                  {product.minTermMonths}-{product.maxTermMonths} months
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* REVIEW / DISBURSE TOOLBARS */}
      {(showLOTB || showBMToolbar || showCOToolbar || showDisburse) && (
        <div className="bg-white border rounded-xl shadow-sm p-6 space-y-4">
          {showLOTB && (
            <>
              <h3 className="text-lg font-semibold">Changes Requested</h3>
              <p className="text-sm text-gray-600">
                Update the application and attach missing documents, then{" "}
                <strong>Resubmit</strong>. Add a short note if helpful.
              </p>
              <label className="block text-xs text-gray-600">Comment (optional)</label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full min-h-[44px]"
                placeholder="What did you fix / add?"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => workflowAction("resubmit")}
                  disabled={acting}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-60"
                  title="Send for review again"
                >
                  {acting ? "Submitting…" : "Resubmit for Review"}
                </button>
                <Link
                  to="/loans/applications"
                  className="px-4 py-2 rounded-lg border hover:bg-gray-50"
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
                <h3 className="text-lg font-semibold">
                  {showBMToolbar ? "Branch Manager Review" : "Compliance Review"}
                </h3>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600">Suggested Principal</label>
                  <input
                    type="number"
                    className="border rounded-lg px-3 py-2 w-full"
                    value={suggestedAmount}
                    onChange={(e) => setSuggestedAmount(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Save a suggestion or approve with a different amount.
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Comment</label>
                  <textarea
                    className="border rounded-lg px-3 py-2 w-full min-h-[44px]"
                    placeholder="Why approving / changes / rejection?"
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    workflowAction(showBMToolbar ? "bm_approve" : "compliance_approve", {
                      suggestedAmount,
                    })
                  }
                  disabled={acting}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-60"
                >
                  {acting ? "Working…" : "Approve"}
                </button>
                <button
                  onClick={() => workflowAction("request_changes")}
                  disabled={acting}
                  className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 disabled:opacity-60"
                  title="Send back to Loan Officer with requested changes"
                >
                  {acting ? "Working…" : "Request Changes"}
                </button>
                <button
                  onClick={() => workflowAction("reject")}
                  disabled={acting}
                  className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-60"
                >
                  {acting ? "Working…" : "Reject"}
                </button>
                <button
                  onClick={saveSuggestion}
                  disabled={acting}
                  className="px-4 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-60"
                >
                  {acting ? "Saving…" : "Save Suggestion"}
                </button>
              </div>
            </>
          )}

          {showDisburse && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                This loan is approved. Proceed to disbursement to finalize payout.
              </p>
              <Link
                to={`/loans/${id}/disburse`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Disburse
              </Link>
            </div>
          )}
        </div>
      )}

      {/* QUICK ACTIONS */}
      <div className="flex flex-wrap gap-3">
        <Link to={`/loans`} className="px-4 py-2 rounded-lg border hover:bg-gray-50">
          Back to Loans
        </Link>
        <button
          onClick={openScheduleModal}
          className="px-4 py-2 rounded-lg border hover:bg-gray-50"
        >
          View Schedule
        </button>
        <button
          onClick={() => setOpenRepay(true)}
          className="px-4 py-2 rounded-lg border hover:bg-gray-50"
        >
          Post Repayment
        </button>
        {loan.status !== "closed" && (
          <button
            onClick={closeLoan}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Close Loan
          </button>
        )}
      </div>

      {/* REPAYMENTS */}
      <div className="bg-white border rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Repayments</h3>
        </div>
        <div className="px-6 py-4">
          {loadingRepayments ? (
            <p>Loading repayments…</p>
          ) : repayments.length === 0 ? (
            <div className="text-sm text-gray-600">No repayments found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr className="text-left">
                    <th className="px-3 py-2 border-b">Date</th>
                    <th className="px-3 py-2 border-b">Amount</th>
                    <th className="px-3 py-2 border-b">Method</th>
                    <th className="px-3 py-2 border-b">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {repayments.map((r, i) => (
                    <tr key={r.id || i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.date)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{fmtTZS(r.amount, currency)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.method || "—"}</td>
                      <td className="px-3 py-2">{r.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* COMMENTS */}
      <div className="bg-white border rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Comments</h3>
        </div>

        <div className="px-6 py-4 space-y-4">
          {loadingComments ? (
            <p>Loading comments…</p>
          ) : comments.length === 0 ? (
            <div className="text-sm text-gray-600">No comments yet.</div>
          ) : (
            <div className="space-y-3 max-h-72 overflow-auto pr-1">
              {comments.map((c, i) => (
                <div key={c.id || i} className="flex gap-3">
                  {/* simple avatar using initial */}
                  <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold select-none">
                    {(c.author?.name || "U").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 border-b pb-2">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span className="font-medium text-gray-700">
                        {c.author?.name || "User"}
                      </span>
                      <span>{fmtDateTime(c.createdAt)}</span>
                    </div>
                    <p className="text-sm mt-0.5">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-start gap-2">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full min-h-[44px]"
              placeholder="Add a comment"
            />
            <button
              onClick={addComment}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Post
            </button>
          </div>
        </div>
      </div>

      {/* REPAYMENT MODAL */}
      {openRepay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-semibold">Post Repayment</h4>
              <button onClick={() => setOpenRepay(false)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600">Amount</label>
                <input
                  type="number"
                  value={repForm.amount}
                  onChange={(e) => setRepForm((s) => ({ ...s, amount: e.target.value }))}
                  className="border rounded-lg px-3 py-2 w-full"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Date</label>
                <input
                  type="date"
                  value={repForm.date}
                  onChange={(e) => setRepForm((s) => ({ ...s, date: e.target.value }))}
                  className="border rounded-lg px-3 py-2 w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Method</label>
                <select
                  value={repForm.method}
                  onChange={(e) => setRepForm((s) => ({ ...s, method: e.target.value }))}
                  className="border rounded-lg px-3 py-2 w-full"
                >
                  <option value="cash">Cash</option>
                  <option value="mobile">Mobile Money</option>
                  <option value="bank">Bank</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600">Notes (optional)</label>
                <input
                  type="text"
                  value={repForm.notes}
                  onChange={(e) => setRepForm((s) => ({ ...s, notes: e.target.value }))}
                  className="border rounded-lg px-3 py-2 w-full"
                  placeholder="Receipt no., reference, etc."
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setOpenRepay(false)} className="px-4 py-2 rounded-lg border">
                Cancel
              </button>
              <button
                onClick={postRepayment}
                disabled={postLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60"
              >
                {postLoading ? "Posting…" : "Post"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULE MODAL */}
      {openSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-semibold">Repayment Schedule</h4>
              <button onClick={() => setOpenSchedule(false)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            {loadingSchedule ? (
              <p>Loading schedule…</p>
            ) : !schedule || schedule.length === 0 ? (
              <p>No schedule available.</p>
            ) : (
              <div className="max-h-[70vh] overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="text-left">
                      <th className="px-3 py-2 border-b">#</th>
                      <th className="px-3 py-2 border-b">Due Date</th>
                      <th className="px-3 py-2 border-b">Principal</th>
                      <th className="px-3 py-2 border-b">Interest</th>
                      <th className="px-3 py-2 border-b">Penalty</th>
                      <th className="px-3 py-2 border-b">Total</th>
                      <th className="px-3 py-2 border-b">Balance</th>
                      <th className="px-3 py-2 border-b">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {schedule.map((row, idx) => (
                      <tr key={row.id || idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap">{idx + 1}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{fmtDate(row.dueDate)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{fmtTZS(row.principal, currency)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{fmtTZS(row.interest, currency)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{fmtTZS(row.penalty || 0, currency)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{fmtTZS(row.total, currency)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{fmtTZS(row.balance, currency)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {row.paid || row.settled ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                              Settled
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button onClick={() => setOpenSchedule(false)} className="px-4 py-2 rounded-lg border">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
