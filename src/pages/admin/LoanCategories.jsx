import React, { useEffect, useState } from "react";
import { SettingsAPI } from "../../api/settings";

export default function LoanCategories() {
  const [items, setItems] = useState([]), [q,setQ] = useState(""), [err,setErr]=useState(""), [loading,setLoading]=useState(false);
  const [form, setForm] = useState({ name:"" }); const [saving, setSaving] = useState(false);

  const load = async ()=>{ setLoading(true); setErr(""); try{
    const data = await SettingsAPI.getLoanCategories(); setItems(data||[]);
  }catch(e){ setErr(e?.response?.data?.message || e.message);} finally{ setLoading(false);} };

  useEffect(()=>{ load(); }, []);

  const create = async ()=>{ if(!form.name.trim()) return;
    setSaving(true); setErr(""); try{ await SettingsAPI.createLoanCategory({name:form.name.trim()}); setForm({name:""}); await load();
    }catch(e){ setErr(e?.response?.data?.message || e.message);} finally{ setSaving(false);} };

  const update = async (id, name)=>{ try{ await SettingsAPI.updateLoanCategory(id,{name}); await load(); }catch(e){ setErr(e?.response?.data?.message || e.message);} };
  const remove = async (id)=>{ if(!confirm("Delete category?")) return; try{ await SettingsAPI.deleteLoanCategory(id); await load(); }catch(e){ setErr(e?.response?.data?.message || e.message);} };

  const filtered = items.filter(c => c.name?.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-3">
      <header className="bg-white dark:bg-slate-900 border rounded-2xl p-4">
        <h1 className="text-xl font-semibold">Loan Categories</h1>
        <div className="flex gap-2 mt-2">
          <input className="rounded border px-3 py-2 text-sm" placeholder="Search…" value={q} onChange={e=>setQ(e.target.value)}/>
          <input className="rounded border px-3 py-2 text-sm" placeholder="New category name" value={form.name} onChange={e=>setForm({name:e.target.value})}/>
          <button className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm" onClick={create} disabled={saving}>{saving?"Saving…":"Add"}</button>
        </div>
      </header>

      <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4">
        {err && <div className="text-sm text-rose-600 mb-2">{err}</div>}
        {loading ? <div className="text-sm text-slate-500">Loading…</div> : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-slate-500">
              <th className="py-2">Name</th><th className="py-2 w-40">Action</th>
            </tr></thead>
            <tbody>
              {filtered.map(c=> <Row key={c.id} c={c} onUpdate={update} onDelete={remove} />)}
              {filtered.length===0 && <tr><td className="py-3 text-slate-500">No results.</td><td/></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Row({ c, onUpdate, onDelete }) {
  const [name,setName]=useState(c.name||""); const [edit,setEdit]=useState(false);
  const save=async()=>{ await onUpdate(c.id,name); setEdit(false); };
  return (
    <tr className="border-t">
      <td className="py-2">{edit
        ? <input className="rounded border px-2 py-1 text-sm" value={name} onChange={e=>setName(e.target.value)}/>
        : c.name
      }</td>
      <td className="py-2">
        {edit ? (
          <>
            <button className="px-2 py-1 rounded bg-blue-600 text-white text-xs mr-2" onClick={save}>Save</button>
            <button className="px-2 py-1 rounded bg-slate-100 text-xs" onClick={()=>{setEdit(false); setName(c.name||"");}}>Cancel</button>
          </>
        ) : (
          <>
            <button className="px-2 py-1 rounded bg-slate-100 text-xs mr-2" onClick={()=>setEdit(true)}>Edit</button>
            <button className="px-2 py-1 rounded bg-rose-600 text-white text-xs" onClick={()=>onDelete(c.id)}>Delete</button>
          </>
        )}
      </td>
    </tr>
  );
}
