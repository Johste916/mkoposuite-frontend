import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import {
  Filter, Search, ChevronLeft, ChevronRight, Check, X as XIcon, CornerUpLeft, Loader2,
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

const statusBadge = (stage) =>
  stage === "approved"
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
    : stage === "rejected"
    ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
    : stage === "returned_with_comment"
    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
    : "bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300";

/* ---------- helpers ---------- */
const money = (v, c = "TZS") => `\u200e${c} ${Number(v || 0).toLocaleString()}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");

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
          api
            .get("/users", { params: { role: "loan_officer" } })
            .catch(() => ({ data: [] })),
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
        const items =
          res.data?.items || (Array.isArray(res.data) ? res.data : []);
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
    if (role === "compliance" || role === "admin" || role === "director")
      return "approved";
    if (curStage === "manager_review") return "compliance_review";
    return "approved";
  };

  const canActOnRow = (r) => {
    const s = (r.stage || r.status || "").toLowerCase();
    if (role === "branch_manager")
      return s === "manager_review" || s === "submitted" || !s;
    if (role === "compliance") return s === "compliance_review";
    if (role === "admin" || role === "director")
      return s === "manager_review" ||
        s === "compliance_review" ||
        s === "submitted";
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

  const pageFrom = useMemo(
    () => (total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1),
    [page, total]
  );
  const pageTo = useMemo(
    () => Math.min(page * PAGE_SIZE, total),
    [page, total]
  );

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Loan Review Queue</h1>
          <p className="text-sm muted">
            {role === "branch_manager"
              ? "Approve/return applications to Compliance."
              : role === "compliance"
              ? "Compliance checks for policy/legal, then approve or return."
              : "Review and route loan applications by stage."}
          </p>
        </div>
        <Link
          to="/loans"
          className="text-indigo-600 hover:underline text-sm"
        >
          Back to Loans
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-3 md:p-4 mb-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search borrower, phone, product, loan #"
              className="input pl-9 pr-3 py-2"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              value={stage}
              onChange={(e) => {
                setStage(e.target.value);
                setPage(1);
              }}
              className="input"
            >
              {STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <select
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                setPage(1);
              }}
              className="input"
            >
              <option value="">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              value={branchId}
              onChange={(e) => {
                setBranchId(e.target.value);
                setPage(1);
              }}
              className="input"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <select
              value={officerId}
              onChange={(e) => {
                setOfficerId(e.target.value);
                setPage(1);
              }}
              className="input"
            >
              <option value="">All Officers</option>
              {officers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name || o.email}
                </option>
              ))}
            </select>
            <div className="hidden lg:flex items-center muted text-sm px-2">
              <Filter className="w-4 h-4 mr-1" /> Filters
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-[var(--fg)]">
              <tr>
                <Th
                  label="Submitted"
                  sortKey="createdAt"
                  sort={sort}
                  dir={dir}
                  onSort={onSort}
                />
                <Th
                  label="Borrower"
                  sortKey="borrowerName"
                  sort={sort}
                  dir={dir}
                  onSort={onSort}
                />
                <Th
                  label="Product"
                  sortKey="productName"
                  sort={sort}
                  dir={dir}
                  onSort={onSort}
                />
                <Th
                  label="Principal"
                  sortKey="amount"
                  sort={sort}
                  dir={dir}
                  onSort={onSort}
                />
                <Th
                  label="Officer"
                  sortKey="officerName"
                  sort={sort}
                  dir={dir}
                  onSort={onSort}
                />
                <Th
                  label="Branch"
                  sortKey="branchName"
                  sort={sort}
                  dir={dir}
                  onSort={onSort}
                />
                <Th
                  label="Stage"
                  sortKey="stage"
                  sort={sort}
                  dir={dir}
                  onSort={onSort}
                />
                <th className="px-3 py-2 text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center muted"
                  >
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center muted"
                  >
                    No applications found.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-[var(--border)] hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    <td className="px-4 py-2">{fmtDate(r.createdAt)}</td>
                    <td className="px-4 py-2">
                      <Link
                        to={`/borrowers/${r.borrowerId}`}
                        className="text-indigo-600 hover:underline"
                      >
                        {r.Borrower?.name || r.borrowerName || "—"}
                      </Link>
                      <div className="text-xs muted">
                        {r.loanNumber ? `Loan #${r.loanNumber}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      {r.Product?.name || r.productName || "—"}
                    </td>
                    <td className="px-4 py-2">
                      {money(r.amount, r.currency || "TZS")}
                    </td>
                    <td className="px-4 py-2">{r.officerName || "—"}</td>
                    <td className="px-4 py-2">{r.branchName || "—"}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-0.5 text-xs rounded ${statusBadge(
                          (r.stage || r.status || "").toLowerCase()
                        )}`}
                      >
                        {(r.stage || r.status || "—").replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="inline-flex gap-1">
                        <Link
                          to={`/loans/${r.id}`}
                          className="px-2 py-1 text-xs rounded border border-[var(--border)] hover:bg-gray-50 dark:hover:bg-slate-800"
                        >
                          View
                        </Link>
                        {canActOnRow(r) && (
                          <>
                            <button
                              className="px-2 py-1 text-xs rounded border border-[var(--border)] bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-1"
                              onClick={() =>
                                setModal({ type: "approve", row: r })
                              }
                            >
                              <Check className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              className="px-2 py-1 text-xs rounded border border-[var(--border)] bg-amber-600 text-white hover:bg-amber-700 inline-flex items-center gap-1"
                              onClick={() =>
                                setModal({ type: "return", row: r })
                              }
                            >
                              <CornerUpLeft className="w-3.5 h-3.5" /> Return
                            </button>
                            <button
                              className="px-2 py-1 text-xs rounded border border-[var(--border)] bg-rose-600 text-white hover:bg-rose-700 inline-flex items-center gap-1"
                              onClick={() =>
                                setModal({ type: "reject", row: r })
                              }
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
        <div className="flex items-center justify-between px-3 py-2 border-t border-[var(--border)] text-sm">
          <div className="muted">
            {pageFrom}–{pageTo} of {total}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1 border border-[var(--border)] rounded disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() =>
                setPage((p) => (p * PAGE_SIZE < total ? p + 1 : p))
              }
              disabled={page * PAGE_SIZE >= total}
              className="p-1 border border-[var(--border)] rounded disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
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
      className="px-3 py-2 cursor-pointer select-none"
      onClick={() => onSort(sortKey)}
      title="Sort"
    >
      <span
        className={`inline-flex items-center gap-1 ${
          active ? "text-indigo-700" : ""
        }`}
      >
        {label}
        {active ? (dir === "asc" ? "▲" : "▼") : ""}
      </span>
    </th>
  );
};

function ActionModal({
  type,
  row,
  role,
  busy,
  onClose,
  onApprove,
  onReject,
  onReturn,
}) {
  const [comment, setComment] = useState("");
  const [suggestedAmount, setSuggestedAmount] = useState("");

  const title =
    type === "approve"
      ? "Approve Application"
      : type === "reject"
      ? "Reject Application"
      : "Return with Comment";

  const showSuggestedAmount =
    role === "branch_manager" && (type === "approve" || type === "return");

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative card w-[95%] max-w-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-50 dark:hover:bg-slate-800"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="text-sm">
            <div>
              <span className="muted">Borrower:</span>{" "}
              {row.Borrower?.name || row.borrowerName || "—"}
            </div>
            <div>
              <span className="muted">Product:</span>{" "}
              {row.Product?.name || row.productName || "—"}
            </div>
            <div>
              <span className="muted">Amount:</span>{" "}
              {money(row.amount, row.currency || "TZS")}
            </div>
          </div>

          {showSuggestedAmount && (
            <div>
              <label className="text-xs muted">Suggested Amount (optional)</label>
              <input
                type="number"
                className="input"
                placeholder="e.g. 500000"
                value={suggestedAmount}
                onChange={(e) => setSuggestedAmount(e.target.value)}
              />
              <p className="text-[11px] muted mt-1">
                Branch Manager can suggest a different principal before forwarding
                to Compliance.
              </p>
            </div>
          )}

          {type !== "approve" && (
            <div>
              <label className="text-xs muted">Comment</label>
              <textarea
                className="input min-h-[96px]"
                placeholder={
                  type === "reject"
                    ? "Reason for rejection…"
                    : "What needs to be updated…"
                }
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded border border-[var(--border)]">
            Cancel
          </button>

          {type === "approve" && (
            <button
              disabled={busy}
              onClick={() => onApprove(row, suggestedAmount)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} Approve
            </button>
          )}

          {type === "return" && (
            <button
              disabled={busy}
              onClick={() => onReturn(row, comment, suggestedAmount)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} Return
            </button>
          )}

          {type === "reject" && (
            <button
              disabled={busy}
              onClick={() => onReject(row, comment)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} Reject
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
