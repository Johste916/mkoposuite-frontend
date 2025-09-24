import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";

/* ------------------------------ small helpers ------------------------------ */
const fmtNum = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat().format(n);
};
const cls = (...xs) => xs.filter(Boolean).join(" ");

/* ------------------------------ Drawer (for view) -------------------------- */
function Drawer({ open, title, children, onClose, width = 520 }) {
  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && onClose?.();
    if (open) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden="true" />
      <aside
        className="fixed right-0 top-0 bottom-0 z-50 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl overflow-auto"
        style={{ width }}
        role="dialog"
        aria-modal="true"
      >
        <div className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-4 py-3">
          <div className="text-lg font-semibold">{title}</div>
        </div>
        <div className="p-4">{children}</div>
      </aside>
    </>
  );
}

/* --------------------------------- Page ----------------------------------- */
export default function LoanProducts() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // list UX
  const [q, setQ] = useState("");
  const [sort, setSort] = useState({ by: "name", dir: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // view drawer
  const [openView, setOpenView] = useState(false);
  const [viewItem, setViewItem] = useState(null);

  // initial + reload
  const load = async (signal) => {
    setLoading(true);
    try {
      const res = await api.get("/loan-products", { params: { q }, signal });
      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.items)
        ? res.data.items
        : res.data?.data || [];
      setItems(list);
    } catch (e) {
      if (e?.name !== "CanceledError") alert("Failed to load loan products.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const c = new AbortController();
    const id = setTimeout(() => load(c.signal), 240); // debounce search
    return () => {
      clearTimeout(id);
      c.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // sort + paginate
  const sorted = useMemo(() => {
    const arr = [...items];
    const { by, dir } = sort;
    arr.sort((a, b) => {
      const av = (a?.[by] ?? "").toString().toLowerCase();
      const bv = (b?.[by] ?? "").toString().toLowerCase();
      if (av < bv) return dir === "asc" ? -1 : 1;
      if (av > bv) return dir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [items, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  // actions
  const startCreate = () => navigate("/loans/products/new");
  const startEdit = (p) => navigate(`/loans/products/${p.id}/edit`);
  const startView = (p) => { setViewItem(p); setOpenView(true); };

  const toggle = async (p) => {
    if (!confirm(`Set "${p.name}" to ${p.status === "active" ? "inactive" : "active"}?`)) return;
    try {
      await api.patch(`/loan-products/${p.id}/toggle`);
      await load();
    } catch {
      alert("Failed to update status.");
    }
  };

  const remove = async (p) => {
    if (!confirm(`Delete product "${p.name}" permanently?`)) return;
    try {
      await api.delete(`/loan-products/${p.id}`);
      await load();
    } catch {
      alert("Failed to delete product.");
    }
  };

  const StatusBadge = ({ value }) => {
    const v = (value || "").toLowerCase();
    const styles =
      v === "active"
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
        : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    return <span className={cls("px-2 py-0.5 rounded text-xs font-medium", styles)}>{v || "—"}</span>;
  };

  const Th = ({ id, children, className }) => {
    const active = sort.by === id;
    const dir = active ? sort.dir : "asc";
    return (
      <th className={cls("p-2 border-b border-[var(--border)] text-left text-xs uppercase tracking-wide", className)}>
        <button
          className="inline-flex items-center gap-1 hover:underline"
          onClick={() =>
            setSort((s) =>
              s.by === id ? { by: id, dir: s.dir === "asc" ? "desc" : "asc" } : { by: id, dir: "asc" }
            )
          }
        >
          <span>{children}</span>
          {active && <span className="opacity-60">{dir === "asc" ? "▲" : "▼"}</span>}
        </button>
      </th>
    );
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Loan Products</h2>
          <p className="muted text-sm">Define the lending terms your team can use in applications.</p>
        </div>
        <button onClick={startCreate} className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700">
          New Product
        </button>
      </div>

      {/* Filters */}
      <div className="card p-3 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <input
          className="input md:w-96"
          placeholder="Search by name or code…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <div className="flex items-center gap-2">
          <label className="text-xs">
            Page size
            <select
              className="ml-2 input"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        {loading ? (
          <p className="p-4 muted">Loading…</p>
        ) : items.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-sm muted mb-3">No products found.</div>
            <button onClick={startCreate} className="px-3 py-2 rounded bg-indigo-600 text-white">
              Create your first product
            </button>
          </div>
        ) : (
          <>
            <table className="min-w-full text-sm">
              <thead className="text-[var(--fg)]">
                <tr>
                  <Th id="name">Name</Th>
                  <Th id="code">Code</Th>
                  <Th id="interestMethod">Method</Th>
                  <Th id="interestRate" className="text-right">Rate (%)</Th>
                  <th className="p-2 border-b border-[var(--border)] text-right">Principal Range</th>
                  <th className="p-2 border-b border-[var(--border)] text-right">Term Range</th>
                  <Th id="penaltyRate" className="text-right">Penalty (%)</Th>
                  <Th id="status">Status</Th>
                  <th className="p-2 border-b border-[var(--border)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--border)] hover:bg-gray-50 dark:hover:bg-slate-800">
                    <td className="px-2 py-2 font-medium">{p.name}</td>
                    <td className="px-2 py-2">{p.code}</td>
                    <td className="px-2 py-2">{p.interestMethod}</td>
                    <td className="px-2 py-2 text-right">{p.interestRate ?? "—"}</td>
                    <td className="px-2 py-2 text-right">
                      {p.minPrincipal != null ? fmtNum(p.minPrincipal) : "—"} –{" "}
                      {p.maxPrincipal != null ? fmtNum(p.maxPrincipal) : "—"}
                    </td>
                    <td className="px-2 py-2 text-right">
                      {p.minTermMonths ?? "—"} – {p.maxTermMonths ?? "—"} m
                    </td>
                    <td className="px-2 py-2 text-right">{p.penaltyRate ?? "—"}</td>
                    <td className="px-2 py-2">
                      <StatusBadge value={p.status} />
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-3 text-sm">
                        <button className="text-indigo-600 hover:underline" onClick={() => startView(p)}>View</button>
                        <button className="text-blue-600 hover:underline" onClick={() => startEdit(p)}>Edit</button>
                        <button className="text-amber-700 hover:underline" onClick={() => toggle(p)}>
                          {p.status === "active" ? "Deactivate" : "Activate"}
                        </button>
                        <button className="text-rose-600 hover:underline" onClick={() => remove(p)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-3 py-2">
              <div className="text-xs muted">
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} of {sorted.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={cls(
                    "px-3 py-1 rounded border text-sm",
                    page === 1
                      ? "opacity-50 cursor-not-allowed border-slate-200 dark:border-slate-800"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                  )}
                >
                  Prev
                </button>
                <div className="text-sm">{page} / {totalPages}</div>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={cls(
                    "px-3 py-1 rounded border text-sm",
                    page >= totalPages
                      ? "opacity-50 cursor-not-allowed border-slate-200 dark:border-slate-800"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                  )}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* View Drawer */}
      <Drawer open={openView} title="Product Details" onClose={() => setOpenView(false)} width={460}>
        {!viewItem ? (
          <div className="muted">No product selected.</div>
        ) : (
          <div className="space-y-4 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wide muted">Name</div>
              <div className="font-medium">{viewItem.name}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide muted">Code</div>
                <div>{viewItem.code}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide muted">Status</div>
                <span className="inline-block mt-1">
                  <span className="align-middle">
                    <StatusBadge value={viewItem.status} />
                  </span>
                </span>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide muted">Interest Method</div>
                <div>{viewItem.interestMethod}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide muted">Interest Rate (%)</div>
                <div>{viewItem.interestRate ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide muted">Penalty Rate (%)</div>
                <div>{viewItem.penaltyRate ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide muted">Term (months)</div>
                <div>
                  {viewItem.minTermMonths ?? "—"} – {viewItem.maxTermMonths ?? "—"}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-xs uppercase tracking-wide muted">Principal Range</div>
                <div>
                  {viewItem.minPrincipal != null ? fmtNum(viewItem.minPrincipal) : "—"} –{" "}
                  {viewItem.maxPrincipal != null ? fmtNum(viewItem.maxPrincipal) : "—"}
                </div>
              </div>
            </div>
            {viewItem.description && (
              <div>
                <div className="text-xs uppercase tracking-wide muted">Description</div>
                <div className="whitespace-pre-wrap">{viewItem.description}</div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
