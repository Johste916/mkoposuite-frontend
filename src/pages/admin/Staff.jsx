// src/pages/admin/Staff.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../api";

const makeId = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export default function Staff() {
  const [items, setItems] = useState([]);
  const [branches, setBranches] = useState([]);
  const [roles, setRoles] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const [u, b, r] = await Promise.all([
        api.get("/users"),
        api.get("/branches"),
        api.get("/roles"),
      ]);
      setItems(u.data || []);
      setBranches(b.data || []);
      setRoles(r.data || []);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || "Failed to load staff");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async (payload) => {
    setSaving(true); setErr("");
    try {
      await api.post("/users", payload);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || "Failed to create staff");
    } finally { setSaving(false); }
  };

  const update = async (id, payload) => {
    setSaving(true); setErr("");
    try {
      await api.put(`/users/${id}`, payload);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || "Failed to update staff");
    } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm("Delete this staff?")) return;
    setSaving(true); setErr("");
    try {
      await api.delete(`/users/${id}`);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || "Failed to delete staff");
    } finally { setSaving(false); }
  };

  const filtered = useMemo(() => {
    const term = q.toLowerCase().trim();
    if (!term) return items;
    return items.filter(u =>
      [u.name, u.email, u.phone].some(v => (v || "").toLowerCase().includes(term))
    );
  }, [q, items]);

  return (
    <div className="space-y-4">
      <header className="bg-white dark:bg-slate-900 border rounded-2xl p-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Staff</h1>
          <p className="text-sm text-slate-500">Add staff, set branch access, roles, 2FA, and credentials.</p>
        </div>
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e)=>setQ(e.target.value)}
            placeholder="Search staff…"
            className="rounded border px-3 py-2 text-sm"
          />
          <NewStaffDialog branches={branches} roles={roles} onCreate={create} busy={saving} />
        </div>
      </header>

      {err && <div className="text-sm text-rose-600">{err}</div>}

      <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4">
        {loading ? (
          <div className="text-sm text-slate-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-slate-500">No staff found.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(u => (
              <StaffRow
                key={u.id || makeId()}
                user={u}
                roles={roles}
                branches={branches}
                onSave={update}
                onDelete={remove}
                busy={saving}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StaffRow({ user, roles, branches, onSave, onDelete, busy }) {
  const [edit, setEdit] = useState(false);
  const [u, setU] = useState({
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    roleId: user.roleId || null,
    branchIds: user.branchIds || [],
    twoFA: !!user.twoFA,
    username: user.username || "",
    // password left blank; only send if changed
    password: "",
  });

  useEffect(() => {
    setU({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      roleId: user.roleId || null,
      branchIds: user.branchIds || [],
      twoFA: !!user.twoFA,
      username: user.username || "",
      password: "",
    });
  }, [user]);

  const toggleBranch = (id) => {
    setU(prev => ({
      ...prev,
      branchIds: prev.branchIds.includes(id)
        ? prev.branchIds.filter(x => x !== id)
        : [...prev.branchIds, id],
    }));
  };

  const submit = async () => {
    const payload = { ...u };
    if (!payload.password) delete payload.password; // don’t overwrite password if untouched
    await onSave(user.id, payload);
    setEdit(false);
  };

  return (
    <div className="p-3 border rounded-lg grid grid-cols-1 md:grid-cols-7 gap-2">
      <input
        disabled={!edit}
        className="rounded border px-3 py-2 text-sm"
        placeholder="Full name"
        value={u.name}
        onChange={(e)=>setU({...u, name:e.target.value})}
      />
      <input
        disabled={!edit}
        className="rounded border px-3 py-2 text-sm"
        placeholder="Email"
        value={u.email}
        onChange={(e)=>setU({...u, email:e.target.value})}
      />
      <input
        disabled={!edit}
        className="rounded border px-3 py-2 text-sm"
        placeholder="Phone"
        value={u.phone}
        onChange={(e)=>setU({...u, phone:e.target.value})}
      />
      <select
        disabled={!edit}
        className="rounded border px-3 py-2 text-sm"
        value={u.roleId || ""}
        onChange={(e)=>setU({...u, roleId: e.target.value ? Number(e.target.value) : null})}
      >
        <option value="">Select role…</option>
        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select>

      {/* Branch access (multi) */}
      <div className="text-sm">
        <div className="font-medium mb-1">Branches</div>
        <div className="flex flex-wrap gap-2">
          {branches.map(b => (
            <label key={b.id} className={`px-2 py-1 rounded border ${u.branchIds.includes(b.id) ? "bg-blue-50 border-blue-300" : "bg-slate-50"}`}>
              <input
                type="checkbox"
                disabled={!edit}
                className="mr-1"
                checked={u.branchIds.includes(b.id)}
                onChange={()=>toggleBranch(b.id)}
              />
              {b.name}
            </label>
          ))}
        </div>
      </div>

      {/* 2FA */}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          disabled={!edit}
          checked={!!u.twoFA}
          onChange={(e)=>setU({...u, twoFA:e.target.checked})}
        />
        Two-Factor
      </label>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {edit ? (
          <>
            {/* Credentials only when editing */}
            <input
              type="text"
              disabled={!edit}
              className="rounded border px-3 py-2 text-sm"
              placeholder="Username"
              value={u.username}
              onChange={(e)=>setU({...u, username:e.target.value})}
            />
            <input
              type="password"
              disabled={!edit}
              className="rounded border px-3 py-2 text-sm"
              placeholder="New password (optional)"
              value={u.password}
              onChange={(e)=>setU({...u, password:e.target.value})}
            />
            <button className="px-3 py-1.5 rounded bg-blue-600 text-white" onClick={submit} disabled={busy}>Save</button>
            <button className="px-3 py-1.5 rounded bg-slate-100" onClick={()=>{ setU({ ...u, password:"" }); setEdit(false); }}>Cancel</button>
          </>
        ) : (
          <>
            <button className="px-3 py-1.5 rounded bg-slate-100" onClick={()=>setEdit(true)}>Edit</button>
            <button className="px-3 py-1.5 rounded bg-rose-50 text-rose-700" onClick={()=>onDelete(user.id)} disabled={busy}>Delete</button>
          </>
        )}
      </div>
    </div>
  );
}

function NewStaffDialog({ branches, roles, onCreate, busy }) {
  const [open, setOpen] = useState(false);
  const [u, setU] = useState({
    name: "", email: "", phone: "",
    roleId: "", branchIds: [], twoFA: false,
    username: "", password: "",
  });

  const toggleBranch = (id) => {
    setU(prev => ({
      ...prev,
      branchIds: prev.branchIds.includes(id)
        ? prev.branchIds.filter(x => x !== id)
        : [...prev.branchIds, id],
    }));
  };

  const submit = async () => {
    const payload = {
      ...u,
      roleId: u.roleId ? Number(u.roleId) : null,
    };
    await onCreate(payload);
    setOpen(false);
    setU({ name:"", email:"", phone:"", roleId:"", branchIds:[], twoFA:false, username:"", password:"" });
  };

  if (!open) {
    return <button className="px-3 py-1.5 rounded bg-blue-600 text-white" onClick={()=>setOpen(true)}>Add Staff</button>;
  }

  return (
    <div className="border rounded-xl p-3 bg-white dark:bg-slate-900">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <input className="rounded border px-3 py-2 text-sm" placeholder="Full name" value={u.name} onChange={(e)=>setU({...u, name:e.target.value})}/>
        <input className="rounded border px-3 py-2 text-sm" placeholder="Email" value={u.email} onChange={(e)=>setU({...u, email:e.target.value})}/>
        <input className="rounded border px-3 py-2 text-sm" placeholder="Phone" value={u.phone} onChange={(e)=>setU({...u, phone:e.target.value})}/>
        <select className="rounded border px-3 py-2 text-sm" value={u.roleId} onChange={(e)=>setU({...u, roleId:e.target.value})}>
          <option value="">Select role…</option>
          {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <input className="rounded border px-3 py-2 text-sm" placeholder="Username" value={u.username} onChange={(e)=>setU({...u, username:e.target.value})}/>
        <input type="password" className="rounded border px-3 py-2 text-sm" placeholder="Password" value={u.password} onChange={(e)=>setU({...u, password:e.target.value})}/>
      </div>

      <div className="mt-2">
        <div className="text-sm font-medium mb-1">Branch access</div>
        <div className="flex flex-wrap gap-2">
          {branches.map(b => (
            <label key={b.id} className={`px-2 py-1 rounded border ${u.branchIds.includes(b.id) ? "bg-blue-50 border-blue-300" : "bg-slate-50"}`}>
              <input type="checkbox" className="mr-1" checked={u.branchIds.includes(b.id)} onChange={()=>toggleBranch(b.id)} />
              {b.name}
            </label>
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" checked={u.twoFA} onChange={(e)=>setU({...u, twoFA:e.target.checked})}/>
          Two-Factor
        </label>
        <div className="ml-auto flex gap-2">
          <button className="px-3 py-1.5 rounded bg-slate-100" onClick={()=>setOpen(false)}>Close</button>
          <button className="px-3 py-1.5 rounded bg-blue-600 text-white" onClick={submit} disabled={busy}>Create</button>
        </div>
      </div>
    </div>
  );
}
