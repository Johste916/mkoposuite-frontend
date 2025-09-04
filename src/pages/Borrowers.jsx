import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  PlusCircle, Upload, Search, Filter, X, Users, Phone, Building2,
  ChevronLeft, ChevronRight, FileUp, IdCard
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";

const PAGE_SIZE = 10;

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

  // Toasts
  const [toasts, setToasts] = useState([]);
  const pushToast = (msg, type = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };

  // Debounce search
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q]);

  // Load filter refs
  useEffect(() => {
    const ac = new AbortController();
    Promise.all([
      api.get("/branches", { signal: ac.signal }).catch(() => ({ data: [] })),
      api.get("/users", { params: { role: "loan_officer" }, signal: ac.signal }).catch(() => ({ data: [] })),
    ])
      .then(([b, u]) => {
        setBranches(Array.isArray(b.data) ? b.data : []);
        setOfficers(Array.isArray(u.data) ? u.data : []);
      })
      .catch(() => pushToast("Failed to load filters", "error"));
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
          list = res.data?.items || res.data?.rows || [];
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
          setDrawerData(d => ({ ...d, overview: res.data || null }));
        } else if (tab === "loans") {
          const res = await api.get(`/borrowers/${borrowerId}/loans`, { signal });
          setDrawerData(d => ({ ...d, loans: res.data || [] }));
        } else if (tab === "savings") {
          const res = await api.get(`/borrowers/${borrowerId}/savings`, { signal });
          setDrawerData(d => ({ ...d, savings: res.data || [] }));
        } else if (tab === "documents") {
          const res = await api.get(`/borrowers/${borrowerId}/documents`, { signal });
          setDrawerData(d => ({ ...d, documents: res.data || [] }));
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
      setDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSort(key);
      setDir("asc");
    }
  };

  // Helpers
  const fmtMoney = (v) => `TZS ${Number(v || 0).toLocaleString()}`;
  const pageFrom = useMemo(() => (total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1), [page, total]);
  const pageTo   = useMemo(() => Math.min(page * PAGE_SIZE, total), [page, total]);

  const displayName = (b) =>
    b.name || `${b.firstName || ""} ${b.lastName || ""}`.trim() || "—";
  const displayBranch = (b) =>
    b.branchName || b.Branch?.name || b.branch?.name || "—";
  const displayOfficer = (b) =>
    b.officerName || b.officer?.name || b.loanOfficer?.name || "—";

  const getInitials = (full) => {
    const s = (full || "").trim();
    if (!s) return "U";
    const parts = s.split(/\s+/).filter(Boolean);
    const letters = (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
    return letters.toUpperCase() || s[0].toUpperCase();
  };

  const statusChip = (s) => {
    const base = "text-[11px] px-2 py-0.5 rounded border";
    switch (s) {
      case "active": return `${base} bg-emerald-50 border-emerald-300 text-emerald-700`;
      case "pending_kyc": return `${base} bg-yellow-50 border-yellow-300 text-yellow-700`;
      case "blacklisted": return `${base} bg-red-50 border-red-300 text-red-700`;
      default: return `${base} bg-gray-50 border-gray-300 text-gray-700`;
    }
  };

  return (
    <div className="p-6">
      {/* Toasts */}
      <div className="fixed right-4 top-4 z-50 space-y-2">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`px-3 py-2 rounded shadow text-sm text-white ${
              t.type === "error" ? "bg-red-600" : t.type === "success" ? "bg-emerald-600" : "bg-slate-800"
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">👥 Borrowers</h1>
        <div className="flex gap-2">
          {/* Directly navigate to the Add Borrower page */}
          <button
            onClick={() => navigate("/borrowers/add")}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
          >
            <PlusCircle className="w-4 h-4" /> Add Borrower
          </button>
          <button
            onClick={() => pushToast("CSV import coming soon", "info")}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 shadow-sm"
          >
            <Upload className="w-4 h-4" /> Import CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow p-3 md:p-4 mb-4 border">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Search by name, phone, national ID…"
              className="w-full border rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <select value={branchId} onChange={e => { setBranchId(e.target.value); setPage(1); }} className="border rounded-lg px-3 py-2">
              <option value="">All Branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select value={officerId} onChange={e => { setOfficerId(e.target.value); setPage(1); }} className="border rounded-lg px-3 py-2">
              <option value="">All Officers</option>
              {officers.map(o => <option key={o.id} value={o.id}>{o.name || o.email}</option>)}
            </select>
            <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="border rounded-lg px-3 py-2">
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending_kyc">Pending KYC</option>
              <option value="blacklisted">Blacklisted</option>
            </select>
            <div className="hidden md:flex items-center text-gray-500 text-sm px-2">
              <Filter className="w-4 h-4 mr-1" /> Filters
            </div>
          </div>
        </div>
      </div>

      {/* Table / Cards */}
      <div className="bg-white rounded-xl shadow border">
        <div className="overflow-x-auto">
          {/* Desktop table */}
          <table className="min-w-full text-sm hidden md:table">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <Th label="Name" sortKey="name" sort={sort} dir={dir} onSort={onSort} />
                <Th label="Phone" sortKey="phone" sort={sort} dir={dir} onSort={onSort} />
                <Th label="Branch" sortKey="branchName" sort={sort} dir={dir} onSort={onSort} />
                <Th label="Officer" sortKey="officerName" sort={sort} dir={dir} onSort={onSort} />
                <Th label="Outstanding" sortKey="outstanding" sort={sort} dir={dir} onSort={onSort} />
                <Th label="Status" sortKey="status" sort={sort} dir={dir} onSort={onSort} />
                <th className="px-3 py-2 text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500">No borrowers.</td></tr>
              ) : (
                rows.map(b => (
                  <tr key={b.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2">{displayName(b)}</td>
                    <td className="px-4 py-2">{b.phone || "—"}</td>
                    <td className="px-4 py-2">{displayBranch(b)}</td>
                    <td className="px-4 py-2">{displayOfficer(b)}</td>
                    <td className="px-4 py-2">{fmtMoney(b.outstanding)}</td>
                    <td className="px-4 py-2">
                      <span className={statusChip(b.status)}>{b.status || "—"}</span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex gap-3 justify-end">
                        <button onClick={() => openDrawer(b.id)} className="text-indigo-600 hover:text-indigo-800 hover:underline">View</button>
                        <Link
                          to={`/loans/applications?borrowerId=${encodeURIComponent(b.id)}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
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

          {/* Mobile / small screens — ENLARGED CARDS */}
          <div className="md:hidden grid grid-cols-1 gap-3 p-3">
            {loading ? (
              <div className="p-6 text-center text-gray-500">Loading…</div>
            ) : rows.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No borrowers.</div>
            ) : rows.map(b => {
              const name = displayName(b);
              return (
                <div
                  key={b.id}
                  className="bg-white border rounded-2xl shadow-sm p-4 hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center text-sm font-semibold shadow-sm">
                        {getInitials(name)}
                      </div>
                      <div>
                        <div className="text-base font-semibold text-gray-900">{name}</div>
                        <div className="text-xs text-gray-500">ID: {b.id}</div>
                      </div>
                    </div>
                    <span className={statusChip(b.status)}>{b.status || "—"}</span>
                  </div>

                  {/* Body */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{b.phone || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="truncate">{displayBranch(b)}</span>
                    </div>
                    <div className="col-span-2 text-gray-700">
                      <span className="text-xs text-gray-500">Outstanding</span>
                      <div className="text-sm font-medium">{fmtMoney(b.outstanding)}</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                      onClick={() => openDrawer(b.id)}
                      className="px-3 py-2 text-sm rounded-lg border hover:bg-gray-50"
                    >
                      View
                    </button>
                    <Link
                      to={`/loans/applications?borrowerId=${encodeURIComponent(b.id)}`}
                      className="px-3 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      New Loan
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-3 py-2 border-t text-sm bg-gray-50 rounded-b-xl">
          <div className="text-gray-600">
            {pageFrom}–{pageTo} of {total}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 border rounded-lg disabled:opacity-50 bg-white"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => (p * PAGE_SIZE < total ? p + 1 : p))}
              disabled={page * PAGE_SIZE >= total}
              className="p-1.5 border rounded-lg disabled:opacity-50 bg-white"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Drawer: Borrower Details */}
      {drawerOpen && (
        <Drawer onClose={() => setDrawerOpen(false)} title="Borrower Details">
          {/* Tabs */}
          <div className="flex gap-2 border-b mb-3">
            {["overview","loans","savings","documents"].map(t => (
              <button
                key={t}
                onClick={() => setDrawerTab(t)}
                className={`px-3 py-2 text-sm border-b-2 -mb-px ${
                  drawerTab === t ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-600"
                }`}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div>
            {drawerLoading ? (
              <div className="text-gray-500 text-sm">Loading…</div>
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
      className="px-3 py-2 cursor-pointer select-none"
      onClick={() => onSort(sortKey)}
      title="Sort"
    >
      <span className={`inline-flex items-center gap-1 ${active ? "text-indigo-700" : ""}`}>
        {label}
        {active ? (dir === "asc" ? "▲" : "▼") : ""}
      </span>
    </th>
  );
};

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center">
    <div className="absolute inset-0 bg-black/30" onClick={onClose} />
    <div className="relative bg-white rounded-lg shadow-xl w-[95%] max-w-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800">{title}</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="w-4 h-4" /></button>
      </div>
      {children}
    </div>
  </div>
);

const Drawer = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[60]">
    <div className="absolute inset-0 bg-black/30" onClick={onClose} />
    <div className="absolute right-0 top-0 h-full w-full sm:w-[620px] bg-white shadow-2xl p-4 overflow-y-auto rounded-l-2xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100" aria-label="Close drawer">
          <X className="w-5 h-5" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

/* Tabs */

const OverviewTab = ({ data }) => {
  if (!data) return <p className="text-gray-500 text-sm">No overview data.</p>;
  const name = data.name || `${data.firstName || ""} ${data.lastName || ""}`.trim() || "—";
  const branch = data.branchName || data.Branch?.name || data.branch?.name || "—";
  const officer = data.officerName || data.officer?.name || data.loanOfficer?.name || "—";
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <InfoCard label="Full Name" value={name} />
        <InfoCard label="Phone" value={data.phone || "—"} />
        <InfoCard label="Branch" value={branch} />
        <InfoCard label="Loan Officer" value={officer} />
        <InfoCard label="Status" value={data.status || "—"} />
        <InfoCard label="National ID" value={data.nationalId || "—"} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Outstanding Loan" value={money(data.outstandingLoan)} />
        <Stat label="Outstanding Interest" value={money(data.outstandingInterest)} />
        <Stat label="Net Savings" value={money(data.netSavings)} />
      </div>
    </div>
  );
};

const LoansTab = ({ items }) => {
  if (!Array.isArray(items) || items.length === 0) {
    return <p className="text-gray-500 text-sm">No loans.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="px-3 py-2 text-left">Loan #</th>
            <th className="px-3 py-2 text-left">Product</th>
            <th className="px-3 py-2 text-left">Disbursed</th>
            <th className="px-3 py-2 text-left">Outstanding</th>
            <th className="px-3 py-2 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map(l => (
            <tr key={l.id} className="border-t">
              <td className="px-3 py-2">{l.id}</td>
              <td className="px-3 py-2">{l.product || "—"}</td>
              <td className="px-3 py-2">{money(l.disbursed)}</td>
              <td className="px-3 py-2">{money(l.outstanding)}</td>
              <td className="px-3 py-2">{l.status || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const SavingsTab = ({ items }) => {
  if (!Array.isArray(items) || items.length === 0) {
    return <p className="text-gray-500 text-sm">No savings accounts.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="px-3 py-2 text-left">Account #</th>
            <th className="px-3 py-2 text-left">Balance</th>
            <th className="px-3 py-2 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map(s => (
            <tr key={s.id} className="border-t">
              <td className="px-3 py-2">{s.id}</td>
              <td className="px-3 py-2">{money(s.balance)}</td>
              <td className="px-3 py-2">{s.status || "—"}</td>
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
          className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg bg-white hover:bg-gray-50"
        >
          <FileUp className="w-4 h-4" /> Upload Document
        </button>
      </div>
      {(!Array.isArray(items) || items.length === 0) ? (
        <p className="text-gray-500 text-sm">No documents.</p>
      ) : (
        <ul className="space-y-2">
          {items.map(d => (
            <li key={d.id} className="border rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <IdCard className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{d.fileName || "Document"}</p>
                  <p className="text-xs text-gray-500">{d.type || "KYC"} • {new Date(d.createdAt).toLocaleString()}</p>
                </div>
              </div>
              {d.url && (
                <a className="text-indigo-600 hover:text-indigo-800 underline text-sm" href={d.url} target="_blank" rel="noreferrer">Open</a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/* Small UI helpers – enlarged/professional cards */
const InfoCard = ({ label, value }) => (
  <div className="border rounded-xl p-4 bg-white shadow-sm">
    <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
    <p className="text-base font-semibold text-gray-900 mt-1">{value}</p>
  </div>
);
const Stat = ({ label, value }) => (
  <div className="rounded-2xl p-4 border bg-gray-50">
    <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
    <p className="text-xl font-semibold text-gray-900 mt-1">{value}</p>
  </div>
);

const money = (v) => `TZS ${Number(v || 0).toLocaleString()}`;

export default Borrowers;
