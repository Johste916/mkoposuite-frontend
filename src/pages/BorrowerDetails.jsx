// src/pages/BorrowerDetails.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { CSVLink } from "react-csv";
import { getUserRole } from "../utils/auth";
import LoanScheduleModal from "../components/LoanScheduleModal";
import RepaymentModal from "../components/RepaymentModal";
import api from "../api";

const BorrowerDetails = () => {
  const { id } = useParams();
  const userRole = getUserRole();

  const [borrower, setBorrower] = useState(null);
  const [loans, setLoans] = useState([]);
  const [repayments, setRepayments] = useState([]);
  const [comments, setComments] = useState([]);

  // Repayments (shared modal)
  const [showRepaymentModal, setShowRepaymentModal] = useState(false);
  const [selectedLoanForRepayment, setSelectedLoanForRepayment] = useState(null);

  // Schedule modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);

  // Savings
  const [savings, setSavings] = useState([]);
  const [filteredSavings, setFilteredSavings] = useState([]);
  const [savingsBalance, setSavingsBalance] = useState(0);
  const [filterType, setFilterType] = useState("all");

  const tryGET = async (paths = [], opts = {}) => {
    for (const p of paths) {
      try {
        const res = await api.get(p, opts);
        return res?.data;
      } catch {}
    }
    throw new Error(`All endpoints failed: ${paths.join(", ")}`);
  };

  const fetchBorrowerBundle = async () => {
    try {
      // borrower
      const borrowerData = await tryGET([`/borrowers/${id}`]);
      setBorrower(borrowerData);

      // loans / repayments / comments / savings
      const [loanData, repayData, commentData, savingsData] = await Promise.all([
        tryGET([`/loans/borrower/${id}`, `/borrowers/${id}/loans`]).catch(() => []),
        tryGET([`/repayments/borrower/${id}`, `/borrowers/${id}/repayments`]).catch(() => []),
        tryGET([`/comments/borrower/${id}`, `/borrowers/${id}/comments`]).catch(() => []),
        tryGET([`/savings/borrower/${id}`, `/borrowers/${id}/savings`]).catch(() => ({})),
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
      setSavingsBalance(Number(savingsData?.balance || 0));
      setFilteredSavings(txs);
    } catch (err) {
      console.error("Fetch borrower bundle failed:", err?.message || err);
    }
  };

  useEffect(() => {
    fetchBorrowerBundle();
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
      await api.post(`/comments`, { borrowerId: id, content });
      setComments((prev) => [
        ...prev,
        { content, createdAt: new Date().toISOString() },
      ]);
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
      const repay = await tryGET([`/repayments/borrower/${id}`, `/borrowers/${id}/repayments`]);
      setRepayments(Array.isArray(repay) ? repay : repay?.items || []);
    } catch {}
  };

  const summarizeSavings = (type) =>
    savings.reduce((sum, tx) => (tx.type === type ? sum + Number(tx.amount || 0) : sum), 0);

  const buildTimeline = () => {
    const items = [];
    loans.forEach((l) =>
      items.push({
        type: "loan",
        date: l.createdAt || l.disbursedAt || l.updatedAt || new Date().toISOString(),
        text: `Loan ${l.id} - ${String(l.status || "").toUpperCase()}`,
      })
    );
    repayments.forEach((r) =>
      items.push({
        type: "repayment",
        date: r.date || r.createdAt || new Date().toISOString(),
        text: `Repayment of TZS ${Number(r.amount || 0).toLocaleString()}`,
      })
    );
    savings.forEach((s) =>
      items.push({
        type: "savings",
        date: s.date || s.createdAt || new Date().toISOString(),
        text: `${s.type} of TZS ${Number(s.amount || 0).toLocaleString()}`,
      })
    );
    comments.forEach((c) =>
      items.push({
        type: "comment",
        date: c.createdAt || new Date().toISOString(),
        text: `Note: ${c.content}`,
      })
    );
    return items.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const getStatusBadge = (status) => {
    const base = "px-2 py-1 text-xs font-semibold rounded";
    switch (status) {
      case "pending":
        return `${base} bg-yellow-100 text-yellow-700`;
      case "approved":
        return `${base} bg-green-100 text-green-700`;
      case "rejected":
        return `${base} bg-red-100 text-red-700`;
      case "active":
        return `${base} bg-blue-100 text-blue-700`;
      case "closed":
        return `${base} bg-gray-200 text-gray-700`;
      default:
        return `${base} bg-gray-100 text-gray-600`;
    }
  };

  const deposits = summarizeSavings("deposit");
  const withdrawals = summarizeSavings("withdrawal");
  const charges = summarizeSavings("charge");
  const interest = summarizeSavings("interest");

  const canAddRepayment = useMemo(() => {
    const role = String(userRole || "").toLowerCase();
    return role === "admin";
  }, [userRole]);

  if (!borrower) return <div className="p-4">Loading...</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Borrower Details</h2>
        <div className="flex gap-2">
          <CSVLink
            data={[borrower]}
            filename={`borrower-${borrower.id}.csv`}
            className="bg-emerald-600 text-white px-4 py-1 rounded hover:bg-emerald-700 text-sm"
          >
            Export CSV
          </CSVLink>
          <button
            onClick={() => {
              const doc = new jsPDF();
              doc.text(`Borrower Profile: ${borrower.name ?? borrower.id}`, 14, 16);
              doc.autoTable({
                startY: 20,
                head: [["Field", "Value"]],
                body: Object.entries(borrower).map(([k, v]) => [k, String(v ?? "")]),
              });
              doc.save(`borrower-${borrower.id}.pdf`);
            }}
            className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 text-sm"
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* Risk snippet */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
        <h4 className="font-semibold text-yellow-700 mb-1">⚠️ Risk Summary</h4>
        <p>
          <strong>Overdue Amount:</strong>{" "}
          TZS {Number(borrower.overdueAmount || 0).toLocaleString()}
        </p>
        <p>
          <strong>PAR:</strong>{" "}
          {Number.isFinite(Number(borrower.parPercent))
            ? `${Number(borrower.parPercent).toFixed(2)}%`
            : "0%"}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <h4 className="font-semibold mb-2">📜 Activity Timeline</h4>
        {canAddRepayment && loans.length > 0 && (
          <button
            onClick={() => {
              const active = loans.find((l) => l.status === "active") || loans[0];
              setSelectedLoanForRepayment(active || null);
              setShowRepaymentModal(true);
            }}
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Add Repayment
          </button>
        )}
      </div>

      <ul className="space-y-2 text-sm">
        {buildTimeline().map((item, i) => (
          <li key={i} className="border-l-4 pl-2 border-gray-300">
            <span className="text-gray-500">
              {item.date ? new Date(item.date).toLocaleDateString() : "—"}
            </span>{" "}
            – {item.text}
          </li>
        ))}
      </ul>

      {/* Loans quick list */}
      {!!loans.length && (
        <div className="bg-white rounded shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Loans</h3>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Reference</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((l) => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="px-3 py-2">{l.id}</td>
                    <td className="px-3 py-2">{l.reference || `L-${l.id}`}</td>
                    <td className="px-3 py-2">
                      <span className={getStatusBadge(l.status)}>
                        {String(l.status || "—")}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      TZS {Number(l.amount || 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 flex gap-2">
                      <button
                        className="px-2 py-1 border rounded hover:bg-gray-50"
                        onClick={() => handleViewSchedule(l.id)}
                      >
                        Schedule
                      </button>
                      {canAddRepayment && (
                        <button
                          className="px-2 py-1 border rounded hover:bg-gray-50"
                          onClick={() => {
                            setSelectedLoanForRepayment(l);
                            setShowRepaymentModal(true);
                          }}
                        >
                          Repay
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="bg-white rounded shadow p-4">
        <h3 className="font-semibold mb-2">Comments</h3>
        <CommentInput onAdd={handleAddComment} />
        <ul className="space-y-2 text-sm">
          {comments.map((c, i) => (
            <li key={`${i}-${c.createdAt}`} className="border rounded p-2">
              <div>{c.content}</div>
              <div className="text-xs text-gray-500">
                {c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Savings summary */}
      <div className="bg-white rounded shadow p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Savings</h3>
          <div className="text-sm">
            Balance:&nbsp;
            <strong>
              TZS {Number(savingsBalance || 0).toLocaleString()}
            </strong>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-3 text-sm">
          <div className="p-2 rounded bg-emerald-50">
            Deposits: <strong>TZS {Number(deposits).toLocaleString()}</strong>
          </div>
          <div className="p-2 rounded bg-amber-50">
            Withdrawals:{" "}
            <strong>TZS {Number(withdrawals).toLocaleString()}</strong>
          </div>
          <div className="p-2 rounded bg-sky-50">
            Interest: <strong>TZS {Number(interest).toLocaleString()}</strong>
          </div>
          <div className="p-2 rounded bg-rose-50">
            Charges: <strong>TZS {Number(charges).toLocaleString()}</strong>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">Filter:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="all">All</option>
            <option value="deposit">Deposits</option>
            <option value="withdrawal">Withdrawals</option>
            <option value="interest">Interest</option>
            <option value="charge">Charges</option>
          </select>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredSavings.map((tx, i) => (
                <tr key={`${tx.id || i}`} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    {tx.date ? new Date(tx.date).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-2 capitalize">{tx.type}</td>
                  <td className="px-3 py-2">
                    TZS {Number(tx.amount || 0).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">{tx.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule modal */}
      {showScheduleModal && selectedLoan && (
        <LoanScheduleModal
          loan={selectedLoan}
          schedule={selectedSchedule}
          onClose={() => setShowScheduleModal(false)}
        />
      )}

      {/* Repayment modal */}
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

const CommentInput = ({ onAdd }) => {
  const [val, setVal] = useState("");
  return (
    <div className="flex gap-2 mb-3">
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="Add a note…"
        className="flex-1 border rounded px-3 py-2"
      />
      <button
        onClick={() => {
          onAdd(val);
          setVal("");
        }}
        className="px-3 py-2 rounded bg-slate-800 text-white"
      >
        Add
      </button>
    </div>
  );
};

export default BorrowerDetails;
