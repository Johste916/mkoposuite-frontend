// src/pages/Repayments.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

/* ---------- shared UI tokens (bold/high-contrast) ---------- */
const ui = {
  page: "w-full px-4 md:px-6 lg:px-10 py-6 text-slate-900",
  h1: "text-3xl font-extrabold tracking-tight",
  sub: "text-sm text-slate-700",
  card: "rounded-2xl border-2 border-slate-300 bg-white shadow",
  th: "bg-slate-100 text-left text-[12px] uppercase tracking-wide text-slate-700 font-semibold px-3 py-2 border-2 border-slate-200 select-none",
  td: "px-3 py-2 border-2 border-slate-200 text-sm",
  btn: "inline-flex items-center rounded-lg border-2 border-slate-300 px-3 py-2 hover:bg-slate-50 font-semibold",
  btnPrimary: "inline-flex items-center rounded-lg bg-indigo-600 text-white px-3 py-2 font-semibold hover:bg-indigo-700",
  btnDanger: "inline-flex items-center rounded-lg bg-rose-600 text-white px-3 py-2 font-semibold hover:bg-rose-700",
  field: "h-11 w-full rounded-lg border-2 border-slate-300 bg-white text-sm px-3 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-600",
};

const money = (v) => Number(v || 0).toLocaleString();

/* inline row pill */
const Row = ({ title, desc, control }) => (
  <div className="flex items-center justify-between rounded-2xl border-2 border-slate-300 bg-white px-3 py-2">
    <div>
      <p className="font-semibold">{title}</p>
      {desc && <p className="text-[12px] text-slate-600">{desc}</p>}
    </div>
    {control}
  </div>
);

