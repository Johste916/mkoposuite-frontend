import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { CSVLink } from "react-csv";
import { getUserRole } from "../utils/auth";
import LoanScheduleModal from "../components/LoanScheduleModal";
import RepaymentModal from "../components/RepaymentModal";
import api from "../api";

/* ---------------- Utilities ---------------- */
const safeNum = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const money = (v) => `TZS ${safeNum(v).toLocaleString()}`;

const displayName = (b) =>
  b?.name ||
  `${b?.firstName || ""} ${b?.lastName || ""}`.trim() ||
  b?.businessName ||
  "—";

const displayBranch = (b) => b?.branchName || b?.Branch?.name || b?.branch?.name || "—";
const displayOfficer = (b) => b?.officerName || b?.officer?.name || b?.loanOfficer?.name || "—";

const initials = (nameLike) => {
  const s = (nameLike || "").trim();
  if (!s) return "U";
  const p = s.split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || s[0].toUpperCase();
};

const statusChipCls = (status) => {
  const base = "px-2 py-1 text-xs font-semibold rounded";
  switch (String(status || "").toLowerCase()) {
    case "pending":
      return `${base} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200`;
    case "approved":
      return `${base} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200`;
    case "rejected":
      return `${base} bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200`;
    case "active":
      return `${base} bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200`;
    case "closed":
      return `${base} bg-gray-200 text-gray-700 dark:bg-slate-800 dark:text-slate-200`;
    default:
      return `${base} bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300`;
  }
};

