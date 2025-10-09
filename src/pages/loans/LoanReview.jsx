// src/pages/loans/LoanReview.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import {
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Check,
  X as XIcon,
  CornerUpLeft,
  Loader2,
  ChevronDown,
} from "lucide-react";

/* ---------- config ---------- */
const PAGE_SIZE = 10;

const STAGES = [
  { value: "submitted", label: "Submitted (New)" },
  { value: "manager_review", label: "Manager Review" },
  { value: "compliance_review", label: "Compliance Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "returned_with_comment", label: "Returned with Comment" },
];

/* ---------- helpers ---------- */
const money = (v, c = "TZS") => `\u200e${c} ${Number(v || 0).toLocaleString()}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");

/* ---------- token-based UI (matches .app-theme-bold / theme.css) ---------- */
const ui = {
  wrap: "w-full px-4 md:px-6 lg:px-8 py-6 bg-[var(--bg)] text-[var(--fg)]",
  h1: "text-3xl font-extrabold tracking-tight",
  sub: "text-sm text-[var(--muted)]",
  card: "rounded-2xl border-2 border-[var(--border-strong)] bg-[var(--card)] shadow",
  btn:
    "inline-flex items-center justify-center rounded-lg border-2 border-[var(--border-strong)] " +
    "px-3 py-2 bg-[var(--card)] hover:bg-[var(--kpi-bg)] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
  btnIcon: "w-4 h-4",
  /* FIX: use primary tokens, not undefined --accent */
  primary:
    "inline-flex items-center rounded-lg px-3 py-2 font-semibold " +
    "bg-[var(--primary)] text-[var(--primary-contrast)] hover:opacity-90 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
  /* FIX: table head token + 1px inner borders */
  th:
    "bg-[var(--table-head-bg)] text-left text-[12px] uppercase tracking-wide text-[var(--muted)] " +
    "font-semibold px-3 py-2 border border-[var(--border)] select-none",
  /* FIX: 1px inner borders */
  td: "px-3 py-2 border border-[var(--border)] text-sm",
  chip: "px-2 py-0.5 text-[11px] rounded-full border",
  /* placeholder uses input-placeholder token */
  fieldBase:
    "h-11 w-full rounded-lg border-2 text-sm outline-none px-3 " +
    "bg-[var(--input-bg)] text-[var(--input-fg)] border-[var(--input-border)] " +
    "placeholder:text-[var(--input-placeholder)] focus:ring-2 focus:ring-[var(--ring)]",
  fieldIcon:
    "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]",
};

/* status chip inline styles via tokens (with fallbacks so it still looks good) */
const statusStyle = (stage) => {
  const s = (stage || "").toLowerCase();
  if (s === "approved")
    return {
      background: "var(--success, #22c55e)",
      color: "var(--on-success, #06230f)",
      borderColor: "var(--success-border, #16a34a)",
    };
  if (s === "rejected")
    return {
      background: "var(--danger, #ef4444)",
      color: "var(--on-danger, #2b0a0a)",
      borderColor: "var(--danger-border, #dc2626)",
    };
  if (s === "returned_with_comment")
    return {
      background: "var(--warn, #f59e0b)",
      color: "var(--on-warn, #231803)",
      borderColor: "var(--warn-border, #d97706)",
    };
  return {
    background: "var(--chip-soft)",
    color: "var(--fg)",
    borderColor: "var(--border)",
  };
};

/* ---------- tiny field components ---------- */
const SelectField = ({ className = "", children, ...props }) => (
  <div className={`relative ${className}`}>
    <select
      {...props}
      className={`${ui.fieldBase} pr-9 appearance-none bg-none ms-select`}
      style={{ backgroundImage: "none" }}
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
  </div>
);

const TextField = ({ className = "", leadingIcon = null, ...props }) => (
  <div className={`relative ${className}`}>
    {leadingIcon}
    <input {...props} className={`${ui.fieldBase} ${leadingIcon ? "pl-10" : ""}`} />
  </div>
);

/* ---------- component ---------- */
export default function LoanReview() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  // dropdown refs
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [officers, setOfficers] = useState([]);

  // filters
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [stage, setStage] = useState("manager_review");
  const [productId, setProductId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [officerId, setOfficerId] = useState("");
  const [sort, setSort] = useState("createdAt");
  const [dir, setDir] = useState("desc");
  const [page, setPage] = useState(1);

  // ui
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [modal, setModal] = useState(null); // {type, row}

  // user/role
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);
  const role = (user?.role || "").toLowerCase();

  // default stage per role
  useEffect(() => {
    if (role === "compliance") setStage("compliance_review");
    else if (role === "branch_manager") setStage("manager_review");
  }, [role]);

  // debounce search
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q]);

  // load refs
  useEffect(() => {
    (async () => {
      try {
        const [p, b, o] = await Promise.all([
          api.get("/loan-products").catch(() => ({ data: [] })),
          api.get("/branches").catch(() => ({ data: [] })),
          api.get("/users", { params: { role: "loan_officer" } }).catch(() => ({ data: [] })),
        ]);
        setProducts(Array.isArray(p.data) ? p.data : p.data.items || []);
        setBranches(Array.isArray(b.data) ? b.data : b.data.items || []);
        setOfficers(Array.isArray(o.data) ? o.data : o.data.items || []);
      } catch {}
    })();
  }, []);

  // fetch list
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      setLoading(true);
      try {
        const res = await api.get("/loans", {
          signal: ac.signal,
          params: {
            q: debouncedQ || undefined,
            stage: stage || undefined, // preferred
            status: stage === "approved" || stage === "rejected" ? stage : undefined,
            productId: productId || undefined,
            branchId: branchId || undefined,
            officerId: officerId || undefined,
            page,
            pageSize: PAGE_SIZE,
            sort,
            dir,
          },
        });
        const items = res.data?.items || (Array.isArray(res.data) ? res.data : []);
        setRows(items);
        setTotal(res.data?.total ?? items.length ?? 0);
      } catch (e) {
        setRows([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [debouncedQ, stage, productId, branchId, officerId, page, sort, dir]);

  /* ----- actions (approve / reject / return) ----- */
  const nextStageForApprove = (curStage) => {
    if (role === "branch_manager") return "compliance_review";
    if (role === "compliance" || role === "admin" || role === "director") return "approved";
    if (curStage === "manager_review") return "compliance_review";
    return "approved";
  };

  const canActOnRow = (r) => {
    const s = (r.stage || r.status || "").toLowerCase();
    if (role === "branch_manager") return s === "manager_review" || s === "submitted" || !s;
    if (role === "compliance") return s === "compliance_review";
    if (role === "admin" || role === "director")
      return s === "manager_review" || s === "compliance_review" || s === "submitted";
    return false;
  };

  const doStagePatch = async (loanId, body) => {
    try {
      await api.patch(`/loans/${loanId}/stage`, body);
      return true;
    } catch (e) {
      try {
        if (body.action === "approve") {
          const final = body.nextStage === "approved";
          await api.patch(`/loans/${loanId}/status`, {
            status: final ? "approved" : "pending",
          });
        } else if (body.action === "reject") {
          await api.patch(`/loans/${loanId}/status`, { status: "rejected" });
        } else if (body.action === "return") {
          await api.patch(`/loans/${loanId}/status`, { status: "pending" });
        }
        if (body.comment) {
          await api.post(`/comments`, { loanId, content: body.comment });
        }
        return true;
      } catch {
        return false;
      }
    }
  };

  const approve = async (row, suggestedAmount) => {
    if (!canActOnRow(row)) return;
    setActionLoading(true);
    const body = {
      action: "approve",
      fromStage: row.stage || row.status || "submitted",
      nextStage: nextStageForApprove(row.stage),
      suggestedAmount: suggestedAmount || undefined,
    };
    const ok = await doStagePatch(row.id, body);
    setActionLoading(false);
    if (!ok) return alert("Failed to approve.");
    setPage(1);
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  };

  const reject = async (row, comment) => {
    if (!canActOnRow(row)) return;
    if (!comment?.trim()) return alert("Please enter a short reason.");
    setActionLoading(true);
    const body = {
      action: "reject",
      fromStage: row.stage || row.status || "submitted",
      nextStage: "rejected",
      comment,
    };
    const ok = await doStagePatch(row.id, body);
    setActionLoading(false);
    if (!ok) return alert("Failed to reject.");
    setPage(1);
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  };

  const returnWithComment = async (row, comment, suggestedAmount) => {
    if (!canActOnRow(row)) return;
    if (!comment?.trim()) return alert("Please enter a comment.");
    setActionLoading(true);
    const body = {
      action: "return",
      fromStage: row.stage || row.status || "submitted",
      nextStage: "returned_with_comment",
      comment,
      suggestedAmount: suggestedAmount || undefined,
    };
    const ok = await doStagePatch(row.id, body);
    setActionLoading(false);
    if (!ok) return alert("Failed to return with comment.");
    setPage(1);
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  };

  /* ----- columns / sort ----- */
  const onSort = (key) => {
    if (sort === key) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSort(key);
      setDir("asc");
    }
  };

  const pageFrom = useMemo(() => (total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1), [page, total]);
  const pageTo = useMemo(() => Math.min(page * PAGE_SIZE, total), [page, total]);

  /* ----- clear filters ----- */
  const clearFilters = () => {
    setQ("");
    setStage(
      role === "compliance" ? "compliance_review" : role === "branch_manager" ? "manager_review" : "submitted"
    );
    setProductId("");
    setBranchId("");
    setOfficerId("");
    setPage(1);
  };

  return (
    <div className={ui.wrap}>
      {/* Hide native select arrows to avoid double icons */}
      <style>{`
        select.ms-select {
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          background-image: none !important;
        }
        select.ms-select::-ms-expand { display: none; }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className={ui.h1}>Loan Review Queue</h1>
          <p className={ui.sub}>
            {role === "branch_manager"
              ? "Approve/return applications to Compliance."
              : role === "compliance"
              ? "Compliance checks for policy/legal, then approve or return."
              : "Review and route loan applications by stage."}
          </p>
        </div>
        <Link to="/loans" className={ui.btn} title="Back to Loans">
          Back to Loans
        </Link>
      </div>

      {/* Filters */}
      <div className={`${ui.card} p-4 mb-5`}>
        <div className="flex items-center justify-between mb-3">
          <div className="inline-flex items-center gap-2 text-[var(--muted)] font-semibold">
            <Filter className="w-4 h-4" /> Filters
          </div>
          <button
            onClick={clearFilters}
            className="text-sm underline decoration-[var(--border)] hover:decoration-[var(--fg)]"
          >
            Clear all
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          <TextField
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search borrower, phone, product, loan #"
            leadingIcon={<Search className={ui.fieldIcon} />}
            className="xl:col-span-2"
          />

          <SelectField
            value={stage}
            onChange={(e) => {
              setStage(e.target.value);
              setPage(1);
            }}
            aria-label="Stage"
          >
            {STAGES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </SelectField>

          <SelectField
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value);
              setPage(1);
            }}
            aria-label="Product"
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </SelectField>

          <div className="grid grid-cols-2 gap-3">
            <SelectField
              value={branchId}
              onChange={(e) => {
                setBranchId(e.target.value);
                setPage(1);
              }}
              aria-label="Branch"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={officerId}
              onChange={(e) => {
                setOfficerId(e.target.value);
                setPage(1);
              }}
              aria-label="Officer"
            >
              <option value="">All Officers</option>
              {officers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name || o.email}
                </option>
              ))}
            </SelectField>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className={ui.card}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <Th label="Submitted" sortKey="createdAt" sort={sort} dir={dir} onSort={onSort} />
                <Th label="Borrower" sortKey="borrowerName" sort={sort} dir={dir} onSort={onSort} />
                <Th label="Product" sortKey="productName" sort={sort} dir={dir} onSort={onSort} />
                <Th label="Principal" sortKey="amount" sort={sort} dir={dir} onSort={onSort} />
                <Th label="Officer" sortKey="officerName" sort={sort} dir={dir} onSort={onSort} />
                <Th label="Branch" sortKey="branchName" sort={sort} dir={dir} onSort={onSort} />
                <Th label="Stage" sortKey="stage" sort={sort} dir={dir} onSort={onSort} />
                <th className={`${ui.th} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className={`${ui.td} text-center py-10 text-[var(--muted)]`}>
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className={`${ui.td} text-center py-10 text-[var(--muted)]`}>
                    No applications found.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="hover:bg-[var(--kpi-bg)]">
                    <td className={ui.td}>{fmtDate(r.createdAt)}</td>
                    <td className={ui.td}>
                      <Link
                        to={`/borrowers/${r.borrowerId}`}
                        className="underline decoration-2 underline-offset-2 text-[var(--fg)] hover:opacity-90"
                      >
                        {r.Borrower?.name || r.borrowerName || "—"}
                      </Link>
                      <div className="text-xs text-[var(--muted)]">
                        {r.loanNumber ? `Loan #${r.loanNumber}` : ""}
                      </div>
                    </td>
                    <td className={ui.td}>{r.Product?.name || r.productName || "—"}</td>
                    <td className={ui.td}>{money(r.amount, r.currency || "TZS")}</td>
                    <td className={ui.td}>{r.officerName || "—"}</td>
                    <td className={ui.td}>{r.branchName || "—"}</td>
                    <td className={ui.td}>
                      <span className={ui.chip} style={statusStyle(r.stage || r.status)}>
                        {(r.stage || r.status || "—").replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className={`${ui.td} text-right`}>
                      <div className="inline-flex gap-1">
                        <Link to={`/loans/${r.id}`} className={ui.btn + " text-xs px-2 py-1"}>
                          View
                        </Link>

                        {canActOnRow(r) && (
                          <>
                            {/* Approve */}
                            <button
                              className={`px-2 py-1 text-xs rounded border-2 inline-flex items-center gap-1
                                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]`}
                              style={{
                                background: "var(--success, #22c55e)",
                                color: "var(--on-success, var(--primary-contrast))",
                                borderColor: "var(--success-strong, var(--success-border, #16a34a))",
                              }}
                              onClick={() => setModal({ type: "approve", row: r })}
                            >
                              <Check className="w-3.5 h-3.5" /> Approve
                            </button>

                            {/* Return */}
                            <button
                              className={`px-2 py-1 text-xs rounded border-2 inline-flex items-center gap-1
                                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]`}
                              style={{
                                background: "var(--warn, #f59e0b)",
                                color: "var(--on-warn, var(--primary-contrast))",
                                borderColor: "var(--warn-strong, var(--warn-border, #d97706))",
                              }}
                              onClick={() => setModal({ type: "return", row: r })}
                            >
                              <CornerUpLeft className="w-3.5 h-3.5" /> Return
                            </button>

                            {/* Reject */}
                            <button
                              className={`px-2 py-1 text-xs rounded border-2 inline-flex items-center gap-1
                                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]`}
                              style={{
                                background: "var(--danger, #ef4444)",
                                color: "var(--on-danger, var(--primary-contrast))",
                                borderColor: "var(--danger-strong, var(--danger-border, #dc2626))",
                              }}
                              onClick={() => setModal({ type: "reject", row: r })}
                            >
                              <XIcon className="w-3.5 h-3.5" /> Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-3 py-2 border-t-2 border-[var(--border-strong)] text-sm">
          <div className="text-[var(--muted)]">
            {pageFrom}–{pageTo} of {total}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`p-1 border-2 border-[var(--border-strong)] bg-[var(--card)] rounded disabled:opacity-50
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]`}
              title="Previous page"
            >
              <ChevronLeft className={ui.btnIcon} />
            </button>
            <button
              onClick={() => setPage((p) => (p * PAGE_SIZE < total ? p + 1 : p))}
              disabled={page * PAGE_SIZE >= total}
              className={`p-1 border-2 border-[var(--border-strong)] bg-[var(--card)] rounded disabled:opacity-50
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]`}
              title="Next page"
            >
              <ChevronRight className={ui.btnIcon} />
            </button>
          </div>
        </div>
      </div>

      {/* Action modal */}
      {modal && (
        <ActionModal
          type={modal.type}
          row={modal.row}
          role={role}
          busy={actionLoading}
          onClose={() => setModal(null)}
          onApprove={approve}
          onReject={reject}
          onReturn={returnWithComment}
        />
      )}
    </div>
  );
}

/* ---------- tiny subcomponents ---------- */

const Th = ({ label, sortKey, sort, dir, onSort }) => {
  const active = sort === sortKey;
  return (
    <th
      className={`${ui.th} cursor-pointer`}
      onClick={() => onSort(sortKey)}
      title="Sort"
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <span className={`inline-flex items-center gap-1 ${active ? "text-[var(--ring)]" : ""}`}>
        {label}
        {active ? (dir === "asc" ? "▲" : "▼") : ""}
      </span>
    </th>
  );
};

function ActionModal({ type, row, role, busy, onClose, onApprove, onReject, onReturn }) {
  const [comment, setComment] = useState("");
  const [suggestedAmount, setSuggestedAmount] = useState("");

  const title =
    type === "approve"
      ? "Approve Application"
      : type === "reject"
      ? "Reject Application"
      : "Return with Comment";

  // Branch managers can suggest amount on approve/return
  const showSuggestedAmount =
    role === "branch_manager" && (type === "approve" || type === "return");

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div
        className="absolute inset-0"
        onClick={onClose}
        style={{ background: "var(--overlay, rgba(0,0,0,.40))" }}
      />
      <div className={`relative ${ui.card} w-[95%] max-w-lg p-4`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg"> {title} </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--kpi-bg)]" title="Close">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="text-sm">
            <div>
              <span className="text-[var(--muted)]">Borrower:</span>{" "}
              {row.Borrower?.name || row.borrowerName || "—"}
            </div>
            <div>
              <span className="text-[var(--muted)]">Product:</span>{" "}
              {row.Product?.name || row.productName || "—"}
            </div>
            <div>
              <span className="text-[var(--muted)]">Amount:</span>{" "}
              {money(row.amount, row.currency || "TZS")}
            </div>
          </div>

          {showSuggestedAmount && (
            <div>
              <label className="text-xs text-[var(--muted)]">Suggested Amount (optional)</label>
              <input
                type="number"
                className={ui.fieldBase}
                placeholder="e.g. 500000"
                value={suggestedAmount}
                onChange={(e) => setSuggestedAmount(e.target.value)}
              />
              <p className="text-[11px] text-[var(--muted)] mt-1">
                Branch Manager can suggest a different principal before forwarding to Compliance.
              </p>
            </div>
          )}

          {type !== "approve" && (
            <div>
              <label className="text-xs text-[var(--muted)]">Comment</label>
              <textarea
                className={`${ui.fieldBase} min-h-[96px]`}
                placeholder={type === "reject" ? "Reason for rejection…" : "What needs to be updated…"}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className={ui.btn}>
            Cancel
          </button>

          {type === "approve" && (
            <button
              disabled={busy}
              onClick={() => onApprove(row, suggestedAmount)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg disabled:opacity-60"
              style={{
                background: "var(--success, #22c55e)",
                color: "var(--on-success, var(--primary-contrast))",
                border: "2px solid var(--success-strong, var(--success-border, #16a34a))",
              }}
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} Approve
            </button>
          )}

          {type === "return" && (
            <button
              disabled={busy}
              onClick={() => onReturn(row, comment, suggestedAmount)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg disabled:opacity-60"
              style={{
                background: "var(--warn, #f59e0b)",
                color: "var(--on-warn, var(--primary-contrast))",
                border: "2px solid var(--warn-strong, var(--warn-border, #d97706))",
              }}
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} Return
            </button>
          )}

          {type === "reject" && (
            <button
              disabled={busy}
              onClick={() => onReject(row, comment)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg disabled:opacity-60"
              style={{
                background: "var(--danger, #ef4444)",
                color: "var(--on-danger, var(--primary-contrast))",
                border: "2px solid var(--danger-strong, var(--danger-border, #dc2626))",
              }}
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} Reject
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