const StatusBadge = ({ status }) => {
  const s = String(status || "").toLowerCase();
  const cls =
    s === "overdue"
      ? "bg-rose-600 text-white"
      : s === "paid" || s === "closed"
      ? "bg-emerald-100 text-emerald-800 ring-2 ring-emerald-300"
      : s === "partial"
      ? "bg-amber-50 text-amber-800 ring-2 ring-amber-300"
      : "bg-slate-100 text-slate-800 ring-2 ring-slate-300";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${cls}`}>
      {status || "—"}
    </span>
  );
};

// Only these should be sent to backend as ?status=
const BACKEND_ENUM_STATUSES = ["pending", "approved", "rejected", "disbursed", "closed"];

export default function Repayments() {
  const navigate = useNavigate();

  // loading
  const [loading, setLoading] = useState(false);
  const [filtersLoading, setFiltersLoading] = useState(false);

  // filters
  const [branches, setBranches] = useState([]);
  the
  const [officers, setOfficers] = useState([]);
  const [branchId, setBranchId] = useState("");
  const [officerId, setOfficerId] = useState("");
  const [status, setStatus] = useState("active"); // active|delinquent|closed|all
  const [q, setQ] = useState("");
  const [dueRange, setDueRange] = useState("next_30_days"); // next_7_days|next_30_days|overdue|all
  const [includeClosed, setIncludeClosed] = useState(false);

  // data
  const [loans, setLoans] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // side panel
  const [open, setOpen] = useState(false);
  const [activeLoan, setActiveLoan] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [repayments, setRepayments] = useState([]);
  const [panelLoading, setPanelLoading] = useState(false);

  // live refresh controls
  const pollRef = useRef(null);
  const POLL_MS = 15000; // 15s gentle polling while drawer is open

  const pages = useMemo(
    () => Math.max(1, Math.ceil(Number(total || 0) / Number(pageSize || 1))),
    [total, pageSize]
  );

  const fetchFilters = async () => {
    setFiltersLoading(true);
    try {
      const [b, u] = await Promise.all([
        api.get("/branches"),
        api.get("/users", { params: { role: "loan_officer", pageSize: 500 } }),
      ]);
      setBranches(Array.isArray(b.data) ? b.data : b.data?.items || []);
      setOfficers(Array.isArray(u.data) ? u.data : u.data?.items || []);
    } catch {
      // noop
    } finally {
      setFiltersLoading(false);
    }
  };

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const params = { page, pageSize };
      if (branchId) params.branchId = branchId;
      if (officerId) params.officerId = officerId;
      if (q?.trim()) params.q = q.trim();
      if (dueRange && dueRange !== "all") params.dueRange = dueRange;

      // Only send DB-backed statuses; "active"/"delinquent" are derived client-side
      if (!includeClosed && BACKEND_ENUM_STATUSES.includes(String(status))) {
        params.status = status;
      }
      // If includeClosed is true, omit status entirely

      const { data } = await api.get("/loans", { params });
      let items = Array.isArray(data) ? data : data?.items || [];

      // Derived filters client-side
      if (!includeClosed) {
        const s = String(status).toLowerCase();
        if (s === "active") {
          items = items.filter(
            (l) => String(l.status || l.state || "").toLowerCase() === "disbursed"
          );
        } else if (s === "delinquent") {
          items = items.filter(
            (l) =>
              String(l.nextDueStatus || "").toLowerCase() === "overdue" ||
              Number(l.dpd || 0) > 0 ||
              Number(l.arrears || 0) > 0
          );
        } else if (s === "closed") {
          items = items.filter((l) => String(l.status || "").toLowerCase() === "closed");
        }
      }

      setLoans(items);
      setTotal(Number(data?.total || items.length || 0));
    } catch {
      setLoans([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchPanelData = async (loanId) => {
    if (!loanId) return;
    setPanelLoading(true);
    try {
      const [schedRes, payRes] = await Promise.all([
        api.get(`/loans/${loanId}/schedule`),
        api.get(`/loans/${loanId}/repayments`),
      ]);
      setSchedule(Array.isArray(schedRes.data) ? schedRes.data : []);
      setRepayments(Array.isArray(payRes.data) ? payRes.data : []);
    } catch {
      setSchedule([]);
      setRepayments([]);
    } finally {
      setPanelLoading(false);
    }
  };

  const openLoanPanel = async (loan) => {
    setActiveLoan(loan);
    setOpen(true);
    await fetchPanelData(loan.id);

    // (Re)start lightweight polling while the panel is open
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      fetchPanelData(loan.id);
    }, POLL_MS);
  };

  // Stop polling when panel closes or component unmounts
  useEffect(() => {
    if (!open && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [open]);

  // Refresh on tab focus/visibility change
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        fetchLoans();
        if (open && activeLoan?.id) fetchPanelData(activeLoan.id);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [open, activeLoan?.id]);

  // Global repayment events
  useEffect(() => {
    const onRepaymentPosted = (e) => {
      const loanId = e?.detail?.loanId;
      fetchLoans();
      if (open && activeLoan?.id && loanId && Number(activeLoan.id) === Number(loanId)) {
        fetchPanelData(loanId);
      }
    };
    window.addEventListener("repayment:posted", onRepaymentPosted);
    return () => window.removeEventListener("repayment:posted", onRepaymentPosted);
  }, [open, activeLoan?.id]);

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchLoans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, branchId, officerId, status, dueRange, includeClosed]);

  const onSearch = (e) => {
    e?.preventDefault?.();
    setPage(1);
    fetchLoans();
  };

  return (
    <div className={ui.page}>
      {/* Header */}
      <div className={`${ui.card} p-4 md:p-5 mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between`}>
        <div>
          <h1 className={ui.h1}>Repayment Schedule</h1>
          <p className={ui.sub}>
            Browse upcoming installments, see overdue items, and post manual repayments.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className={ui.btn}
            onClick={() => fetchLoans()}
            disabled={loading || filtersLoading}
            title="Refresh list"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button
            className={ui.btn}
            onClick={() => navigate("/repayments/receipts")}
            title="Open receipts list"
          >
            Receipts
          </button>
          <button
            className={ui.btn}
            onClick={() => navigate("/repayments/charts")}
            title="Open charts"
          >
            Charts
          </button>
          <button className={ui.btnPrimary} onClick={() => navigate("/repayments/new")}>
            Manual Repayment
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={`${ui.card} p-4 md:p-5 mb-6`}>
        <h2 className="text-xl font-bold tracking-tight mb-3">Filters</h2>
        <form onSubmit={onSearch} className="grid md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <label className="text-[12px] font-semibold text-slate-600">Search (Borrower / Loan Ref)</label>
            <input
              className={ui.field}
              placeholder="e.g., Juma / L-000123"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div>
            <label className="text-[12px] font-semibold text-slate-600">Branch</label>
            <select className={ui.field} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">All</option>
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[12px] font-semibold text-slate-600">Loan Officer</label>
            <select className={ui.field} value={officerId} onChange={(e) => setOfficerId(e.target.value)}>
              <option value="">All</option>
              {officers.map((o) => (
                <option key={o.id} value={String(o.id)}>
                  {o.name || `${o.firstName || ""} ${o.lastName || ""}`.trim() || o.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[12px] font-semibold text-slate-600">Due Range</label>
            <select className={ui.field} value={dueRange} onChange={(e) => setDueRange(e.target.value)}>
              <option value="next_7_days">Next 7 days</option>
              <option value="next_30_days">Next 30 days</option>
              <option value="overdue">Overdue only</option>
              <option value="all">All</option>
            </select>
          </div>

          <div className={`${includeClosed ? "opacity-60 pointer-events-none" : ""}`}>
            <label className="text-[12px] font-semibold text-slate-600">Status</label>
            <select className={ui.field} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="active">Active</option>
              <option value="delinquent">Delinquent</option>
              <option value="closed">Closed</option>
              <option value="all">All</option>
            </select>
          </div>

          <div className="flex items-end">
            <Row
              title="Include Closed"
              control={
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-5 w-5"
                    checked={includeClosed}
                    onChange={(e) => setIncludeClosed(e.target.checked)}
                  />
                </label>
              }
            />
          </div>

          <div className="md:col-span-6 flex justify-end gap-2 pt-1">
            <button
              type="button"
              className={ui.btn}
              onClick={() => {
                setBranchId("");
                setOfficerId("");
                setStatus("active");
                setDueRange("next_30_days");
                setIncludeClosed(false);
                setQ("");
                setPage(1);
                fetchLoans();
              }}
            >
              Reset
            </button>
            <button type="submit" className={ui.btnPrimary}>
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Loans table */}
      <div className={`${ui.card} p-4 md:p-5 space-y-4`}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Loans</h2>
          <div className="inline-flex items-center gap-2">
            <span className="text-sm text-slate-700">Page size</span>
            <select
              className="h-9 rounded-lg border-2 border-slate-300 bg-white px-2 text-sm outline-none"
              value={String(pageSize)}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr>
                {["Loan Ref", "Borrower", "Outstanding", "Next Due", "Officer", "Status", "Actions"].map((h, i) => (
                  <th key={h} className={`${ui.th} ${i === 6 ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && loans.length === 0 && (
                <tr>
                  <td colSpan={7} className={`${ui.td} text-center py-10 text-slate-600`}>
                    No loans found.
                  </td>
                </tr>
              )}
              {loans.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className={ui.td}>{l.reference || `L-${l.id}`}</td>
                  <td className={ui.td}>{l.borrowerName || l.Borrower?.name}</td>
                  <td className={ui.td}>
                    {l.currency || "TZS"} {money(l.outstanding ?? l.balance ?? 0)}
                  </td>
                  <td className={ui.td}>
                    {l.nextDueDate ? (
                      <div className="flex items-center gap-2">
                        <span>{l.nextDueDate}</span>
                        {l.nextDueStatus && <StatusBadge status={l.nextDueStatus} />}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={ui.td}>{l.officerName || l.officer?.name || "—"}</td>
                  <td className={ui.td}>{l.state || l.status || "active"}</td>
                  <td className={`${ui.td} text-right`}>
                    <div className="inline-flex gap-2">
                      <button className={ui.btn} onClick={() => openLoanPanel(l)}>
                        View Schedule
                      </button>
                      <button
                        className={ui.btnPrimary}
                        onClick={() => navigate(`/repayments/new?loanId=${l.id}`)}
                      >
                        Add Repayment
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {loading && (
                <tr>
                  <td colSpan={7} className={`${ui.td} py-8 text-center text-slate-600`}>
                    Loading…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* pagination */}
        <div className="flex items-center justify-between px-1 py-2 border-t-2 border-slate-300">
          <p className="text-sm text-slate-700">
            Page {page} of {pages} • {total} total
          </p>
          <div className="flex gap-2">
            <button
              className={`${ui.btn} disabled:opacity-60`}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <button
              className={`${ui.btn} disabled:opacity-60`}
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Side panel (drawer) */}
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-full sm:max-w-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b-2 border-slate-300">
              <h3 className="text-xl font-bold tracking-tight">Loan Schedule</h3>
              <button className={ui.btn} onClick={() => setOpen(false)}>
                Close
              </button>
            </div>

            {!activeLoan ? (
              <div className="p-4 text-sm text-slate-600">No loan selected.</div>
            ) : (
              <div className="p-4 md:p-5 space-y-5">
                <div>
                  <h4 className="text-lg font-bold tracking-tight">
                    {activeLoan.reference || `L-${activeLoan.id}`}
                  </h4>
                  <p className="text-sm text-slate-700">
                    {activeLoan.borrowerName || activeLoan.Borrower?.name} •{" "}
                    {activeLoan.currency || "TZS"}{" "}
                    {money(activeLoan.principal || activeLoan.amount || 0)}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      className={ui.btnPrimary}
                      onClick={() => navigate(`/repayments/new?loanId=${activeLoan.id}`)}
                    >
                      Add Repayment
                    </button>
                    <button
                      className={ui.btn}
                      onClick={() => window.open(`/loans/${activeLoan.id}`, "_blank")}
                    >
                      Open Loan
                    </button>
                  </div>
                </div>

                {/* Installments */}
                <div className={`${ui.card} p-3 md:p-4`}>
                  <h5 className="font-semibold mb-2">Installments</h5>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border-separate border-spacing-0">
                      <thead>
                        <tr>
                          {["#", "Due Date", "Principal", "Interest", "Fees", "Total", "Paid", "Penalty", "Status"].map((h) => (
                            <th key={h} className={ui.th}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {panelLoading && (
                          <tr>
                            <td colSpan={9} className={`${ui.td} text-center py-8 text-slate-600`}>
                              Loading…
                            </td>
                          </tr>
                        )}
                        {!panelLoading && schedule.length === 0 && (
                          <tr>
                            <td colSpan={9} className={`${ui.td} text-center py-8 text-slate-600`}>
                              No schedule entries.
                            </td>
                          </tr>
                        )}
                        {schedule.map((s, idx) => (
                          <tr key={`${s.period}-${s.dueDate}`} className="hover:bg-slate-50">
                            <td className={ui.td}>{s.period ?? idx + 1}</td>
                            <td className={ui.td}>{s.dueDate}</td>
                            <td className={ui.td}>{(activeLoan.currency || "TZS") + " " + money(s.principal)}</td>
                            <td className={ui.td}>{(activeLoan.currency || "TZS") + " " + money(s.interest)}</td>
                            <td className={ui.td}>{(activeLoan.currency || "TZS") + " " + money(s.fees)}</td>
                            <td className={ui.td}>{(activeLoan.currency || "TZS") + " " + money(s.total)}</td>
                            <td className={ui.td}>{(activeLoan.currency || "TZS") + " " + money(s.paid)}</td>
                            <td className={ui.td}>
                              {s.penalty ? `${activeLoan.currency || "TZS"} ${money(s.penalty)}` : "—"}
                            </td>
                            <td className={ui.td}>
                              <StatusBadge status={s.status || "upcoming"} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Repayments */}
                <div className={`${ui.card} p-3 md:p-4`}>
                  <h5 className="font-semibold mb-2">Repayments</h5>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border-separate border-spacing-0">
                      <thead>
                        <tr>
                          {["Date", "Amount", "Method", "Reference", "Posted By"].map((h) => (
                            <th key={h} className={ui.th}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {panelLoading && (
                          <tr>
                            <td colSpan={5} className={`${ui.td} text-center py-8 text-slate-600`}>
                              Loading…
                            </td>
                          </tr>
                        )}
                        {!panelLoading && repayments.length === 0 && (
                          <tr>
                            <td colSpan={5} className={`${ui.td} text-center py-8 text-slate-600`}>
                              No repayments yet.
                            </td>
                          </tr>
                        )}
                        {repayments.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50">
                            <td className={ui.td}>{r.date}</td>
                            <td className={ui.td}>{(activeLoan.currency || "TZS") + " " + money(r.amount || 0)}</td>
                            <td className={ui.td}>{r.method || "—"}</td>
                            <td className={ui.td}>{r.ref || r.reference || "—"}</td>
                            <td className={ui.td}>{r.postedBy || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
