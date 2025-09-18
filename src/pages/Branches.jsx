// src/pages/Branches.jsx
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import api from "../api";

/* ---------------- permission helper (unchanged) ---------------- */
const can = (me, action) => {
  if (!me) return false;
  if (
    ["admin", "director", "super_admin", "system_admin"].includes(
      (me.role || "").toLowerCase()
    )
  )
    return true;
  return Array.isArray(me.permissions) && me.permissions.includes(action);
};

/* ---------------- tolerant request helpers --------------------- */
async function tryOneGET(path, opts = {}) {
  try {
    const res = await api.get(path, opts);
    return { ok: true, data: res?.data };
  } catch (e) {
    return { ok: false, error: e };
  }
}
async function tryOnePOST(path, body = {}, opts = {}) {
  try {
    const res = await api.post(path, body, opts);
    return { ok: true, data: res?.data };
  } catch (e) {
    return { ok: false, error: e };
  }
}
async function tryOnePUT(path, body = {}, opts = {}) {
  try {
    const res = await api.put(path, body, opts);
    return { ok: true, data: res?.data };
  } catch (e) {
    return { ok: false, error: e };
  }
}
async function tryOneDELETE(path, opts = {}) {
  try {
    const res = await api.delete(path, opts);
    return { ok: true, data: res?.data };
  } catch (e) {
    return { ok: false, error: e };
  }
}

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

/* ---------------- small helpers (unchanged) -------------------- */
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

/* ============================== PAGE ============================== */
export default function Branches() {
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState("overview");

  const BRANCH_PATH_CANDIDATES = useMemo(
    () => [
      "/branches",
      "/org/branches",
      // add "/api/branches" only if your axios baseURL is the origin root
    ],
    []
  );
  const [branchesBase, setBranchesBase] = useState(null);
  const [apiUnavailable, setApiUnavailable] = useState(false);

  useEffect(() => {
    (async () => {
      const base = await discoverBranchesBase(BRANCH_PATH_CANDIDATES);
      if (base) {
        setBranchesBase(base);
        setApiUnavailable(false);
      } else {
        setApiUnavailable(true);
      }
    })();
  }, [BRANCH_PATH_CANDIDATES]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/auth/me");
        setMe(data);
      } catch {}
    })();
  }, []);

  if (!me) return <div className="p-4">Loading…</div>;

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Branches</h1>
          <p className="text-xs text-slate-500">
            View branches and perform common operations.
          </p>
          {apiUnavailable && (
            <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 inline-block">
              Branches API not enabled on this backend. Listing/creating and assignments are disabled.
            </div>
          )}
        </div>
        <div className="flex gap-1 rounded-lg border bg-white overflow-hidden">
          <Tab label="Overview" id="overview" tab={tab} setTab={setTab} />
          {can(me, "branches:manage") && (
            <Tab label="Add" id="add" tab={tab} setTab={setTab} />
          )}
          {can(me, "branches:assign") && (
            <Tab label="Assign" id="assign" tab={tab} setTab={setTab} />
          )}
          <Tab label="Reports" id="reports" tab={tab} setTab={setTab} />
        </div>
      </header>

      {tab === "overview" && (
        <Overview
          me={me}
          branchesBase={branchesBase}
          apiUnavailable={apiUnavailable}
        />
      )}
      {tab === "add" && can(me, "branches:manage") && (
        <AddBranch branchesBase={branchesBase} apiUnavailable={apiUnavailable} />
      )}
      {tab === "assign" && can(me, "branches:assign") && (
        <AssignStaff branchesBase={branchesBase} apiUnavailable={apiUnavailable} />
      )}
      {tab === "reports" && (
        <BranchReports branchesBase={branchesBase} apiUnavailable={apiUnavailable} />
      )}
    </div>
  );
}

