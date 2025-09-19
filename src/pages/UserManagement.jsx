// src/pages/UserManagement.jsx
import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import api from "../api";

/* ---------------- tolerant request helpers --------------------- */
async function tryOneGET(path, opts = {}) { try { const res = await api.get(path, opts); return { ok: true, data: res?.data }; } catch (e) { return { ok: false, error: e }; } }
async function tryOnePOST(path, body = {}, opts = {}) { try { const res = await api.post(path, body, opts); return { ok: true, data: res?.data }; } catch (e) { return { ok: false, error: e }; } }
async function tryOnePUT(path, body = {}, opts = {}) { try { const res = await api.put(path, body, opts); return { ok: true, data: res?.data }; } catch (e) { return { ok: false, error: e }; } }
async function tryOneDELETE(path, opts = {}) { try { const res = await api.delete(path, opts); return { ok: true, data: res?.data }; } catch (e) { return { ok: false, error: e }; } }

/* ---------------- small helpers -------------------- */
const onlyDigits = (v) => String(v || "").replace(/\D+/g, "");
const cleanString = (v) => { const s = String(v ?? "").trim(); return s.length ? s : null; };
const pickArrayish = (data) => Array.isArray(data) ? data : (data?.items || data?.rows || data?.data || []);

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
    const menuW = 220, gap = 6;
    let left = Math.min(Math.max(8, r.right - menuW), window.innerWidth - menuW - 8);
    let top = r.bottom + gap;
    const approxH = 8 + actions.length * 36;
    if (top + approxH > window.innerHeight - 8) top = Math.max(8, r.top - gap - approxH);
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
      <button ref={btnRef} className="px-2 py-1 border rounded hover:bg-gray-50" onClick={() => setOpen(v => !v)} aria-haspopup="menu" aria-expanded={open}>⋮</button>
      {open && (
        <PortalRoot>
          <div className="fixed inset-0 z-50" style={{ background: "transparent" }} onClick={() => setOpen(false)} />
          <div ref={menuRef} className="fixed z-[60] min-w-[220px] bg-white border shadow-lg rounded-md"
               style={{ top: pos.top, left: pos.left }} onClick={(e) => e.stopPropagation()} role="menu">
            {actions.map((a, i) => (
              <button key={i} onClick={() => { if (a.disabled) return; setOpen(false); a.onClick?.(); }}
                      disabled={a.disabled}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${a.danger ? "text-red-700" : ""} disabled:opacity-50`}>
                {a.label}
              </button>
            ))}
          </div>
        </PortalRoot>
      )}
    </>
  );
}

/* ---------------- Modal ---------------- */
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
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <PortalRoot>
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl border shadow p-4 w-full max-w-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">{title}</h3>
            <button onClick={onClose} className="text-sm px-2 py-1 border rounded" aria-label="Close">✕</button>
          </div>
          {children}
        </div>
      </div>
    </PortalRoot>
  );
}

/* ---------------- Buttons ---------------- */
function PrimaryButton({ className = "", children, ...props }) {
  return (
    <button {...props} className={[
      "px-3 py-2 rounded-lg text-sm font-medium",
      "bg-blue-600 text-white border border-blue-600 hover:bg-blue-700",
      "disabled:opacity-60 disabled:hover:bg-blue-600",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1",
      className].join(" ")}>{children}</button>
  );
}
function SecondaryButton({ className = "", children, ...props }) {
  return (
    <button {...props} className={[
      "px-3 py-2 rounded-lg text-sm font-medium",
      "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-1",
      "disabled:opacity-60", className].join(" ")}>{children}</button>
  );
}
function DangerButton({ className = "", children, ...props }) {
  return (
    <button {...props} className={[
      "px-3 py-2 rounded-lg text-sm font-medium",
      "bg-red-600 text-white border border-red-600 hover:bg-red-700",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-1",
      "disabled:opacity-60", className].join(" ")}>{children}</button>
  );
}

/* ============================== PAGE ============================== */
const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [saving, setSaving] = useState({});
  const [draft, setDraft] = useState({});
  const [error, setError] = useState("");

  // modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [model, setModel] = useState(null);
  const [roleSel, setRoleSel] = useState(new Set());

  const hydrate = (usersRes, rolesRes, branchesRes) => {
    const ux = pickArrayish(usersRes.data);
    const rx = pickArrayish(rolesRes.data);
    const bx = pickArrayish(branchesRes.data);
    setUsers(ux);
    setRoles(rx);
    setBranches(bx);
    const d = {};
    ux.forEach(u => {
      d[u.id] = {
        roleId: u.roleId ?? u.role?.id ?? "",     // quick single-role selector
        branchId: u.branchId ?? "",
      };
    });
    setDraft(d);
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [usersRes, rolesRes, branchesRes] = await Promise.all([
        tryOneGET("/users", { params: { limit: 1000, q } }),
        tryOneGET("/roles", { params: { limit: 1000 } }),
        tryOneGET("/branches", { params: { limit: 1000 } }),
      ]);
      if (!usersRes.ok) throw usersRes.error;
      if (!rolesRes.ok) throw rolesRes.error;
      if (!branchesRes.ok) throw branchesRes.error;
      hydrate(usersRes, rolesRes, branchesRes);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // initial

  // Debounce search to keep behavior smooth
  useEffect(() => {
    const id = setTimeout(() => { if (!loading) load(); }, 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const setDraftFor = (userId, patch) => {
    setDraft(prev => ({ ...prev, [userId]: { ...(prev[userId] || {}), ...patch } }));
  };

  const hasChanged = (u) => {
    const d = draft[u.id] || {};
    const roleServer = u.roleId ?? u.role?.id ?? "";
    const branchServer = u.branchId ?? "";
    return String(d.roleId || "") !== String(roleServer) || String(d.branchId || "") !== String(branchServer);
  };

  const handleSaveInline = async (u) => {
    const userId = u.id;
    const d = draft[userId] || {};
    const payload = {
      roleId: d.roleId ? Number(d.roleId) : null,
      branchId: d.branchId ? Number(d.branchId) : null,
    };
    setSaving(s => ({ ...s, [userId]: true }));
    try {
      // Prefer your existing endpoint:
      let r = await tryOnePOST(`/users/${userId}/assign`, payload);
      if (!r.ok) {
        // tolerances: some backends accept put
        r = await tryOnePUT(`/users/${userId}`, payload);
      }
      if (!r.ok) throw r.error;
      setUsers(prev => prev.map(x => x.id === userId ? { ...x, roleId: payload.roleId, branchId: payload.branchId } : x));
      alert("Assigned successfully");
    } catch (err) {
      alert(err?.response?.data?.error || err?.message || "Failed to assign");
    } finally {
      setSaving(s => ({ ...s, [userId]: false }));
    }
  };

  /* ---------- Staff management actions ---------- */
  const onCreate = () => {
    setModel({ name: "", email: "", phone: "", password: "", roleId: "", branchId: "" });
    setCreateOpen(true);
  };
  const onEdit = (u) => {
    setModel({
      id: u.id,
      name: u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim(),
      email: u.email || "",
      phone: u.phone || "",
    });
    setEditOpen(true);
  };
  const onPassword = (u) => { setModel({ id: u.id, password: "" }); setPwdOpen(true); };
  const onRoles = async (u) => {
    setModel(u);
    // current roles
    const selected = new Set((u.roles || u.Roles || []).map(r => r?.id ?? r?.roleId ?? r?.RoleId).filter(x => x != null));
    setRoleSel(selected);
    // ensure roles list is available
    if (roles.length === 0) {
      const r = await tryOneGET("/roles", { params: { limit: 1000 } });
      if (r.ok) setRoles(pickArrayish(r.data));
    }
    setRolesOpen(true);
  };
  const onDisable = async (u) => {
    const r = await tryOneDELETE(`/users/${u.id}`);
    if (!r.ok) alert(r?.error?.response?.data?.error || r?.error?.message || "Failed to disable user.");
    load();
  };
  const onDelete = async (u) => {
    const r = await tryOneDELETE(`/users/${u.id}`, {
      params: { force: 1, hard: 1 }, headers: { "X-Force-Delete": "1" }, data: { force: true },
    });
    if (!r.ok) alert(r?.error?.response?.data?.error || r?.error?.message || "Failed to delete user.");
    load();
  };

  /* ---------- Submitters for modals ---------- */
  const submitCreate = async () => {
    const payload = {
      name: cleanString(model.name),
      email: cleanString(model.email),
      phone: cleanString(onlyDigits(model.phone)),
      ...(model.password ? { password: model.password } : {}),
      ...(model.roleId ? { roleId: Number(model.roleId) } : {}),
      ...(model.branchId ? { branchId: Number(model.branchId) } : {}),
    };
    const r = await tryOnePOST("/users", payload);
    if (!r.ok) alert(r?.error?.response?.data?.error || r?.error?.message || "Failed to create user.");
    setCreateOpen(false); setModel(null); load();
  };
  const submitEdit = async () => {
    const payload = {
      name: cleanString(model.name),
      email: cleanString(model.email),
      phone: cleanString(onlyDigits(model.phone)),
    };
    let r = await tryOnePUT(`/users/${model.id}`, payload);
    if (!r.ok) r = await tryOnePOST(`/users/${model.id}`, payload); // fallback
    if (!r.ok) alert(r?.error?.response?.data?.error || r?.error?.message || "Failed to update user.");
    setEditOpen(false); setModel(null); load();
  };
  const submitPassword = async () => {
    let r = await tryOnePOST(`/users/${model.id}/password`, { password: model.password });
    if (!r.ok) r = await tryOnePUT(`/users/${model.id}`, { password: model.password });
    if (!r.ok) alert(r?.error?.response?.data?.error || r?.error?.message || "Failed to set password.");
    setPwdOpen(false); setModel(null); load();
  };
  const submitRoles = async () => {
    const roleIds = [...roleSel];
    let r = await tryOnePOST(`/users/${model.id}/roles`, { roleIds });
    if (!r.ok) r = await tryOnePUT(`/users/${model.id}/roles`, { roleIds });
    if (!r.ok) r = await tryOnePUT(`/users/${model.id}`, { roleIds });
    if (!r.ok) alert(r?.error?.response?.data?.error || r?.error?.message || "Failed to update roles.");
    setRolesOpen(false); setModel(null); load();
  };

  const toggleRole = (id) => {
    const next = new Set(roleSel);
    next.has(id) ? next.delete(id) : next.add(id);
    setRoleSel(next);
  };

  /* ---------- Render ---------- */
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">User & Staff Management</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              placeholder="Search name, email, role…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="border rounded px-3 py-1.5 text-sm"
              aria-label="Search users"
            />
          </div>
          <SecondaryButton onClick={load} disabled={loading}>{loading ? "Loading…" : "Refresh"}</SecondaryButton>
          <PrimaryButton onClick={onCreate}>Add Staff</PrimaryButton>
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {loading ? (
        <p>Loading users...</p>
      ) : (
        <div className="overflow-x-auto bg-white border rounded">
          <table className="min-w-full">
            <thead className="bg-gray-100 text-sm">
              <tr>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Phone</th>
                <th className="px-4 py-2 text-left">Role</th>
                <th className="px-4 py-2 text-left">Branch</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-2">{u.name || `${u.firstName||''} ${u.lastName||''}`.trim() || "—"}</td>
                  <td className="px-4 py-2">{u.email || "—"}</td>
                  <td className="px-4 py-2">{u.phone || "—"}</td>
                  <td className="px-4 py-2">
                    <select
                      className="border rounded px-2 py-1 min-w-[180px]"
                      value={draft[u.id]?.roleId ?? ""}
                      onChange={(e) => setDraftFor(u.id, { roleId: e.target.value })}
                    >
                      <option value="">— Select Role —</option>
                      {roles.map(r => <option key={r.id} value={r.id}>{r.name || r.title}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <select
                      className="border rounded px-2 py-1 min-w-[180px]"
                      value={draft[u.id]?.branchId ?? ""}
                      onChange={(e) => setDraftFor(u.id, { branchId: e.target.value })}
                    >
                      <option value="">— Select Branch —</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50"
                        disabled={!hasChanged(u) || saving[u.id]}
                        onClick={() => handleSaveInline(u)}
                      >
                        {saving[u.id] ? "Saving…" : "Save"}
                      </button>
                      <ActionMenu
                        actions={[
                          { label: "Edit", onClick: () => onEdit(u) },
                          { label: "Manage Roles (multi)", onClick: () => onRoles(u) },
                          { label: "Set/Reset Password", onClick: () => onPassword(u) },
                          { label: "Disable", onClick: () => onDisable(u), danger: true },
                          { label: "Delete (hard)", onClick: () => onDelete(u), danger: true },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td className="px-4 py-6 text-center text-gray-500" colSpan={6}>No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------- Modals ---------- */}
      {createOpen && (
        <Modal title="Add Staff" onClose={() => setCreateOpen(false)}>
          <div className="grid gap-2">
            {["name", "email", "phone", "password"].map((k) => (
              <div key={k}>
                <label className="block text-xs text-gray-500 capitalize">{k}</label>
                <input
                  className="border rounded px-2 py-1 text-sm w-full"
                  type={k === "password" ? "password" : "text"}
                  value={model?.[k] ?? ""}
                  onChange={(e) => setModel((s) => ({ ...s, [k]: e.target.value }))}
                  placeholder={k === "phone" ? "digits only" : ""}
                />
              </div>
            ))}

            {/* Optional inline assignment on create */}
            <div>
              <label className="block text-xs text-gray-500">Role (optional)</label>
              <select
                className="border rounded px-2 py-1 text-sm w-full"
                value={model?.roleId ?? ""}
                onChange={(e) => setModel((s) => ({ ...s, roleId: e.target.value }))}
              >
                <option value="">— Select Role —</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name || r.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500">Branch (optional)</label>
              <select
                className="border rounded px-2 py-1 text-sm w-full"
                value={model?.branchId ?? ""}
                onChange={(e) => setModel((s) => ({ ...s, branchId: e.target.value }))}
              >
                <option value="">— Select Branch —</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <SecondaryButton onClick={() => setCreateOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={submitCreate}>Create</PrimaryButton>
          </div>
        </Modal>
      )}

      {editOpen && (
        <Modal title="Edit Staff" onClose={() => setEditOpen(false)}>
          <div className="grid gap-2">
            {["name", "email", "phone"].map((k) => (
              <div key={k}>
                <label className="block text-xs text-gray-500 capitalize">{k}</label>
                <input
                  className="border rounded px-2 py-1 text-sm w-full"
                  value={model?.[k] ?? ""}
                  onChange={(e) => setModel((s) => ({ ...s, [k]: e.target.value }))}
                  placeholder={k === "phone" ? "digits only" : ""}
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <SecondaryButton onClick={() => setEditOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={submitEdit}>Save</PrimaryButton>
          </div>
        </Modal>
      )}

      {pwdOpen && (
        <Modal title="Set/Reset Password" onClose={() => setPwdOpen(false)}>
          <div className="grid gap-2">
            <label className="block text-xs text-gray-500">New Password</label>
            <input
              type="password"
              className="border rounded px-2 py-1 text-sm w-full"
              value={model?.password ?? ""}
              onChange={(e) => setModel((s) => ({ ...s, password: e.target.value }))}
            />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <SecondaryButton onClick={() => setPwdOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={submitPassword}>Set Password</PrimaryButton>
          </div>
        </Modal>
      )}

      {rolesOpen && (
        <Modal title={`Manage Roles • ${model?.name || model?.email || ""}`} onClose={() => setRolesOpen(false)}>
          <div className="max-h-[50vh] overflow-auto border rounded p-2">
            {roles.length === 0 ? (
              <div className="text-sm text-gray-500">No roles found.</div>
            ) : roles.map((r) => {
              const id = r.id ?? r.roleId ?? r.RoleId;
              const name = r.name || r.title || `#${id}`;
              const checked = roleSel.has(id);
              return (
                <label key={id} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-gray-50">
                  <input type="checkbox" checked={checked} onChange={() => toggleRole(id)} />
                  <span className="text-sm">{name}</span>
                </label>
              );
            })}
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <SecondaryButton onClick={() => setRolesOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={submitRoles}>Save Roles</PrimaryButton>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default UserManagement;
