import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api";

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
  const [newComment, setNewComment] = useState("");
  const [openRepay, setOpenRepay] = useState(false);
  const [openSchedule, setOpenSchedule] = useState(false);

  const [repForm, setRepForm] = useState({
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    method: "cash",
    notes: "",
  });
  const [postingRepayment, setPostingRepayment] = useState(false);

  const currency = loan?.currency || "TZS";
  const statusBadge =
    statusColors[loan?.status] || "bg-slate-100 text-slate-800";

  // Load loan + related data
  const loadLoan = async () => {
    setLoading(true);
    setErrs(null);
    try {
      const { data: l } = await api.get(`/loans/${id}`);
      setLoan(l);

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
    loadLoan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Status change handler
  const handleStatusChange = async (nextStatus, extraBody = {}) => {
    if (nextStatus === "disbursed" && loan?.status !== "approved") {
      alert("You can disburse only after the loan is approved.");
      return;
    }
    if (nextStatus === "closed" && (loan?.outstanding ?? 0) > 0) {
      if (!confirm("Outstanding > 0. Close anyway?")) return;
      extraBody.override = true;
    }
    if (!confirm(`Mark this loan as ${nextStatus}?`)) return;

    try {
      await api.patch(`/loans/${id}/status`, { status: nextStatus, ...extraBody });
      await loadLoan();
      alert(`Loan marked as ${nextStatus}.`);
    } catch (e) {
      console.error(e);
      alert(`Failed to update status to ${nextStatus}.`);
    }
  };

  // Comment handler
  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      const res = await api.post(`/comments`, { loanId: id, content: newComment });
      setComments((prev) => [res.data, ...prev]);
      setNewComment("");
    } catch (e) {
      console.error(e);
      alert("Failed to add comment.");
    }
  };

  // Schedule modal
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

  // Repayment handler
  const postRepayment = async () => {
    const amt = Number(repForm.amount);
    if (!amt || amt <= 0) return alert("Enter a valid amount.");

    setPostingRepayment(true);
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
      setPostingRepayment(false);
    }
  };

  if (loading) return <div className="p-4">Loading loan…</div>;
  if (errs) return <div className="p-4 text-red-600">{errs}</div>;
  if (!loan) return <div className="p-4">Loan not found.</div>;

  const outstanding = loan?.outstanding ?? null;

  return (
    <div className="p-4 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Loan Details</h2>
          <span className={`px-2 py-1 rounded text-xs font-semibold ${statusBadge}`}>
            {loan.status}
          </span>
        </div>
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline">
          &larr; Back
        </button>
      </div>

      {/* SUMMARY CARD */}
      <div className="bg-white p-4 rounded shadow space-y-2">
        <div className="flex flex-wrap gap-6">
          <div>
            <div className="text-gray-500 text-xs">Borrower</div>
            <Link className="text-blue-600 hover:underline" to={`/borrowers/${loan.borrowerId}`}>
              {loan.Borrower?.name || "N/A"}
            </Link>
          </div>
          <div>
            <div className="text-gray-500 text-xs">Amount</div>
            <div className="font-semibold">{fmtTZS(loan.amount, currency)}</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs">Interest</div>
            <div>{loan.interestRate}% · {loan.interestMethod}</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs">Term</div>
            <div>{loan.termMonths} months</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs">Start Date</div>
            <div>{fmtDate(loan.startDate)}</div>
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
              Product: {product.name}{product.code ? ` (${product.code})` : ""}
            </div>
            <div>
              Defaults: {product.interestMethod} @ {product.interestRate ?? product.defaultInterestRate}% · Limits:{" "}
              {fmtTZS(product.minPrincipal, currency)} – {fmtTZS(product.maxPrincipal, currency)},{" "}
              {product.minTermMonths}-{product.maxTermMonths} months
            </div>
          </div>
        )}
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex flex-wrap gap-3">
        <Link to={`/loans`} className="px-3 py-2 rounded border">Back to Loans</Link>
        {loan.status === "pending" && (
          <>
            <button onClick={() => handleStatusChange("approved")} className="bg-emerald-600 text-white px-3 py-2 rounded hover:bg-emerald-700">
              Approve
            </button>
            <button onClick={() => handleStatusChange("rejected")} className="bg-gray-600 text-white px-3 py-2 rounded hover:bg-gray-700">
              Reject
            </button>
          </>
        )}
        {(loan.status === "approved" || loan.status === "disbursed") && (
          <button onClick={() => handleStatusChange("disbursed")} className="bg-indigo-600 text-white px-3 py-2 rounded hover:bg-indigo-700">
            Disburse
          </button>
        )}
        {loan.status !== "closed" && (
          <button onClick={() => handleStatusChange("closed")} className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700">
            Close
          </button>
        )}
        <button onClick={openScheduleModal} className="px-3 py-2 rounded border hover:bg-gray-50">
          View Schedule
        </button>
        <button onClick={() => setOpenRepay(true)} className="px-3 py-2 rounded border hover:bg-gray-50">
          Post Repayment
        </button>
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
                  <td className="border px-2 py-1">{fmtTZS(r.amount, currency)}</td>
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
                <span className="text-gray-400 text-xs">{fmtDateTime(c.createdAt)}</span>
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
          <button onClick={handleAddComment} className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700">
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
              <button onClick={() => setOpenRepay(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600">Amount</label>
                <input
                  type="number"
                  value={repForm.amount}
                  onChange={(e) => setRepForm((s) => ({ ...s, amount: e.target.value }))}
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
                  onChange={(e) => setRepForm((s) => ({ ...s, date: e.target.value }))}
                  className="border rounded px-2 py-1 w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Method</label>
                <select
                  value={repForm.method}
                  onChange={(e) => setRepForm((s) => ({ ...s, method: e.target.value }))}
                  className="border rounded px-2 py-1 w-full"
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
                  className="border rounded px-2 py-1 w-full"
                  placeholder="Receipt no., reference, etc."
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setOpenRepay(false)} className="px-3 py-2 rounded border">Cancel</button>
              <button
                onClick={postRepayment}
                disabled={postingRepayment}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60"
              >
                {postingRepayment ? "Posting…" : "Post"}
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
              <button onClick={() => setOpenSchedule(false)} className="text-gray-500 hover:text-gray-700">✕</button>
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
                        <td className="border px-2 py-1">{fmtDate(row.dueDate)}</td>
                        <td className="border px-2 py-1">{fmtTZS(row.principal, currency)}</td>
                        <td className="border px-2 py-1">{fmtTZS(row.interest, currency)}</td>
                        <td className="border px-2 py-1">{fmtTZS(row.penalty || 0, currency)}</td>
                        <td className="border px-2 py-1">{fmtTZS(row.total, currency)}</td>
                        <td className="border px-2 py-1">{fmtTZS(row.balance, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-3 flex justify-end">
              <button onClick={() => setOpenSchedule(false)} className="px-3 py-2 rounded border">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
