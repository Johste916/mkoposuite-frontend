import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

// shadcn/ui (as in your snippet)
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const money = (v) => Number(v || 0).toLocaleString();

const Row = ({ title, desc, control }) => (
  <div className="flex items-center justify-between border rounded-xl p-3">
    <div>
      <p className="font-medium">{title}</p>
      {desc && <p className="text-sm text-muted-foreground">{desc}</p>}
    </div>
    {control}
  </div>
);

const StatusBadge = ({ status }) => {
  const map = {
    current: "default",
    paid: "secondary",
    partial: "outline",
    overdue: "destructive",
    upcoming: "default",
    closed: "secondary",
  };
  return <Badge variant={map[status] || "outline"} className="capitalize">{status}</Badge>;
};

export default function Repayments() {
  const navigate = useNavigate();

  // top-level state
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

  // data table
  const [loans, setLoans] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // side panel (loan details + schedule)
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
      // silent
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
      params.status = includeClosed ? "all" : status;

      // Use /loans list; backend may ignore some filters (OK)
      const { data } = await api.get("/loans", { params });
      const items = Array.isArray(data) ? data : data?.items || [];
      setLoans(items);
      setTotal(Number(data?.total || items.length || 0));
    } catch {
      // silent
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
        api.get(`/loans/${loan.id}/schedule`), // [{ period, dueDate, principal, interest, fees, total, paid, status, overdueDays, penalty }]
        api.get(`/loans/${loan.id}/repayments`), // [{ id, date, amount, method, ref, postedBy }]
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
      <Card>
        <CardContent className="p-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Repayment Schedule</h2>
            <p className="text-sm text-muted-foreground">
              Browse upcoming installments, see overdue items, and post manual repayments.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => fetchLoans()} disabled={loading || filtersLoading}>
              {loading ? "Refreshing…" : "Refresh"}
            </Button>
            <Button onClick={() => navigate("/repayments/new")}>Manual Repayment</Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Filters</h3>
          <form onSubmit={onSearch} className="grid md:grid-cols-6 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Search (Borrower / Loan Ref)</Label>
              <Input
                placeholder="e.g., Juma / L-000123"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Branch</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger><SelectValue placeholder="All branches" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Loan Officer</Label>
              <Select value={officerId} onValueChange={setOfficerId}>
                <SelectTrigger><SelectValue placeholder="All officers" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  {officers.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.name || `${o.firstName || ""} ${o.lastName || ""}`.trim() || o.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Due Range</Label>
              <Select value={dueRange} onValueChange={setDueRange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="next_7_days">Next 7 days</SelectItem>
                  <SelectItem value="next_30_days">Next 30 days</SelectItem>
                  <SelectItem value="overdue">Overdue only</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className={`${includeClosed ? "opacity-60 pointer-events-none" : ""} space-y-2`}>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="delinquent">Delinquent</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Row
                title="Include Closed"
                control={<Switch checked={includeClosed} onCheckedChange={setIncludeClosed} />}
              />
            </div>

            <div className="md:col-span-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
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
              </Button>
              <Button type="submit">Search</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Loans table */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Loans</h3>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Page size</Label>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[10, 20, 50].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto border rounded-xl">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-muted/40">
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
                    <td colSpan={7} className="p-4 text-muted-foreground">
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
                        <Button size="sm" variant="outline" onClick={() => openLoanPanel(l)}>
                          View Schedule
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => navigate(`/repayments/new?loanId=${l.id}`)}
                        >
                          Add Repayment
                        </Button>
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
            <p className="text-sm text-muted-foreground">
              Page {page} of {pages} • {total} total
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                disabled={page >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Side panel */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Loan Schedule</SheetTitle>
          </SheetHeader>
          {!activeLoan ? (
            <div className="p-4 text-sm text-muted-foreground">No loan selected.</div>
          ) : (
            <div className="p-4 space-y-4">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">
                  {activeLoan.reference || `L-${activeLoan.id}`}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {activeLoan.borrowerName || activeLoan.Borrower?.name} •{" "}
                  {activeLoan.currency || "TZS"} {money(activeLoan.principal || activeLoan.amount || 0)}
                </p>
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    onClick={() => navigate(`/repayments/new?loanId=${activeLoan.id}`)}
                  >
                    Add Repayment
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`/loans/${activeLoan.id}`, "_blank")}
                  >
                    Open Loan
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Installments */}
              <div className="space-y-2">
                <h4 className="font-medium">Installments</h4>
                <div className="overflow-x-auto border rounded-xl">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-muted/40">
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
                          <td colSpan={9} className="p-4 text-muted-foreground">
                            No schedule entries.
                          </td>
                        </tr>
                      )}
                      {schedule.map((s, idx) => (
                        <tr key={`${s.period}-${s.dueDate}`} className="border-t">
                          <td className="p-3">{s.period ?? idx + 1}</td>
                          <td className="p-3">{s.dueDate}</td>
                          <td className="p-3">
                            {activeLoan.currency || "TZS"} {money(s.principal)}
                          </td>
                          <td className="p-3">
                            {activeLoan.currency || "TZS"} {money(s.interest)}
                          </td>
                          <td className="p-3">
                            {activeLoan.currency || "TZS"} {money(s.fees)}
                          </td>
                          <td className="p-3">
                            {activeLoan.currency || "TZS"} {money(s.total)}
                          </td>
                          <td className="p-3">
                            {activeLoan.currency || "TZS"} {money(s.paid)}
                          </td>
                          <td className="p-3">
                            {s.penalty
                              ? `${activeLoan.currency || "TZS"} ${money(s.penalty)}`
                              : "—"}
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
                <h4 className="font-medium">Repayments</h4>
                <div className="overflow-x-auto border rounded-xl">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-muted/40">
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
                          <td colSpan={5} className="p-4 text-muted-foreground">
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
        </SheetContent>
      </Sheet>
    </div>
  );
}
