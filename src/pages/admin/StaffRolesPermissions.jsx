import React, { useEffect, useState } from "react";
import { ACL } from "../../api/acl";

export default function StaffRolesPermissions() {
  const [roles, setRoles] = useState([]);
  const [perms, setPerms] = useState([]);
  const [err, setErr] = useState("");
  const [creating, setCreating] = useState({ name: "", description: "" });

  useEffect(() => {
    (async () => {
      try {
        setErr("");
        const [r, p] = await Promise.all([ACL.listRoles(), ACL.listPermissions()]);
        setRoles(r || []);
        setPerms(p || []);
      } catch (e) {
        setErr(e?.response?.data?.error || "Failed to load roles or permissions");
      }
    })();
  }, []);

  const createRole = async () => {
    try {
      const role = await ACL.createRole(creating);
      setRoles([role, ...roles]);
      setCreating({ name: "", description: "" });
    } catch (e) {
      setErr(e?.response?.data?.error || "Failed to create role");
    }
  };

  const toggle = (action, roleName) => {
    setPerms(ps => ps.map(p => {
      if (p.action !== action) return p;
      const has = (p.roles || []).includes(roleName);
      return { ...p, roles: has ? p.roles.filter(r => r !== roleName) : [...p.roles, roleName] };
    }));
  };

  const saveAction = async (action) => {
    try {
      const p = perms.find(x => x.action === action);
      await ACL.updatePermission(action, p.roles || []);
    } catch (e) {
      setErr(e?.response?.data?.error || `Failed to update "${action}"`);
    }
  };

  return (
    <div className="space-y-4">
      <header className="bg-white dark:bg-slate-900 border rounded-2xl p-4">
        <h1 className="text-xl font-semibold">Staff Roles & Permissions</h1>
        <p className="text-sm text-slate-500">Add roles and control which roles can perform each action.</p>
      </header>

      {err && <div className="text-sm text-rose-600">{err}</div>}

      {/* Create role */}
      <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 grid grid-cols-1 md:grid-cols-4 gap-2">
        <input className="rounded border px-3 py-2 text-sm" placeholder="Role name (e.g., manager)"
          value={creating.name} onChange={e=>setCreating(c=>({...c,name:e.target.value}))}/>
        <input className="rounded border px-3 py-2 text-sm" placeholder="Description"
          value={creating.description} onChange={e=>setCreating(c=>({...c,description:e.target.value}))}/>
        <div className="md:col-span-2 flex justify-end">
          <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={createRole}>Create Role</button>
        </div>
      </div>

      {/* Permissions matrix */}
      <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 overflow-x-auto">
        {perms.length === 0 ? (
          <div className="text-sm text-slate-500">No permissions defined.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-2 pr-4">Action</th>
                {roles.map(r => <th key={r.id} className="py-2 pr-4">{r.name}</th>)}
                <th className="py-2 pr-4">Save</th>
              </tr>
            </thead>
            <tbody>
              {perms.map(p => (
                <tr key={p.action} className="border-t">
                  <td className="py-2 pr-4">{p.action}</td>
                  {roles.map(r => {
                    const checked = (p.roles || []).includes(r.name);
                    return (
                      <td key={r.id} className="py-2 pr-4">
                        <input type="checkbox" checked={checked} onChange={()=>toggle(p.action, r.name)} />
                      </td>
                    );
                  })}
                  <td className="py-2 pr-4">
                    <button className="px-3 py-1.5 rounded border" onClick={()=>saveAction(p.action)}>Save</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
