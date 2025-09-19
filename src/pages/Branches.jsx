// src/pages/Branches.jsx
import { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import api from "../api";

/* ---------------- permission helper ---------------- */
const can = (me, action) => {
  if (!me) return false;
  if (["admin", "director", "super_admin", "system_admin"].includes((me.role || "").toLowerCase())) return true;
  return Array.isArray(me.permissions) && me.permissions.includes(action);
};

/* ---------------- tolerant request helpers --------------------- */
async function tryOneGET(path, opts = {}) { try { const res = await api.get(path, opts); return { ok: true, data: res?.data }; } catch (e) { return { ok: false, error: e }; } }
async function tryOnePOST(path, body = {}, opts = {}) { try { const res = await api.post(path, body, opts); return { ok: true, data: res?.data }; } catch (e) { return { ok: false, error: e }; } }
async function tryOnePUT(path, body = {}, opts = {}) { try { const res = await api.put(path, body, opts); return { ok: true, data: res?.data }; } catch (e) { return { ok: false, error: e }; } }
async function tryOneDELETE(path, opts = {}) { try { const res = await api.delete(path, opts); return { ok: true, data: res?.data }; } catch (e) { return { ok: false, error: e }; } }

/** Discover the first working branches base path and return it (e.g. "/branches"). */
async function discoverBranchesBase(paths) {
  for (const p of paths) {
    const r = await tryOneGET(p, { params: { limit: 1 } });
    if (r.ok) return p;
    const status = r?.error?.response?.status;
    if (status === 401 || status === 403) return p;
  }
  return null;
}

/* ---------------- small helpers -------------------- */
const onlyDigits = (v) => String(v || "").replace(/\D+/g, "");
const toNullableNumber = (v) => {
  const t = String(v ?? "").trim();
  if (!t) return null;
  if (!/^-?\d+$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};
const cleanString = (v) => {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
};

/* ---------- normalizers: make drawers robust to many API shapes ---------- */
function pickArrayish(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return (
    data.items ||
    data.rows ||
    data.data ||
    data.users ||
    data.staff ||
    data.borrowers ||
    []
  );
}
function normalizeUserRow(row) {
  // Accept {id, name...} OR {userId, User:{...}} OR {user:{...}}
  const u = row?.User || row?.user || row;
  const id = u?.id ?? row?.userId ?? row?.id;
  const role =
    u?.role ||
    (Array.isArray(u?.Roles) ? u.Roles.map((r) => r?.name).filter(Boolean).join(", ") : undefined) ||
    row?.role ||
    row?.Role?.name;
  const name =
    u?.name ||
    [u?.firstName, u?.lastName].filter(Boolean).join(" ").trim() ||
    row?.name;
  return {
    id,
    name: name || "—",
    email: u?.email || row?.email || "—",
    role: role || "—",
  };
}
function normalizeBorrowerRow(row) {
  // Accept {id,...} OR {borrowerId, Borrower:{...}}
  const b = row?.Borrower || row?.borrower || row;
  const id = b?.id ?? row?.borrowerId ?? row?.id;
  return {
    id,
    name: b?.name || b?.fullName || row?.name || "—",
    phone: b?.phone || row?.phone || "—",
    nationalId: b?.nationalId || row?.nationalId || "—",
    status: b?.status || row?.status || "—",
  };
}

/* ============================== PAGE ============================== */
export default function Branches() {
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState("overview");

  const BRANCH_PATH_CANDIDATES = useMemo(() => ["/branches", "/org/branches"], []);
  const [branchesBase, setBranchesBase] = useState(null);
  const [apiUnavailable, setApiUnavailable] = useState(false);

  useEffect(() => {
    (async () => {
      const base = await discoverBranchesBase(BRANCH_PATH_CANDIDATES);
      if (base) { setBranchesBase(base); setApiUnavailable(false); } else { setApiUnavailable(true); }
    })();
  }, [BRANCH_PATH_CANDIDATES]);

  useEffect(() => { (async () => { try { const { data } = await api.get("/auth/me"); setMe(data); } catch {} })(); }, []);

  if (!me) return <div className="p-4">Loading…</div>;

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Branches</h1>
          <p className="text-xs text-slate-500">View branches and perform common operations.</p>
          {apiUnavailable && (
            <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 inline-block">
              Branches API not enabled on this backend. Listing/creating and assignments are disabled.
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 rounded-lg border border-slate-200 bg-white p-1">
          <Tab label="Overview" id="overview" tab={tab} setTab={setTab} />
          {can(me, "branches:manage") && <Tab label="Add" id="add" tab={tab} setTab={setTab} />}
          {can(me, "branches:assign") && <Tab label="Assign" id="assign" tab={tab} setTab={setTab} />}
          <Tab label="Reports" id="reports" tab={tab} setTab={setTab} />
        </div>
      </header>

      {tab === "overview" && (
        <Overview me={me} branchesBase={branchesBase} apiUnavailable={apiUnavailable} />
      )}
      {tab === "add" && can(me, "branches:manage") && (
        <AddBranch branchesBase={branchesBase} apiUnavailable={apiUnavailable} />
      )}
      {tab === "assign" && can(me, "branches:assign") && (
        <AssignCenter branchesBase={branchesBase} apiUnavailable={apiUnavailable} />
      )}
      {tab === "reports" && (
        <BranchReports branchesBase={branchesBase} apiUnavailable={apiUnavailable} />
      )}
    </div>
  );
}

/* ----------------------------- Buttons ---------------------------- */
function PrimaryButton({ className = "", children, ...props }) {
  return (
    <button
      {...props}
      className={[
        "px-3 py-2 rounded-lg text-sm font-medium",
        "bg-indigo-600 text-white border border-indigo-600",
        "hover:bg-indigo-700",
        "disabled:opacity-60 disabled:hover:bg-indigo-600",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-1",
        className
      ].join(" ")}
    >
      {children}
    </button>
  );
}
function SecondaryButton({ className = "", children, ...props }) {
  return (
    <button
      {...props}
      className={[
        "px-3 py-2 rounded-lg text-sm font-medium",
        "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-1",
        "disabled:opacity-60",
        className
      ].join(" ")}
    >
      {children}
    </button>
  );
}
function DangerButton({ className = "", children, ...props }) {
  return (
    <button
      {...props}
      className={[
        "px-3 py-2 rounded-lg text-sm font-medium",
        "bg-red-600 text-white border border-red-600 hover:bg-red-700",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-1",
        "disabled:opacity-60",
        className
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/* ----------------------------- UI Bits ---------------------------- */
function Tab({ label, id, tab, setTab }) {
  const active = tab === id;
  return (
    <button
      onClick={() => setTab(id)}
      aria-current={active ? "page" : undefined}
      className={[
        "px-3 py-1.5 text-sm rounded-md transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-1",
        active ? "bg-indigo-600 text-white shadow-sm" : "text-slate-700 hover:bg-slate-100"
      ].join(" ")}
    >
      {label}
    </button>
  );
}

/* ======== Portal + anchored Actions menu (prevents clipping) ======== */
function PortalRoot({ children }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
function useOnClickAway(targets, handler) {
  useEffect(() => {
    const fn = (e) => {
      const inside = targets.some((r) => r.current && r.current.contains(e.target));
      if (!inside) handler();
    };
    document.addEventListener("mousedown", fn, true);
    document.addEventListener("touchstart", fn, { passive: true, capture: true });
    return () => {
      document.removeEventListener("mousedown", fn, true);
      document.removeEventListener("touchstart", fn, true);
    };
  }, [targets, handler]);
}
function ActionMenu({ actions = [] }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const place = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const menuW = 200;
    const gap = 6;
    let left = Math.min(Math.max(8, r.right - menuW), window.innerWidth - menuW - 8);
    let top = r.bottom + gap;
    const approxH = 8 + actions.length * 36;
    if (top + approxH > window.innerHeight - 8) {
      top = Math.max(8, r.top - gap - approxH);
    }
    setPos({ top, left });
  };

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const onScroll = () => place();
    const onResize = () => place();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, actions.length]);

  useOnClickAway([btnRef, menuRef], () => setOpen(false));
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        className="px-2 py-1 border rounded hover:bg-gray-50"
        onClick={() => setOpen((v) => !v)}
        aria-label="Actions"
        title="Actions"
      >
        ⋮
      </button>

      {open && (
        <PortalRoot>
          <div className="fixed inset-0 z-50" style={{ background: "transparent" }} onClick={() => setOpen(false)} />
          <div
            ref={menuRef}
            className="fixed z-[60] min-w-[200px] bg-white border shadow-lg rounded-md"
            style={{ top: pos.top, left: pos.left }}
            onClick={(e) => e.stopPropagation()}
          >
            {actions.map((a, i) => (
              <button
                key={i}
                onClick={() => {
                  if (a.disabled) return;
                  setOpen(false);
                  a.onClick?.();
                }}
                disabled={a.disabled}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${a.danger ? "text-red-700" : ""} disabled:opacity-50`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </PortalRoot>
      )}
    </>
  );
}

/* ----------------------------- Overview --------------------------- */
function Overview({ me, branchesBase, apiUnavailable }) {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // drawers / modals
  const [editOpen, setEditOpen] = useState(false);
  const [editModel, setEditModel] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false); // soft
  const [confirmTarget, setConfirmTarget] = useState(null);

  const [hardOpen, setHardOpen] = useState(false); // hard
  const [hardTarget, setHardTarget] = useState(null);

  const [staffOpen, setStaffOpen] = useState(false);
  const [staffFor, setStaffFor] = useState(null);
  const [staffRows, setStaffRows] = useState([]);
  const [staffErr, setStaffErr] = useState("");
  const [staffSel, setStaffSel] = useState(new Set());

  const [borrowersOpen, setBorrowersOpen] = useState(false);
  const [borrowersFor, setBorrowersFor] = useState(null);
  const [borrowersRows, setBorrowersRows] = useState([]);
  const [borrowersErr, setBorrowersErr] = useState("");
  const [boSel, setBoSel] = useState(new Set());

  const [overviewOpen, setOverviewOpen] = useState(false);
  const [overviewFor, setOverviewFor] = useState(null);
  const [overview, setOverview] = useState(null);
  const [overviewErr, setOverviewErr] = useState("");

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignFor, setAssignFor] = useState(null);

  const load = async () => {
    if (!branchesBase) { setRows([]); setErr(apiUnavailable ? "" : "Detecting endpoint…"); return; }
    setLoading(true); setErr("");
    const r = await tryOneGET(branchesBase, { params: { q } });
    setLoading(false);
    if (r.ok) {
      const data = r.data;
      const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : data?.rows || data?.data || [];
      setRows(items);
    } else {
      setErr(r?.error?.response?.data?.error || r?.error?.message || "Failed to load branches.");
      setRows([]);
    }
  };

  useEffect(() => { load(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [branchesBase]);

  // ====== Actions ======
  const onEdit = (b) => {
    setEditModel({
      id: b.id,
      name: b.name || "",
      code: b.code ?? "",
      phone: b.phone ?? "",
      address: b.address ?? "",
      managerId: b.managerId ?? b.manager ?? "",
    });
    setEditOpen(true);
  };

  const onDisable = (b) => { setConfirmTarget(b); setConfirmOpen(true); };
  const onHardDelete = (b) => { setHardTarget(b); setHardOpen(true); };
  const onAssign = (b) => { setAssignFor(b); setAssignOpen(true); };

  const onViewStaff = async (b) => {
    setStaffFor(b); setStaffOpen(true); setStaffRows([]); setStaffErr(""); setStaffSel(new Set());
    if (!branchesBase || !b?.id) return;
    // Primary endpoint
    let r = await tryOneGET(`${branchesBase}/${b.id}/staff`);
    if (r.ok) {
      const raw = pickArrayish(r.data);
      setStaffRows(raw.map(normalizeUserRow).filter((u) => u.id != null));
      return;
    }
    // Fallback: try "/users?branchId="
    r = await tryOneGET(`/users`, { params: { branchId: b?.id, limit: 1000 } });
    if (r.ok) {
      const raw = pickArrayish(r.data);
      setStaffRows(raw.map(normalizeUserRow).filter((u) => u.id != null));
    } else {
      setStaffErr(r?.error?.response?.data?.error || r?.error?.message || "Failed to load staff.");
    }
  };

  const onViewBorrowers = async (b) => {
    setBorrowersFor(b); setBorrowersOpen(true); setBorrowersRows([]); setBorrowersErr(""); setBoSel(new Set());
    let r = await tryOneGET(`${branchesBase}/${b?.id}/borrowers`);
    if (!r.ok) r = await tryOneGET(`/borrowers`, { params: { branchId: b?.id, limit: 1000 } });
    if (r.ok) {
      const raw = pickArrayish(r.data);
      setBorrowersRows(raw.map(normalizeBorrowerRow).filter((x) => x.id != null));
    } else {
      setBorrowersErr(r?.error?.response?.data?.error || r?.error?.message || "Borrowers endpoint not available.");
    }
  };

  const toggleSet = (set, id, setter) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    setter(next);
  };

  const saveEdit = async () => {
    if (!branchesBase || !editModel?.id) return;
    const payload = {
      name: cleanString(editModel.name),
      code: editModel.code == null ? null : String(editModel.code).trim(),
      phone: cleanString(onlyDigits(editModel.phone)),
      address: cleanString(editModel.address),
      ...(editModel.managerId !== "" ? { managerId: editModel.managerId } : {}),
    };
    const r = await tryOnePUT(`${branchesBase}/${editModel.id}`, payload);
    if (r.ok) { setEditOpen(false); setEditModel(null); load(); }
    else alert(r?.error?.response?.data?.error || r?.error?.message || "Failed to update branch.");
  };

  const confirmDisable = async () => {
    if (!branchesBase || !confirmTarget?.id) return;
    const r = await tryOneDELETE(`${branchesBase}/${confirmTarget.id}`);
    if (!r.ok) alert(r?.error?.response?.data?.error || r?.error?.message || "Failed to disable branch.");
    setConfirmOpen(false); setConfirmTarget(null); load();
  };

  const confirmHardDelete = async () => {
    if (!branchesBase || !hardTarget?.id) return;
    const r = await tryOneDELETE(`${branchesBase}/${hardTarget.id}`, {
      params: { force: 1, hard: 1 }, headers: { "X-Force-Delete": "1" }, data: { force: true },
    });
    if (!r.ok) alert(r?.error?.response?.data?.error || r?.error?.message || "Failed to delete branch.");
    setHardOpen(false); setHardTarget(null); load();
  };

  const onViewOverview = async (b) => {
    setOverviewFor(b); setOverviewOpen(true); setOverview(null); setOverviewErr("");
    if (!branchesBase || !b?.id) return;
    const r = await tryOneGET(`${branchesBase}/${b.id}/overview`);
    if (r.ok) setOverview(r.data);
    else setOverviewErr(r?.error?.response?.data?.error || r?.error?.message || "Failed to load overview.");
  };

  // bulk unassign staff (tolerant)
  const unassignSelectedStaff = async () => {
    const ids = [...staffSel];
    if (!ids.length || !branchesBase || !staffFor?.id) return;
    let r = await tryOnePOST(`${branchesBase}/${staffFor.id}/unassign-staff`, { userIds: ids });
    if (!r.ok) {
      for (const id of ids) {
        let one = await tryOneDELETE(`${branchesBase}/${staffFor.id}/staff/${id}`);
        if (!one.ok) one = await tryOneDELETE(`${branchesBase}/${staffFor.id}/staff`, { params: { userId: id } });
      }
    }
    onViewStaff(staffFor);
  };

  // bulk unassign borrowers
  const unassignSelectedBorrowers = async () => {
    const ids = [...boSel];
    if (!ids.length || !branchesBase || !borrowersFor?.id) return;
    let r = await tryOnePOST(`${branchesBase}/${borrowersFor.id}/unassign-borrowers`, { borrowerIds: ids });
    if (!r.ok) {
      for (const id of ids) await tryOnePUT(`/borrowers/${id}`, { branchId: null });
    }
    onViewBorrowers(borrowersFor);
  };

  return (
    <div className="space-y-3">
      {/* Search row */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex gap-3 items-end">
        <div className="relative">
          <label className="block text-xs text-gray-500 mb-0.5">Search</label>
          <span className="pointer-events-none absolute left-2 top-[30px]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            className="border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-sm placeholder:text-slate-400
                       focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="name, code, phone…"
          />
        </div>
        <PrimaryButton onClick={load} disabled={!branchesBase || loading}>
          {loading ? "Loading…" : "Apply"}
        </PrimaryButton>
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}

      {/* Table */}
      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600 border-b">
              <th className="py-2 px-3">Name</th>
              <th className="py-2 px-3">Code</th>
              <th className="py-2 px-3">Phone</th>
              <th className="py-2 px-3">Address</th>
              <th className="py-2 px-3">Manager</th>
              <th className="py-2 px-3 w-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="p-3 text-gray-500">{branchesBase ? "No branches yet." : "Waiting for endpoint…"}</td></tr>
            ) : (
              rows.map((b) => (
                <tr key={b.id ?? b.code ?? Math.random()} className="border-b">
                  <td className="py-2 px-3">{b.name}</td>
                  <td className="py-2 px-3">{b.code ?? "—"}</td>
                  <td className="py-2 px-3">{b.phone ?? "—"}</td>
                  <td className="py-2 px-3">{b.address ?? "—"}</td>
                  <td className="py-2 px-3">{b.managerName || b.manager_id || b.managerId || "—"}</td>
                  <td className="py-2 px-3">
                    <ActionMenu
                      actions={[
                        { label: "Overview", onClick: () => onViewOverview(b) },
                        { label: "Staff", onClick: () => onViewStaff(b) },
                        { label: "Borrowers", onClick: () => onViewBorrowers(b) },
                        can({ ...me }, "branches:assign") ? { label: "Assign…", onClick: () => onAssign(b) } : { label: "Assign…", disabled: true },
                        can({ ...me }, "branches:manage") ? { label: "Edit", onClick: () => onEdit(b) } : { label: "Edit", disabled: true },
                        can({ ...me }, "branches:manage") ? { label: "Disable", onClick: () => onDisable(b), danger: true } : { label: "Disable", disabled: true },
                        can({ ...me }, "branches:manage") ? { label: "Delete", onClick: () => onHardDelete(b), danger: true } : { label: "Delete", disabled: true },
                      ]}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editOpen && (
        <Modal onClose={() => setEditOpen(false)} title="Edit Branch">
          <div className="grid gap-2">
            {["name", "code", "phone", "address", "managerId"].map((k) => (
              <div key={k}>
                <label className="block text-xs text-gray-500 capitalize">{k === "managerId" ? "Manager ID" : k}</label>
                <input
                  className="border rounded px-2 py-1 text-sm w-full"
                  value={editModel?.[k] ?? ""}
                  onChange={(e) => setEditModel((s) => ({ ...s, [k]: e.target.value }))}
                  placeholder={k === "code" ? "e.g. 1" : k === "phone" ? "digits only" : ""}
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <SecondaryButton onClick={() => setEditOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={saveEdit}>Save</PrimaryButton>
          </div>
        </Modal>
      )}

      {/* Confirm Disable */}
      {confirmOpen && (
        <Modal onClose={() => setConfirmOpen(false)} title="Disable Branch">
          <p className="text-sm">This will <b>soft-delete</b> the branch (disable). Continue?</p>
          <div className="mt-3 flex justify-end gap-2">
            <SecondaryButton onClick={() => setConfirmOpen(false)}>Cancel</SecondaryButton>
            <DangerButton onClick={confirmDisable}>Disable</DangerButton>
          </div>
        </Modal>
      )}

      {/* Confirm Delete */}
      {hardOpen && (
        <Modal onClose={() => setHardOpen(false)} title="Delete Branch">
          <p className="text-sm">This will <b>permanently delete</b> the branch. Continue?</p>
          <div className="mt-3 flex justify-end gap-2">
            <SecondaryButton onClick={() => setHardOpen(false)}>Cancel</SecondaryButton>
            <DangerButton onClick={confirmHardDelete}>Delete</DangerButton>
          </div>
        </Modal>
      )}

      {/* Staff Drawer — full-screen */}
      {staffOpen && (
        <Drawer title={`Staff • ${staffFor?.name || ""}`} onClose={() => setStaffOpen(false)} full>
          {staffErr && <div className="text-sm text-red-600 mb-2">{staffErr}</div>}

          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">{staffRows.length} staff</div>
            <div className="flex gap-2">
              <SecondaryButton className="px-2 py-1" onClick={() => setStaffSel(new Set(staffRows.map((u) => u.id)))}>Select all</SecondaryButton>
              <SecondaryButton className="px-2 py-1" onClick={() => setStaffSel(new Set())}>Clear</SecondaryButton>
              <SecondaryButton
                className="px-2 py-1 disabled:opacity-50"
                disabled={staffSel.size === 0 || !can({ ...me }, "branches:assign")}
                onClick={unassignSelectedStaff}
              >
                Unassign selected
              </SecondaryButton>
            </div>
          </div>

          <div className="border rounded-xl overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 border-b">
                  <th className="py-2 px-3">Pick</th>
                  <th className="py-2 px-3">Name</th>
                  <th className="py-2 px-3">Email</th>
                  <th className="py-2 px-3">Role</th>
                  <th className="py-2 px-3 w-1">Single</th>
                </tr>
              </thead>
              <tbody>
                {(staffRows || []).length === 0 ? (
                  <tr><td colSpan={5} className="p-3 text-gray-500">No staff assigned.</td></tr>
                ) : (
                  staffRows.map((u) => (
                    <tr key={u.id} className="border-b">
                      <td className="py-2 px-3"><input type="checkbox" checked={staffSel.has(u.id)} onChange={() => toggleSet(staffSel, u.id, setStaffSel)} /></td>
                      <td className="py-2 px-3">{u.name || "—"}</td>
                      <td className="py-2 px-3">{u.email || "—"}</td>
                      <td className="py-2 px-3">{u.role || "—"}</td>
                      <td className="py-2 px-3">
                        <SecondaryButton
                          className="px-2 py-1"
                          onClick={async () => {
                            let d = await tryOneDELETE(`${branchesBase}/${staffFor.id}/staff/${u.id}`);
                            if (!d.ok) d = await tryOneDELETE(`${branchesBase}/${staffFor.id}/staff`, { params: { userId: u.id } });
                            onViewStaff(staffFor);
                          }}
                          disabled={!can({ ...me }, "branches:assign")}
                        >
                          Unassign
                        </SecondaryButton>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Drawer>
      )}

      {/* Borrowers Drawer — full-screen */}
      {borrowersOpen && (
        <Drawer title={`Borrowers • ${borrowersFor?.name || ""}`} onClose={() => setBorrowersOpen(false)} full>
          {borrowersErr && <div className="text-sm text-amber-700 mb-2">{borrowersErr}</div>}

          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">{borrowersRows.length} borrowers</div>
            <div className="flex gap-2">
              <SecondaryButton className="px-2 py-1" onClick={() => setBoSel(new Set(borrowersRows.map((b) => b.id)))}>Select all</SecondaryButton>
              <SecondaryButton className="px-2 py-1" onClick={() => setBoSel(new Set())}>Clear</SecondaryButton>
              <SecondaryButton
                className="px-2 py-1 disabled:opacity-50"
                disabled={boSel.size === 0 || !can({ ...me }, "branches:assign")}
                onClick={unassignSelectedBorrowers}
              >
                Unassign selected
              </SecondaryButton>
            </div>
          </div>

          <div className="border rounded-xl overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 border-b">
                  <th className="py-2 px-3">Pick</th>
                  <th className="py-2 px-3">Name</th>
                  <th className="py-2 px-3">Phone</th>
                  <th className="py-2 px-3">National ID</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {(borrowersRows || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-3 text-gray-500">
                      {borrowersErr ? "Endpoint not available." : "No borrowers found."}
                    </td>
                  </tr>
                ) : (
                  borrowersRows.map((bo) => (
                    <tr key={bo.id} className="border-b">
                      <td className="py-2 px-3"><input type="checkbox" checked={boSel.has(bo.id)} onChange={() => toggleSet(boSel, bo.id, setBoSel)} /></td>
                      <td className="py-2 px-3">{bo.name || "—"}</td>
                      <td className="py-2 px-3">{bo.phone || "—"}</td>
                      <td className="py-2 px-3">{bo.nationalId || "—"}</td>
                      <td className="py-2 px-3">{bo.status || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Drawer>
      )}

      {/* Overview Drawer */}
      {overviewOpen && (
        <Drawer title={`Overview • ${overviewFor?.name || ""}`} onClose={() => setOverviewOpen(false)} wide>
          {overviewErr && <div className="text-sm text-red-600 mb-2">{overviewErr}</div>}
          {!overview ? (
            <div className="text-sm text-gray-500">Loading…</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KPI title="Staff" value={overview.kpis?.staffCount ?? "—"} tone="indigo" />
                <KPI title="Borrowers" value={overview.kpis?.borrowers ?? "—"} tone="blue" />
                <KPI title="Loans" value={overview.kpis?.loans?.total ?? "—"} tone="emerald" />
                <KPI
                  title="Outstanding"
                  value={overview.kpis?.loans?.outstanding != null ? `TZS ${Number(overview.kpis.loans.outstanding).toLocaleString()}` : "—"}
                  tone="amber"
                />
                <KPI
                  title="Collections (30d)"
                  value={overview.kpis?.collections?.last30Days != null ? `TZS ${Number(overview.kpis.collections.last30Days).toLocaleString()}` : "—"}
                  tone="indigo"
                />
                <KPI
                  title="Expenses (this month)"
                  value={overview.kpis?.expenses?.thisMonth != null ? `TZS ${Number(overview.kpis.expenses.thisMonth).toLocaleString()}` : "—"}
                  tone="rose"
                />
              </div>

              <div className="bg-white border rounded-xl p-3">
                <div className="text-xs text-gray-500 mb-2">Branch</div>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 text-sm">
                  <div><b>Name:</b> {overview.branch?.name || "—"}</div>
                  <div><b>Code:</b> {overview.branch?.code ?? "—"}</div>
                  <div><b>Phone:</b> {overview.branch?.phone || "—"}</div>
                  <div><b>Address:</b> {overview.branch?.address || "—"}</div>
                  <div><b>Created:</b> {overview.branch?.createdAt?.slice(0,10) || "—"}</div>
                  <div><b>Tenant ID:</b> {overview.branch?.tenantId || "—"}</div>
                </div>
              </div>
            </div>
          )}
        </Drawer>
      )}

      {/* Assign Drawer (per branch) */}
      {assignOpen && (
        <AssignDrawer
          me={me}
          branchesBase={branchesBase}
          branch={assignFor}
          onClose={() => setAssignOpen(false)}
        />
      )}
    </div>
  );
}

/* ----------------------------- Add Branch ------------------------- */
function AddBranch({ branchesBase, apiUnavailable }) {
  const [form, setForm] = useState({ name: "", code: "", phone: "", address: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [reqId, setReqId] = useState("");

  const submit = async () => {
    if (!branchesBase) { setErr(apiUnavailable ? "Branches API not available." : "Detecting endpoint…"); return; }
    setSaving(true); setErr(""); setMsg(""); setReqId("");

    const payload = {
      name: cleanString(form.name),
      code: form.code == null ? null : String(form.code).trim(),
      phone: cleanString(onlyDigits(form.phone)),
      address: cleanString(form.address),
    };

    const r = await tryOnePOST(branchesBase, payload);
    setSaving(false);

    if (r.ok) {
      setMsg("Branch created.");
      setForm({ name: "", code: "", phone: "", address: "" });
    } else {
      const data = r?.error?.response?.data;
      setReqId(data?.requestId || "");
      setErr(data?.error || data?.message || r?.error?.message || "Failed to create branch");
    }
  };

  return (
    <div className="bg-white border rounded-xl p-3 grid gap-2 md:grid-cols-4 items-end">
      {["name", "code", "phone", "address"].map((k) => (
        <div key={k}>
          <label className="block text-xs text-gray-500 capitalize">{k}</label>
          <input
            className="border rounded px-2 py-1 text-sm w-full"
            value={form[k]}
            onChange={(e) => setForm((s) => ({ ...s, [k]: e.target.value }))}
            placeholder={k === "code" ? "e.g. 1" : k === "phone" ? "digits only" : ""}
          />
        </div>
      ))}
      <PrimaryButton onClick={submit} disabled={saving || !branchesBase}>
        {saving ? "Saving…" : "Create"}
      </PrimaryButton>
      {msg && <div className="text-sm text-emerald-700">{msg}</div>}
      {(err || reqId) && (
        <div className="text-sm text-red-600 col-span-full">
          {err} {reqId ? <span className="text-xs opacity-80">(requestId: {reqId})</span> : null}
        </div>
      )}
    </div>
  );
}

/* ----------------------------- Assign Drawer (per-branch) -------- */
function AssignDrawer({ me, branchesBase, branch, onClose }) {
  const [users, setUsers] = useState([]);
  const [borrowers, setBorrowers] = useState([]);
  const [uSel, setUSel] = useState(new Set());
  const [bSel, setBSel] = useState(new Set());
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const [u, b] = await Promise.all([
        tryOneGET("/users", { params: { limit: 1000 } }),
        tryOneGET("/borrowers", { params: { limit: 1000 } }),
      ]);
      if (u.ok) {
        const data = u.data; const items = data?.items || data?.rows || data?.data || data || [];
        setUsers(items);
      }
      if (b.ok) {
        const data = b.data; const items = data?.items || data?.rows || data?.data || data || [];
        setBorrowers(items);
      }
    })();
  }, []);

  const postAssignStaff = async () => {
    if (!branchesBase || !branch?.id) return;
    const ids = [...uSel];
    const r = await tryOnePOST(`${branchesBase}/${branch.id}/assign-staff`, { userIds: ids });
    if (r.ok) { setMsg(`Assigned ${ids.length} staff.`); setErr(""); } else setErr(r?.error?.response?.data?.error || r?.error?.message || "Failed to assign staff.");
  };

  const postAssignBorrowers = async () => {
    if (!branchesBase || !branch?.id) return;
    const ids = [...bSel];
    let r = await tryOnePOST(`${branchesBase}/${branch.id}/assign-borrowers`, { borrowerIds: ids });
    if (!r.ok) {
      for (const id of ids) await tryOnePUT(`/borrowers/${id}`, { branchId: branch.id });
      r = { ok: true };
    }
    if (r.ok) { setMsg(`Assigned ${ids.length} borrowers.`); setErr(""); } else setErr(r?.error?.response?.data?.error || r?.error?.message || "Failed to assign borrowers.");
  };

  const toggle = (set, id, setter) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    setter(next);
  };

  return (
    <Drawer title={`Assign • ${branch?.name || ""}`} onClose={onClose} wide>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Staff */}
        <div className="bg-white border rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">Staff</h4>
            <div className="flex gap-2">
              <SecondaryButton className="px-2 py-1" onClick={() => setUSel(new Set(users.map(u => u.id)))}>Select all</SecondaryButton>
              <SecondaryButton className="px-2 py-1" onClick={() => setUSel(new Set())}>Clear</SecondaryButton>
              <PrimaryButton className="px-2 py-1" disabled={!can({ ...me }, "branches:assign") || uSel.size === 0} onClick={postAssignStaff}>
                Assign selected
              </PrimaryButton>
            </div>
          </div>
          <div className="border rounded-xl overflow-x-auto max-h-[45vh]">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 border-b">
                  <th className="py-2 px-3">Pick</th><th className="py-2 px-3">Name</th><th className="py-2 px-3">Email</th><th className="py-2 px-3">Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b">
                    <td className="py-2 px-3"><input type="checkbox" checked={uSel.has(u.id)} onChange={() => toggle(uSel, u.id, setUSel)} /></td>
                    <td className="py-2 px-3">{u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim()}</td>
                    <td className="py-2 px-3">{u.email}</td>
                    <td className="py-2 px-3">{u.role || (u.Roles || []).map((r) => r.name).join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Borrowers */}
        <div className="bg-white border rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">Borrowers</h4>
            <div className="flex gap-2">
              <SecondaryButton className="px-2 py-1" onClick={() => setBSel(new Set(borrowers.map(b => b.id)))}>Select all</SecondaryButton>
              <SecondaryButton className="px-2 py-1" onClick={() => setBSel(new Set())}>Clear</SecondaryButton>
              <PrimaryButton className="px-2 py-1" disabled={!can({ ...me }, "branches:assign") || bSel.size === 0} onClick={postAssignBorrowers}>
                Assign selected
              </PrimaryButton>
            </div>
          </div>
          <div className="border rounded-xl overflow-x-auto max-h-[45vh]">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 border-b">
                  <th className="py-2 px-3">Pick</th><th className="py-2 px-3">Name</th><th className="py-2 px-3">Phone</th><th className="py-2 px-3">National ID</th>
                </tr>
              </thead>
              <tbody>
                {borrowers.map(bo => (
                  <tr key={bo.id} className="border-b">
                    <td className="py-2 px-3"><input type="checkbox" checked={bSel.has(bo.id)} onChange={() => toggle(bSel, bo.id, setBSel)} /></td>
                    <td className="py-2 px-3">{bo.name || bo.fullName || "—"}</td>
                    <td className="py-2 px-3">{bo.phone || "—"}</td>
                    <td className="py-2 px-3">{bo.nationalId || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {(msg || err) && (
        <div className={`mt-3 text-sm ${err ? "text-red-600" : "text-emerald-700"}`}>{err || msg}</div>
      )}
    </Drawer>
  );
}

/* ----------------------------- Assign Center (global tab) -------- */
function AssignCenter({ branchesBase, apiUnavailable }) {
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [branchId, setBranchId] = useState("");
  const [selected, setSelected] = useState([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      if (!branchesBase) return;
      const [b, u] = await Promise.all([tryOneGET(branchesBase), tryOneGET("/users", { params: { limit: 1000 } })]);
      if (b.ok) {
        const data = b.data; const bItems = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : data?.rows || data?.data || [];
        setBranches(bItems);
      }
      if (u.ok) {
        const data = u.data; const uItems = data?.items || data?.rows || data?.data || data || [];
        setUsers(uItems);
      }
    })();
  }, [branchesBase]);

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const submit = async () => {
    setMsg(""); setErr("");
    if (!branchesBase) { setErr(apiUnavailable ? "Branches API not available." : "Detecting endpoint…"); return; }
    const numericBranchId = toNullableNumber(branchId); if (numericBranchId == null) { setErr("Invalid branch selected."); return; }
    const r = await tryOnePOST(`${branchesBase}/${numericBranchId}/assign-staff`, { userIds: selected });
    if (r.ok) setMsg("Assigned successfully."); else setErr(r?.error?.response?.data?.error || r?.error?.message || "Failed to assign staff.");
  };

  return (
    <div className="space-y-3">
      <div className="bg-white border rounded-xl p-3 flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-xs text-gray-500">Branch</label>
          <select className="border rounded px-2 py-1 text-sm min-w-[220px]" value={branchId} onChange={(e) => setBranchId(e.target.value)} disabled={!branchesBase}>
            <option value="">Select branch</option>
            {branches.map((b) => (<option key={b.id ?? b.code} value={b.id}>{b.name}</option>))}
          </select>
        </div>
        <PrimaryButton onClick={submit} disabled={!branchId || selected.length === 0 || !branchesBase}>
          Assign {selected.length ? `(${selected.length})` : ""}
        </PrimaryButton>
        {msg && <div className="text-sm text-emerald-700">{msg}</div>}
        {err && <div className="text-sm text-red-600">{err}</div>}
      </div>

      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600 border-b">
              <th className="py-2 px-3">Assign</th><th className="py-2 px-3">Name</th><th className="py-2 px-3">Email</th><th className="py-2 px-3">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={4} className="p-3 text-gray-500">{branchesBase ? "No users." : "Waiting for endpoint…"}</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b">
                  <td className="py-2 px-3"><input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggle(u.id)} /></td>
                  <td className="py-2 px-3">{u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim()}</td>
                  <td className="py-2 px-3">{u.email}</td>
                  <td className="py-2 px-3">{u.role || (u.Roles || []).map((r) => r.name).join(", ") || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ----------------------------- Branch Reports -------------------- */
function BranchReports({ branchesBase, apiUnavailable }) {
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [kpis, setKpis] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => { (async () => {
    if (!branchesBase) return;
    const r = await tryOneGET(branchesBase);
    if (r.ok) {
      const data = r.data; const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : data?.rows || data?.data || [];
      setBranches(items);
    }
  })(); }, [branchesBase]);

  const run = async () => {
    setErr(""); setKpis(null);
    if (!branchesBase) { setErr(apiUnavailable ? "Branches API not available." : "Detecting endpoint…"); return; }
    const numericBranchId = toNullableNumber(branchId); if (numericBranchId == null) { setErr("Invalid branch selected."); return; }
    const r = await tryOneGET(`${branchesBase}/${numericBranchId}/report`, { params: { from, to } });
    if (r.ok) setKpis(r.data?.kpis || r.data || null);
    else setErr(r?.error?.response?.data?.error || r?.error?.message || "Failed to load report.");
  };

  return (
    <div className="space-y-3">
      <div className="bg-white border rounded-xl p-3 flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-xs text-gray-500">Branch</label>
          <select className="border rounded px-2 py-1 text-sm min-w-[220px]" value={branchId} onChange={(e) => setBranchId(e.target.value)} disabled={!branchesBase}>
            <option value="">Select</option>
            {branches.map((b) => (<option key={b.id ?? b.code} value={b.id}>{b.name}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500">From</label>
          <input type="date" className="border rounded px-2 py-1 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-500">To</label>
          <input type="date" className="border rounded px-2 py-1 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <PrimaryButton onClick={run} disabled={!branchId || !branchesBase}>Run</PrimaryButton>
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}

      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI title="Staff" value={kpis.staffCount} tone="indigo" />
          <KPI title="Expenses" value={`TZS ${Number(kpis.expenses || 0).toLocaleString()}`} tone="amber" />
          <KPI title="Loans Out" value={`TZS ${Number(kpis.loansOut || kpis.disbursed || 0).toLocaleString()}`} tone="emerald" />
          <KPI title="Collections" value={`TZS ${Number(kpis.collections || kpis.collected || 0).toLocaleString()}`} tone="blue" />
        </div>
      )}
    </div>
  );
}

function KPI({ title, value, tone = "indigo" }) {
  const tones = {
    indigo: "text-indigo-600 bg-indigo-50",
    amber: "text-amber-600 bg-amber-50",
    emerald: "text-emerald-600 bg-emerald-50",
    blue: "text-blue-600 bg-blue-50",
    rose: "text-rose-600 bg-rose-50",
  }[tone] || "text-slate-600 bg-slate-50";
  return (
    <div className="bg-white border rounded-xl p-3 flex items-center gap-3">
      <div className={`px-2 py-1 rounded ${tones}`}>{title}</div>
      <div className="font-semibold">{value ?? "—"}</div>
    </div>
  );
}

/* ----------------------------- Modal/Drawer (via Portal) ---- */
function useLockBodyScroll() {
  useEffect(() => {
    const { body } = document;
    const prev = body.style.overflow;
    body.style.overflow = "hidden";
    return () => { body.style.overflow = prev || ""; };
  }, []);
}
function Modal({ title, children, onClose }) {
  useLockBodyScroll();
  return (
    <PortalRoot>
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl border shadow p-4 w-full max-w-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">{title}</h3>
            <button onClick={onClose} className="text-sm px-2 py-1 border rounded">✕</button>
          </div>
          {children}
        </div>
      </div>
    </PortalRoot>
  );
}

/**
 * Drawer
 * - Default: right sheet with 3xl/5xl max width
 * - wide: wider sheet
 * - full: takes the entire viewport (for Staff & Borrowers)
 */
function Drawer({ title, children, onClose, wide = false, full = false }) {
  useLockBodyScroll();
  return (
    <PortalRoot>
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/30" onClick={onClose} />
        <div
          className={
            full
              ? "absolute inset-0 w-full h-full bg-white p-4 overflow-auto"
              : `absolute right-0 top-0 h-full w-full ${wide ? "max-w-5xl" : "max-w-3xl"} bg-white border-l shadow-xl p-4`
          }
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">{title}</h3>
            <button onClick={onClose} className="text-sm px-2 py-1 border rounded">✕</button>
          </div>
          {children}
        </div>
      </div>
    </PortalRoot>
  );
}
