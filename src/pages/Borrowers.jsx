import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PlusCircle, Upload, Search, Filter, X, Phone, Building2,
  ChevronLeft, ChevronRight, FileUp, IdCard
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";

const PAGE_SIZE = 10;
// Default phone country code (TZS in UI implies Tanzania)
const PHONE_CC = "+255";

/* ---------- Helpers for resilient APIs ---------- */
async function tryGET(paths = [], opts = {}) {
  let lastErr;
  for (const p of paths) {
    try {
      const res = await api.get(p, opts);
      return res?.data;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("No endpoint succeeded");
}

function toArray(maybe) {
  if (Array.isArray(maybe)) return maybe;
  if (Array.isArray(maybe?.items)) return maybe.items;
  if (Array.isArray(maybe?.rows)) return maybe.rows;
  if (Array.isArray(maybe?.data)) return maybe.data;
  return [];
}

/* ---------- Phone formatting ---------- */
export function formatPhoneDisplay(raw, cc = PHONE_CC) {
  if (!raw) return "—";
  let s = String(raw).trim();
  // strip spaces & dashes
  s = s.replace(/[\s-]/g, "");
  // already E.164-ish
  if (s.startsWith("+")) return s;
  // if starts with country digits, prefix +
  if (cc && s.startsWith(cc.replace("+", ""))) return `+${s}`;
  // local leading zero -> country code without that 0
  if (cc && s.startsWith("0")) return `${cc}${s.slice(1)}`;
  // else just prefix +
  return s.startsWith("+") ? s : `+${s}`;
}

/* ---------- Token-based UI utilities ---------- */
const ui = {
  container: "p-6 min-h-screen bg-[var(--bg)] text-[var(--fg)]",
  card: "rounded-2xl border-2 border-[var(--border-strong)] bg-[var(--card)] shadow",
  softCard: "rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm",
  btn:
    "inline-flex items-center gap-2 px-3 py-2 rounded-md border-2 " +
    "border-[var(--border-strong)] bg-[var(--card)] text-[var(--fg)] " +
    "hover:bg-[var(--kpi-bg)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
  primary:
    "inline-flex items-center gap-2 px-3 py-2 rounded-md font-semibold " +
    "bg-indigo-600 text-white hover:bg-indigo-700 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
  input:
    "w-full h-10 rounded-md px-3 py-2 border-2 " +
    "bg-[var(--input-bg)] text-[var(--input-fg)] border-[var(--input-border)] " +
    "placeholder:text-[var(--input-placeholder)] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
  table:
    "min-w-full text-[15px] border-separate border-spacing-0",
  th:
    "px-3 py-2 text-left text-[13px] uppercase tracking-wide font-semibold " +
    "bg-[var(--table-head-bg)] text-[var(--fg)] " +
    "border border-[var(--border)] first:border-l-0 last:border-r-0",
  td:
    "px-3 py-2 border border-[var(--border)] first:border-l-0 last:border-r-0",
  link:
    "font-semibold underline decoration-2 underline-offset-2 rounded-sm " +
    "text-[var(--ring)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
  chip:
    "inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border " +
    "bg-[var(--badge-bg)] text-[var(--badge-fg)] border-[var(--border)]",
  muted: "text-[var(--muted)]",
};

const strongLink = ui.link;

const Borrowers = () => {
  const navigate = useNavigate();

  // Data
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  // Filters
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [branchId, setBranchId] = useState("");
  const [officerId, setOfficerId] = useState("");
  const [status, setStatus] = useState(""); // active, inactive, blacklisted, pending_kyc
  const [sort, setSort] = useState("createdAt");
  const [dir, setDir] = useState("desc");

  // Pagination
  const [page, setPage] = useState(1);

  // Refs
  const [branches, setBranches] = useState([]);
  const [officers, setOfficers] = useState([]);

  // UI
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState(null); // borrower id
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState("overview");
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerData, setDrawerData] = useState({ overview: null, loans: [], savings: [], documents: [] });

  // CSV import
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState([]);
  const pushToast = (msg, type = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  };

  // Debounce search
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q]);

  // Load filter refs (resilient to missing endpoints/paths)
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const [b, u] = await Promise.all([
          tryGET(["/branches", "/org/branches", "/api/branches"], { signal: ac.signal }).catch(() => []),
          tryGET(
            ["/users?role=loan_officer", "/staff?role=loan_officer", "/api/users?role=loan_officer"],
            { signal: ac.signal }
          ).catch(() => []),
        ]);

        const bArr = toArray(b);
        const uArr = toArray(u);

        setBranches(
          bArr
            .map((x) =>
              x
                ? {
                    id: x.id ?? x._id ?? x.branchId ?? String(x.code ?? ""),
                    name: x.name ?? x.branchName ?? `Branch ${x.id ?? x.code ?? ""}`,
                  }
                : null
            )
            .filter(Boolean)
        );

        setOfficers(
          uArr
            .map((x) =>
              x
                ? {
                    id: x.id ?? x._id ?? x.userId ?? x.email ?? String(Math.random()),
                    name: x.name ?? x.fullName ?? x.email ?? "User",
                    email: x.email,
                  }
                : null
            )
            .filter(Boolean)
        );
      } catch {
        setBranches([]);
        setOfficers([]);
      }
    })();
    return () => ac.abort();
  }, []);

  // Fetch list (resilient to API shape)
  const fetchList = useCallback(
    async (signal) => {
      setLoading(true);
      try {
        const res = await api.get("/borrowers", {
          signal,
          params: {
            q: debouncedQ || undefined,
            branchId: branchId || undefined,
            officerId: officerId || undefined,
            status: status || undefined,
            page,
            pageSize: PAGE_SIZE,
            sort,
            dir,
          },
        });

        let list = [];
        let count = 0;
        if (Array.isArray(res.data)) {
          list = res.data;
          count = res.data.length;
        } else {
          list = res.data?.items || res.data?.rows || res.data?.data || [];
          count = Number(res.data?.total ?? list.length ?? 0);
        }

        setRows(list);
        setTotal(count);
      } catch (e) {
        pushToast("Failed to load borrowers", "error");
        setRows([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [debouncedQ, branchId, officerId, status, page, sort, dir]
  );

  useEffect(() => {
    const ac = new AbortController();
    fetchList(ac.signal);
    return () => ac.abort();
  }, [fetchList]);

  // Drawer loads
  const openDrawer = (borrowerId) => {
    setSelected(borrowerId);
    setDrawerTab("overview");
    setDrawerOpen(true);
  };

  const fetchDrawer = useCallback(
    async (tab, borrowerId, signal) => {
      setDrawerLoading(true);
      try {
        if (tab === "overview") {
          const res = await api.get(`/borrowers/${borrowerId}`, { signal });
          setDrawerData((d) => ({ ...d, overview: res.data || null }));
        } else if (tab === "loans") {
          const res = await api.get(`/borrowers/${borrowerId}/loans`, { signal });
          setDrawerData((d) => ({ ...d, loans: Array.isArray(res.data) ? res.data : res.data?.items || [] }));
        } else if (tab === "savings") {
          const res = await api.get(`/borrowers/${borrowerId}/savings`, { signal });
          setDrawerData((d) => ({ ...d, savings: Array.isArray(res.data) ? res.data : res.data?.items || [] }));
        } else if (tab === "documents") {
          const res = await api.get(`/borrowers/${borrowerId}/documents`, { signal }).catch(() => ({ data: [] }));
          setDrawerData((d) => ({ ...d, documents: Array.isArray(res?.data) ? res.data : res?.data?.items || [] }));
        }
      } catch (e) {
        pushToast("Failed to load borrower details", "error");
      } finally {
        setDrawerLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!drawerOpen || !selected) return;
    const ac = new AbortController();
    fetchDrawer(drawerTab, selected, ac.signal);
    return () => ac.abort();
  }, [drawerOpen, drawerTab, selected, fetchDrawer]);

  // Sorting
  const onSort = (key) => {
    if (sort === key) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSort(key);
      setDir("asc");
    }
  };

  // Helpers
  const fmtMoney = (v) => `TZS ${Number(v || 0).toLocaleString()}`;
  const pageFrom = useMemo(() => (total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1), [page, total]);
  const pageTo = useMemo(() => Math.min(page * PAGE_SIZE, total), [page, total]);

  const displayName = (b) => b?.name || `${b?.firstName || ""} ${b?.lastName || ""}`.trim() || "—";
  const displayBranch = (b) => b?.branchName || b?.Branch?.name || b?.branch?.name || "—";
  const displayOfficer = (b) => b?.officerName || b?.officer?.name || b?.loanOfficer?.name || "—";

  const getInitials = (full) => {
    const s = (full || "").trim();
    if (!s) return "U";
    const parts = s.split(/\s+/).filter(Boolean);
    const letters = (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
    return letters.toUpperCase() || s[0].toUpperCase();
  };

  const statusChip = (s) => {
    return ui.chip;
  };

  /* ---------- CSV Import ---------- */
  const onPickCSV = () => fileInputRef.current?.click();
  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) {
      pushToast("Please choose a .csv file", "error");
      return;
    }
    try {
      setImporting(true);
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("/borrowers/import", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const count = res?.data?.count ?? 0;
      pushToast(`Imported ${count} borrower${count === 1 ? "" : "s"}.`, "info");
      // refresh list
      const ac = new AbortController();
      fetchList(ac.signal);
    } catch (err) {
      const msg = err?.response?.data?.error || "Import failed";
      pushToast(msg, "error");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className={ui.container}>
      {/* Toasts (token skin) */}
      <div className="fixed right-4 top-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="px-3 py-2 rounded-md shadow text-sm border-2"
            style={{
              background: "var(--card)",
              color: "var(--fg)",
              borderColor: "var(--border-strong)",
            }}
          >
            {t.msg}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl md:text-3xl font-extrabold">👥 Borrowers</h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/borrowers/add")}
            className={ui.primary}
          >
            <PlusCircle className="w-4 h-4" /> Add Borrower
          </button>
          <button
            onClick={onPickCSV}
            className={ui.btn}
            disabled={importing}
            title="Import .csv with columns: name, phone, nationalId (optional)"
          >
            <Upload className="w-4 h-4" /> {importing ? "Importing…" : "Import CSV"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
      </div>

      {/* Filters */}
      <div className={`${ui.card} p-3 md:p-4 mb-4`}>
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <Search className={`w-4 h-4 ${ui.muted} absolute left-3 top-1/2 -translate-y-1/2`} />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, phone, national ID…"
              className={`${ui.input} pl-9`}
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <div className="min-w-[200px]">
              <select
                value={branchId}
                onChange={(e) => {
                  setBranchId(e.target.value);
                  setPage(1);
                }}
                className={ui.input}
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-[200px]">
              <select
                value={officerId}
                onChange={(e) => {
                  setOfficerId(e.target.value);
                  setPage(1);
                }}
                className={ui.input}
              >
                <option value="">All Officers</option>
                {officers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name || o.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-[180px]">
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className={ui.input}
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending_kyc">Pending KYC</option>
                <option value="blacklisted">Blacklisted</option>
              </select>
            </div>

            <div className={`hidden md:flex items-center text-sm px-2 ${ui.muted}`}>
              <Filter className="w-4 h-4 mr-1" /> Filters
            </div>
          </div>
        </div>
      </div>

      {/* Table / Cards */}
      <div className={`${ui.card}`}>
        <div className="overflow-x-auto">
          {/* Desktop table */}
          <table className={`${ui.table} hidden md:table`}>
            <thead>
              <tr>
                <Th label="Name" sortKey="name" sort={sort} dir={dir} onSort={onSort} />
                <Th label="Phone" sortKey="phone" sort={sort} dir={dir} onSort={onSort} />
                <Th label="Branch" sortKey="branchName" sort={sort} dir={dir} onSort={onSort} />
                <Th label="Officer" sortKey="officerName" sort={sort} dir={dir} onSort={onSort} />
                <Th label="Outstanding" sortKey="outstanding" sort={sort} dir={dir} onSort={onSort} />
                <Th label="Status" sortKey="status" sort={sort} dir={dir} onSort={onSort} />
                <th className="px-3 py-2 text-right pr-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className={`px-4 py-10 text-center ${ui.muted}`}>Loading…</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`px-4 py-10 text-center ${ui.muted}`}>No borrowers.</td>
                </tr>
              ) : (
                rows.map((b) => (
                  <tr
                    key={b.id}
                    className="border-t border-[var(--border)] hover:bg-[var(--kpi-bg)]"
                  >
                    <td className={ui.td}>{displayName(b)}</td>
                    <td className={ui.td}>{formatPhoneDisplay(b.phone)}</td>
                    <td className={ui.td}>{displayBranch(b)}</td>
                    <td className={ui.td}>{displayOfficer(b)}</td>
                    <td className={ui.td}>{fmtMoney(b.outstanding)}</td>
                    <td className={ui.td}>
                      <span className={statusChip(b.status)}>{b.status || "—"}</span>
                    </td>
                    <td className={`${ui.td} text-right`}>
                      <div className="flex gap-3 justify-end">
                        <Link
                          to={`/borrowers/${encodeURIComponent(b.id)}`}
                          className={strongLink}
                        >
                          View
                        </Link>
                        <Link
                          to={`/loans/applications?borrowerId=${encodeURIComponent(b.id)}`}
                          className={strongLink}
                        >
                          New Loan
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Mobile / small screens — cards */}
          <div className="md:hidden grid grid-cols-1 gap-3 p-3">
            {loading ? (
              <div className={`p-6 text-center ${ui.muted}`}>Loading…</div>
            ) : rows.length === 0 ? (
              <div className={`p-6 text-center ${ui.muted}`}>No borrowers.</div>
            ) : (
              rows.map((b) => {
                const name = displayName(b);
                return (
                  <div key={b.id} className="rounded-xl border-2 border-[var(--border-strong)] bg-[var(--card)] p-4 hover:shadow-md transition-shadow">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-full text-white flex items-center justify-center text-sm font-semibold shadow-sm"
                          style={{ background: "linear-gradient(135deg, var(--sb-start), var(--sb-end))" }}
                        >
                          {getInitials(name)}
                        </div>
                        <div>
                          <div className="text-base font-semibold">{name}</div>
                          <div className={`text-xs ${ui.muted}`}>ID: {b.id}</div>
                        </div>
                      </div>
                      <span className={statusChip(b.status)}>{b.status || "—"}</span>
                    </div>

                    {/* Body */}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Phone className={`w-4 h-4 ${ui.muted}`} />
                        <span>{formatPhoneDisplay(b.phone)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building2 className={`w-4 h-4 ${ui.muted}`} />
                        <span className="truncate">{displayBranch(b)}</span>
                      </div>
                      <div className="col-span-2">
                        <span className={`text-xs ${ui.muted}`}>Outstanding</span>
                        <div className="text-sm font-medium">{fmtMoney(b.outstanding)}</div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex items-center justify-end gap-2">
                      <Link
                        to={`/borrowers/${encodeURIComponent(b.id)}`}
                        className={ui.btn}
                      >
                        View
                      </Link>
                      <Link
                        to={`/loans/applications?borrowerId=${encodeURIComponent(b.id)}`}
                        className={ui.primary}
                      >
                        New Loan
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Pagination */}
        <div
          className="flex items-center justify-between px-3 py-2 rounded-b-xl border-t"
          style={{
            background: "var(--table-foot-bg)",
            borderColor: "var(--border-strong)",
          }}
        >
          <div className={ui.muted}>
            {pageFrom}–{pageTo} of {total}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`${ui.btn} p-2 disabled:opacity-50`}
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => (p * PAGE_SIZE < total ? p + 1 : p))}
              disabled={page * PAGE_SIZE >= total}
              className={`${ui.btn} p-2 disabled:opacity-50`}
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Drawer: Borrower Details (kept for compatibility) */}
      {drawerOpen && (
        <Drawer onClose={() => setDrawerOpen(false)} title="Borrower Details">
          {/* Tabs */}
          <div className="flex gap-2 border-b mb-3 border-[var(--border)]">
            {["overview", "loans", "savings", "documents"].map((t) => (
              <button
                key={t}
                onClick={() => setDrawerTab(t)}
                className={`px-3 py-2 text-sm border-b-2 -mb-px ${
                  drawerTab === t
                    ? "border-indigo-600 text-indigo-600 font-semibold"
                    : "border-transparent text-[var(--muted)]"
                } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]`}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div>
            {drawerLoading ? (
              <div className={`${ui.muted} text-sm`}>Loading…</div>
            ) : drawerTab === "overview" ? (
              <OverviewTab data={drawerData.overview} />
            ) : drawerTab === "loans" ? (
              <LoansTab items={drawerData.loans} />
            ) : drawerTab === "savings" ? (
              <SavingsTab items={drawerData.savings} />
            ) : (
              <DocumentsTab items={drawerData.documents} />
            )}
          </div>
        </Drawer>
      )}
    </div>
  );
};

/* ---------- Subcomponents ---------- */

const Th = ({ label, sortKey, sort, dir, onSort }) => {
  const active = sort === sortKey;
  return (
    <th
      className={`${ui.th} cursor-pointer select-none`}
      onClick={() => onSort(sortKey)}
      title="Sort"
    >
      <span className={`inline-flex items-center gap-1 ${active ? "text-indigo-700 font-semibold" : ""}`}>
        {label}
        {active ? (dir === "asc" ? "▲" : "▼") : ""}
      </span>
    </th>
  );
};

const Drawer = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[60]">
    <div className="absolute inset-0 bg-black/30" onClick={onClose} />
    <div
      className="absolute right-0 top-0 h-full w-full sm:w-[620px] shadow-2xl p-4 overflow-y-auto rounded-l-2xl border-l-2"
      style={{
        background: "var(--card)",
        color: "var(--fg)",
        borderColor: "var(--border-strong)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-[var(--kpi-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          aria-label="Close drawer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const OverviewTab = ({ data }) => {
  if (!data) return <p className={`${ui.muted} text-sm`}>No overview data.</p>;
  const name = data.name || `${data.firstName || ""} ${data.lastName || ""}`.trim() || "—";
  const branch = data.branchName || data.Branch?.name || data.branch?.name || "—";
  const officer = data.officerName || data.officer?.name || data.loanOfficer?.name || "—";
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <InfoCard label="Full Name" value={name} />
        <InfoCard label="Phone" value={formatPhoneDisplay(data.phone)} />
        <InfoCard label="Branch" value={branch} />
        <InfoCard label="Loan Officer" value={officer} />
        <InfoCard label="Status" value={data.status || "—"} />
        <InfoCard label="National ID" value={data.nationalId || "—"} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Outstanding Loan" value={fmt("outstandingLoan", data)} />
        <Stat label="Outstanding Interest" value={fmt("outstandingInterest", data)} />
        <Stat label="Net Savings" value={fmt("netSavings", data)} />
      </div>
    </div>
  );
};

const fmt = (k, data) => `TZS ${Number(data?.[k] || 0).toLocaleString()}`;

const LoansTab = ({ items }) => {
  if (!Array.isArray(items) || items.length === 0) {
    return <p className={`${ui.muted} text-sm`}>No loans.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th className={ui.th}>Loan #</th>
            <th className={ui.th}>Product</th>
            <th className={ui.th}>Disbursed</th>
            <th className={ui.th}>Outstanding</th>
            <th className={ui.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((l) => (
            <tr key={l.id} className="border-t border-[var(--border)]">
              <td className={ui.td}>{l.id}</td>
              <td className={ui.td}>{l.product || "—"}</td>
              <td className={ui.td}>{`TZS ${Number(l.disbursed || 0).toLocaleString()}`}</td>
              <td className={ui.td}>{`TZS ${Number(l.outstanding || 0).toLocaleString()}`}</td>
              <td className={ui.td}>{l.status || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const SavingsTab = ({ items }) => {
  if (!Array.isArray(items) || items.length === 0) {
    return <p className={`${ui.muted} text-sm`}>No savings accounts.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th className={ui.th}>Account #</th>
            <th className={ui.th}>Balance</th>
            <th className={ui.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((s) => (
            <tr key={s.id} className="border-t border-[var(--border)]">
              <td className={ui.td}>{s.id}</td>
              <td className={ui.td}>{`TZS ${Number(s.balance || 0).toLocaleString()}`}</td>
              <td className={ui.td}>{s.status || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const DocumentsTab = ({ items }) => {
  return (
    <div>
      <div className="mb-3">
        <button
          onClick={() => alert("KYC upload coming soon")}
          className={ui.btn}
        >
          <FileUp className="w-4 h-4" /> Upload Document
        </button>
      </div>
      {!Array.isArray(items) || items.length === 0 ? (
        <p className={`${ui.muted} text-sm`}>No documents.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((d) => (
            <li key={d.id} className="flex items-center justify-between border-2 border-[var(--border-strong)] rounded-md px-3 py-2 bg-[var(--card)]">
              <div className="flex items-center gap-2">
                <IdCard className={`w-4 h-4 ${ui.muted}`} />
                <div>
                  <p className="text-sm font-medium">{d.fileName || d.name || "Document"}</p>
                  <p className={`text-xs ${ui.muted}`}>
                    {(d.type || "KYC")}{d.createdAt ? ` • ${new Date(d.createdAt).toLocaleString()}` : ""}
                  </p>
                </div>
              </div>
              {d.url && (
                <a
                  className={strongLink}
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/* Small UI helpers */
const InfoCard = ({ label, value }) => (
  <div className="border-2 border-[var(--border-strong)] rounded-lg p-3 bg-[var(--card)]">
    <p className={`text-xs ${ui.muted}`}>{label}</p>
    <p className="text-base font-semibold mt-1">{value}</p>
  </div>
);

const Stat = ({ label, value }) => (
  <div className="rounded-2xl p-4 border-2 border-[var(--border-strong)] bg-[var(--card)] shadow-sm">
    <p className={`text-xs ${ui.muted}`}>{label}</p>
    <p className="text-xl font-semibold mt-1">{value}</p>
  </div>
);

export default Borrowers;
