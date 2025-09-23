import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
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
  const base = "px-2 py-0.5 text-xs font-semibold rounded-full";
  switch (String(status || "").toLowerCase()) {
    case "pending":
      return `${base} bg-amber-100 text-amber-800`;
    case "approved":
      return `${base} bg-emerald-100 text-emerald-700`;
    case "rejected":
      return `${base} bg-rose-100 text-rose-700`;
    case "active":
      return `${base} bg-blue-100 text-blue-700`;
    case "disabled":
      return `${base} bg-slate-200 text-slate-700`;
    case "blacklisted":
      return `${base} bg-red-200 text-red-800`;
    case "closed":
      return `${base} bg-gray-200 text-gray-700`;
    default:
      return `${base} bg-gray-100 text-gray-600`;
  }
};

/* GET with graceful fallbacks (prefers ?borrowerId=, matching your API) */
const tryGET = async (paths = [], opts = {}) => {
  let lastErr;
  for (const p of paths) {
    try {
      const res = await api.get(p, opts);
      return res?.data;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error(`All endpoints failed: ${paths.join(", ")}`);
};

const withTenant = (tenantId) => (tenantId ? { headers: { "X-Tenant-Id": tenantId } } : {});

/* Small visual helpers */
const Card = ({ title, icon, children, className = "" }) => (
  <section className={`bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-4 md:p-5 ${className}`}>
    {title && (
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-base md:text-lg font-semibold text-slate-900">{title}</h2>
      </div>
    )}
    {children}
  </section>
);

const Field = ({ label, children }) => (
  <div>
    <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</div>
    <div className="mt-1 text-sm text-slate-900">{children ?? "—"}</div>
  </div>
);

const DlGrid = ({ items, cols = 3 }) => (
  <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-${cols}`}>
    {items.map((it, i) => (
      <Field key={i} label={it.label}>
        {it.value ?? "—"}
      </Field>
    ))}
  </div>
);

const PillTabs = ({ tabs, active, onChange }) => (
  <div className="flex flex-wrap gap-2 border-b border-slate-200 px-2 pt-2">
    {tabs.map((t) => {
      const is = active === t.key;
      return (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-3 py-1.5 text-sm rounded-full border ${
            is
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200"
          }`}
        >
          {t.label}
          {typeof t.count === "number" && (
            <span
              className={`ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full text-xs ${
                is ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
              } px-1.5`}
            >
              {t.count}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

const BorrowerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const userRole = getUserRole();

  const [borrower, setBorrower] = useState(null);
  const [loans, setLoans] = useState([]);
  const [repayments, setRepayments] = useState([]);
  const [comments, setComments] = useState([]);

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

  const fetchBorrowerBundle = async () => {
    setErrors({ loans: null, savings: null });
    try {
      const b = await tryGET([`/borrowers/${id}`]);
      setBorrower(b);

      const qTenant = b?.tenantId ? `&tenantId=${encodeURIComponent(b.tenantId)}` : "";

      const [loanData, repayData, commentData, savingsData] = await Promise.all([
        tryGET([`/loans?borrowerId=${id}${qTenant}`, `/borrowers/${id}/loans`, `/loans/borrower/${id}`]).catch(() => {
          setErrors((x) => ({ ...x, loans: "Couldn’t load loans." }));
          return [];
        }),
        tryGET([
          `/repayments?borrowerId=${id}${qTenant}`,
          `/borrowers/${id}/repayments`,
          `/repayments/borrower/${id}`,
        ]).catch(() => []),
        tryGET([`/borrowers/${id}/comments`, `/comments/borrower/${id}`]).catch(() => []),
        tryGET([`/savings?borrowerId=${id}${qTenant}`, `/borrowers/${id}/savings`, `/savings/borrower/${id}`]).catch(
          () => {
            setErrors((x) => ({ ...x, savings: "Couldn’t load savings." }));
            return {};
          }
        ),
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
      await api.post(`/borrowers/${id}/comments`, { content }, withTenant(borrower?.tenantId));
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
      const repay = await tryGET([
        `/repayments?borrowerId=${id}${borrower?.tenantId ? `&tenantId=${encodeURIComponent(borrower.tenantId)}` : ""}`,
        `/borrowers/${id}/repayments`,
      ]);
      setRepayments(Array.isArray(repay) ? repay : repay?.items || []);
    } catch {}
  };

  // Admin actions
  const handleDisable = async () => {
    if (!window.confirm("Disable this borrower? They will not be able to apply or receive disbursements.")) return;
    try {
      await api.post(`/borrowers/${id}/disable`, {}, withTenant(borrower?.tenantId));
      setBorrower((b) => ({ ...b, status: "disabled" }));
    } catch {
      try {
        await api.patch(`/borrowers/${id}`, { status: "disabled" }, withTenant(borrower?.tenantId));
        setBorrower((b) => ({ ...b, status: "disabled" }));
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
    } catch {
      try {
        await api.patch(`/borrowers/${id}`, { status: "blacklisted" }, withTenant(borrower?.tenantId));
        setBorrower((b) => ({ ...b, status: "blacklisted" }));
      } catch {
        alert("Could not blacklist borrower.");
      }
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Permanently delete this borrower and their client profile? This cannot be undone.")) return;
    try {
      await api.delete(`/borrowers/${id}`, withTenant(borrower?.tenantId));
      navigate("/borrowers");
    } catch {
      alert("Could not delete borrower.");
    }
  };

  const missedRepayments = useMemo(() => {
    const today = new Date();
    return repayments.filter((r) => {
      const due = r.dueDate ? new Date(r.dueDate) : null;
      const status = String(r.status || "").toLowerCase();
      const paid = safeNum(r.amountPaid ?? r.paidAmount) > 0;
      return due && due < today && !paid && (status === "overdue" || status === "due" || status === "");
    }).length;
  }, [repayments]);

  if (!borrower) return <div className="p-4 min-h-screen bg-slate-50">Loading...</div>;

  const bName = displayName(borrower);
  const tenantQuery = borrower?.tenantId ? `?tenantId=${encodeURIComponent(borrower.tenantId)}` : "";
  const visibleComments = showAllComments ? comments : comments.slice(0, 3);

  const tel = (p) => (p ? `tel:${p}` : undefined);
  const sms = (p) => (p ? `sms:${p}` : undefined);
  const wa = (p) => (p ? `https://wa.me/${String(p).replace(/[^\d]/g, "")}` : undefined);
  const mail = (e) => (e ? `mailto:${e}` : undefined);

  const deposits = savings.reduce((s, t) => (t.type === "deposit" ? s + safeNum(t.amount) : s), 0);
  const withdrawals = savings.reduce((s, t) => (t.type === "withdrawal" ? s + safeNum(t.amount) : s), 0);
  const charges = savings.reduce((s, t) => (t.type === "charge" ? s + safeNum(t.amount) : s), 0);
  const interest = savings.reduce((s, t) => (t.type === "interest" ? s + safeNum(t.amount) : s), 0);

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm">
          <Link to={`/borrowers${tenantQuery}`} className="text-indigo-600 hover:underline">
            Borrowers
          </Link>{" "}
          <span className="text-slate-400">/</span>{" "}
          <span className="text-slate-900 font-medium">{bName}</span>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/borrowers/${encodeURIComponent(borrower.id)}/edit${tenantQuery}`}
            className="px-3 py-1.5 text-sm rounded-xl border border-slate-200 text-slate-800 hover:bg-slate-50"
          >
            Edit
          </Link>
          <button
            onClick={handleDisable}
            className="px-3 py-1.5 text-sm rounded-xl border border-slate-200 text-slate-800 hover:bg-slate-50"
          >
            Disable
          </button>
          <button
            onClick={handleBlacklist}
            className="px-3 py-1.5 text-sm rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50"
          >
            Blacklist
          </button>
          <button
            onClick={handleDelete}
            className="px-3 py-1.5 text-sm rounded-xl border border-red-200 text-red-700 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* MAIN */}
        <div className="lg:col-span-3 space-y-5">
          {/* Profile */}
          <Card>
            <div className="flex gap-5">
              {/* Avatar */}
              <div className="relative shrink-0">
                {borrower.photoUrl ? (
                  <img src={borrower.photoUrl} alt={bName} className="w-24 h-24 rounded-2xl object-cover ring-1 ring-slate-200" />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center text-2xl font-semibold">
                    {initials(bName)}
                  </div>
                )}
                <span className={`absolute -bottom-2 left-2 ${chip(borrower.status)} ring-1 ring-black/5`}>
                  {borrower.status || "—"}
                </span>
              </div>

              {/* Name + quick contact */}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">{bName}</h1>
                  <span className="text-xs text-slate-500">ID: {borrower.id}</span>
                  <span className="text-xs text-slate-500">Tenant: {borrower.tenantId || "—"}</span>
                </div>

                <div className="mt-2 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Field label="Phone">
                    <div className="flex items-center gap-2">
                      <span>{borrower.phone || "—"}</span>
                      {borrower.phone && (
                        <>
                          <a className="underline text-indigo-600" href={tel(borrower.phone)}>
                            Call
                          </a>
                          <a className="underline text-indigo-600" href={sms(borrower.phone)}>
                            SMS
                          </a>
                          <a className="underline text-indigo-600" href={wa(borrower.phone)} target="_blank" rel="noreferrer">
                            WhatsApp
                          </a>
                        </>
                      )}
                    </div>
                  </Field>

                  <Field label="Email">
                    <div className="flex items-center gap-2">
                      <span>{borrower.email || "—"}</span>
                      {borrower.email && (
                        <a className="underline text-indigo-600" href={mail(borrower.email)}>
                          Email
                        </a>
                      )}
                    </div>
                  </Field>

                  <Field label="Address">
                    {borrower.addressLine ||
                      [borrower.street, borrower.houseNumber, borrower.ward, borrower.district, borrower.city]
                        .filter(Boolean)
                        .join(", ") ||
                      "—"}
                  </Field>
                </div>
              </div>
            </div>

            {/* Divider */}
            <hr className="my-4 border-slate-200" />

            {/* Identity mirrors Add Borrower */}
            <div className="grid gap-5">
              <DlGrid
                cols={3}
                items={[
                  { label: "Gender", value: borrower.gender },
                  {
                    label: "Birth Date",
                    value: borrower.birthDate ? new Date(borrower.birthDate).toLocaleDateString() : "—",
                  },
                  { label: "Occupation / Business", value: borrower.occupation },
                  { label: "Employment Status", value: borrower.employmentStatus },
                  { label: "Secondary Phone", value: borrower.secondaryPhone },
                  { label: "Customer No.", value: borrower.customerNumber || borrower.accountNumber },
                ]}
              />

              <div className="grid gap-5 lg:grid-cols-2">
                <Card title="ID Document">
                  <DlGrid
                    cols={2}
                    items={[
                      { label: "ID Type", value: borrower.idType },
                      { label: "ID Number", value: borrower.idNumber },
                      {
                        label: "Issued On",
                        value: borrower.idIssuedDate ? new Date(borrower.idIssuedDate).toLocaleDateString() : "—",
                      },
                      {
                        label: "Expiry Date",
                        value: borrower.idExpiryDate ? new Date(borrower.idExpiryDate).toLocaleDateString() : "—",
                      },
                    ]}
                  />
                </Card>

                <Card title="Assignment & Registration">
                  <DlGrid
                    cols={2}
                    items={[
                      { label: "Branch", value: displayBranch(borrower) },
                      { label: "Loan Officer", value: displayOfficer(borrower) },
                      { label: "Loan Type", value: borrower.loanType || "individual" },
                      { label: "Group ID", value: borrower.groupId },
                      {
                        label: "Registration Date",
                        value: borrower.regDate ? new Date(borrower.regDate).toLocaleDateString() : "—",
                      },
                    ]}
                  />
                </Card>
              </div>

              <Card title="Next of Kin">
                <DlGrid
                  cols={3}
                  items={[
                    { label: "Full Name", value: borrower.nextKinName || borrower.nextOfKinName },
                    { label: "Phone", value: borrower.nextKinPhone || borrower.nextOfKinPhone },
                    { label: "Relationship", value: borrower.nextOfKinRelationship || borrower.kinRelationship },
                  ]}
                />
              </Card>
            </div>
          </Card>

          {/* KPI */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { k: "PAR %", v: Number.isFinite(Number(borrower.parPercent)) ? `${Number(borrower.parPercent).toFixed(2)}%` : "0%" },
              { k: "Overdue Amount", v: money(borrower.overdueAmount) },
              { k: "Missed Repayments", v: missedRepayments },
              { k: "Net Savings", v: money(borrower.netSavings) },
            ].map((c, i) => (
              <div key={i} className="rounded-2xl bg-white ring-1 ring-slate-200 p-4">
                <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{c.k}</div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">{c.v}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200">
            <PillTabs
              active={activeTab}
              onChange={setActiveTab}
              tabs={[
                { key: "loans", label: "Loans", count: loans.length },
                { key: "repayments", label: "Repayments", count: repayments.length },
                { key: "savings", label: "Savings", count: filteredSavings.length },
                { key: "documents", label: "Documents" },
                { key: "activity", label: "Activity" },
              ]}
            />

            <div className="p-4 md:p-5">
              {/* Loans */}
              {activeTab === "loans" && (
                <>
                  {errors.loans && <div className="mb-3 text-sm text-rose-600">{errors.loans}</div>}
                  {loans.length === 0 ? (
                    <Empty
                      text={
                        <>
                          No loans for this borrower.
                          <Link
                            to={`/loans/applications?borrowerId=${encodeURIComponent(borrower.id)}${
                              borrower?.tenantId ? `&tenantId=${encodeURIComponent(borrower.tenantId)}` : ""
                            }`}
                            className="ml-1 underline text-indigo-600"
                          >
                            Create loan
                          </Link>
                        </>
                      }
                    />
                  ) : (
                    <Table
                      head={["Loan", "Reference", "Status", "Amount", "Actions"]}
                      rows={loans.map((l) => [
                        <Link
                          to={`/loans/${encodeURIComponent(l.id)}${
                            borrower?.tenantId ? `?tenantId=${encodeURIComponent(borrower.tenantId)}` : ""
                          }`}
                          className="text-indigo-600 underline"
                        >
                          {l.id}
                        </Link>,
                        l.reference || `L-${l.id}`,
                        <span className={chip(l.status)}>{String(l.status || "—")}</span>,
                        <div className="text-right tabular-nums">{money(l.amount)}</div>,
                        <div className="flex gap-2">
                          <button
                            className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                            onClick={() => handleViewSchedule(l.id)}
                          >
                            Schedule
                          </button>
                          {String(userRole || "").toLowerCase() === "admin" && (
                            <button
                              className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
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

              {/* Repayments */}
              {activeTab === "repayments" && (
                <>
                  {repayments.length === 0 ? (
                    <Empty text="No repayments recorded for this borrower." />
                  ) : (
                    <Table
                      head={["Date", "Amount", "Loan", "Status"]}
                      rows={repayments.map((r, i) => [
                        r.date
                          ? new Date(r.date).toLocaleDateString()
                          : r.createdAt
                          ? new Date(r.createdAt).toLocaleDateString()
                          : "—",
                        <div className="text-right tabular-nums">{money(r.amount)}</div>,
                        r.loanId ? (
                          <Link
                            to={`/loans/${encodeURIComponent(r.loanId)}${
                              borrower?.tenantId ? `?tenantId=${encodeURIComponent(borrower.tenantId)}` : ""
                            }`}
                            className="text-indigo-600 underline"
                          >
                            {r.loanId}
                          </Link>
                        ) : (
                          "—"
                        ),
                        <span className={chip(r.status)}>{r.status || "—"}</span>,
                      ])}
                    />
                  )}
                </>
              )}

              {/* Savings */}
              {activeTab === "savings" && (
                <>
                  {errors.savings && <div className="mb-3 text-sm text-rose-600">{errors.savings}</div>}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-3 text-sm">
                    <BadgeCard label="Deposits" value={money(deposits)} tone="emerald" />
                    <BadgeCard label="Withdrawals" value={money(withdrawals)} tone="amber" />
                    <BadgeCard label="Interest" value={money(interest)} tone="sky" />
                    <BadgeCard label="Charges" value={money(charges)} tone="rose" />
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-700">Filter:</span>
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
                    <Link
                      to={`/savings${tenantQuery}${tenantQuery ? "&" : "?"}borrowerId=${encodeURIComponent(borrower.id)}`}
                      className="text-sm text-indigo-600 underline"
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
                        <span className="capitalize">{tx.type}</span>,
                        <div className="text-right tabular-nums">{money(tx.amount)}</div>,
                        tx.notes || "—",
                      ])}
                    />
                  )}
                </>
              )}

              {/* Documents */}
              {activeTab === "documents" && (
                <div className="text-sm text-slate-700">
                  <Link
                    to={`/borrowers/${encodeURIComponent(borrower.id)}/documents${tenantQuery}`}
                    className="text-indigo-600 underline"
                  >
                    Manage KYC documents
                  </Link>
                </div>
              )}

              {/* Activity */}
              {activeTab === "activity" && (
                <ActivityTimeline
                  loans={loans}
                  repayments={repayments}
                  savings={savings}
                  comments={comments}
                  canAddRepayment={String(userRole || "").toLowerCase() === "admin"}
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
        </div>

        {/* NOTES SIDEBAR */}
        <aside className="lg:col-span-1 space-y-5">
          <Card title="Notes">
            <input
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddComment(e.currentTarget.value);
                  e.currentTarget.value = "";
                }
              }}
              placeholder="Add a note and press Enter…"
              className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
            />
            {comments.length === 0 ? (
              <div className="text-xs text-slate-500">No notes yet.</div>
            ) : (
              <>
                <ul className="space-y-2">
                  {visibleComments.map((c, i) => (
                    <li key={`${i}-${c.createdAt}`} className="border rounded-lg p-2 text-xs">
                      <div className="text-slate-900">{c.content}</div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        {c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}
                      </div>
                    </li>
                  ))}
                </ul>
                {comments.length > 3 && (
                  <button
                    onClick={() => setShowAllComments((s) => !s)}
                    className="mt-3 w-full text-xs px-2 py-1 rounded-lg border"
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
  <div className="p-6 text-sm text-slate-600 border border-dashed rounded-2xl">{text}</div>
);

const Table = ({ head = [], rows = [] }) => (
  <div className="overflow-auto rounded-xl ring-1 ring-slate-200">
    <table className="min-w-full text-sm">
      <thead className="bg-slate-50">
        <tr className="text-left text-slate-700">
          {head.map((h, i) => (
            <th key={i} className={`px-3 py-2 ${i === head.length - 1 ? "text-right" : ""}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="odd:bg-white even:bg-slate-50">
            {r.map((c, j) => (
              <td key={j} className={`px-3 py-2 align-top ${j === head.length - 1 ? "text-right" : ""}`}>
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
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    sky: "bg-sky-50 text-sky-700",
    rose: "bg-rose-50 text-rose-700",
  };
  return (
    <div className={`p-3 rounded-xl ${toneMap[tone]} text-sm`}>
      {label}: <strong>{value}</strong>
    </div>
  );
};

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
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-slate-900">📜 Activity Timeline</h4>
        {canAddRepayment && (
          <button onClick={onAddRepayment} className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">
            Record Repayment
          </button>
        )}
      </div>
      <ul className="space-y-2 text-sm">
        {items.map((item, i) => (
          <li key={i} className="border-l-4 pl-3 border-slate-300 text-slate-800">
            <span className="text-slate-500">
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
