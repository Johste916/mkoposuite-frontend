import React, { useEffect, useState } from "react";
import api from "../../../api";

/** Generic CRUD for /api/admin/types/:category (name/code + optional meta JSON) */
export default function TypesEditor({ title, category }) {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ name: "", code: "", meta: "" });

  const load = async () => {
    setErr("");
    try {
      const { data } = await api.get(`/admin/types/${category}`);
      setRows(data || []);
    } catch (e) { setErr(e?.response?.data?.error || e.message); }
  };

  useEffect(()=>{ load(); /* eslint-disable-next-line */ },[category]);

  const add = async () => {
    try {
      let meta = undefined;
      if (form.meta && typeof form.meta === "string") {
        try { meta = JSON.parse(form.meta); } catch {}
      } else if (form.meta && typeof form.meta === "object") { meta = form.meta; }
      await api.post(`/admin/types/${category}`, { name: form.name, code: form.code, meta });
      setForm({ name:"", code:"", meta:"" });
      await load();
    } catch (e) { setErr(e?.response?.data?.error || e.message); }
  };

  const del = async (id) => {
    if (!window.confirm("Delete?")) return;
    try { await api.delete(`/admin/types/${category}/${id}`); await load(); }
    catch (e) { setErr(e?.response?.data?.error || e.message); }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
      <h1 className="text-xl font-semibold">{title}</h1>
      {err && <div className="text-sm text-rose-600">{err}</div>}

      <div className="grid md:grid-cols-3 gap-2 items-end">
        <div>
          <label className="block text-xs">Name</label>
          <input className="w-full border rounded px-2 py-1 text-sm"
                 value={form.name} onChange={(e)=>setForm(s=>({...s,name:e.target.value}))}/>
        </div>
        <div>
          <label className="block text-xs">Code</label>
          <input className="w-full border rounded px-2 py-1 text-sm"
                 value={form.code} onChange={(e)=>setForm(s=>({...s,code:e.target.value}))}/>
        </div>
        <div className="md:col-span-3">
          <label className="block text-xs">Meta (JSON, optional)</label>
          <textarea rows={4} className="w-full border rounded px-2 py-1 text-sm"
                    value={form.meta} onChange={(e)=>setForm(s=>({...s,meta:e.target.value}))}/>
        </div>
        <div>
          <button onClick={add} className="px-3 py-2 border rounded bg-white">Add</button>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-xl">
        <table className="min-w-full text-sm">
          <thead><tr className="border-b">
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">Code</th>
            <th className="p-2 text-left">Meta</th>
            <th className="p-2"></th>
          </tr></thead>
          <tbody>
            {rows.length===0 ? <tr><td className="p-3" colSpan={4}>No items</td></tr> :
              rows.map(r=>(
                <tr key={r.id} className="border-b align-top">
                  <td className="p-2">{r.name}</td>
                  <td className="p-2">{r.code || "—"}</td>
                  <td className="p-2"><pre className="whitespace-pre-wrap text-xs">{r.meta ? JSON.stringify(r.meta, null, 2) : "—"}</pre></td>
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
