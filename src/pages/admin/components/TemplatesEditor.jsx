import React, { useEffect, useState } from "react";
import api from "../../../api";

/** Generic CRUD for /admin/templates/:category  */
export default function TemplatesEditor({ title, category, channel = null }) {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ name:"", subject:"", body:"", channel: channel || "email" });

  const load = async () => {
    setErr("");
    try {
      const { data } = await api.get(`/admin/templates/${category}`);
      setRows(data || []);
    } catch (e) { setErr(e?.response?.data?.error || e.message); }
  };

  useEffect(()=>{ load(); /* eslint-disable */ },[category]);

  const add = async () => {
    try {
      await api.post(`/admin/templates/${category}`, form);
      setForm({ name:"", subject:"", body:"", channel: form.channel });
      await load();
    } catch (e) { setErr(e?.response?.data?.error || e.message); }
  };

  const del = async (id) => {
    if (!confirm("Delete?")) return;
    try { await api.delete(`/admin/templates/${category}/${id}`); await load(); }
    catch (e) { setErr(e?.response?.data?.error || e.message); }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
      <h1 className="text-xl font-semibold">{title}</h1>
      {err && <div className="text-sm text-rose-600">{err}</div>}

      <div className="grid md:grid-cols-2 gap-2">
        <div>
          <label className="block text-xs">Name</label>
          <input className="w-full border rounded px-2 py-1 text-sm"
                 value={form.name} onChange={(e)=>setForm(s=>({...s,name:e.target.value}))}/>
        </div>
        {form.channel !== "sms" && (
          <div>
            <label className="block text-xs">Subject</label>
            <input className="w-full border rounded px-2 py-1 text-sm"
                   value={form.subject} onChange={(e)=>setForm(s=>({...s,subject:e.target.value}))}/>
          </div>
        )}
        <div className="md:col-span-2">
          <label className="block text-xs">Body</label>
          <textarea rows={8} className="w-full border rounded px-2 py-1 text-sm"
                    value={form.body} onChange={(e)=>setForm(s=>({...s,body:e.target.value}))}/>
        </div>
        <div>
          <label className="block text-xs">Channel</label>
          <select className="w-full border rounded px-2 py-1 text-sm"
                  value={form.channel} onChange={(e)=>setForm(s=>({...s,channel:e.target.value}))}>
            <option value="email">email</option>
            <option value="sms">sms</option>
          </select>
        </div>
        <div className="self-end">
          <button onClick={add} className="px-3 py-2 border rounded bg-white">Add</button>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-xl">
        <table className="min-w-full text-sm">
          <thead><tr className="border-b"><th className="p-2 text-left">Name</th><th className="p-2">Channel</th><th className="p-2"></th></tr></thead>
          <tbody>
            {rows.length===0 ? <tr><td className="p-3" colSpan={3}>No templates</td></tr> :
              rows.map(r=>(
                <tr key={r.id} className="border-b">
                  <td className="p-2">{r.name}</td>
                  <td className="p-2 text-center">{r.channel || "—"}</td>
                  <td className="p-2 text-right">
                    <button onClick={()=>del(r.id)} className="px-2 py-1 text-xs border rounded">Delete</button>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
