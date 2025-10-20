// src/pages/user-management/Users.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import api from "../../api";

/* -------------------- small utils -------------------- */
const emailOk = (v = "") => /.+@.+\..+/.test(v);
const pickArray = (x) => (Array.isArray(x) ? x : x?.items || x?.rows || x?.data || []);
const startCase = (s) =>
  String(s || "")
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
const toCode = (v) =>
  String(v || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || null;

/** Does this user appear to have *any* role info? */
const userHasAnyRole = (u) => {
  if (!u) return false;
  if (u.roleId) return true;
  if (u.role && typeof u.role === "object" && (u.role.id || u.role.name || u.role.code)) return true;
  if (typeof u.role === "string" && u.role.trim()) return true;
  if (u.role_code || u.role_name) return true;
  if (Array.isArray(u.roles) && u.roles.length) return true;       // could be strings or objects
  if (Array.isArray(u.roleNames) && u.roleNames.length) return true;
  if (Array.isArray(u.Roles) && u.Roles.length) return true;       // objects from include
  return false;
};

/** Collect *all* roles from any response shape and de-duplicate */
const rolesFromUser = (u) => {
  const out = [];
  const push = (name, code) => {
    const c = toCode(code || name);
    if (!c) return;
    if (out.some((r) => r.code === c)) return;
    out.push({ name: name || startCase(c), code: c });
  };

  // Objects from include
  if (Array.isArray(u?.Roles)) {
    u.Roles.forEach((r) => push(r.name, r.code));
  }
  // Mixed array (strings/objects)
  if (Array.isArray(u?.roles)) {
    u.roles.forEach((r) => {
      if (typeof r === "string") push(startCase(r), r);
      else push(r?.name, r?.code);
    });
  }
  // Canonical single fields
  if (u?.role_name || u?.role_code) push(u.role_name, u.role_code);
  // Legacy string
  if (typeof u?.role === "string" && u.role.trim()) push(startCase(u.role), u.role);

  return out;
};

/**
 * Compute the user's *primary* role meta (code/name/id) from any response shape,
 * then resolve to a role ID by looking up in the `roles` list from /roles.
 */
const primaryRoleMeta = (u, rolesList) => {
  const list = rolesFromUser(u);
  const first = list[0] || { name: u?.role_name || (u?.role ? startCase(u.role) : null), code: u?.role_code || toCode(u?.role) };
  let id = null;
  if (Array.isArray(rolesList) && rolesList.length) {
    const found =
      rolesList.find((r) => r.code && first.code && String(r.code).toLowerCase() === String(first.code).toLowerCase()) ||
      rolesList.find((r) => r.name && first.name && String(r.name) === String(first.name));
    if (found) id = found.id ?? null;
  }
  const label = first.name || (first.code ? startCase(first.code) : null);
  return { id, code: first.code || null, name: label || null, display: label || first.code || "—" };
};

/* --------- Badge palettes (role → color tone) ---------- */
const ROLE_TONE = {
  loan_officer: "emerald",
  admin: "indigo",
  manager: "sky",
  director: "violet",
  accountant: "amber",
  user: "slate",
};
const toneClasses = (tone = "slate") => {
  const map = {
    indigo: { b: "border-indigo-300", t: "text-indigo-800", bg: "bg-indigo-50" },
    sky: { b: "border-sky-300", t: "text-sky-800", bg: "bg-sky-50" },
    violet: { b: "border-violet-300", t: "text-violet-800", bg: "bg-violet-50" },
    emerald: { b: "border-emerald-300", t: "text-emerald-800", bg: "bg-emerald-50" },
    amber: { b: "border-amber-300", t: "text-amber-900", bg: "bg-amber-50" },
    rose: { b: "border-rose-300", t: "text-rose-800", bg: "bg-rose-50" },
    slate: { b: "border-slate-300", t: "text-slate-800", bg: "bg-slate-50" },
  };
  return map[tone] || map.slate;
};

/* ----------------- Chips / Badges ----------------- */
const RoleBadge = ({ code, name }) => {
  const tone = ROLE_TONE[code] || "slate";
  const { b, t, bg } = toneClasses(tone);
  return (
    <span className={`inline-flex items-center rounded-full ${b} ${t} ${bg} px-2 py-[2px] text-[11px] font-semibold`}>
      {name || startCase(code)}
    </span>
  );
};

const StatusChip = ({ text, tone = "emerald", title }) => {
  const { b, t, bg } = toneClasses(tone);
  return (
    <span title={title} className={`inline-flex items-center rounded-full ${b} ${t} ${bg} px-2 py-[2px] text-[11px] font-semibold`}>
      {text}
    </span>
  );
};

const ui = {
  page: "w-full px-4 md:px-6 lg:px-10 py-6 text-slate-900",
  h1: "text-3xl font-extrabold tracking-tight",
  sub: "text-sm text-slate-700",
  card: "rounded-2xl border-2 border-slate-300 bg-white shadow",
  th: "bg-slate-100 text-left text-[12px] uppercase tracking-wide text-slate-700 font-semibold px-3 py-2 border-2 border-slate-200",
  td: "px-3 py-2 border-2 border-slate-200 text-sm",
  field:
    "h-11 w-full rounded-lg border-2 border-slate-300 bg-white text-sm px-3 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-600",
  btn: "inline-flex items-center rounded-lg border-2 border-slate-300 px-3 py-2 hover:bg-slate-50 font-semibold",
  btnPrimary:
    "inline-flex items-center rounded-lg bg-indigo-600 text-white px-3 py-2 font-semibold hover:bg-indigo-700 disabled:opacity-60",
  btnDanger:
    "inline-flex items-center rounded-lg border-2 border-rose-300 text-rose-600 px-3 py-2 hover:bg-rose-50 font-semibold",
  chip:
    "inline-flex items-center rounded-full border px-2 py-[2px] text-[11px] font-semibold",
};

/* ------------------------ Resilient helpers ------------------------ */
async function tryMany(candidates) {
  let lastErr;
  for (const c of candidates) {
    try {
      const res = await api[c.m](c.url, c.data);
      return res;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

async function assignRoleToUser(userId, roleId) {
  const rid = roleId == null ? null : Number(roleId) || roleId;

  if (rid == null) {
    await tryMany([
      { m: "post", url: `/users/${userId}/assign`, data: { roleId: null } },
      { m: "put",  url: `/users/${userId}`,        data: { roleId: null } },
      { m: "delete", url: `/users/${userId}/role`, data: undefined },
      { m: "put",  url: `/users/${userId}/roles`,  data: { roleIds: [] } },
      { m: "post", url: `/users/${userId}/roles`,  data: { roleIds: [] } },
      { m: "post", url: `/auth/roles/unassign`,    data: { userId } },
    ]);
    return true;
  }

  await tryMany([
    { m: "post", url: `/users/${userId}/assign`, data: { roleId: rid } },
    { m: "put",  url: `/users/${userId}`,        data: { roleId: rid } },
    { m: "post", url: `/users/${userId}/role`,   data: { roleId: rid } },
    { m: "put",  url: `/users/${userId}/role`,   data: { roleId: rid } },
    { m: "post", url: `/users/${userId}/roles`,  data: { roleIds: [rid] } },
    { m: "put",  url: `/users/${userId}/roles`,  data: { roleIds: [rid] } },
    { m: "post", url: `/roles/${rid}/assign`,    data: { userId } },
    { m: "post", url: `/auth/roles/assign`,      data: { userId, roleId: rid } },
    { m: "put",  url: `/auth/users/${userId}/role`, data: { roleId: rid } },
  ]);
  return true;
}

async function fetchRolesResilient() {
  const tries = [
    () => api.get("/roles"),
    () => api.get("/v1/roles"),
    () => api.get("/auth/roles"),
    () => api.get("/iam/roles"),
  ];
  for (const t of tries) {
    try {
      const r = await t();
      return pickArray(r.data);
    } catch {}
  }
  return [];
}

/* ----------------------------- Modal ------------------------------ */
function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border-2 border-slate-300 bg-white p-5 shadow" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold tracking-tight mb-3">{title}</h3>
        {children}
      </div>
    </div>
  );
}

/* =============================== Page ============================== */
const Users = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  // modal state
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", id: null });

  // inline assignment draft for "awaiting" rows
  const [assignDraft, setAssignDraft] = useState({});
  const [assignBusy, setAssignBusy] = useState({}); // { [userId]: boolean }

  const timerRef = useRef();

  const fetchUsers = async (query = "") => {
    setLoading(true);
    try {
      const [uRes, roleList] = await Promise.all([
        api.get("/users", { params: { q: query, limit: 500 } }),
        fetchRolesResilient(),
      ]);
      setUsers(pickArray(uRes.data));
      setRoles(roleList);
    } catch (err) {
      console.error("Error fetching users/roles:", err);
      alert(err?.response?.data?.error || "Failed to load users/roles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchUsers(q), 300);
    return () => clearTimeout(timerRef.current);
  }, [q]);

  /* ---------- derive awaiting vs assigned ---------- */
  const awaiting = useMemo(
    () =>
      users
        .filter((u) => !userHasAnyRole(u))
        .filter((u) => {
          const needle = q.trim().toLowerCase();
          if (!needle) return true;
          const name = (u.name || `${u.firstName || ""} ${u.lastName || ""}`).toLowerCase();
          return name.includes(needle) || String(u.email || "").toLowerCase().includes(needle);
        }),
    [users, q]
  );

  const assigned = useMemo(
    () =>
      users
        .filter((u) => userHasAnyRole(u))
        .map((u) => {
          const meta = primaryRoleMeta(u, roles);
          return {
            ...u,
            _roleId: meta.id,
            _roleName: meta.name || "—",
            _roleCode: meta.code || null,
            _roleDisplay: meta.display,
          };
        })
        .filter((u) => {
          const needle = q.trim().toLowerCase();
          if (!needle) return true;
          const name = (u.name || `${u.firstName || ""} ${u.lastName || ""}`).toLowerCase();
          return (
            name.includes(needle) ||
            String(u.email || "").toLowerCase().includes(needle) ||
            String(u._roleDisplay || "").toLowerCase().includes(needle)
          );
        }),
    [users, roles, q]
  );

  const isLoanOfficer = (u) => {
    const code = u?._roleCode || toCode(u?._roleName);
    return /^loan[_\s-]*officer$/.test(String(code || ""));
  };

  /* ------------ inline assignment actions (awaiting) ------------ */
  const assignRole = async (userId, roleId) => {
    if (!roleId) return alert("Please select a role first.");
    setAssignBusy((s) => ({ ...s, [userId]: true }));
    try {
      await assignRoleToUser(userId, roleId);

      // reflect locally: set code/name from current roles list for that ID
      const meta = roles.find((r) => String(r.id) === String(roleId));
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                roleId: Number(roleId),
                role: { id: Number(roleId), name: meta?.name, code: meta?.code },
                role_code: meta?.code || u.role_code || null,
                role_name: meta?.name || u.role_name || null,
                Roles: meta ? [{ id: meta.id, name: meta.name, code: meta.code }] : u.Roles,
                roles: meta ? [meta.code || meta.name] : u.roles,
              }
            : u
        )
      );
      setAssignDraft((d) => ({ ...d, [userId]: "" }));
      alert("Role assigned");
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || err?.message || "Failed to assign role");
    } finally {
      setAssignBusy((s) => ({ ...s, [userId]: false }));
    }
  };

  const clearRole = async (userId) => {
    if (!window.confirm("Remove this user's role?")) return;
    setAssignBusy((s) => ({ ...s, [userId]: true }));
    try {
      await assignRoleToUser(userId, null);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, roleId: null, role: null, role_code: null, role_name: null, Roles: [], roles: [] } : u
        )
      );
      alert("Role cleared");
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || err?.message || "Failed to clear role");
    } finally {
      setAssignBusy((s) => ({ ...s, [userId]: false }));
    }
  };

  /* ------------ create/edit/delete users (existing UX) ------------ */
  const openModal = (user = { name: "", email: "", password: "", id: null }) => {
    setForm(user);
    setShowModal(true);
  };
  const closeModal = () => {
    if (saving) return;
    setForm({ name: "", email: "", password: "", id: null });
    setShowModal(false);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !emailOk(form.email)) {
      return alert("Please provide a valid name and email.");
    }
    if (!form.id && !form.password.trim()) {
      return alert("Please set an initial password for this user.");
    }
    setSaving(true);
    try {
      if (form.id) {
        await api.put(`/users/${form.id}`, {
          name: form.name.trim(),
          email: form.email.trim(),
        });
        alert("User updated successfully");
      } else {
        await api.post("/users", {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password.trim(),
        });
        alert("User created successfully");
      }
      closeModal();
      fetchUsers(q);
    } catch (err) {
      console.error("Submit error:", err);
      alert(err?.response?.data?.error || "Error saving user");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await api.delete(`/users/${id}`);
      alert("User deleted");
      fetchUsers(q);
    } catch (err) {
      console.error("Delete error:", err);
      alert(err?.response?.data?.error || "Error deleting user");
    }
  };

  return (
    <div className={ui.page}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-4">
        <div>
          <h1 className={ui.h1}>Users / Staff</h1>
          <p className={ui.sub}>
            Assign roles to staff. Staff with roles won’t appear in the “Awaiting role assignment”
            list—they’ll live in the “Staff with roles” table below.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="block text-[12px] font-semibold text-slate-600">Search</label>
            <input
              className={`${ui.field} w-64 h-10`}
              placeholder="name, email, role…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <button className={ui.btn} onClick={() => fetchUsers(q)}>Refresh</button>
          <button className={ui.btnPrimary} onClick={() => openModal()}>+ New User</button>
        </div>
      </div>

      {/* AWAITING ASSIGNMENT */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold">Awaiting role assignment</h2>
          <div className="text-sm text-slate-600">
            {awaiting.length} {awaiting.length === 1 ? "user" : "users"}
          </div>
        </div>

        <div className={`${ui.card} overflow-x-auto`}>
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              <tr>
                {["#", "Name", "Email", "Role to assign", "Actions"].map((h, i) => (
                  <th key={h} className={`${ui.th} ${i === 4 ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className={`${ui.td} text-center py-8 text-slate-600`}>Loading…</td>
                </tr>
              ) : awaiting.length ? (
                awaiting.map((u, i) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className={ui.td}>{i + 1}</td>
                    <td className={ui.td}>{u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || "—"}</td>
                    <td className={ui.td}>{u.email || "—"}</td>
                    <td className={ui.td}>
                      <select
                        className="border rounded px-2 py-1 text-sm min-w-[220px]"
                        value={assignDraft[u.id] ?? ""}
                        onChange={(e) => setAssignDraft((s) => ({ ...s, [u.id]: e.target.value }))}
                      >
                        <option value="">— Select Role —</option>
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className={`${ui.td} text-right`}>
                      <div className="inline-flex gap-2">
                        <button
                          className={`${ui.btnPrimary} disabled:opacity-50`}
                          disabled={!assignDraft[u.id] || assignBusy[u.id]}
                          onClick={() => assignRole(u.id, assignDraft[u.id])}
                        >
                          {assignBusy[u.id] ? "Assigning…" : "Assign"}
                        </button>
                        <button className={ui.btn} onClick={() => openModal(u)}>Edit</button>
                        <button className={ui.btnDanger} onClick={() => handleDelete(u.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className={`${ui.td} text-center py-8 text-slate-600`}>🎉 All users have roles assigned.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* STAFF WITH ROLES */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold">Staff with roles</h2>
          <div className="text-sm text-slate-600">
            {assigned.length} {assigned.length === 1 ? "user" : "users"}
          </div>
        </div>

        <div className={`${ui.card} overflow-x-auto`}>
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              <tr>
                {["#", "Name", "Email", "Role", "Actions"].map((h, i) => (
                  <th key={h} className={`${ui.th} ${i === 4 ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className={`${ui.td} text-center py-8 text-slate-600`}>Loading…</td>
                </tr>
              ) : assigned.length ? (
                assigned.map((u, i) => {
                  const list = rolesFromUser(u);
                  // if backend didn't provide list, show the primary anyway
                  const show = list.length ? list : (u._roleCode || u._roleName ? [{ code: u._roleCode, name: u._roleName }] : []);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className={ui.td}>{i + 1}</td>
                      <td className={ui.td}>{u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || "—"}</td>
                      <td className={ui.td}>{u.email || "—"}</td>
                      <td className={ui.td}>
                        <div className="flex items-center gap-2 flex-wrap">
                          {show.length ? (
                            show.map((r, idx) => (
                              <RoleBadge key={`${r.code || r.name}-${idx}`} code={r.code} name={r.name} />
                            ))
                          ) : (
                            <span>—</span>
                          )}
                          {isLoanOfficer(u) && (
                            <StatusChip
                              text="Discoverable"
                              tone="emerald"
                              title="Appears under /users?role=loan_officer"
                            />
                          )}
                        </div>
                      </td>
                      <td className={`${ui.td} text-right`}>
                        <div className="inline-flex gap-2">
                          <button className={ui.btn} onClick={() => openModal(u)}>Edit</button>
                          <button
                            className={ui.btn}
                            onClick={() => {
                              const nextId = window.prompt(
                                "Enter new role ID to assign (leave blank to cancel):",
                                u._roleId ?? ""
                              );
                              if (nextId && Number(nextId) !== Number(u._roleId)) {
                                assignRole(u.id, nextId);
                              }
                            }}
                          >
                            Change Role
                          </button>
                          <button
                            className={`${ui.btnDanger} disabled:opacity-50`}
                            disabled={assignBusy[u.id]}
                            onClick={() => clearRole(u.id)}
                          >
                            Clear Role
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className={`${ui.td} text-center py-8 text-slate-600`}>No staff with roles yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="text-[12px] text-slate-600 mt-2">
          Tip: give a user the <b>Loan Officer</b> role (exactly “loan_officer”, “loan-officer” or
          “Loan Officer”) so they’re discoverable by pages like Borrower Details which call
          <code className="mx-1 bg-slate-100 px-1 rounded">/users?role=loan_officer</code>.
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <Modal title={form.id ? "Edit User" : "Add New User"} onClose={closeModal}>
          <div className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-slate-600">Full name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={ui.field}
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-600">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={`${ui.field} ${form.email && !emailOk(form.email) ? "!border-rose-400" : ""}`}
              />
              {form.email && !emailOk(form.email) && (
                <div className="text-[12px] text-rose-600 mt-1">Please enter a valid email.</div>
              )}
            </div>

            {!form.id && (
              <div>
                <label className="block text-[12px] font-semibold text-slate-600">Initial Password</label>
                <input
                  type="password"
                  placeholder="Enter initial password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={ui.field}
                />
                <div className="text-[12px] text-slate-500 mt-1">Set an initial password (user can reset later)</div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3">
              <button className={ui.btn} onClick={closeModal} disabled={saving}>Cancel</button>
              <button className={`${ui.btnPrimary} disabled:opacity-50`} onClick={handleSubmit} disabled={saving}>
                {saving ? "Saving…" : form.id ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Users;
