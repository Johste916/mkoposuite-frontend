// src/pages/admin/LoanCategories.jsx
import React, { useEffect, useState } from "react";
import { SettingsAPI } from "../../api/settings";

export default function LoanCategories() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ name:"", code:"" });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setErr("");
    setLoading(true);
    try {
      const data = await SettingsAPI.getLoanCategories();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) { setErr(e?.response?.data?.error || e.message); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ load(); },[]);

  const add = async () => {
    try { await SettingsAPI.createLoanCategory(form); setForm({ name:"", code:"" }); await load(); }
    catch (e) { setErr(e?.response?.data?.error || e.message); }
  };

  const save = async (id, patch) => {
    try { await SettingsAPI.updateLoanCategory(id, patch); await load(); }
    catch (e) { setErr(e?.response?.data?.error || e.message); }
  };

  const del = async (id) => {
    if (!confirm("Delete?")) return;
    try { await SettingsAPI.deleteLoanCategory(id); await load(); }
    catch (e) { setErr(e?.response?.data?.error || e.message); }
  };

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;

  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3">
      <h1 className="text-xl font-semibold">Loan Categories</h1>
      {err && <div className="text-sm text-rose-600">{err}</div>}

      <div className="grid md:grid-cols-3 gap-2 items-end">
        <div>
          <label className="block text-xs">Name</label>
          <input className="w-full border rounded px-2 py-1 text-sm" value={form.name}
                 onChange={(e)=>setForm(s=>({...s,name:e.target.value}))}/>
        </div>
        <div>
          <label className="block text-xs">Code</label>
          <input className="w-full border rounded px-2 py-1 text-sm" value={form.code}
                 onChange={(e)=>setForm(s=>({...s,code:e.target.value}))}/>
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
            <th className="p-2"></th>
          </tr></thead>
          <tbody>
          {rows.length === 0 ? (
            <tr><td className="p-3" colSpan={3}>No categories</td></tr>
          ) : rows.map(r => <Row key={r.id} row={r} onSave={save} onDelete={del} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ row, onSave, onDelete }) {
  const [edit, setEdit] = useState({ name: row.name || "", code: row.code || "" });
  return (
    <tr className="border-b">
      <td className="p-2"><input className="w-full border rounded px-2 py-1" value={edit.name} onChange={(e)=>setEdit(s=>({...s,name:e.target.value}))}/></td>
      <td className="p-2"><input className="w-full border rounded px-2 py-1" value={edit.code} onChange={(e)=>setEdit(s=>({...s,code:e.target.value}))}/></td>
      <td className="p-2 text-right space-x-2">
        <button className="px-2 py-1 text-xs border rounded" onClick={()=>onSave(row.id, edit)}>Save</button>
        <button className="px-2 py-1 text-xs border rounded" onClick={()=>onDelete(row.id)}>Delete</button>
      </td>
    </tr>
  );
}
