// src/pages/Branches.jsx
import { useEffect, useState } from "react";
import api from "../api";

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

// ------------ small helpers -------------
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
// ----------------------------------------

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
        <div>
          <h1 className="text-xl font-semibold">Branches</h1>
          <p className="text-xs text-slate-500">
            View branches and perform common operations.
          </p>
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

      {tab === "overview" && <Overview />}
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
      className={`px-3 py-1.5 text-sm ${
        active ? "bg-slate-100" : "bg-white hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

function Overview() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    try {
      const { data } = await api.get("/branches", { params: { q } });
      const items = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
        ? data
        : [];
      setRows(items);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    }
  };

  useEffect(() => {
    load();
  }, []); // initial

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
          className="px-3 py-2 border rounded-lg bg-white hover:bg-gray-50 text-sm"
        >
          Apply
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
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-3 text-gray-500">
                  No branches yet.
                </td>
              </tr>
            ) : (
              rows.map((b) => (
                <tr key={b.id} className="border-b">
                  <td className="py-2 px-3">{b.name}</td>
                  <td className="py-2 px-3">{b.code ?? "—"}</td>
                  <td className="py-2 px-3">{b.phone ?? "—"}</td>
                  <td className="py-2 px-3">{b.address ?? "—"}</td>
                  <td className="py-2 px-3">
                    {b.managerName || b.manager_id || "—"}
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

function AddBranch() {
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
    setSaving(true);
    setErr("");
    setMsg("");
    setReqId("");

    // ---- payload hardening ----
    const payload = {
      name: cleanString(form.name),
      // send code as number or null; never empty string
      code: toNullableNumber(form.code),
      // keep phone as string, digits only; or null if nothing present
      phone: cleanString(onlyDigits(form.phone)),
      address: cleanString(form.address),
    };

    try {
      await api.post("/branches", payload);
      setMsg("Branch created.");
      setForm({ name: "", code: "", phone: "", address: "" });
    } catch (e) {
      const data = e?.response?.data;
      setReqId(data?.requestId || "");
      setErr(
        data?.error ||
          data?.message ||
          e.message ||
          "Failed to create branch"
      );
    } finally {
      setSaving(false);
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
        disabled={saving}
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
        const [{ data: b }, { data: u }] = await Promise.all([
          api.get("/branches"),
          api.get("/users", { params: { limit: 1000 } }),
        ]);
        const bItems = Array.isArray(b?.items)
          ? b.items
          : Array.isArray(b)
          ? b
          : [];
        const uItems = Array.isArray(u?.items)
          ? u.items
          : Array.isArray(u?.rows)
          ? u.rows
          : Array.isArray(u)
          ? u
          : [];
        setBranches(bItems);
        setUsers(uItems);
      } catch {}
    })();
  }, []);

  const toggle = (id) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const submit = async () => {
    setMsg("");
    setErr("");
    try {
      // ensure numeric branchId
      const numericBranchId = toNullableNumber(branchId);
      await api.post(`/branches/${numericBranchId}/assign-staff`, {
        userIds: selected,
      });
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
          <select
            className="border rounded px-2 py-1 text-sm min-w-[220px]"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            <option value="">Select branch</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={submit}
          disabled={!branchId || selected.length === 0}
          className="px-3 py-2 border rounded-lg bg-white hover:bg-gray-50 text-sm"
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
                  No users.
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
        const items = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
          ? data
          : [];
        setBranches(items);
      } catch {}
    })();
  }, []);

  const run = async () => {
    setErr("");
    setKpis(null);
    try {
      const numericBranchId = toNullableNumber(branchId);
      const { data } = await api.get(`/branches/${numericBranchId}/report`, {
        params: { from, to },
      });
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
          <select
            className="border rounded px-2 py-1 text-sm min-w-[220px]"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            <option value="">Select</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
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
          disabled={!branchId}
          className="px-3 py-2 border rounded-lg bg-white hover:bg-gray-50 text-sm"
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
    }[tone] || "text-slate-600 bg-slate-50";
  return (
    <div className="bg-white border rounded-xl p-3 flex items-center gap-3">
      <div className={`px-2 py-1 rounded ${tones}`}>{title}</div>
      <div className="font-semibold">{value ?? "—"}</div>
    </div>
  );
}
