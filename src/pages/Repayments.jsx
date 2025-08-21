import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

const money = (v) => Number(v || 0).toLocaleString();

const Row = ({ title, desc, control }) => (
  <div className="flex items-center justify-between border rounded-xl p-3">
    <div>
      <p className="font-medium">{title}</p>
      {desc && <p className="text-sm text-gray-500">{desc}</p>}
    </div>
    {control}
  </div>
);

const StatusBadge = ({ status }) => {
  const cls =
    status === "overdue"
      ? "bg-red-600 text-white"
      : status === "paid" || status === "closed"
      ? "bg-green-100 text-green-800 border border-green-300"
      : status === "partial"
      ? "bg-yellow-50 text-yellow-800 border border-yellow-300"
      : "bg-gray-100 text-gray-800 border";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs capitalize ${cls}`}>
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

  const openLoanPanel = async (loan) => {
    setActiveLoan(loan);
    setOpen(true);
    setPanelLoading(true);
    try {
      const [schedRes, payRes] = await Promise.all([
        api.get(`/loans/${loan.id}/schedule`),
        api.get(`/loans/${loan.id}/repayments`),
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border rounded-xl shadow p-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Repayment Schedule</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Browse upcoming installments, see overdue items, and post manual repayments.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="px-3 py-2 rounded border hover:bg-gray-50 disabled:opacity-60"
            onClick={() => fetchLoans()}
            disabled={loading || filtersLoading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button
            className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => navigate("/repayments/new")}
          >
            Manual Repayment
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 border rounded-xl shadow p-6 space-y-4">
        <h3 className="text-lg font-semibold">Filters</h3>
        <form onSubmit={onSearch} className="grid md:grid-cols-6 gap-4">
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm">Search (Borrower / Loan Ref)</label>
            <input
              className="w-full border rounded px-3 py-2"
              placeholder="e.g., Juma / L-000123"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm">Branch</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            >
              <option value="">All</option>
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm">Loan Officer</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={officerId}
              onChange={(e) => setOfficerId(e.target.value)}
            >
              <option value="">All</option>
              {officers.map((o) => (
                <option key={o.id} value={String(o.id)}>
                  {o.name || `${o.firstName || ""} ${o.lastName || ""}`.trim() || o.email}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm">Due Range</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={dueRange}
              onChange={(e) => setDueRange(e.target.value)}
            >
              <option value="next_7_days">Next 7 days</option>
              <option value="next_30_days">Next 30 days</option>
              <option value="overdue">Overdue only</option>
              <option value="all">All</option>
            </select>
          </div>

          <div className={`${includeClosed ? "opacity-60 pointer-events-none" : ""} space-y-1`}>
            <label className="text-sm">Status</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
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
                    checked={includeClosed}
                    onChange={(e) => setIncludeClosed(e.target.checked)}
                  />
                </label>
              }
            />
          </div>

          <div className="md:col-span-6 flex justify-end gap-2">
            <button
              type="button"
              className="px-3 py-2 rounded border hover:bg-gray-50"
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
            <button type="submit" className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Loans table */}
      <div className="bg-white dark:bg-gray-800 border rounded-xl shadow p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Loans</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Page size</span>
            <select
              className="border rounded px-2 py-1 text-sm"
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

        <div className="overflow-x-auto border rounded-xl">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-3">Loan Ref</th>
                <th className="text-left p-3">Borrower</th>
                <th className="text-left p-3">Outstanding</th>
                <th className="text-left p-3">Next Due</th>
                <th className="text-left p-3">Officer</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && loans.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-4 text-gray-500">
                    No loans found.
                  </td>
                </tr>
              )}
              {loans.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="p-3">{l.reference || `L-${l.id}`}</td>
                  <td className="p-3">{l.borrowerName || l.Borrower?.name}</td>
                  <td className="p-3">
                    {l.currency || "TZS"} {money(l.outstanding ?? l.balance ?? 0)}
                  </td>
                  <td className="p-3">
                    {l.nextDueDate ? (
                      <div className="flex items-center gap-2">
                        <span>{l.nextDueDate}</span>
                        {l.nextDueStatus && <StatusBadge status={l.nextDueStatus} />}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-3">{l.officerName || l.officer?.name || "—"}</td>
                  <td className="p-3">{l.state || l.status || "active"}</td>
                  <td className="p-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        className="px-3 py-1.5 rounded border hover:bg-gray-50"
                        onClick={() => openLoanPanel(l)}
                      >
                        View Schedule
                      </button>
                      <button
                        className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
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
                  <td colSpan={7} className="p-4">
                    Loading…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* pagination */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-600">
            Page {page} of {pages} • {total} total
          </p>
          <div className="flex gap-2">
            <button
              className="px-3 py-1.5 rounded border hover:bg-gray-50 disabled:opacity-60"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <button
              className="px-3 py-1.5 rounded border hover:bg-gray-50 disabled:opacity-60"
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
          <div className="absolute inset-y-0 right-0 w-full sm:max-w-3xl bg-white dark:bg-gray-900 shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Loan Schedule</h3>
              <button className="px-3 py-1.5 rounded border hover:bg-gray-50" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>

            {!activeLoan ? (
              <div className="p-4 text-sm text-gray-500">No loan selected.</div>
            ) : (
              <div className="p-4 space-y-4">
                <div className="space-y-1">
                  <h4 className="text-lg font-semibold">{activeLoan.reference || `L-${activeLoan.id}`}</h4>
                  <p className="text-sm text-gray-600">
                    {activeLoan.borrowerName || activeLoan.Borrower?.name} •{" "}
                    {activeLoan.currency || "TZS"} {money(activeLoan.principal || activeLoan.amount || 0)}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button
                      className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
                      onClick={() => navigate(`/repayments/new?loanId=${activeLoan.id}`)}
                    >
                      Add Repayment
                    </button>
                    <button
                      className="px-3 py-1.5 rounded border hover:bg-gray-50"
                      onClick={() => window.open(`/loans/${activeLoan.id}`, "_blank")}
                    >
                      Open Loan
                    </button>
                  </div>
                </div>

                <hr />

                {/* Installments */}
                <div className="space-y-2">
                  <h5 className="font-medium">Installments</h5>
                  <div className="overflow-x-auto border rounded-xl">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left p-3">#</th>
                          <th className="text-left p-3">Due Date</th>
                          <th className="text-left p-3">Principal</th>
                          <th className="text-left p-3">Interest</th>
                          <th className="text-left p-3">Fees</th>
                          <th className="text-left p-3">Total</th>
                          <th className="text-left p-3">Paid</th>
                          <th className="text-left p-3">Penalty</th>
                          <th className="text-left p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {panelLoading && (
                          <tr>
                            <td colSpan={9} className="p-4">
                              Loading…
                            </td>
                          </tr>
                        )}
                        {!panelLoading && schedule.length === 0 && (
                          <tr>
                            <td colSpan={9} className="p-4 text-gray-500">
                              No schedule entries.
                            </td>
                          </tr>
                        )}
                        {schedule.map((s, idx) => (
                          <tr key={`${s.period}-${s.dueDate}`} className="border-t">
                            <td className="p-3">{s.period ?? idx + 1}</td>
                            <td className="p-3">{s.dueDate}</td>
                            <td className="p-3">{activeLoan.currency || "TZS"} {money(s.principal)}</td>
                            <td className="p-3">{activeLoan.currency || "TZS"} {money(s.interest)}</td>
                            <td className="p-3">{activeLoan.currency || "TZS"} {money(s.fees)}</td>
                            <td className="p-3">{activeLoan.currency || "TZS"} {money(s.total)}</td>
                            <td className="p-3">{activeLoan.currency || "TZS"} {money(s.paid)}</td>
                            <td className="p-3">
                              {s.penalty ? `${activeLoan.currency || "TZS"} ${money(s.penalty)}` : "—"}
                            </td>
                            <td className="p-3">
                              <StatusBadge status={s.status || "upcoming"} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Repayments */}
                <div className="space-y-2">
                  <h5 className="font-medium">Repayments</h5>
                  <div className="overflow-x-auto border rounded-xl">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left p-3">Date</th>
                          <th className="text-left p-3">Amount</th>
                          <th className="text-left p-3">Method</th>
                          <th className="text-left p-3">Reference</th>
                          <th className="text-left p-3">Posted By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {panelLoading && (
                          <tr>
                            <td colSpan={5} className="p-4">
                              Loading…
                            </td>
                          </tr>
                        )}
                        {!panelLoading && repayments.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-4 text-gray-500">
                              No repayments yet.
                            </td>
                          </tr>
                        )}
                        {repayments.map((r) => (
                          <tr key={r.id} className="border-t">
                            <td className="p-3">{r.date}</td>
                            <td className="p-3">
                              {activeLoan.currency || "TZS"} {money(r.amount || 0)}
                            </td>
                            <td className="p-3">{r.method || "—"}</td>
                            <td className="p-3">{r.ref || r.reference || "—"}</td>
                            <td className="p-3">{r.postedBy || "—"}</td>
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
