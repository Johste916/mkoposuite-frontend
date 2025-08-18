import React, { useEffect, useState } from "react";
import { ReportingAPI } from "../../api/reporting";
import { ACL } from "../../api/acl";

export default function StaffEmailNotifications() {
  const [defs, setDefs] = useState([]);
  const [subs, setSubs] = useState([]);
  const [roles, setRoles] = useState([]);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const blank = {
    name: "", reportKey: "", frequency: "daily", timeOfDay: "09:00",
    dayOfWeek: 1, dayOfMonth: 1, monthOfYear: 1, cron: "",
    format: "csv", filters: {},
    recipientsType: "role", roleId: "", userId: "", emails: [],
    active: true,
  };
  const [form, setForm] = useState(blank);

  const load = async () => {
    try {
      setErr("");
      const [d, s, r] = await Promise.all([
        ReportingAPI.listDefs(),
        ReportingAPI.listSubs(),
        ACL.listRoles(),
      ]);
      setDefs(d || []);
      setSubs(s || []);
      setRoles(r || []);
    } catch (e) {
      setErr(e?.response?.data?.error || "Failed to load");
    }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    try {
      setSaving(true); setErr("");
      const payload = {
        ...form,
        roleId: form.recipientsType === "role" ? Number(form.roleId) || null : null,
        userId: form.recipientsType === "user" ? Number(form.userId) || null : null,
      };
      const row = await ReportingAPI.createSub(payload);
      setSubs([row, ...subs]);
      setForm(blank);
    } catch (e) {
      setErr(e?.response?.data?.error || "Failed to create subscription");
    } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm("Delete this subscription?")) return;
    await ReportingAPI.deleteSub(id);
    setSubs(subs.filter(s => s.id !== id));
  };

  const runNow = async (id) => {
    try {
      await ReportingAPI.runNow(id);
      alert("Sent!");
    } catch (e) {
      alert(e?.response?.data?.error || "Failed to send");
    }
  };

  return (
    <div className="space-y-4">
      <header className="bg-white dark:bg-slate-900 border rounded-2xl p-4">
        <h1 className="text-xl font-semibold">Staff Email Notifications</h1>
        <p className="text-sm text-slate-500">Schedule reports to be emailed to staff by role or recipients.</p>
      </header>

      {err && <div className="text-sm text-rose-600">{err}</div>}

      {/* Create */}
      <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 grid grid-cols-1 md:grid-cols-6 gap-2">
        <input className="rounded border px-3 py-2 text-sm md:col-span-2" placeholder="Name"
          value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>

        <select className="rounded border px-3 py-2 text-sm md:col-span-2"
          value={form.reportKey} onChange={e=>setForm(f=>({...f,reportKey:e.target.value}))}>
          <option value="">Select report…</option>
          {defs.map(d => <option key={d.key} value={d.key}>{d.name}</option>)}
        </select>

        <select className="rounded border px-3 py-2 text-sm"
          value={form.format} onChange={e=>setForm(f=>({...f,format:e.target.value}))}>
          <option value="csv">CSV</option>
          <option value="xlsx" disabled>Excel (soon)</option>
          <option value="pdf"  disabled>PDF (soon)</option>
        </select>

        <div className="md:col-span-6 grid grid-cols-1 md:grid-cols-6 gap-2">
          <select className="rounded border px-3 py-2 text-sm"
            value={form.frequency} onChange={e=>setForm(f=>({...f,frequency:e.target.value}))}>
            <option>daily</option><option>weekly</option><option>monthly</option>
            <option>quarterly</option><option>semiannual</option><option>annual</option>
            <option>custom</option>
          </select>

          <input className="rounded border px-3 py-2 text-sm" placeholder="HH:mm"
            value={form.timeOfDay} onChange={e=>setForm(f=>({...f,timeOfDay:e.target.value}))}/>

          {form.frequency === "weekly" && (
            <select className="rounded border px-3 py-2 text-sm"
              value={form.dayOfWeek} onChange={e=>setForm(f=>({...f,dayOfWeek:Number(e.target.value)}))}>
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d,i)=><option key={i} value={i}>{d}</option>)}
            </select>
          )}

          {['monthly','quarterly','semiannual','annual'].includes(form.frequency) && (
            <input type="number" min="1" max="28" className="rounded border px-3 py-2 text-sm"
              value={form.dayOfMonth} onChange={e=>setForm(f=>({...f,dayOfMonth:Number(e.target.value)}))} placeholder="Day of month"/>
          )}

          {form.frequency === "annual" && (
            <input type="number" min="1" max="12" className="rounded border px-3 py-2 text-sm"
              value={form.monthOfYear} onChange={e=>setForm(f=>({...f,monthOfYear:Number(e.target.value)}))} placeholder="Month (1..12)"/>
          )}

          {form.frequency === "custom" && (
            <input className="rounded border px-3 py-2 text-sm md:col-span-2" placeholder="CRON expression"
              value={form.cron} onChange={e=>setForm(f=>({...f,cron:e.target.value}))}/>
          )}
        </div>

        {/* Recipients */}
        <div className="md:col-span-6 grid grid-cols-1 md:grid-cols-6 gap-2">
          <select className="rounded border px-3 py-2 text-sm"
            value={form.recipientsType} onChange={e=>setForm(f=>({...f,recipientsType:e.target.value}))}>
            <option value="role">By role</option>
            <option value="user">Specific user (ID)</option>
            <option value="emails">Custom emails</option>
          </select>

          {form.recipientsType === "role" && (
            <select className="rounded border px-3 py-2 text-sm md:col-span-2"
              value={form.roleId} onChange={e=>setForm(f=>({...f,roleId:e.target.value}))}>
              <option value="">Select role…</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          )}

          {form.recipientsType === "user" && (
            <input className="rounded border px-3 py-2 text-sm md:col-span-2" placeholder="User ID"
              value={form.userId} onChange={e=>setForm(f=>({...f,userId:e.target.value}))}/>
          )}

          {form.recipientsType === "emails" && (
            <input className="rounded border px-3 py-2 text-sm md:col-span-3" placeholder="email1@example.com, email2@example.com"
              value={form.emails.join(', ')} onChange={e=>setForm(f=>({...f,emails:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}))}/>
          )}

          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.active} onChange={e=>setForm(f=>({...f,active:e.target.checked}))}/>
            Active
          </label>

          <div className="md:col-span-2 flex justify-end">
            <button className="px-3 py-2 rounded bg-blue-600 text-white" disabled={saving} onClick={create}>
              {saving ? "Saving…" : "Create subscription"}
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 overflow-auto">
        {subs.length === 0 ? (
          <div className="text-sm text-slate-500">No subscriptions yet.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Report</th>
                <th className="py-2 pr-4">When</th>
                <th className="py-2 pr-4">Recipients</th>
                <th className="py-2 pr-4">Last / Next</th>
                <th className="py-2 pr-4">Ops</th>
              </tr>
            </thead>
            <tbody>
              {subs.map(s => (
                <tr key={s.id} className="border-t">
                  <td className="py-2 pr-4">{s.name}</td>
                  <td className="py-2 pr-4"><code className="text-xs">{s.reportKey}</code></td>
                  <td className="py-2 pr-4">{s.frequency} @ {s.timeOfDay}</td>
                  <td className="py-2 pr-4">
                    {s.recipientsType === 'role' ? `role #${s.roleId}` :
                     s.recipientsType === 'user' ? `user #${s.userId}` :
                     (s.emails||[]).join(', ')}
                  </td>
                  <td className="py-2 pr-4">
                    <div className="text-xs">
                      <div>Last: {s.lastRunAt ? new Date(s.lastRunAt).toLocaleString() : '—'}</div>
                      <div>Next: {s.nextRunAt ? new Date(s.nextRunAt).toLocaleString() : '—'}</div>
                    </div>
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex gap-2">
                      <button className="px-2 py-1 rounded border" onClick={()=>runNow(s.id)}>Send now</button>
                      <button className="px-2 py-1 rounded border text-rose-700" onClick={()=>remove(s.id)}>Delete</button>
                    </div>
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
