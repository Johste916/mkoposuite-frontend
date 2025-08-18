import React, { useEffect, useMemo, useState } from "react";
import { ACL } from "../../api/acl";
import { SettingsAPI } from "../../api/settings"; // for branches list
import { FiSearch } from "react-icons/fi";

export default function Staff() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    name: "", email: "", phone: "",
    username: "", password: "",
    roleId: "", branchIds: [],
    twoFactor: false,
  });

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return users;
    return users.filter(u =>
      [u.name, u.email, u.username].some(s => String(s||"").toLowerCase().includes(t))
    );
  }, [users, q]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");

        const [rList, bList] = await Promise.all([
          ACL.listRoles().catch(() => []),
          SettingsAPI.listBranches().catch(() => []),
        ]);

        setRoles(rList || []);
        setBranches(Array.isArray(bList) ? bList : (bList.items || []));

        const rows = await ACL.listUsers();
        setUsers(rows || []);
      } catch (e) {
        setErr(e?.response?.data?.error || "Failed to load staff");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const create = async () => {
    try {
      setErr("");
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        username: form.username,
        password: form.password,
        roleId: form.roleId || null,
        branchIds: form.branchIds,   // UI allows multiple; backend will use the first for branchId
        twoFactor: !!form.twoFactor,
      };
      const newUser = await ACL.createUser(payload);
      setUsers([newUser, ...users]);
      setForm({ ...form, name:"", email:"", phone:"", username:"", password:"" });
    } catch (e) {
      setErr(e?.response?.data?.error || "Failed to create user");
    }
  };

  const toggleBranch = (id) => {
    setForm(f => {
      const has = f.branchIds.includes(id);
      return { ...f, branchIds: has ? f.branchIds.filter(b => b !== id) : [...f.branchIds, id] };
    });
  };

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;

  return (
    <div className="space-y-4">
      <header className="bg-white dark:bg-slate-900 border rounded-2xl p-4">
        <h1 className="text-xl font-semibold">Staff</h1>
        <p className="text-sm text-slate-500">Add staff, set branch access, roles, 2FA, and credentials.</p>
      </header>

      {err && <div className="text-sm text-rose-600">{err}</div>}

      {/* Create form */}
      <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 grid grid-cols-1 md:grid-cols-6 gap-2">
        <input className="rounded border px-3 py-2 text-sm" placeholder="Full name"
          value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
        <input className="rounded border px-3 py-2 text-sm" placeholder="Email"
          value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
        <input className="rounded border px-3 py-2 text-sm" placeholder="Phone"
          value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/>
        <select className="rounded border px-3 py-2 text-sm"
          value={form.roleId} onChange={e=>setForm(f=>({...f,roleId:e.target.value}))}>
          <option value="">Select role…</option>
          {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <input className="rounded border px-3 py-2 text-sm" placeholder="Username"
          value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))}/>
        <input type="password" className="rounded border px-3 py-2 text-sm" placeholder="Password"
          value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}/>

        <div className="md:col-span-6">
          <div className="text-xs mb-2">Branch access</div>
          <div className="flex flex-wrap gap-3">
            {branches.map(b => (
              <label key={b.id} className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox"
                  checked={form.branchIds.includes(b.id)}
                  onChange={()=>toggleBranch(b.id)}/>
                {b.name}
              </label>
            ))}
          </div>
        </div>

        <label className="inline-flex items-center gap-2 text-sm md:col-span-3">
          <input type="checkbox"
            checked={!!form.twoFactor}
            onChange={e=>setForm(f=>({...f, twoFactor:e.target.checked}))}/>
          Two-Factor
        </label>

        <div className="md:col-span-3 flex justify-end gap-2">
          <button className="px-3 py-2 rounded border" onClick={() => setForm({
            name:"", email:"", phone:"", username:"", password:"", roleId:"", branchIds:[], twoFactor:false
          })}>Close</button>
          <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={create}>Create</button>
        </div>
      </div>

      {/* Search + list */}
      <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4">
        <div className="relative mb-3">
          <FiSearch className="absolute left-3 top-3 text-slate-400" />
          <input
            value={q} onChange={e=>setQ(e.target.value)}
            placeholder="Search staff…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded border"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="text-sm text-slate-500">No staff found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Role(s)</th>
                  <th className="py-2 pr-4">Branch</th>
                  <th className="py-2 pr-4">Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id} className="border-t">
                    <td className="py-2 pr-4">{u.name}</td>
                    <td className="py-2 pr-4">{u.email}</td>
                    <td className="py-2 pr-4">
                      {Array.isArray(u.Roles) && u.Roles.length
                        ? u.Roles.map(r=>r.name).join(", ")
                        : (u.role || "—")}
                    </td>
                    <td className="py-2 pr-4">
                      {/* Backend returns belongsTo Branch (singular) */}
                      {u.Branch?.name ?? "—"}
                    </td>
                    <td className="py-2 pr-4">{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
