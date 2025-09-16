import { useEffect, useMemo, useState } from "react";
import api from "../api";

const can = (me, action) => {
  if (!me) return false;
  if (["admin", "director", "super_admin", "system_admin"].includes((me.role || "").toLowerCase())) return true;
  return Array.isArray(me.permissions) && me.permissions.includes(action);
};

export default function Branches() {
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState("overview");

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
        <h1 className="text-xl font-semibold">Branches</h1>
        <div className="flex gap-1 rounded-lg border bg-white overflow-hidden">
          <Tab label="Overview" id="overview" tab={tab} setTab={setTab} />
          {can(me, "branches:manage") && <Tab label="Add" id="add" tab={tab} setTab={setTab} />}
          {can(me, "branches:assign") && <Tab label="Assign" id="assign" tab={tab} setTab={setTab} />}
          <Tab label="Reports" id="reports" tab={tab} setTab={setTab} />
        </div>
      </header>

      {tab === "overview" && <Overview canManage={can(me, "branches:manage")} />}
      {tab === "add" && can(me, "branches:manage") && <AddBranch />}
      {tab === "assign" && can(me, "branches:assign") && <AssignStaff />}
      {tab === "reports" && <BranchReports />}
    </div>
  );
}

function Tab({ label, id, tab, setTab }) {
  const active = tab === id;
  return (
    <button
      onClick={() => setTab(id)}
      className={`px-3 py-1.5 text-sm ${active ? "bg-slate-100" : "bg-white hover:bg-slate-50"}`}
    >
      {label}
    </button>
  );
}