/* resilient GET across possible mounts */
const tryGET = async (paths = [], opts = {}) => {
  for (const p of paths) {
    try {
      const res = await api.get(p, opts);
      return res?.data;
    } catch {}
  }
  throw new Error(`All endpoints failed: ${paths.join(", ")}`);
};

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

  const fetchBorrowerBundle = async () => {
    try {
      const borrowerData = await tryGET([`/borrowers/${id}`]);
      setBorrower(borrowerData);

      const [loanData, repayData, commentData, savingsData] = await Promise.all([
        tryGET([`/loans/borrower/${id}`, `/borrowers/${id}/loans`]).catch(() => []),
        tryGET([`/repayments/borrower/${id}`, `/borrowers/${id}/repayments`]).catch(() => []),
        tryGET([
          `/borrowers/${id}/comments`,
          `/comments/borrower/${id}`,
          `/borrowers/${id}/comments`,
        ]).catch(() => []),
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
      setSavingsBalance(safeNum(savingsData?.balance, 0));
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
      await api.post(`/borrowers/${id}/comments`, { content });
      setComments((prev) => [...prev, { content, createdAt: new Date().toISOString() }]);
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
        `/repayments/borrower/${id}`,
        `/borrowers/${id}/repayments`,
      ]);
      setRepayments(Array.isArray(repay) ? repay : repay?.items || []);
    } catch {}
  };

  const summarizeSavings = (type) =>
    savings.reduce((sum, tx) => (tx.type === type ? sum + safeNum(tx.amount) : sum), 0);

  // best-effort missed repayments tally
  const missedRepayments = useMemo(() => {
    const today = new Date();
    return repayments.filter((r) => {
      const due = r.dueDate ? new Date(r.dueDate) : null;
      const status = String(r.status || "").toLowerCase();
      const paid = safeNum(r.amountPaid ?? r.paidAmount) > 0;
      return due && due < today && !paid && (status === "overdue" || status === "due" || status === "");
    }).length;
  }, [repayments]);

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
        text: `Repayment of ${money(r.amount)}`,
      })
    );
    savings.forEach((s) =>
      items.push({
        type: "savings",
        date: s.date || s.createdAt || new Date().toISOString(),
        text: `${s.type} of ${money(s.amount)}`,
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

  const deposits = summarizeSavings("deposit");
  const withdrawals = summarizeSavings("withdrawal");
  const charges = summarizeSavings("charge");
  const interest = summarizeSavings("interest");

  const canAddRepayment = useMemo(() => {
    const role = String(userRole || "").toLowerCase();
    return role === "admin";
  }, [userRole]);

  if (!borrower) return <div className="p-4 dark:bg-slate-950 min-h-screen">Loading...</div>;

  const bName = displayName(borrower);

  return (
    <div className="p-4 space-y-4 dark:bg-slate-950 min-h-screen">
      {/* Breadcrumb + actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm">
          <Link to="/borrowers" className="text-indigo-600 hover:underline dark:text-indigo-400">
            Borrowers
          </Link>{" "}
          <span className="text-gray-400 dark:text-slate-500">/</span>{" "}
          <span className="text-gray-700 dark:text-slate-100">{bName}</span>
        </div>
        <div className="flex gap-2">
          <CSVLink
            data={[borrower]}
            filename={`borrower-${borrower.id}.csv`}
            className="bg-emerald-600 text-white px-3 py-1.5 rounded hover:bg-emerald-700 text-sm"
          >
            Export CSV
          </CSVLink>
          <button
            onClick={() => {
              const doc = new jsPDF();
              doc.text(`Borrower Profile: ${bName}`, 14, 16);
              doc.autoTable({
                startY: 20,
                head: [["Field", "Value"]],
                body: Object.entries(borrower).map(([k, v]) => [k, String(v ?? "")]),
              });
              doc.save(`borrower-${borrower.id}.pdf`);
            }}
            className="bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 text-sm"
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* Profile strip */}
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center text-sm font-semibold shadow-sm">
              {initials(bName)}
            </div>
            <div>
              <div className="text-xl font-semibold dark:text-slate-100">{bName}</div>
              <div className="text-xs text-gray-500 dark:text-slate-400">
                ID: {borrower.id} • Phone: {borrower.phone || "—"}
              </div>
              <div className="text-xs text-gray-500 dark:text-slate-400">
                Branch: {displayBranch(borrower)} • Officer: {displayOfficer(borrower)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={statusChipCls(borrower.status)}>{borrower.status || "—"}</span>
            <Link
              to={`/borrowers/${encodeURIComponent(borrower.id)}/edit`}
              className="px-3 py-1.5 text-sm rounded border dark:border-slate-700 dark:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              Edit
            </Link>
            <Link
              to={`/borrowers/${encodeURIComponent(borrower.id)}/documents`}
              className="px-3 py-1.5 text-sm rounded border dark:border-slate-700 dark:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              KYC Docs
            </Link>
          </div>
        </div>

        {/* Quick links */}
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link to={`/loans?borrowerId=${encodeURIComponent(borrower.id)}`} className="text-indigo-600 hover:underline dark:text-indigo-400">Loans</Link>
          <span className="text-gray-400">·</span>
          <Link to={`/savings?borrowerId=${encodeURIComponent(borrower.id)}`} className="text-indigo-600 hover:underline dark:text-indigo-400">Savings</Link>
          <span className="text-gray-400">·</span>
          <Link to={`/repayments?borrowerId=${encodeURIComponent(borrower.id)}`} className="text-indigo-600 hover:underline dark:text-indigo-400">Repayments</Link>
          <span className="text-gray-400">·</span>
          <Link to={`/borrowers/${encodeURIComponent(borrower.id)}`} className="text-indigo-600 hover:underline dark:text-indigo-400">Profile</Link>
          <span className="text-gray-400">·</span>
          <Link to={`/borrowers/${encodeURIComponent(borrower.id)}/documents`} className="text-indigo-600 hover:underline dark:text-indigo-400">Documents</Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 dark:border-slate-800 border rounded p-4">
          <p className="text-xs text-gray-500 dark:text-slate-400">PAR %</p>
          <p className="mt-1 text-lg font-semibold dark:text-slate-100">
            {Number.isFinite(Number(borrower.parPercent)) ? `${Number(borrower.parPercent).toFixed(2)}%` : "0%"}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 dark:border-slate-800 border rounded p-4">
          <p className="text-xs text-gray-500 dark:text-slate-400">Overdue Amount</p>
          <p className="mt-1 text-lg font-semibold dark:text-slate-100">{money(borrower.overdueAmount)}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 dark:border-slate-800 border rounded p-4">
          <p className="text-xs text-gray-500 dark:text-slate-400">Missed Repayments</p>
          <p className="mt-1 text-lg font-semibold dark:text-slate-100">{missedRepayments}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 dark:border-slate-800 border rounded p-4">
          <p className="text-xs text-gray-500 dark:text-slate-400">Net Savings</p>
          <p className="mt-1 text-lg font-semibold dark:text-slate-100">{money(borrower.netSavings)}</p>
        </div>
      </div>

      {/* Risk snippet */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded dark:bg-yellow-900/20 dark:border-yellow-700">
        <h4 className="font-semibold text-yellow-700 dark:text-yellow-200 mb-1">⚠️ Risk Summary</h4>
        <p className="dark:text-slate-100"><strong>Overdue Amount:</strong> {money(borrower.overdueAmount)}</p>
        <p className="dark:text-slate-100">
          <strong>PAR:</strong>{" "}
          {Number.isFinite(Number(borrower.parPercent)) ? `${Number(borrower.parPercent).toFixed(2)}%` : "0%"}
        </p>
      </div>

      {/* Loans */}
      {!!loans.length && (
        <div className="bg-white rounded shadow p-4 dark:bg-slate-900 dark:border dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold dark:text-slate-100">Loans</h3>
            <Link
              to={`/loans?borrowerId=${encodeURIComponent(borrower.id)}`}
              className="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
            >
              View all loans
            </Link>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b dark:border-slate-800 dark:text-slate-300">
                  <th className="px-3 py-2">Loan</th>
                  <th className="px-3 py-2">Reference</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((l) => (
                  <tr key={l.id} className="border-b last:border-0 dark:border-slate-800">
                    <td className="px-3 py-2">
                      <Link
                        to={`/loans/${encodeURIComponent(l.id)}`}
                        className="text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        {l.id}
                      </Link>
                    </td>
                    <td className="px-3 py-2 dark:text-slate-100">{l.reference || `L-${l.id}`}</td>
                    <td className="px-3 py-2">
                      <span className={statusChipCls(l.status)}>{String(l.status || "—")}</span>
                    </td>
                    <td className="px-3 py-2 dark:text-slate-100">{money(l.amount)}</td>
                    <td className="px-3 py-2 flex gap-2">
                      <button
                        className="px-2 py-1 border rounded hover:bg-gray-50 dark:hover:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                        onClick={() => handleViewSchedule(l.id)}
                      >
                        Schedule
                      </button>
                      {canAddRepayment && (
                        <button
                          className="px-2 py-1 border rounded hover:bg-gray-50 dark:hover:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
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

      {/* Recent repayments */}
      {!!repayments.length && (
        <div className="bg-white rounded shadow p-4 dark:bg-slate-900 dark:border dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold dark:text-slate-100">Recent Repayments</h3>
            <Link
              to={`/repayments?borrowerId=${encodeURIComponent(borrower.id)}`}
              className="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
            >
              View all repayments
            </Link>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b dark:border-slate-800 dark:text-slate-300">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Loan</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {repayments.slice(0, 10).map((r, i) => (
                  <tr key={`${r.id || i}`} className="border-b last:border-0 dark:border-slate-800">
                    <td className="px-3 py-2 dark:text-slate-100">
                      {r.date
                        ? new Date(r.date).toLocaleDateString()
                        : r.createdAt
                        ? new Date(r.createdAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-3 py-2 dark:text-slate-100">{money(r.amount)}</td>
                    <td className="px-3 py-2">
                      {r.loanId ? (
                        <Link
                          to={`/loans/${encodeURIComponent(r.loanId)}`}
                          className="text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                          {r.loanId}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={statusChipCls(r.status)}>{r.status || "—"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="bg-white rounded shadow p-4 dark:bg-slate-900 dark:border dark:border-slate-800">
        <h3 className="font-semibold mb-2 dark:text-slate-100">Comments</h3>
        <CommentInput onAdd={handleAddComment} />
        <ul className="space-y-2 text-sm">
          {comments.map((c, i) => (
            <li key={`${i}-${c.createdAt}`} className="border rounded p-2 dark:border-slate-700">
              <div className="dark:text-slate-100">{c.content}</div>
              <div className="text-xs text-gray-500 dark:text-slate-400">
                {c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Savings summary & transactions */}
      <div className="bg-white rounded shadow p-4 dark:bg-slate-900 dark:border dark:border-slate-800">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold dark:text-slate-100">Savings</h3>
          <div className="text-sm dark:text-slate-200">
            Balance:&nbsp;<strong>{money(savingsBalance)}</strong>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-3 text-sm">
          <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-200">
            Deposits: <strong>{money(deposits)}</strong>
          </div>
          <div className="p-2 rounded bg-amber-50 dark:bg-amber-900/20 dark:text-amber-200">
            Withdrawals: <strong>{money(withdrawals)}</strong>
          </div>
          <div className="p-2 rounded bg-sky-50 dark:bg-sky-900/20 dark:text-sky-200">
            Interest: <strong>{money(interest)}</strong>
          </div>
          <div className="p-2 rounded bg-rose-50 dark:bg-rose-900/20 dark:text-rose-200">
            Charges: <strong>{money(charges)}</strong>
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm dark:text-slate-200">Filter:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border rounded px-2 py-1 text-sm dark:bg-slate-950 dark:border-slate-700 dark:text-slate-100"
            >
              <option value="all">All</option>
              <option value="deposit">Deposits</option>
              <option value="withdrawal">Withdrawals</option>
              <option value="interest">Interest</option>
              <option value="charge">Charges</option>
            </select>
          </div>
          <Link
            to={`/savings?borrowerId=${encodeURIComponent(borrower.id)}`}
            className="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
          >
            View savings accounts
          </Link>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b dark:border-slate-800 dark:text-slate-300">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredSavings.map((tx, i) => (
                <tr key={`${tx.id || i}`} className="border-b last:border-0 dark:border-slate-800">
                  <td className="px-3 py-2 dark:text-slate-100">
                    {tx.date ? new Date(tx.date).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-2 capitalize dark:text-slate-100">{tx.type}</td>
                  <td className="px-3 py-2 dark:text-slate-100">{money(tx.amount)}</td>
                  <td className="px-3 py-2 dark:text-slate-100">{tx.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity timeline */}
      <div className="bg-white rounded shadow p-4 dark:bg-slate-900 dark:border dark:border-slate-800">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold mb-2 dark:text-gray-100">📜 Activity Timeline</h4>
          {canAddRepayment && loans.length > 0 && (
            <button
              onClick={() => {
                const active = loans.find((l) => l.status === "active") || loans[0];
                setSelectedLoanForRepayment(active || null);
                setShowRepaymentModal(true);
              }}
              className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Record Repayment
            </button>
          )}
        </div>
        <ul className="space-y-2 text-sm">
          {buildTimeline().map((item, i) => (
            <li key={i} className="border-l-4 pl-2 border-gray-300 dark:border-slate-700 dark:text-slate-200">
              <span className="text-gray-500 dark:text-slate-400">
                {item.date ? new Date(item.date).toLocaleDateString() : "—"}
              </span>{" "}
              – {item.text}
            </li>
          ))}
        </ul>
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
        className="flex-1 border rounded px-3 py-2 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-100"
      />
      <button
        onClick={() => {
          onAdd(val);
          setVal("");
        }}
        className="px-3 py-2 rounded bg-slate-800 text-white dark:bg-slate-700"
      >
        Add
      </button>
    </div>
  );
};

export default BorrowerDetails;
