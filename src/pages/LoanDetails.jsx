import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api";

/* ---------- helpers ---------- */
const fmtTZS = (n, currency = "TZS") =>
  `\u200e${currency} ${Number(n || 0).toLocaleString()}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "N/A");
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString() : "");

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  rejected: "bg-gray-200 text-gray-700",
  disbursed: "bg-indigo-100 text-indigo-800",
  active: "bg-emerald-100 text-emerald-800",
  closed: "bg-slate-200 text-slate-700",
};

const chip =
  "inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold";

const roleOf = () => {
  try {
    const r = (JSON.parse(localStorage.getItem("user") || "{}").role || "").toLowerCase();
    return r;
  } catch {
    return "";
  }
};
const isAdmin = (r) => r === "admin" || r === "director" || r === "superadmin";
const isBM = (r) =>
  ["branch_manager", "manager", "bm"].includes(r) || isAdmin(r);
const isCompliance = (r) =>
  ["compliance", "compliance_officer", "legal"].includes(r) || isAdmin(r);
const isAccountant = (r) =>
  ["accountant", "finance"].includes(r) || isAdmin(r);
const isOfficer = (r) =>
  ["loan_officer", "officer"].includes(r) && !isAdmin(r); // admins already have all bars

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
  const statusBadge = statusColors[loan?.status] || "bg-slate-100 text-slate-800";

  const role = roleOf();
  const canBM = isBM(role);
  const canCO = isCompliance(role);
  const canACC = isAccountant(role);
  const canOFF = isOfficer(role);

  const workflowStage =
    loan?.workflowStage || deriveStageFromStatus(loan?.status);

  // Show bars depending on stage
  const showLOTB = canOFF && [
    "changes_requested",
    "bm_changes_requested",
    "compliance_changes_requested",
    "returned_to_officer",
    "request_changes",
  ].includes(workflowStage);

  const showBMToolbar =
    canBM &&
    ["submitted", "bm_review", "changes_resubmitted"].includes(workflowStage);

  const showCOToolbar =
    canCO && ["compliance", "compliance_review"].includes(workflowStage);

  const showDisburse =
    canACC && (loan?.status === "approved" || workflowStage === "accounting");

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
          if (reviewComment.trim())
            await postCommentInline(reviewComment.trim());
        } else if (action === "reject") {
          await api.patch(`/loans/${id}/status`, { status: "rejected" });
          if (reviewComment.trim())
            await postCommentInline(reviewComment.trim());
        } else if (action === "request_changes") {
          if (reviewComment.trim())
            await postCommentInline(
              `Changes requested: ${reviewComment.trim()}`
            );
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
          `Suggested amount: ${fmtTZS(
            suggestedAmount,
            currency
          )} — ${reviewComment.trim()}`
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
    if (outstanding > 0 && !window.confirm("Outstanding > 0. Close anyway?"))
      return;
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

  /* ---------- repayments ---------- */
  const postRepayment = async () => {
    const amt = Number(repForm.amount);
    if (!amt || amt <= 0) return alert("Enter a valid amount.");
    setPostLoading(true);
    try {
      await api.post(`/repayments`, { loanId: id, ...repForm, amount: amt });
      await loadLoan();
      setOpenRepay(false);
      setRepForm({
        amount: "",
        date: new Date().toISOString().slice(0, 10),
        method: "cash",
        notes: "",
      });
      alert("Repayment posted.");
    } catch (e) {
      console.error(e);
      alert("Failed to post repayment.");
    } finally {
      setPostLoading(false);
    }
  };

  /* ---------- render ---------- */
  if (loading) return <div className="p-4">Loading loan…</div>;
  if (errs) return <div className="p-4 text-red-600">{errs}</div>;
  if (!loan) return <div className="p-4">Loan not found.</div>;

  const outstanding = loan?.outstanding ?? null;

  return (
    <div className="p-4 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-2xl font-bold">Loan Details</h2>
          <span className={`${chip} ${statusBadge}`}>{loan.status}</span>
          {workflowStage && (
            <span
              className={`${chip} bg-indigo-50 text-indigo-700 border border-indigo-200`}
            >
              Stage: {workflowStage.replaceAll("_", " ")}
            </span>
          )}
        </div>
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 hover:underline"
        >
          &larr; Back
        </button>
      </div>

      {/* SUMMARY CARD */}
      <div className="bg-white p-4 rounded shadow space-y-2">
        <div className="flex flex-wrap gap-6">
          <div>
            <div className="text-gray-500 text-xs">Borrower</div>
            <Link
              className="text-blue-600 hover:underline"
              to={`/borrowers/${loan.borrowerId}`}
            >
              {loan.Borrower?.name || loan.borrowerName || "N/A"}
            </Link>
          </div>
          <div>
            <div className="text-gray-500 text-xs">Amount</div>
            <div className="font-semibold">
              {fmtTZS(loan.amount, currency)}
            </div>
          </div>
          <div>
            <div className="text-gray-500 text-xs">Interest</div>
            <div>
              {loan.interestRate}% · {loan.interestMethod}
            </div>
          </div>
          <div>
            <div className="text-gray-500 text-xs">Term</div>
            <div>{loan.termMonths || loan.durationMonths} months</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs">Start / Release</div>
            <div>{fmtDate(loan.startDate || loan.releaseDate)}</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs">Outstanding</div>
            <div className="font-semibold">
              {outstanding == null ? "—" : fmtTZS(outstanding, currency)}
            </div>
          </div>
        </div>

        {product && (
          <div className="mt-4 text-sm text-gray-700">
            <div className="font-semibold">
              Product: {product.name}
              {product.code ? ` (${product.code})` : ""}
            </div>
            <div>
              Defaults: {product.interestMethod} @{" "}
              {product.interestRate ?? product.defaultInterestRate}% · Limits:{" "}
              {fmtTZS(product.minPrincipal, currency)} –{" "}
              {fmtTZS(product.maxPrincipal, currency)},{" "}
              {product.minTermMonths}-{product.maxTermMonths} months
            </div>
          </div>
        )}
      </div>

      {/* LOAN OFFICER RESUBMIT BAR */}
      {showLOTB && (
        <div className="bg-white p-4 rounded shadow border space-y-3">
          <h3 className="text-lg font-semibold">Changes Requested</h3>
            <p className="text-sm text-gray-600">
              Your Branch Manager / Compliance requested changes. Update the
              application and attach missing documents, then{" "}
              <strong>Resubmit</strong>. Add a short note if helpful.
            </p>
          <div>
            <label className="block text-xs text-gray-600">Comment (optional)</label>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              className="border rounded px-3 py-2 w-full min-h-[44px]"
              placeholder="What did you fix / add?"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => workflowAction("resubmit")}
              disabled={acting}
              className="bg-indigo-600 text-white px-3 py-2 rounded hover:bg-indigo-700 disabled:opacity-60"
              title="Send for review again"
            >
              {acting ? "Submitting…" : "Resubmit for Review"}
            </button>
            <Link
              to="/loans/applications"
              className="px-3 py-2 rounded border hover:bg-gray-50"
              title="Open applications to edit details/attachments"
            >
              Edit Application
            </Link>
          </div>
        </div>
      )}

      {/* REVIEW TOOLBAR (BM / COMPLIANCE / ACCOUNTING) */}
      {(showBMToolbar || showCOToolbar || showDisburse) && (
        <div className="bg-white p-4 rounded shadow space-y-3 border">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold">
              {showBMToolbar
                ? "Branch Manager Review"
                : showCOToolbar
                ? "Compliance Review"
                : "Accounting / Disbursement"}
            </h3>
            {showDisburse && (
              <Link
                to={`/loans/${id}/disburse`}
                className="inline-flex items-center gap-2 px-3 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Disburse
              </Link>
            )}
          </div>

          {(showBMToolbar || showCOToolbar) && (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600">
                    Suggested Principal Amount
                  </label>
                  <input
                    type="number"
                    className="border rounded px-3 py-2 w-full"
                    value={suggestedAmount}
                    onChange={(e) => setSuggestedAmount(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Save a suggestion or approve with a different amount.
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Comment</label>
                  <textarea
                    className="border rounded px-3 py-2 w-full min-h-[44px]"
                    placeholder="Why approving / changes / rejection?"
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    workflowAction(
                      showBMToolbar ? "bm_approve" : "compliance_approve",
                      { suggestedAmount }
                    )
                  }
                  disabled={acting}
                  className="bg-emerald-600 text-white px-3 py-2 rounded hover:bg-emerald-700 disabled:opacity-60"
                >
                  {acting ? "Working…" : "Approve"}
                </button>
                <button
                  onClick={() => workflowAction("request_changes")}
                  disabled={acting}
                  className="bg-amber-600 text-white px-3 py-2 rounded hover:bg-amber-700 disabled:opacity-60"
                  title="Send back to Loan Officer with requested changes"
                >
                  {acting ? "Working…" : "Request Changes"}
                </button>
                <button
                  onClick={() => workflowAction("reject")}
                  disabled={acting}
                  className="bg-gray-700 text-white px-3 py-2 rounded hover:bg-gray-800 disabled:opacity-60"
                >
                  {acting ? "Working…" : "Reject"}
                </button>
                <button
                  onClick={saveSuggestion}
                  disabled={acting}
                  className="px-3 py-2 rounded border hover:bg-gray-50 disabled:opacity-60"
                >
                  {acting ? "Saving…" : "Save Suggestion"}
                </button>
              </div>
            </>
          )}

          {showDisburse && (
            <p className="text-sm text-gray-600">
              This loan is approved. Proceed to disbursement to finalize payout.
            </p>
          )}
        </div>
      )}

      {/* QUICK ACTIONS */}
      <div className="flex flex-wrap gap-3">
        <Link to={`/loans`} className="px-3 py-2 rounded border">
          Back to Loans
        </Link>
        <button
          onClick={openScheduleModal}
          className="px-3 py-2 rounded border hover:bg-gray-50"
        >
          View Schedule
        </button>
        <button
          onClick={() => setOpenRepay(true)}
          className="px-3 py-2 rounded border hover:bg-gray-50"
        >
          Post Repayment
        </button>
        {loan.status !== "closed" && (
          <button
            onClick={closeLoan}
            className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700"
          >
            Close Loan
          </button>
        )}
      </div>

      {/* REPAYMENTS */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="text-lg font-semibold mb-2">Repayments</h3>
        {loadingRepayments ? (
          <p>Loading repayments…</p>
        ) : repayments.length === 0 ? (
          <p>No repayments found.</p>
        ) : (
          <table className="min-w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1">Date</th>
                <th className="border px-2 py-1">Amount</th>
                <th className="border px-2 py-1">Method</th>
                <th className="border px-2 py-1">Notes</th>
              </tr>
            </thead>
            <tbody>
              {repayments.map((r, i) => (
                <tr key={r.id || i}>
                  <td className="border px-2 py-1">{fmtDate(r.date)}</td>
                  <td className="border px-2 py-1">
                    {fmtTZS(r.amount, currency)}
                  </td>
                  <td className="border px-2 py-1">{r.method || "—"}</td>
                  <td className="border px-2 py-1">{r.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* COMMENTS */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="text-lg font-semibold mb-2">Comments</h3>
        {loadingComments ? (
          <p>Loading comments…</p>
        ) : comments.length === 0 ? (
          <p>No comments yet.</p>
        ) : (
          <div className="space-y-2 mb-3 max-h-64 overflow-auto pr-1">
            {comments.map((c, i) => (
              <div key={c.id || i} className="text-sm border-b pb-1">
                <p>{c.content}</p>
                <span className="text-gray-400 text-xs">
                  {fmtDateTime(c.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="border rounded px-2 py-1 w-full"
            placeholder="Add a comment"
          />
          <button
            onClick={addComment}
            className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
          >
            Post
          </button>
        </div>
      </div>

      {/* REPAYMENT MODAL */}
      {openRepay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-semibold">Post Repayment</h4>
              <button
                onClick={() => setOpenRepay(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600">Amount</label>
                <input
                  type="number"
                  value={repForm.amount}
                  onChange={(e) =>
                    setRepForm((s) => ({ ...s, amount: e.target.value }))
                  }
                  className="border rounded px-2 py-1 w-full"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Date</label>
                <input
                  type="date"
                  value={repForm.date}
                  onChange={(e) =>
                    setRepForm((s) => ({ ...s, date: e.target.value }))
                  }
                  className="border rounded px-2 py-1 w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Method</label>
                <select
                  value={repForm.method}
                  onChange={(e) =>
                    setRepForm((s) => ({ ...s, method: e.target.value }))
                  }
                  className="border rounded px-2 py-1 w-full"
                >
                  <option value="cash">Cash</option>
                  <option value="mobile">Mobile Money</option>
                  <option value="bank">Bank</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={repForm.notes}
                  onChange={(e) =>
                    setRepForm((s) => ({ ...s, notes: e.target.value }))
                  }
                  className="border rounded px-2 py-1 w-full"
                  placeholder="Receipt no., reference, etc."
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setOpenRepay(false)}
                className="px-3 py-2 rounded border"
              >
                Cancel
              </button>
              <button
                onClick={postRepayment}
                disabled={postLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60"
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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-semibold">Repayment Schedule</h4>
              <button
                onClick={() => setOpenSchedule(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            {loadingSchedule ? (
              <p>Loading schedule…</p>
            ) : !schedule || schedule.length === 0 ? (
              <p>No schedule available.</p>
            ) : (
              <div className="max-h-[60vh] overflow-auto">
                <table className="min-w-full text-sm border">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="border px-2 py-1">#</th>
                      <th className="border px-2 py-1">Due Date</th>
                      <th className="border px-2 py-1">Principal</th>
                      <th className="border px-2 py-1">Interest</th>
                      <th className="border px-2 py-1">Penalty</th>
                      <th className="border px-2 py-1">Total</th>
                      <th className="border px-2 py-1">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((row, idx) => (
                      <tr key={row.id || idx}>
                        <td className="border px-2 py-1">{idx + 1}</td>
                        <td className="border px-2 py-1">
                          {fmtDate(row.dueDate)}
                        </td>
                        <td className="border px-2 py-1">
                          {fmtTZS(row.principal, currency)}
                        </td>
                        <td className="border px-2 py-1">
                          {fmtTZS(row.interest, currency)}
                        </td>
                        <td className="border px-2 py-1">
                          {fmtTZS(row.penalty || 0, currency)}
                        </td>
                        <td className="border px-2 py-1">
                          {fmtTZS(row.total, currency)}
                        </td>
                        <td className="border px-2 py-1">
                          {fmtTZS(row.balance, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => setOpenSchedule(false)}
                className="px-3 py-2 rounded border"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