/* ----------------------------- UI Bits ---------------------------- */
function Tab({ label, id, tab, setTab }) {
  const active = tab === id;
  return (
    <button
      onClick={() => setTab(id)}
      className={`px-3 py-1.5 text-sm ${
        active ? "bg-slate-100" : "bg-white hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

/* ----------------------------- Overview --------------------------- */
function Overview({ me, branchesBase, apiUnavailable }) {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // UI state: modals/drawers
  const [editOpen, setEditOpen] = useState(false);
  const [editModel, setEditModel] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false); // soft delete
  const [confirmTarget, setConfirmTarget] = useState(null);

  const [hardOpen, setHardOpen] = useState(false); // hard delete
  const [hardTarget, setHardTarget] = useState(null);

  const [staffOpen, setStaffOpen] = useState(false);
  const [staffFor, setStaffFor] = useState(null);
  const [staffRows, setStaffRows] = useState([]);
  const [staffErr, setStaffErr] = useState("");

  const [borrowersOpen, setBorrowersOpen] = useState(false);
  const [borrowersFor, setBorrowersFor] = useState(null);
  const [borrowersRows, setBorrowersRows] = useState([]);
  const [borrowersErr, setBorrowersErr] = useState("");

  const [overviewOpen, setOverviewOpen] = useState(false);
  const [overviewFor, setOverviewFor] = useState(null);
  const [overview, setOverview] = useState(null);
  const [overviewErr, setOverviewErr] = useState("");

  const load = async () => {
    if (!branchesBase) {
      setRows([]);
      setErr(apiUnavailable ? "" : "Detecting endpoint…");
      return;
    }
    setLoading(true);
    setErr("");
    const r = await tryOneGET(branchesBase, { params: { q } });
    setLoading(false);
    if (r.ok) {
      const data = r.data;
      const items = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
        ? data
        : data?.rows || data?.data || [];
      setRows(items);
    } else {
      setErr(
        r?.error?.response?.data?.error ||
          r?.error?.message ||
          "Failed to load branches."
      );
      setRows([]);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchesBase]);

  // ----- Actions -----
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

  const onDisable = (b) => {
    setConfirmTarget(b);
    setConfirmOpen(true);
  };

  const onHardDelete = (b) => {
    setHardTarget(b);
    setHardOpen(true);
  };

  const onViewStaff = async (b) => {
    setStaffFor(b);
    setStaffOpen(true);
    setStaffRows([]);
    setStaffErr("");
    if (!branchesBase || !b?.id) return;
    const r = await tryOneGET(`${branchesBase}/${b.id}/staff`);
    if (r.ok) {
      setStaffRows(r.data?.items || r.data || []);
    } else {
      setStaffErr(
        r?.error?.response?.data?.error || r?.error?.message || "Failed to load staff."
      );
    }
  };

  const unassignStaff = async (userId) => {
    if (!branchesBase || !staffFor?.id || !userId) return;
    const r = await tryOneDELETE(`${branchesBase}/${staffFor.id}/staff/${userId}`);
    if (!r.ok) {
      const msg =
        r?.error?.response?.data?.error ||
        r?.error?.message ||
        "Failed to unassign.";
      setStaffErr(msg);
      return;
    }
    onViewStaff(staffFor);
  };

  const onViewBorrowers = async (b) => {
    setBorrowersFor(b);
    setBorrowersOpen(true);
    setBorrowersRows([]);
       setBorrowersErr("");
    // Prefer branch route; fallback to legacy
    let r = await tryOneGET(`${branchesBase}/${b?.id}/borrowers`);
    if (!r.ok) {
      r = await tryOneGET(`/borrowers`, {
        params: { branchId: b?.id, limit: 500 },
      });
    }
    if (r.ok) {
      const data = r.data;
      const items = data?.items || data?.rows || data?.data || data || [];
      setBorrowersRows(items);
    } else {
      setBorrowersErr(
        r?.error?.response?.data?.error ||
          r?.error?.message ||
          "Borrowers endpoint not available."
      );
    }
  };

  const onViewOverview = async (b) => {
    setOverviewFor(b);
    setOverviewOpen(true);
    setOverview(null);
    setOverviewErr("");
    if (!branchesBase || !b?.id) return;
    const r = await tryOneGET(`${branchesBase}/${b.id}/overview`);
    if (r.ok) {
      setOverview(r.data);
    } else {
      setOverviewErr(
        r?.error?.response?.data?.error ||
          r?.error?.message ||
          "Failed to load overview."
      );
    }
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
    if (r.ok) {
      setEditOpen(false);
      setEditModel(null);
      load();
    } else {
      alert(
        r?.error?.response?.data?.error ||
          r?.error?.message ||
          "Failed to update branch."
      );
    }
  };

  const confirmDisable = async () => {
    if (!branchesBase || !confirmTarget?.id) return;
    const r = await tryOneDELETE(`${branchesBase}/${confirmTarget.id}`);
    if (!r.ok) {
      alert(
        r?.error?.response?.data?.error ||
          r?.error?.message ||
          "Failed to disable branch."
      );
    }
    setConfirmOpen(false);
    setConfirmTarget(null);
    load();
  };

  const confirmHardDelete = async () => {
    if (!branchesBase || !hardTarget?.id) return;
    // try to hint backend for hard-delete; safe if ignored
    const r = await tryOneDELETE(`${branchesBase}/${hardTarget.id}`, {
      params: { force: 1, hard: 1 },
      headers: { "X-Force-Delete": "1" },
      data: { force: true }, // some servers read delete body
    });
    if (!r.ok) {
      alert(
        r?.error?.response?.data?.error ||
          r?.error?.message ||
          "Failed to delete branch."
      );
    }
    setHardOpen(false);
    setHardTarget(null);
    load();
  };

  return (
    <div className="space-y-3">
      <div className="bg-white border rounded-xl p-3 flex gap-2 items-end">
        <div>
          <label className="block text-xs text-gray-500">Search</label>
          <input
            className="border rounded px-2 py-1 text-sm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="name, code, phone…"
          />
        </div>
        <button
          onClick={load}
          disabled={!branchesBase}
          className="px-3 py-2 border rounded-lg bg-white hover:bg-gray-50 text-sm disabled:opacity-60"
        >
          {loading ? "Loading…" : "Apply"}
        </button>
      </div>
      {err && <div className="text-sm text-red-600">{err}</div>}
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
              <tr>
                <td colSpan={6} className="p-3 text-gray-500">
                  {branchesBase ? "No branches yet." : "Waiting for endpoint…"}
                </td>
              </tr>
            ) : (
              rows.map((b) => (
                <tr key={b.id ?? b.code ?? Math.random()} className="border-b">
                  <td className="py-2 px-3">{b.name}</td>
                  <td className="py-2 px-3">{b.code ?? "—"}</td>
                  <td className="py-2 px-3">{b.phone ?? "—"}</td>
                  <td className="py-2 px-3">{b.address ?? "—"}</td>
                  <td className="py-2 px-3">
                    {b.managerName || b.manager_id || b.managerId || "—"}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => onViewOverview(b)}
                        className="px-2 py-1 border rounded hover:bg-gray-50"
                        title="Overview"
                      >
                        View
                      </button>
                      <button
                        onClick={() => onViewStaff(b)}
                        className="px-2 py-1 border rounded hover:bg-gray-50"
                        title="View Staff"
                      >
                        Staff
                      </button>
                      <button
                        onClick={() => onViewBorrowers(b)}
                        className="px-2 py-1 border rounded hover:bg-gray-50"
                        title="View Borrowers"
                      >
                        Borrowers
                      </button>
                      <button
                        onClick={() => onEdit(b)}
                        className="px-2 py-1 border rounded hover:bg-gray-50"
                        disabled={!can({ ...me }, "branches:manage")}
                        title="Edit"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDisable(b)}
                        className="px-2 py-1 border rounded hover:bg-red-50 text-red-700"
                        disabled={!can({ ...me }, "branches:manage")}
                        title="Disable (soft delete)"
                      >
                        Disable
                      </button>
                      <button
                        onClick={() => onHardDelete(b)}
                        className="px-2 py-1 border rounded hover:bg-red-100 text-red-800"
                        disabled={!can({ ...me }, "branches:manage")}
                        title="Delete permanently"
                      >
                        Delete
                      </button>
                    </div>
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
                <label className="block text-xs text-gray-500 capitalize">
                  {k === "managerId" ? "Manager ID" : k}
                </label>
                <input
                  className="border rounded px-2 py-1 text-sm w-full"
                  value={editModel?.[k] ?? ""}
                  onChange={(e) =>
                    setEditModel((s) => ({ ...s, [k]: e.target.value }))
                  }
                  placeholder={
                    k === "code"
                      ? "e.g. 1"
                      : k === "phone"
                      ? "digits only"
                      : ""
                  }
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => setEditOpen(false)}
              className="px-3 py-2 border rounded bg-white hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={saveEdit}
              className="px-3 py-2 border rounded bg-slate-900 text-white text-sm"
            >
              Save
            </button>
          </div>
        </Modal>
      )}

      {/* Confirm Disable (soft) */}
      {confirmOpen && (
        <Modal onClose={() => setConfirmOpen(false)} title="Disable Branch">
          <p className="text-sm">
            This will <b>soft-delete</b> the branch (disable) so it won’t appear
            in normal lists. Continue?
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => setConfirmOpen(false)}
              className="px-3 py-2 border rounded bg-white hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={confirmDisable}
              className="px-3 py-2 border rounded bg-red-600 text-white text-sm"
            >
              Disable
            </button>
          </div>
        </Modal>
      )}

      {/* Confirm Hard Delete */}
      {hardOpen && (
        <Modal onClose={() => setHardOpen(false)} title="Delete Branch">
          <p className="text-sm">
            This will <b>permanently delete</b> the branch and may not be reversible.
            Continue?
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => setHardOpen(false)}
              className="px-3 py-2 border rounded bg-white hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={confirmHardDelete}
              className="px-3 py-2 border rounded bg-red-700 text-white text-sm"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}

      {/* Staff Drawer */}
      {staffOpen && (
        <Drawer
          title={`Staff • ${staffFor?.name || ""}`}
          onClose={() => setStaffOpen(false)}
          wide
        >
          {staffErr && <div className="text-sm text-red-600 mb-2">{staffErr}</div>}
          <div className="border rounded-xl overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 border-b">
                  <th className="py-2 px-3">Name</th>
                  <th className="py-2 px-3">Email</th>
                  <th className="py-2 px-3">Role</th>
                  <th className="py-2 px-3 w-1">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(staffRows || []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-3 text-gray-500">
                      No staff assigned.
                    </td>
                  </tr>
                ) : (
                  staffRows.map((u) => (
                    <tr key={u.id} className="border-b">
                      <td className="py-2 px-3">{u.name || "—"}</td>
                      <td className="py-2 px-3">{u.email || "—"}</td>
                      <td className="py-2 px-3">{u.role || "—"}</td>
                      <td className="py-2 px-3">
                        <button
                          onClick={() => unassignStaff(u.id)}
                          className="px-2 py-1 border rounded hover:bg-gray-50"
                          disabled={!can({ ...me }, "branches:assign")}
                        >
                          Unassign
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Drawer>
      )}

      {/* Borrowers Drawer */}
      {borrowersOpen && (
        <Drawer
          title={`Borrowers • ${borrowersFor?.name || ""}`}
          onClose={() => setBorrowersOpen(false)}
          wide
        >
          {borrowersErr && (
            <div className="text-sm text-amber-700 mb-2">{borrowersErr}</div>
          )}
          <div className="border rounded-xl overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 border-b">
                  <th className="py-2 px-3">Name</th>
                  <th className="py-2 px-3">Phone</th>
                  <th className="py-2 px-3">National ID</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {(borrowersRows || []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-3 text-gray-500">
                      {borrowersErr
                        ? "Endpoint not available."
                        : "No borrowers found."}
                    </td>
                  </tr>
                ) : (
                  borrowersRows.map((bo) => (
                    <tr key={bo.id} className="border-b">
                      <td className="py-2 px-3">{bo.name || bo.fullName || "—"}</td>
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
        <Drawer
          title={`Overview • ${overviewFor?.name || ""}`}
          onClose={() => setOverviewOpen(false)}
          wide
        >
          {overviewErr && (
            <div className="text-sm text-red-600 mb-2">{overviewErr}</div>
          )}
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
                  value={
                    overview.kpis?.loans?.outstanding != null
                      ? `TZS ${Number(overview.kpis.loans.outstanding).toLocaleString()}`
                      : "—"
                  }
                  tone="amber"
                />
                <KPI
                  title="Collections (30d)"
                  value={
                    overview.kpis?.collections?.last30Days != null
                      ? `TZS ${Number(overview.kpis.collections.last30Days).toLocaleString()}`
                      : "—"
                  }
                  tone="indigo"
                />
                <KPI
                  title="Expenses (this month)"
                  value={
                    overview.kpis?.expenses?.thisMonth != null
                      ? `TZS ${Number(overview.kpis.expenses.thisMonth).toLocaleString()}`
                      : "—"
                  }
                  tone="rose"
                />
                {overview.kpis?.savings && (
                  <>
                    <KPI
                      title="Savings deposits (month)"
                      value={`TZS ${Number(overview.kpis.savings.depositsThisMonth || 0).toLocaleString()}`}
                      tone="emerald"
                    />
                    <KPI
                      title="Savings withdrawals (month)"
                      value={`TZS ${Number(overview.kpis.savings.withdrawalsThisMonth || 0).toLocaleString()}`}
                      tone="amber"
                    />
                  </>
                )}
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
    </div>
  );
}

/* ----------------------------- Add Branch ------------------------- */
function AddBranch({ branchesBase, apiUnavailable }) {
  const [form, setForm] = useState({
    name: "",
    code: "",
    phone: "",
    address: "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [reqId, setReqId] = useState("");

  const submit = async () => {
    if (!branchesBase) {
      setErr(apiUnavailable ? "Branches API not available." : "Detecting endpoint…");
      return;
    }

    setSaving(true);
    setErr("");
    setMsg("");
    setReqId("");

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
      setErr(
        data?.error ||
          data?.message ||
          r?.error?.message ||
          "Failed to create branch"
      );
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
            onChange={(e) =>
              setForm((s) => ({ ...s, [k]: e.target.value }))
            }
            placeholder={
              k === "code" ? "e.g. 1" : k === "phone" ? "digits only" : ""
            }
          />
        </div>
      ))}
      <button
        onClick={submit}
        disabled={saving || !branchesBase}
        className="px-3 py-2 border rounded-lg bg-white hover:bg-gray-50 text-sm disabled:opacity-60"
      >
        {saving ? "Saving…" : "Create"}
      </button>
      {msg && <div className="text-sm text-emerald-700">{msg}</div>}
      {(err || reqId) && (
        <div className="text-sm text-red-600 col-span-full">
          {err}
          {reqId ? (
            <>
              {" "}
              <span className="text-xs opacity-80">
                (requestId: {reqId})
              </span>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

/* ----------------------------- Assign Staff ----------------------- */
function AssignStaff({ branchesBase, apiUnavailable }) {
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [branchId, setBranchId] = useState("");
  const [selected, setSelected] = useState([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      if (!branchesBase) return;
      const [b, u] = await Promise.all([
        tryOneGET(branchesBase),
        tryOneGET("/users", { params: { limit: 1000 } }),
      ]);
      if (b.ok) {
        const data = b.data;
        const bItems = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
          ? data
          : data?.rows || data?.data || [];
        setBranches(bItems);
      }
      if (u.ok) {
        const data = u.data;
        const uItems = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.rows)
          ? data.rows
          : Array.isArray(data)
          ? data
          : data?.data || [];
        setUsers(uItems);
      }
    })();
  }, [branchesBase]);

  const toggle = (id) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const submit = async () => {
    setMsg("");
    setErr("");
    if (!branchesBase) {
      setErr(apiUnavailable ? "Branches API not available." : "Detecting endpoint…");
      return;
    }
    const numericBranchId = toNullableNumber(branchId);
    if (numericBranchId == null) {
      setErr("Invalid branch selected.");
      return;
    }
    const r = await tryOnePOST(`${branchesBase}/${numericBranchId}/assign-staff`, {
      userIds: selected,
    });
    if (r.ok) {
      setMsg("Assigned successfully.");
    } else {
      setErr(r?.error?.response?.data?.error || r?.error?.message || "Failed to assign staff.");
    }
  };

  return (
    <div className="space-y-3">
      <div className="bg-white border rounded-xl p-3 flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-xs text-gray-500">Branch</label>
          <select
            className="border rounded px-2 py-1 text-sm min-w-[220px]"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            disabled={!branchesBase}
          >
            <option value="">Select branch</option>
            {branches.map((b) => (
              <option key={b.id ?? b.code} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={submit}
          disabled={!branchId || selected.length === 0 || !branchesBase}
          className="px-3 py-2 border rounded-lg bg-white hover:bg-gray-50 text-sm disabled:opacity-60"
        >
          Assign {selected.length ? `(${selected.length})` : ""}
        </button>
        {msg && <div className="text-sm text-emerald-700">{msg}</div>}
        {err && <div className="text-sm text-red-600">{err}</div>}
      </div>

      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600 border-b">
              <th className="py-2 px-3">Assign</th>
              <th className="py-2 px-3">Name</th>
              <th className="py-2 px-3">Email</th>
              <th className="py-2 px-3">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-3 text-gray-500">
                  {branchesBase ? "No users." : "Waiting for endpoint…"}
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b">
                  <td className="py-2 px-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(u.id)}
                      onChange={() => toggle(u.id)}
                    />
                  </td>
                  <td className="py-2 px-3">
                    {u.name ||
                      `${u.firstName || ""} ${u.lastName || ""}`.trim()}
                  </td>
                  <td className="py-2 px-3">{u.email}</td>
                  <td className="py-2 px-3">
                    {u.role || (u.Roles || []).map((r) => r.name).join(", ") || "—"}
                  </td>
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

  useEffect(() => {
    (async () => {
      if (!branchesBase) return;
      const r = await tryOneGET(branchesBase);
      if (r.ok) {
        const data = r.data;
        const items = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
          ? data
          : data?.rows || data?.data || [];
        setBranches(items);
      }
    })();
  }, [branchesBase]);

  const run = async () => {
    setErr("");
    setKpis(null);
    if (!branchesBase) {
      setErr(apiUnavailable ? "Branches API not available." : "Detecting endpoint…");
      return;
    }
    const numericBranchId = toNullableNumber(branchId);
    if (numericBranchId == null) {
      setErr("Invalid branch selected.");
      return;
    }
    const r = await tryOneGET(`${branchesBase}/${numericBranchId}/report`, {
      params: { from, to },
    });
    if (r.ok) {
      setKpis(r.data?.kpis || r.data || null);
    } else {
      setErr(r?.error?.response?.data?.error || r?.error?.message || "Failed to load report.");
    }
  };

  return (
    <div className="space-y-3">
      <div className="bg-white border rounded-xl p-3 flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-xs text-gray-500">Branch</label>
          <select
            className="border rounded px-2 py-1 text-sm min-w-[220px]"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            disabled={!branchesBase}
          >
            <option value="">Select</option>
            {branches.map((b) => (
              <option key={b.id ?? b.code} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500">From</label>
          <input
            type="date"
            className="border rounded px-2 py-1 text-sm"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500">To</label>
          <input
            type="date"
            className="border rounded px-2 py-1 text-sm"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <button
          onClick={run}
          disabled={!branchId || !branchesBase}
          className="px-3 py-2 border rounded-lg bg-white hover:bg-gray-50 text-sm disabled:opacity-60"
        >
          Run
        </button>
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}

      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI title="Staff" value={kpis.staffCount} tone="indigo" />
          <KPI
            title="Expenses"
            value={`TZS ${Number(kpis.expenses || 0).toLocaleString()}`}
            tone="amber"
          />
          <KPI
            title="Loans Out"
            value={`TZS ${Number(kpis.loansOut || kpis.disbursed || 0).toLocaleString()}`}
            tone="emerald"
          />
          <KPI
            title="Collections"
            value={`TZS ${Number(kpis.collections || kpis.collected || 0).toLocaleString()}`}
            tone="blue"
          />
        </div>
      )}
    </div>
  );
}

function KPI({ title, value, tone = "indigo" }) {
  const tones =
    {
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

/* ----------------------------- Tiny Modal/Drawer (via Portal) ---- */
function Portal({ children }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

function useLockBodyScroll() {
  useEffect(() => {
    const { body } = document;
    const prev = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = prev || "";
    };
  }, []);
}

function Modal({ title, children, onClose }) {
  useLockBodyScroll();
  return (
    <Portal>
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl border shadow p-4 w-full max-w-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">{title}</h3>
            <button onClick={onClose} className="text-sm px-2 py-1 border rounded">
              ✕
            </button>
          </div>
          {children}
        </div>
      </div>
    </Portal>
  );
}

function Drawer({ title, children, onClose, wide = false }) {
  useLockBodyScroll();
  return (
    <Portal>
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/30" onClick={onClose} />
        <div
          className={`absolute right-0 top-0 h-full w-full ${
            wide ? "max-w-5xl" : "max-w-3xl"
          } bg-white border-l shadow-xl p-4`}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">{title}</h3>
            <button onClick={onClose} className="text-sm px-2 py-1 border rounded">
              ✕
            </button>
          </div>
          {children}
        </div>
      </div>
    </Portal>
  );
}
