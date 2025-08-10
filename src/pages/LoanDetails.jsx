import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api";

const LoanDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loan, setLoan] = useState(null);
  const [product, setProduct] = useState(null);
  const [repayments, setRepayments] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingRepayments, setLoadingRepayments] = useState(true);
  const [loadingComments, setLoadingComments] = useState(true);

  const loadLoan = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/loans/${id}`);
      setLoan(res.data);
      // fetch product if present
      if (res.data?.productId) {
        try {
          const p = await api.get(`/loan-products/${res.data.productId}`);
          setProduct(p.data);
        } catch { /* product optional */ }
      } else {
        setProduct(null);
      }
    } catch {
      alert("Failed to fetch loan");
    } finally {
      setLoading(false);
    }
  };

  const loadRepayments = async () => {
    setLoadingRepayments(true);
    try {
      const res = await api.get(`/repayments/loan/${id}`);
      setRepayments(res.data || []);
    } catch {
      // optional
    } finally {
      setLoadingRepayments(false);
    }
  };

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const res = await api.get(`/comments/loan/${id}`);
      setComments(res.data || []);
    } catch {
      // optional
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    loadLoan();
    loadRepayments();
    loadComments();
  }, [id]);

  const handleClose = async () => {
    if (!confirm("Mark this loan as closed?")) return;
    try {
      await api.patch(`/loans/${id}/status`, { status: "closed" });
      await loadLoan();
      alert("Loan marked as closed.");
    } catch {
      alert("Failed to mark as closed");
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await api.post(`/comments`, { loanId: id, content: newComment });
      setComments((prev) => [
        ...prev,
        { content: newComment, createdAt: new Date().toISOString() },
      ]);
      setNewComment("");
    } catch {
      alert("Failed to add comment");
    }
  };

  if (loading) return <div className="p-4">Loading loan...</div>;
  if (!loan) return <div className="p-4">Loan not found.</div>;

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Loan Details</h2>
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline">
          &larr; Back
        </button>
      </div>

      {/* Summary */}
      <div className="bg-white p-4 rounded shadow space-y-2">
        <h3 className="text-xl font-semibold text-gray-800">Summary</h3>
        <p>
          <strong>Borrower:</strong>{" "}
          <Link className="text-blue-600 hover:underline" to={`/borrowers/${loan.borrowerId}`}>
            {loan.Borrower?.name || "N/A"}
          </Link>
        </p>
        <p><strong>Amount:</strong> TZS {Number(loan.amount || 0).toLocaleString()}</p>
        <p><strong>Interest Rate:</strong> {loan.interestRate}%</p>
        <p><strong>Interest Method:</strong> {loan.interestMethod}</p>
        <p><strong>Term:</strong> {loan.termMonths} months</p>
        <p><strong>Start Date:</strong> {loan.startDate ? new Date(loan.startDate).toLocaleDateString() : "N/A"}</p>
        <p><strong>Status:</strong> <span className="capitalize font-semibold">{loan.status}</span></p>

        {product && (
          <div className="mt-2 text-sm text-gray-600">
            <p><strong>Product:</strong> {product.name} {product.code ? `(${product.code})` : ""}</p>
            <p><strong>Product Defaults:</strong> {product.interestMethod} @ {product.interestRate ?? product.defaultInterestRate}%</p>
            <p><strong>Limits:</strong> TZS {product.minPrincipal} - {product.maxPrincipal}, {product.minTermMonths}-{product.maxTermMonths} months</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link to={`/loans`} className="px-3 py-2 rounded border">Back to Loans</Link>
        {loan.status !== "closed" && (
          <button onClick={handleClose} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
            Mark as Closed
          </button>
        )}
      </div>

      {/* Repayments */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="text-lg font-semibold mb-2">Repayments</h3>
        {loadingRepayments ? (
          <p>Loading repayments...</p>
        ) : repayments.length === 0 ? (
          <p>No repayments found.</p>
        ) : (
          <table className="min-w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1">Date</th>
                <th className="border px-2 py-1">Amount</th>
                <th className="border px-2 py-1">Method</th>
              </tr>
            </thead>
            <tbody>
              {repayments.map((r, i) => (
                <tr key={i}>
                  <td className="border px-2 py-1">{r.date ? new Date(r.date).toLocaleDateString() : "—"}</td>
                  <td className="border px-2 py-1">TZS {Number(r.amount || 0).toLocaleString()}</td>
                  <td className="border px-2 py-1">{r.method || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Comments */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="text-lg font-semibold mb-2">Comments</h3>
        {loadingComments ? (
          <p>Loading comments...</p>
        ) : comments.length === 0 ? (
          <p>No comments yet.</p>
        ) : (
          <div className="space-y-2 mb-3">
            {comments.map((c, i) => (
              <div key={i} className="text-sm border-b pb-1">
                <p>{c.content}</p>
                <span className="text-gray-400 text-xs">
                  {c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}
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
          <button onClick={handleAddComment} className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700">
            Post
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoanDetails;
