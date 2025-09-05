import React, { useEffect, useState } from "react";
import api from "../../api";

export default function AdminTenants() {
  const [rows, setRows] = useState([]);
  const [sel, setSel] = useState(null);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try {
      const res = await api.get(`/admin/tenants`, { params: { q } });
      setRows(res.data || []);
    } catch (e) { setErr(e?.response?.data?.error || e.message); }
  }
  useEffect(() => { load(); }, []); // eslint-disable-line

  async function open(id) {
    const r = await api.get(`/admin/tenants/${id}`);
    setSel(r.data);
  }

  async function save() {
    await api.patch(`/admin/tenants/${sel.id}`, {
      name: sel.name, status: sel.status, plan_code: sel.plan_code,
      trial_ends_at: sel.trial_ends_at, grace_days: sel.grace_days,
      billing_email: sel.billing_email, auto_disable_overdue: sel.auto_disable_overdue,
    });
    await load();
    setSel(null);
  }

  return (
    <div className="ms-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Admin · Tenants</h2>
        <div className="flex items-center gap-2">
          <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search…" className="ms-input" />
          <button onClick={load} className="ms-btn">Search</button>
        </div>
      </div>

      {err && <div className="text-rose-600 text-sm">Error: {err}</div>}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr><th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Plan</th><th className="py-2 pr-4">Status</th><th className="py-2 pr-4">Trial ends</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="py-2 pr-4">{r.name}</td>
                <td className="py-2 pr-4">{r.plan_code}</td>
                <td className="py-2 pr-4">{r.status}</td>
                <td className="py-2 pr-4">{r.trial_ends_at?.slice(0,10) || "-"}</td>
                <td className="py-2 pr-4"><button className="ms-btn" onClick={()=>open(r.id)}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Simple inline editor */}
      {sel && (
        <div className="border-t pt-3 space-y-2">
          <h3 className="font-semibold">Edit {sel.name}</h3>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <label className="block">Name
              <input className="ms-input" value={sel.name||""} onChange={e=>setSel({...sel,name:e.target.value})} />
            </label>
            <label className="block">Plan
              <select className="ms-input" value={sel.plan_code||"basic"} onChange={e=>setSel({...sel,plan_code:e.target.value})}>
                <option value="basic">basic</option><option value="pro">pro</option><option value="premium">premium</option>
              </select>
            </label>
            <label className="block">Status
              <select className="ms-input" value={sel.status||"active"} onChange={e=>setSel({...sel,status:e.target.value})}>
                <option value="active">active</option>
                <option value="trial">trial</option>
                <option value="suspended">suspended</option>
                <option value="cancelled">cancelled</option>
              </select>
            </label>
            <label className="block">Trial ends
              <input type="date" className="ms-input" value={sel.trial_ends_at?.slice(0,10)||""} onChange={e=>setSel({...sel,trial_ends_at:e.target.value})}/>
            </label>
            <label className="block">Grace days
              <input type="number" className="ms-input" value={sel.grace_days??7} onChange={e=>setSel({...sel,grace_days:Number(e.target.value||0)})}/>
            </label>
            <label className="block">Billing email
              <input className="ms-input" value={sel.billing_email||""} onChange={e=>setSel({...sel,billing_email:e.target.value})}/>
            </label>
            <label className="flex items-center gap-2 col-span-full">
              <input type="checkbox" checked={!!sel.auto_disable_overdue} onChange={e=>setSel({...sel,auto_disable_overdue:e.target.checked})}/>
              <span>Auto suspend overdue</span>
            </label>
          </div>
          <div className="flex gap-2">
            <button className="ms-btn" onClick={()=>setSel(null)}>Cancel</button>
            <button className="ms-btn-primary" onClick={save}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
}