/* ------------------------------- Overview --------------------------------- */
function Overview({ canManage }) {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [drawerId, setDrawerId] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setErr("");
    try {
      const { data } = await api.get("/branches", { params: { q } });
      const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setRows(items);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    }
  };

  useEffect(() => { load(); /* initial */ }, []); // eslint-disable-line

  const current = useMemo(() => rows.find(r => String(r.id) === String(drawerId)) || null, [rows, drawerId]);

  const onDelete = async (id) => {
    if (!canManage) return;
    if (!window.confirm("Delete this branch?")) return;
    try {
      await api.delete(`/branches/${id}`);
      setRows(prev => prev.filter(x => String(x.id) !== String(id)));
      if (drawerId === id) setDrawerId(null);
    } catch (e) {
      alert(e?.response?.data?.error || e.message || "Delete failed");
    }
  };

  const onSaveEdit = async (form) => {
    if (!editRow) return;
    setSaving(true);
    try {
      const payload = buildBranchPayload(form);
      await api.put(`/branches/${editRow.id}`, payload);
      setEditRow(null);
      load();
    } catch (e) {
      alert(e?.response?.data?.error || e.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="bg-white border rounded-xl p-3 flex gap-2 items-end">
        <div>
          <label className="block text-xs text-gray-500">Search</label>
          <input
            className="border rounded px-2 py-1 text-sm"
            value={q}
            onChange={(e)=>setQ(e.target.value)}
            placeholder="name, code…"
          />
        </div>
        <button onClick={load} className="px-3 py-2 border rounded-lg bg-white hover:bg-gray-50 text-sm">Apply</button>
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600 border-b">
              <th className="py-2 px-3">Name</th>
              <th className="py-2 px-3">Code</th>
              <th className="py-2 px-3">Manager</th>
              <th className="py-2 px-3">Phone</th>
              <th className="py-2 px-3">Address</th>
              <th className="py-2 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="p-3 text-gray-500">No branches yet.</td></tr>
            ) : rows.map(b => (
              <tr key={b.id} className="border-b">
                <td className="py-2 px-3">{b.name}</td>
                <td className="py-2 px-3">{b.code || "—"}</td>
                <td className="py-2 px-3">{b.managerName || b.manager_id || "—"}</td>
                <td className="py-2 px-3">{b.phone || "—"}</td>
                <td className="py-2 px-3">{b.address || "—"}</td>
                <td className="py-2 px-3 text-right space-x-2">
                  <button className="text-blue-600 hover:underline" onClick={()=>setDrawerId(b.id)}>View</button>
                  {canManage && (
                    <>
                      <button className="text-slate-700 hover:underline" onClick={()=>setEditRow(b)}>Edit</button>
                      <button className="text-rose-600 hover:underline" onClick={()=>onDelete(b.id)}>Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Drawer: Branch quick view */}
      {drawerId && current && (
        <BranchDrawer branch={current} onClose={()=>setDrawerId(null)} />
      )}

      {/* Modal: Edit branch */}
      {editRow && (
        <EditModal
          title="Edit Branch"
          initial={editRow}
          saving={saving}
          onCancel={()=>setEditRow(null)}
          onSave={onSaveEdit}
        />
      )}
    </div>
  );
}

/* ------------------------------- Add branch -------------------------------- */
function AddBranch() {
  const [form, setForm] = useState({ name: "", code: "", phone: "", address: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const submit = async () => {
    setSaving(true); setErr(""); setMsg("");
    try {
      const payload = buildBranchPayload(form);
      await api.post("/branches", payload);
      setMsg("Branch created.");
      setForm({ name: "", code: "", phone: "", address: "" });
    } catch (e) {
      // surfaces 22P02 etc. from the server
      setErr(e?.response?.data?.error || e.message || "Internal server error");
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-white border rounded-xl p-3 grid gap-2 md:grid-cols-4 items-end">
      {["name","code","phone","address"].map(k => (
        <div key={k}>
          <label className="block text-xs text-gray-500 capitalize">{k}</label>
          <input
            className="border rounded px-2 py-1 text-sm w-full"
            value={form[k]}
            onChange={(e)=>setForm(s=>({...s,[k]:e.target.value}))}
            placeholder={k === "code" ? "e.g., 001" : ""}
          />
        </div>
      ))}
      <button onClick={submit} disabled={saving || !form.name.trim()} className="px-3 py-2 border rounded-lg bg-white hover:bg-gray-50 text-sm">
        {saving ? "Saving…" : "Create"}
      </button>
      {msg && <div className="text-sm text-emerald-700">{msg}</div>}
      {err && <div className="text-sm text-red-600">{err}</div>}
    </div>
  );
}

/* ------------------------------ Assign staff -------------------------------- */
function AssignStaff() {
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [branchId, setBranchId] = useState("");
  const [selected, setSelected] = useState([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [{data:b}, {data:u}] = await Promise.all([
          api.get("/branches"),
          api.get("/users", { params: { limit: 1000 } }),
        ]);
        const bItems = Array.isArray(b?.items) ? b.items : Array.isArray(b) ? b : [];
        const uItems = Array.isArray(u?.items) ? u.items : Array.isArray(u?.rows) ? u.rows : Array.isArray(u) ? u : [];
        setBranches(bItems);
        setUsers(uItems);
      } catch {}
    })();
  }, []);

  const toggle = (id) => {
    setSelected(s => s.includes(id) ? s.filter(x => x!==id) : [...s, id]);
  };

  const submit = async () => {
    setMsg(""); setErr("");
    try {
      await api.post(`/branches/${branchId}/assign-staff`, { userIds: selected });
      setMsg("Assigned successfully.");
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    }
  };

  return (
    <div className="space-y-3">
      <div className="bg-white border rounded-xl p-3 flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-xs text-gray-500">Branch</label>
          <select className="border rounded px-2 py-1 text-sm min-w-[220px]" value={branchId} onChange={(e)=>setBranchId(e.target.value)}>
            <option value="">Select branch</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <button onClick={submit} disabled={!branchId || selected.length===0} className="px-3 py-2 border rounded-lg bg-white hover:bg-gray-50 text-sm">
          Assign {selected.length ? `(${selected.length})` : ""}
        </button>
        {msg && <div className="text-sm text-emerald-700">{msg}</div>}
        {err && <div className="text-sm text-red-600">{err}</div>}
      </div>

      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead><tr className="text-left text-gray-600 border-b">
            <th className="py-2 px-3">Assign</th>
            <th className="py-2 px-3">Name</th>
            <th className="py-2 px-3">Email</th>
            <th className="py-2 px-3">Role</th>
          </tr></thead>
          <tbody>
          {users.length===0 ? (
            <tr><td colSpan={4} className="p-3 text-gray-500">No users.</td></tr>
          ) : users.map(u => (
            <tr key={u.id} className="border-b">
              <td className="py-2 px-3">
                <input type="checkbox" checked={selected.includes(u.id)} onChange={()=>toggle(u.id)} />
              </td>
              <td className="py-2 px-3">{u.name || `${u.firstName||""} ${u.lastName||""}`.trim()}</td>
              <td className="py-2 px-3">{u.email}</td>
              <td className="py-2 px-3">{u.role || (u.Roles||[]).map(r=>r.name).join(", ") || "—"}</td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------- Reports ----------------------------------- */
function BranchReports() {
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [kpis, setKpis] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/branches");
        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        setBranches(items);
      } catch {}
    })();
  }, []);

  const run = async () => {
    setErr(""); setKpis(null);
    try {
      const { data } = await api.get(`/branches/${branchId}/report`, { params: { from, to } });
      setKpis(data?.kpis || data || null);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    }
  };

  return (
    <div className="space-y-3">
      <div className="bg-white border rounded-xl p-3 flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-xs text-gray-500">Branch</label>
          <select className="border rounded px-2 py-1 text-sm min-w-[220px]" value={branchId} onChange={(e)=>setBranchId(e.target.value)}>
            <option value="">Select</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500">From</label>
          <input type="date" className="border rounded px-2 py-1 text-sm" value={from} onChange={(e)=>setFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-500">To</label>
          <input type="date" className="border rounded px-2 py-1 text-sm" value={to} onChange={(e)=>setTo(e.target.value)} />
        </div>
        <button onClick={run} disabled={!branchId} className="px-3 py-2 border rounded-lg bg-white hover:bg-gray-50 text-sm">Run</button>
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}

      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI title="Staff" value={kpis.staffCount} tone="indigo" />
          <KPI title="Expenses" value={`TZS ${Number(kpis.expenses||0).toLocaleString()}`} tone="amber" />
          <KPI title="Loans Out" value={`TZS ${Number(kpis.loansOut||kpis.disbursed||0).toLocaleString()}`} tone="emerald" />
          <KPI title="Collections" value={`TZS ${Number(kpis.collections||kpis.collected||0).toLocaleString()}`} tone="blue" />
        </div>
      )}
    </div>
  );
}

function KPI({ title, value, tone="indigo" }) {
  const tones = {
    indigo:"text-indigo-600 bg-indigo-50", amber:"text-amber-600 bg-amber-50",
    emerald:"text-emerald-600 bg-emerald-50", blue:"text-blue-600 bg-blue-50"
  }[tone] || "text-slate-600 bg-slate-50";
  return (
    <div className="bg-white border rounded-xl p-3 flex items-center gap-3">
      <div className={`px-2 py-1 rounded ${tones}`}>{title}</div>
      <div className="font-semibold">{value ?? "—"}</div>
    </div>
  );
}

/* --------------------------- Helpers & UI bits ----------------------------- */
function buildBranchPayload(form) {
  // avoid sending empty strings – they often cause 22P02 on the backend
  const t = (v) => (typeof v === "string" ? v.trim() : v);
  const payload = {};
  if (t(form.name)) payload.name = t(form.name);
  if (t(form.code)) payload.code = t(form.code); // keep as string unless your API requires number
  if (t(form.address)) payload.address = t(form.address);
  if (t(form.phone)) {
    const digits = String(form.phone).replace(/[^\d+]/g, "");
    payload.phone = digits || undefined;
  }
  return payload;
}

function EditModal({ title, initial, saving, onCancel, onSave }) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    code: initial?.code || "",
    phone: initial?.phone || "",
    address: initial?.address || "",
  });
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl border w-full max-w-lg p-4">
        <h3 className="text-lg font-semibold mb-3">{title}</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {["name","code","phone","address"].map(k=>(
            <div key={k} className={k==="address" ? "sm:col-span-2" : ""}>
              <label className="block text-xs text-gray-500 capitalize">{k}</label>
              <input
                className="border rounded px-2 py-1 text-sm w-full"
                value={form[k]}
                onChange={(e)=>setForm(s=>({...s,[k]:e.target.value}))}
              />
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="px-3 py-2 border rounded" onClick={onCancel} disabled={saving}>Cancel</button>
          <button
            className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            onClick={()=>onSave(form)}
            disabled={saving || !form.name.trim()}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BranchDrawer({ branch, onClose }) {
  const [kpis, setKpis] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/branches/${branch.id}/report`);
        setKpis(data?.kpis || data || null);
      } catch {}
    })();
  }, [branch.id]);

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-white border-l shadow-xl p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Branch: {branch.name}</h3>
          <button className="px-2 py-1 border rounded" onClick={onClose}>Close</button>
        </div>

        <section className="space-y-1 text-sm">
          <div><span className="text-slate-500">Code:</span> {branch.code || "—"}</div>
          <div><span className="text-slate-500">Phone:</span> {branch.phone || "—"}</div>
          <div><span className="text-slate-500">Address:</span> {branch.address || "—"}</div>
          <div><span className="text-slate-500">Manager:</span> {branch.managerName || branch.manager_id || "—"}</div>
        </section>

        {kpis && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <KPI title="Staff" value={kpis.staffCount} tone="indigo" />
            <KPI title="Loans Out" value={`TZS ${Number(kpis.loansOut||kpis.disbursed||0).toLocaleString()}`} tone="emerald" />
            <KPI title="Collections" value={`TZS ${Number(kpis.collections||kpis.collected||0).toLocaleString()}`} tone="blue" />
            <KPI title="Expenses" value={`TZS ${Number(kpis.expenses||0).toLocaleString()}`} tone="amber" />
          </div>
        )}

        <div className="mt-6">
          <h4 className="text-sm font-semibold mb-2">Quick actions</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <a className="px-3 py-2 border rounded text-center hover:bg-slate-50" href={`/collections?branchId=${branch.id}`}>Collections</a>
            <a className="px-3 py-2 border rounded text-center hover:bg-slate-50" href={`/expenses?branchId=${branch.id}`}>Expenses</a>
            <a className="px-3 py-2 border rounded text-center hover:bg-slate-50" href={`/loans?branchId=${branch.id}`}>Loans</a>
            <a className="px-3 py-2 border rounded text-center hover:bg-slate-50" href={`/reports/borrowers?branchId=${branch.id}`}>Borrowers Report</a>
          </div>
        </div>
      </aside>
    </div>
  );
}
