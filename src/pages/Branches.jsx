import { useEffect, useMemo, useState } from "react";
import api from "../api"; // axios instance baseURL:/api

const canManage = (u) =>
  !!u && (u.role === "admin" || u.role === "director" || u.permissions?.includes("branches:manage"));
const canAssign = (u) =>
  !!u && (u.role === "admin" || u.role === "director" || u.permissions?.includes("branches:assign"));

export default function Branches() {
  const [me, setMe] = useState(null);

  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [borrowers, setBorrowers] = useState([]);

  const [form, setForm] = useState({ name:"", code:"", email:"", phone:"", address:"", status:"active" });
  const [editing, setEditing] = useState(null);

  const [activeBranch, setActiveBranch] = useState(null);
  const [assignees, setAssignees] = useState([]); // staff in branch
  const [branchClients, setBranchClients] = useState([]); // borrowers in branch
  const [pickUsers, setPickUsers] = useState([]);
  const [pickBorrowers, setPickBorrowers] = useState([]);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState("");

  const canM = useMemo(()=>canManage(me),[me]);
  const canA = useMemo(()=>canAssign(me),[me]);

  // bootstrap
  useEffect(()=>{ (async()=>{
    try {
      const [{data:meRes},{data:br},{data:usr}] = await Promise.all([
        api.get("/auth/me"),
        api.get("/branches/list"),
        api.get("/users", { params:{ limit:1000 } })
      ]);
      setMe(meRes);
      setRows(br?.items || []);
      setUsers(usr?.items || usr || []);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    }
  })(); },[]);

  // optional: preload borrowers if you need client assignment
  useEffect(()=>{ (async()=>{
    try{
      const { data } = await api.get("/borrowers", { params:{ limit:1000 } });
      setBorrowers(data?.items || data || []);
    }catch{/* ignore */}
  })(); },[]);

  const reload = async ()=>{
    const { data } = await api.get("/branches/list");
    setRows(data?.items || []);
  };

  const save = async ()=>{
    try{
      if (editing) {
        await api.put(`/branches/${editing.id}`, form);
      } else {
        await api.post(`/branches`, form);
      }
      setForm({ name:"", code:"", email:"", phone:"", address:"", status:"active" });
      setEditing(null);
      await reload();
    }catch(e){ setError(e?.response?.data?.error || e.message); }
  };

  const del = async (id)=>{
    if (!window.confirm("Delete this branch?")) return;
    try{ await api.delete(`/branches/${id}`); await reload(); }catch(e){ setError(e?.response?.data?.error || e.message); }
  };

  const openAssign = async (b)=>{
    setActiveBranch(b);
    setAssignees([]); setBranchClients([]);
    try{
      const [{data:s},{data:c}] = await Promise.all([
        api.get(`/branches/${b.id}/staff`),
        api.get(`/branches/${b.id}/borrowers`),
      ]);
      setAssignees(s?.items || []);
      setBranchClients(c?.items || []);
      setPickUsers([]); setPickBorrowers([]);
      setFrom(""); setTo("");
      setStats({});
    }catch(e){ setError(e?.response?.data?.error || e.message); }
  };

  const doAssignUsers = async ()=>{
    try{
      await api.post(`/branches/${activeBranch.id}/staff`, { userIds: pickUsers });
      await openAssign(activeBranch);
    }catch(e){ setError(e?.response?.data?.error || e.message); }
  };
  const removeUser = async (uid)=>{
    try{ await api.delete(`/branches/${activeBranch.id}/staff/${uid}`); await openAssign(activeBranch); }catch(e){ setError(e?.response?.data?.error || e.message); }
  };

  const doAssignBorrowers = async ()=>{
    try{
      await api.post(`/branches/${activeBranch.id}/borrowers`, { borrowerIds: pickBorrowers });
      await openAssign(activeBranch);
    }catch(e){ setError(e?.response?.data?.error || e.message); }
  };
  const removeBorrower = async (bid)=>{
    try{ await api.delete(`/branches/${activeBranch.id}/borrowers/${bid}`); await openAssign(activeBranch); }catch(e){ setError(e?.response?.data?.error || e.message); }
  };

  const loadStats = async ()=>{
    try{
      const { data } = await api.get(`/branches/${activeBranch.id}/stats`, { params:{ from: from||undefined, to: to||undefined }});
      setStats(data||{});
    }catch(e){ setError(e?.response?.data?.error || e.message); }
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Branches</h1>
      </header>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {/* Create / Edit */}
      <div className="bg-white border rounded-xl p-3 grid gap-2 md:grid-cols-6 items-end">
        <div className="md:col-span-2">
          <label className="block text-xs text-gray-500">Name</label>
          <input className="border rounded px-2 py-1 text-sm w-full"
                 value={form.name} onChange={(e)=>setForm(s=>({...s,name:e.target.value}))} />
        </div>
        <div>
          <label className="block text-xs text-gray-500">Code</label>
          <input className="border rounded px-2 py-1 text-sm w-full"
                 value={form.code} onChange={(e)=>setForm(s=>({...s,code:e.target.value}))} />
        </div>
        <div>
          <label className="block text-xs text-gray-500">Email</label>
          <input className="border rounded px-2 py-1 text-sm w-full"
                 value={form.email} onChange={(e)=>setForm(s=>({...s,email:e.target.value}))} />
        </div>
        <div>
          <label className="block text-xs text-gray-500">Phone</label>
          <input className="border rounded px-2 py-1 text-sm w-full"
                 value={form.phone} onChange={(e)=>setForm(s=>({...s,phone:e.target.value}))} />
        </div>
        <div>
          <label className="block text-xs text-gray-500">Status</label>
          <select className="border rounded px-2 py-1 text-sm w-full"
                  value={form.status} onChange={(e)=>setForm(s=>({...s,status:e.target.value}))}>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-gray-500">Address</label>
          <input className="border rounded px-2 py-1 text-sm w-full"
                 value={form.address} onChange={(e)=>setForm(s=>({...s,address:e.target.value}))} />
        </div>
        {canM && (
          <button onClick={save} className="px-3 py-2 border rounded-lg bg-white hover:bg-gray-50 text-sm">
            {editing ? "Update" : "Add Branch"}
          </button>
        )}
      </div>

      {/* List */}
      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600 border-b">
              <th className="py-2 px-3">Branch</th>
              <th className="py-2 px-3">Code</th>
              <th className="py-2 px-3">Email</th>
              <th className="py-2 px-3">Phone</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length===0 ? (
              <tr><td colSpan={6} className="p-3 text-gray-500">No branches.</td></tr>
            ) : rows.map(b=>(
              <tr key={b.id} className="border-b">
                <td className="py-2 px-3">{b.name}</td>
                <td className="py-2 px-3">{b.code}</td>
                <td className="py-2 px-3">{b.email || "—"}</td>
                <td className="py-2 px-3">{b.phone || "—"}</td>
                <td className="py-2 px-3">{b.status}</td>
                <td className="py-2 px-3">
                  <div className="flex flex-wrap gap-2">
                    <button className="text-xs border rounded px-2 py-0.5" onClick={()=>openAssign(b)}>Open</button>
                    {canM && <>
                      <button className="text-xs border rounded px-2 py-0.5"
                              onClick={()=>{ setEditing(b); setForm({
                                name:b.name, code:b.code, email:b.email||"", phone:b.phone||"",
                                address:b.address||"", status:b.status||"active"
                              }); }}>Edit</button>
                      <button className="text-xs border rounded px-2 py-0.5" onClick={()=>del(b.id)}>Delete</button>
                    </>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Drawer / Panel for a selected branch */}
      {activeBranch && (
        <div className="bg-white border rounded-xl p-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{activeBranch.name} — Operations</h2>
            <button className="text-sm" onClick={()=>setActiveBranch(null)}>Close</button>
          </div>

          {/* Stats filters */}
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <label className="block text-xs text-gray-500">From</label>
              <input type="date" className="border rounded px-2 py-1 text-sm" value={from} onChange={(e)=>setFrom(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500">To</label>
              <input type="date" className="border rounded px-2 py-1 text-sm" value={to} onChange={(e)=>setTo(e.target.value)} />
            </div>
            <button onClick={loadStats} className="px-3 py-2 border rounded-lg bg-white hover:bg-gray-50 text-sm">Refresh KPIs</button>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <KPI title="Staff" value={stats.staffCount ?? "—"} />
            <KPI title="Borrowers" value={stats.borrowers ?? "—"} />
            <KPI title="Disbursed" value={`TZS ${Number(stats.disbursed||0).toLocaleString()}`} />
            <KPI title="Collected" value={`TZS ${Number(stats.collected||0).toLocaleString()}`} />
            <KPI title="Expenses" value={`TZS ${Number(stats.expenses||0).toLocaleString()}`} />
          </div>

          {/* Assignments */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Staff */}
            <div className="border rounded-xl p-3">
              <h3 className="font-medium mb-2">Staff</h3>
              {canA && (
                <div className="flex gap-2 items-end mb-3">
                  <select multiple className="border rounded px-2 py-1 text-sm min-w-[260px] h-28"
                          value={pickUsers} onChange={(e)=>setPickUsers(Array.from(e.target.selectedOptions).map(o=>Number(o.value)))}>
                    {users.map(u=> <option key={u.id} value={u.id}>{u.name || `${u.firstName||''} ${u.lastName||''}`} — {u.email}</option>)}
                  </select>
                  <button onClick={doAssignUsers} className="px-3 py-2 border rounded-lg bg-white hover:bg-gray-50 text-sm">Assign</button>
                </div>
              )}
              <table className="w-full text-sm">
                <tbody>
                  {assignees.length===0 ? <tr><td className="text-gray-500 p-2">No staff assigned.</td></tr> :
                    assignees.map(s=>(
                      <tr key={s.id} className="border-t">
                        <td className="p-2">{s.name} <span className="text-xs text-gray-500">({s.email})</span></td>
                        <td className="p-2 text-right">
                          {canA && <button className="text-xs border rounded px-2 py-0.5" onClick={()=>removeUser(s.id)}>Remove</button>}
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>

            {/* Borrowers */}
            <div className="border rounded-xl p-3">
              <h3 className="font-medium mb-2">Borrowers / Clients</h3>
              {canA && (
                <div className="flex gap-2 items-end mb-3">
                  <select multiple className="border rounded px-2 py-1 text-sm min-w-[260px] h-28"
                          value={pickBorrowers} onChange={(e)=>setPickBorrowers(Array.from(e.target.selectedOptions).map(o=>Number(o.value)))}>
                    {borrowers.map(b=> <option key={b.id} value={b.id}>{b.name} — {b.phone}</option>)}
                  </select>
                  <button onClick={doAssignBorrowers} className="px-3 py-2 border rounded-lg bg-white hover:bg-gray-50 text-sm">Assign</button>
                </div>
              )}
              <table className="w-full text-sm">
                <tbody>
                  {branchClients.length===0 ? <tr><td className="text-gray-500 p-2">No clients assigned.</td></tr> :
                    branchClients.map(b=>(
                      <tr key={b.id} className="border-t">
                        <td className="p-2">{b.name} <span className="text-xs text-gray-500">({b.phone || "—"})</span></td>
                        <td className="p-2 text-right">
                          {canA && <button className="text-xs border rounded px-2 py-0.5" onClick={()=>removeBorrower(b.id)}>Remove</button>}
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick links to reporting (reuse your existing reports pages) */}
          <div className="border rounded-xl p-3">
            <h3 className="font-medium mb-2">Reports (branch filter)</h3>
            <p className="text-xs text-gray-600 mb-2">Use your existing reports with a <code>?branchId=…</code> param, or we can add a branch filter server-side if not present yet.</p>
            <div className="flex flex-wrap gap-2">
              <a className="text-xs border rounded px-2 py-1" href={`/reports/collections?branchId=${activeBranch.id}`} >Collections</a>
              <a className="text-xs border rounded px-2 py-1" href={`/reports/loans?branchId=${activeBranch.id}`} >Loans</a>
              <a className="text-xs border rounded px-2 py-1" href={`/reports/daily?branchId=${activeBranch.id}`} >Daily</a>
              <a className="text-xs border rounded px-2 py-1" href={`/reports/monthly?branchId=${activeBranch.id}`} >Monthly</a>
              <a className="text-xs border rounded px-2 py-1" href={`/reports/fees?branchId=${activeBranch.id}`} >Fees</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KPI({ title, value }) {
  return (
    <div className="bg-white border rounded-xl p-3 flex items-center gap-3">
      <div className="px-2 py-1 rounded bg-slate-50 text-slate-600">{title}</div>
      <div className="font-semibold">{value ?? "—"}</div>
    </div>
  );
}
