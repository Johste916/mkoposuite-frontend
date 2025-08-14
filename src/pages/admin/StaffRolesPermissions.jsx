// src/pages/admin/StaffRolesPermissions.jsx
import React, { useEffect, useState } from "react";
import api from "../../api";

const defaultPerms = [
  "borrowers:view", "borrowers:edit",
  "loans:view", "loans:edit", "loans:approve",
  "repayments:view", "repayments:record",
  "reports:view",
  "settings:view", "settings:edit",
  "users:view", "users:edit",
];

export default function StaffRolesPermissions() {
  const [roles, setRoles] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [newName, setNewName] = useState("");

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const r = await api.get("/roles");
      setRoles(r.data || []);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || "Failed to load roles");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!newName.trim()) return;
    setSavingId("new");
    try {
      await api.post("/roles", { name: newName.trim(), permissions: [] });
      setNewName("");
      await load();
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || "Failed to create role");
    } finally { setSavingId(null); }
  };

  const save = async (id, payload) => {
    setSavingId(id);
    try {
      await api.put(`/roles/${id}`, payload);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || "Failed to update role");
    } finally { setSavingId(null); }
  };

  const remove = async (id) => {
    if (!confirm("Delete this role?")) return;
    setSavingId(id);
    try {
      await api.delete(`/roles/${id}`);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || "Failed to delete role");
    } finally { setSavingId(null); }
  };

  return (
    <div className="space-y-4">
      <header className="bg-white dark:bg-slate-900 border rounded-2xl p-4">
        <h1 className="text-xl font-semibold">Staff Roles & Permissions</h1>
        <p className="text-sm text-slate-500">Control who can see and do what.</p>
      </header>

      {err && <div className="text-sm text-rose-600">{err}</div>}

      {/* Create role */}
      <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 flex gap-2">
        <input
          className="rounded border px-3 py-2 text-sm"
          placeholder="New role name"
          value={newName}
          onChange={(e)=>setNewName(e.target.value)}
        />
        <button className="px-3 py-1.5 rounded bg-blue-600 text-white" onClick={create} disabled={savingId==="new"}>
          {savingId==="new" ? "Creating…" : "Create"}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4">
        {loading ? (
          <div className="text-sm text-slate-500">Loading…</div>
        ) : roles.length === 0 ? (
          <div className="text-sm text-slate-500">No roles yet.</div>
        ) : (
          <div className="space-y-3">
            {roles.map(r => (
              <RoleRow key={r.id} role={r} allPerms={defaultPerms} onSave={save} onDelete={remove} busy={savingId===r.id}/>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RoleRow({ role, allPerms, onSave, onDelete, busy }) {
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(role.name || "");
  const [perms, setPerms] = useState(Array.isArray(role.permissions) ? role.permissions : []);

  const toggle = (p) => setPerms(prev => prev.includes(p) ? prev.filter(x=>x!==p) : [...prev, p]);

  const submit = async () => {
    await onSave(role.id, { name: name.trim(), permissions: perms });
    setEdit(false);
  };

  return (
    <div className="p-3 border rounded-lg space-y-2">
      <div className="flex items-center gap-2">
        <input
          disabled={!edit}
          className="rounded border px-3 py-2 text-sm"
          value={name}
          onChange={(e)=>setName(e.target.value)}
        />
        {edit ? (
          <>
            <button className="px-3 py-1.5 rounded bg-blue-600 text-white" onClick={submit} disabled={busy}>Save</button>
            <button className="px-3 py-1.5 rounded bg-slate-100" onClick={()=>{setEdit(false); setName(role.name || ""); setPerms(Array.isArray(role.permissions)?role.permissions:[])}}>Cancel</button>
          </>
        ) : (
          <>
            <button className="px-3 py-1.5 rounded bg-slate-100" onClick={()=>setEdit(true)}>Edit</button>
            <button className="px-3 py-1.5 rounded bg-rose-50 text-rose-700" onClick={()=>onDelete(role.id)} disabled={busy}>Delete</button>
          </>
        )}
      </div>

      {/* Permissions */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {allPerms.map(p => (
          <label key={p} className={`px-2 py-1 rounded border text-sm ${perms.includes(p) ? "bg-blue-50 border-blue-300" : "bg-slate-50"}`}>
            <input
              type="checkbox"
              className="mr-1"
              checked={perms.includes(p)}
              onChange={()=>toggle(p)}
              disabled={!edit}
            />
            {p}
          </label>
        ))}
      </div>
    </div>
  );
}
