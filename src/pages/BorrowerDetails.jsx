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

const chip = (status) => {
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

/* Resilient GET — NOW tries the likely-working endpoints FIRST */
const tryGET = async (paths = [], opts = {}) => {
  let lastErr;
  for (const p of paths) {
    try {
      const res = await api.get(p, opts);
      if (process.env.NODE_ENV !== "production") console.debug("[BorrowerDetails] GET:", p, "OK");
      return res?.data;
    } catch (e) {
      lastErr = e;
      if (process.env.NODE_ENV !== "production") console.debug("[BorrowerDetails] GET:", p, "FAILED");
    }
  }
  throw lastErr || new Error(`All endpoints failed: ${paths.join(", ")}`);
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

  const [activeTab, setActiveTab] = useState("loans"); // default tab
  const [errors, setErrors] = useState({ loans: null, savings: null });

  // counts
  const loansCount = loans?.length || 0;
  const repaymentsCount = repayments?.length || 0;

  const fetchBorrowerBundle = async () => {
    setErrors({ loans: null, savings: null });
    try {
      const borrowerData = await tryGET([`/borrowers/${id}`]);
      setBorrower(borrowerData);

      // IMPORTANT: prefer /borrowers/:id/* FIRST to stop 404s & 500s you saw
      const [loanData, repayData, commentData, savingsData] = await Promise.all([
        tryGET([`/borrowers/${id}/loans`, `/loans?borrowerId=${id}`, `/loans/borrower/${id}`]).catch((e) => {
          setErrors((x) => ({ ...x, loans: "Couldn’t load loans." }));
          return [];
        }),
        tryGET([`/borrowers/${id}/repayments`, `/repayments?borrowerId=${id}`, `/repayments/borrower/${id}`]).catch(
          () => []
        ),
        tryGET([`/borrowers/${id}/comments`, `/comments/borrower/${id}`]).catch(() => []),
        tryGET([`/borrowers/${id}/savings`, `/savings?borrowerId=${id}`, `/savings/borrower/${id}`]).catch((e) => {
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
      const repay = await tryGET([`/borrowers/${id}/repayments`, `/repayments?borrowerId=${id}`]);
      setRepayments(Array.isArray(repay) ? repay : repay?.items || []);
    } catch {}
  };

  const summarizeSavings = (type) =>
    savings.reduce((sum, tx) => (tx.type === type ? sum + safeNum(tx.amount) : sum), 0);

  const missedRepayments = useMemo(() => {
    const today = new Date();
    return repayments.filter((r) => {
      const due = r.dueDate ? new Date(r.dueDate) : null;
      const status = String(r.status || "").toLowerCase();
      const paid = safeNum(r.amountPaid ?? r.paidAmount) > 0;
      return due && due < today && !paid && (status === "overdue" || status === "due" || status === "");
    }).length;
  }, [repayments]);

  if (!borrower) return <div className="p-4 dark:bg-slate-950 min-h-screen">Loading...</div>;

  const bName = displayName(borrower);
  const deposits = summarizeSavings("deposit");
  const withdrawals = summarizeSavings("withdrawal");
  const charges = summarizeSavings("charge");
  const interest = summarizeSavings("interest");
  const canAddRepayment = String(userRole || "").toLowerCase() === "admin";

  /* ---------- small, compact comment box ---------- */
  const [showAllComments, setShowAllComments] = useState(false);
  const visibleComments = showAllComments ? comments : comments.slice(0, 3);

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

      {/* Header strip */}
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
            <span className={chip(borrower.status)}>{borrower.status || "—"}</span>
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
      </div>

      {/* KPIs */}
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

      {/* Compact comments (tiny footprint) */}
      <div className="bg-white dark:bg-slate-900 dark:border dark:border-slate-800 rounded-xl p-3">
        <div className="flex items-center gap-2">
          <input
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleAddComment(e.currentTarget.value);
                e.currentTarget.value = "";
              }
            }}
            placeholder="Add a note and press Enter…"
            className="flex-1 border rounded px-3 py-2 text-sm dark:bg-slate-950 dark:border-slate-700 dark:text-slate-100"
          />
          <span className="text-xs text-gray-500 dark:text-slate-400">
            Showing {visibleComments.length}/{comments.length} notes
          </span>
          {comments.length > 3 && (
            <button
              onClick={() => setShowAllComments((s) => !s)}
              className="text-xs px-2 py-1 rounded border dark:border-slate-700 dark:text-slate-100"
            >
              {showAllComments ? "Show less" : "Show all"}
            </button>
          )}
        </div>
        {visibleComments.length > 0 && (
          <ul className="mt-2 grid md:grid-cols-3 gap-2">
            {visibleComments.map((c, i) => (
              <li key={`${i}-${c.createdAt}`} className="border rounded p-2 text-xs dark:border-slate-700">
                <div className="dark:text-slate-100">{c.content}</div>
                <div className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">
                  {c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 dark:border dark:border-slate-800 rounded-xl">
        <div className="border-b dark:border-slate-800 flex flex-wrap">
          {["loans", "repayments", "savings", "documents", "activity"].map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2 text-sm border-b-2 -mb-px ${
                activeTab === t
                  ? "border-indigo-600 text-indigo-700 dark:text-indigo-300"
                  : "border-transparent text-gray-600 dark:text-slate-300"
              }`}
            >
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="p-4">
          {/* Loans table */}
          {activeTab === "loans" && (
            <>
              {errors.loans && (
                <div className="mb-3 text-sm text-red-600 dark:text-red-300">{errors.loans}</div>
              )}
              {loans.length === 0 ? (
                <div className="p-4 text-sm text-gray-600 dark:text-slate-300 border rounded dark:border-slate-800">
                  No loans for this borrower.
                  <Link
                    to={`/loans/applications?borrowerId=${encodeURIComponent(borrower.id)}`}
                    className="ml-2 text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    Create loan
                  </Link>
                </div>
              ) : (
                <div className="overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-800/50">
                      <tr className="text-left dark:text-slate-300">
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
                            <span className={chip(l.status)}>{String(l.status || "—")}</span>
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
              )}
            </>
          )}

          {/* Repayments table */}
          {activeTab === "repayments" && (
            <>
              {repayments.length === 0 ? (
                <div className="p-4 text-sm text-gray-600 dark:text-slate-300 border rounded dark:border-slate-800">
                  No repayments recorded for this borrower.
                </div>
              ) : (
                <div className="overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-800/50">
                      <tr className="text-left dark:text-slate-300">
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Amount</th>
                        <th className="px-3 py-2">Loan</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {repayments.map((r, i) => (
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
                            <span className={chip(r.status)}>{r.status || "—"}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Savings table + summary badges */}
          {activeTab === "savings" && (
            <>
              {errors.savings && (
                <div className="mb-3 text-sm text-red-600 dark:text-red-300">{errors.savings}</div>
              )}
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

              {filteredSavings.length === 0 ? (
                <div className="p-4 text-sm text-gray-600 dark:text-slate-300 border rounded dark:border-slate-800">
                  No savings transactions for this borrower.
                </div>
              ) : (
                <div className="overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-800/50">
                      <tr className="text-left dark:text-slate-300">
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
              )}
            </>
          )}

          {/* Documents placeholder (kept minimal) */}
          {activeTab === "documents" && (
            <div className="text-sm text-gray-600 dark:text-slate-300">
              <Link
                to={`/borrowers/${encodeURIComponent(borrower.id)}/documents`}
                className="text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Manage KYC documents
              </Link>
            </div>
          )}

          {/* Activity timeline */}
          {activeTab === "activity" && (
            <ActivityTimeline
              loans={loans}
              repayments={repayments}
              savings={savings}
              comments={comments}
              canAddRepayment={canAddRepayment}
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

/* ------- Small subcomponents ------- */
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
      <div className="flex items-center justify-between">
        <h4 className="font-semibold mb-2 dark:text-gray-100">📜 Activity Timeline</h4>
        {canAddRepayment && (
          <button
            onClick={onAddRepayment}
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Record Repayment
          </button>
        )}
      </div>
      <ul className="space-y-2 text-sm">
        {items.map((item, i) => (
          <li key={i} className="border-l-4 pl-2 border-gray-300 dark:border-slate-700 dark:text-slate-200">
            <span className="text-gray-500 dark:text-slate-400">
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
