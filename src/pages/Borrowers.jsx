import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  PlusCircle, Upload, Search, Filter, X, Users, Phone, Building2, ChevronLeft, ChevronRight, FileUp, IdCard, Loader2
} from "lucide-react";
import api from "../api";

// Borrowers Management Module
// - List + filters + pagination
// - Add Borrower modal
// - Borrower details drawer with tabs (Overview, Loans, Savings, Documents)
// NOTES: No dummy data. All calls expect real endpoints; empty states will show until backend is ready.

const PAGE_SIZE = 10;

const Borrowers = () => {
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
  const [adding, setAdding] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

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
      api.get("/branches", { signal: ac.signal }),
      api.get("/users", { params: { role: "loan_officer" }, signal: ac.signal }),
    ])
      .then(([b, u]) => {
        setBranches(b.data || []);
        setOfficers(u.data || []);
      })
      .catch(() => pushToast("Failed to load filters", "error"));
    return () => ac.abort();
  }, []);

  // Fetch list
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
        setRows(res.data?.items || []);
        setTotal(res.data?.total || 0);
      } catch (e) {
        pushToast("Failed to load borrowers", "error");
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

  // Add Borrower
  const [addForm, setAddForm] = useState({
    name: "",
    phone: "",
    nationalId: "",
    branchId: "",
    officerId: "",
  });

  const canSubmitAdd = useMemo(() => {
    return addForm.name.trim() && addForm.phone.trim();
  }, [addForm]);

  const submitAdd = async () => {
    if (!canSubmitAdd) return;
    setAdding(true);
    try {
      await api.post("/borrowers", {
        name: addForm.name.trim(),
        phone: addForm.phone.trim(),
        nationalId: addForm.nationalId.trim() || null,
        branchId: addForm.branchId || null,
        officerId: addForm.officerId || null,
      });
      setShowAddModal(false);
      setAddForm({ name: "", phone: "", nationalId: "", branchId: "", officerId: "" });
      const ac = new AbortController();
      await fetchList(ac.signal);
      pushToast("Borrower added", "success");
    } catch (e) {
      pushToast("Failed to add borrower", "error");
    } finally {
      setAdding(false);
    }
  };

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
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <PlusCircle className="w-4 h-4" /> Add Borrower
          </button>
          <button
            onClick={() => pushToast("CSV import coming soon", "info")}
            className="inline-flex items-center gap-2 px-3 py-2 rounded border bg-white hover:bg-gray-50"
          >
            <Upload className="w-4 h-4" /> Import CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-md shadow p-3 md:p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Search by name, phone, national ID…"
              className="w-full border rounded pl-9 pr-3 py-2"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <select value={branchId} onChange={e => { setBranchId(e.target.value); setPage(1); }} className="border rounded px-3 py-2">
              <option value="">All Branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select value={officerId} onChange={e => { setOfficerId(e.target.value); setPage(1); }} className="border rounded px-3 py-2">
              <option value="">All Officers</option>
              {officers.map(o => <option key={o.id} value={o.id}>{o.name || o.email}</option>)}
            </select>
            <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="border rounded px-3 py-2">
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
      <div className="bg-white rounded-md shadow">
        <div className="overflow-x-auto">
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
                    <td className="px-4 py-2">{b.name}</td>
                    <td className="px-4 py-2">{b.phone}</td>
                    <td className="px-4 py-2">{b.branchName || "-"}</td>
                    <td className="px-4 py-2">{b.officerName || "-"}</td>
                    <td className="px-4 py-2">{fmtMoney(b.outstanding)}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded border ${
                        b.status === "active" ? "bg-emerald-50 border-emerald-300 text-emerald-700" :
                        b.status === "pending_kyc" ? "bg-yellow-50 border-yellow-300 text-yellow-700" :
                        b.status === "blacklisted" ? "bg-red-50 border-red-300 text-red-700" :
                        "bg-gray-50 border-gray-300 text-gray-700"
                      }`}>
                        {b.status || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => openDrawer(b.id)} className="underline text-indigo-600">View</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Mobile cards */}
          <div className="md:hidden divide-y">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading…</div>
            ) : rows.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No borrowers.</div>
            ) : rows.map(b => (
              <div key={b.id} className="p-4 flex items-start justify-between">
                <div>
                  <div className="font-medium text-gray-900 flex items-center gap-2">
                    <Users className="w-4 h-4" /> {b.name}
                  </div>
                  <div className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                    <Phone className="w-3 h-3" /> {b.phone}
                  </div>
                  <div className="text-xs text-gray-600 flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> {b.branchName || "-"}
                  </div>
                  <div className="text-xs text-gray-600">Outstanding: {fmtMoney(b.outstanding)}</div>
                  <div className="mt-1">
                    <span className={`text-[11px] px-2 py-0.5 rounded border ${
                      b.status === "active" ? "bg-emerald-50 border-emerald-300 text-emerald-700" :
                      b.status === "pending_kyc" ? "bg-yellow-50 border-yellow-300 text-yellow-700" :
                      b.status === "blacklisted" ? "bg-red-50 border-red-300 text-red-700" :
                      "bg-gray-50 border-gray-300 text-gray-700"
                    }`}>
                      {b.status || "—"}
                    </span>
                  </div>
                </div>
                <div>
                  <button onClick={() => openDrawer(b.id)} className="underline text-indigo-600">View</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-3 py-2 border-t text-sm">
          <div className="text-gray-600">
            {pageFrom}–{pageTo} of {total}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1 border rounded disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => (p * PAGE_SIZE < total ? p + 1 : p))}
              disabled={page * PAGE_SIZE >= total}
              className="p-1 border rounded disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Borrower Modal */}
      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)} title="Add Borrower">
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600">Full Name</label>
              <input
                className="w-full border rounded px-3 py-2"
                value={addForm.name}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Phone Number</label>
              <input
                className="w-full border rounded px-3 py-2"
                value={addForm.phone}
                onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+2557…"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">National ID (optional)</label>
              <input
                className="w-full border rounded px-3 py-2"
                value={addForm.nationalId}
                onChange={e => setAddForm(f => ({ ...f, nationalId: e.target.value }))}
                placeholder="NIDA / ID"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-600">Branch (optional)</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={addForm.branchId}
                  onChange={e => setAddForm(f => ({ ...f, branchId: e.target.value }))}
                >
                  <option value="">—</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600">Loan Officer (optional)</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={addForm.officerId}
                  onChange={e => setAddForm(f => ({ ...f, officerId: e.target.value }))}
                >
                  <option value="">—</option>
                  {officers.map(o => <option key={o.id} value={o.id}>{o.name || o.email}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button className="px-3 py-2 border rounded" onClick={() => setShowAddModal(false)}>Cancel</button>
            <button
              className="px-3 py-2 rounded text-white bg-indigo-600 disabled:opacity-50 inline-flex items-center gap-2"
              onClick={submitAdd}
              disabled={!canSubmitAdd || adding}
            >
              {adding && <Loader2 className="w-4 h-4 animate-spin" />} Save
            </button>
          </div>
        </Modal>
      )}

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

const Modal = ({ title, onClose, children }) => {
  return (
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
};

const Drawer = ({ title, onClose, children }) => {
  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[540px] bg-white shadow-xl p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
};

/* Tabs */

const OverviewTab = ({ data }) => {
  if (!data) return <p className="text-gray-500 text-sm">No overview data.</p>;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <InfoCard label="Full Name" value={data.name || "—"} />
        <InfoCard label="Phone" value={data.phone || "—"} />
        <InfoCard label="Branch" value={data.branchName || "—"} />
        <InfoCard label="Loan Officer" value={data.officerName || "—"} />
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
          className="inline-flex items-center gap-2 px-3 py-2 border rounded bg-white hover:bg-gray-50"
        >
          <FileUp className="w-4 h-4" /> Upload Document
        </button>
      </div>
      {(!Array.isArray(items) || items.length === 0) ? (
        <p className="text-gray-500 text-sm">No documents.</p>
      ) : (
        <ul className="space-y-2">
          {items.map(d => (
            <li key={d.id} className="border rounded p-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IdCard className="w-4 h-4" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{d.fileName || "Document"}</p>
                  <p className="text-xs text-gray-500">{d.type || "KYC"} • {new Date(d.createdAt).toLocaleString()}</p>
                </div>
              </div>
              {d.url && (
                <a className="text-indigo-600 underline text-sm" href={d.url} target="_blank" rel="noreferrer">Open</a>
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
  <div className="border rounded p-3">
    <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
    <p className="text-sm font-medium text-gray-800 mt-0.5">{value}</p>
  </div>
);
const Stat = ({ label, value }) => (
  <div className="bg-gray-50 border rounded p-3">
    <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
    <p className="text-lg font-semibold text-gray-900 mt-0.5">{value}</p>
  </div>
);

const money = (v) => `TZS ${Number(v || 0).toLocaleString()}`;

export default Borrowers;
