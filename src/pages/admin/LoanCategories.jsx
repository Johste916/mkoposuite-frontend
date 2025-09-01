import React from "react";
import api from "../../api";

export default function LoanCategories() {
  const [rows, setRows] = React.useState([]);
  const [form, setForm] = React.useState({ name: "", code: "" });
  const [err, setErr] = React.useState(""); const [loading, setLoading] = React.useState(true);

  const load = async () => {
    setErr(""); setLoading(true);
    try { const { data } = await api.get("/api/settings/loan-categories"); setRows(Array.isArray(data)?data:[]); }
    catch (e) { setErr(e?.response?.data?.error || e.message); }
    finally { setLoading(false); }
  };
  React.useEffect(()=>{ load(); },[]);

  const add = async () => {
    try {
      await api.post("/api/settings/loan-categories", { name: form.name, code: form.code || null });
      setForm({ name:"", code:"" }); await load();
    } catch (e) { setErr(e?.response?.data?.error || e.message); }
  };
  const del = async (id) => {
    if (!confirm("Delete?")) return;
    try { await api.delete(`/api/settings/loan-categories/${id}`); await load(); }
    catch (e) { setErr(e?.response?.data?.error || e.message); }
  };
  const save = async (id, p) => {
    try { await api.put(`/api/settings/loan-categories/${id}`, p); await load(); }
    catch (e) { setErr(e?.response?.data?.error || e.message); }
  };

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;

  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3">
      <h1 className="text-xl font-semibold">Loan Categories</h1>
      {err && <div className="text-sm text-rose-600">{err}</div>}

      <div className="grid md:grid-cols-3 gap-2 items-end">
        <div><label className="block text-xs">Name</label>
          <input className="w-full border rounded px-2 py-1 text-sm"
                 value={form.name} onChange={(e)=>setForm(s=>({...s,name:e.target.value}))}/>
        </div>
        <div><label className="block text-xs">Code</label>
          <input className="w-full border rounded px-2 py-1 text-sm"
                 value={form.code} onChange={(e)=>setForm(s=>({...s,code:e.target.value}))}/>
        </div>
        <div>
          <button onClick={add} className="px-3 py-2 border rounded bg-white">Add</button>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-xl">
        <table className="min-w-full text-sm">
          <thead><tr className="border-b">
            <th className="p-2 text-left">Name</th><th className="p-2 text-left">Code</th><th className="p-2"></th>
          </tr></thead>
          <tbody>
            {rows.length===0 ? <tr><td className="p-3" colSpan={3}>No categories</td></tr> :
              rows.map(r=>(
                <tr key={r.id} className="border-b">
                  <td className="p-2">
                    <input className="w-full border rounded px-2 py-1"
                           value={r.name||""}
                           onChange={(e)=>setRows(s=>s.map(x=>x.id===r.id?{...x,name:e.target.value}:x))}/>
                  </td>
                  <td className="p-2">
                    <input className="w-full border rounded px-2 py-1"
                           value={r.code||""}
                           onChange={(e)=>setRows(s=>s.map(x=>x.id===r.id?{...x,code:e.target.value}:x))}/>
                  </td>
                  <td className="p-2 text-right space-x-2">
                    <button className="px-2 py-1 text-xs border rounded"
                            onClick={()=>save(r.id, { name:r.name, code:r.code })}>Save</button>
                    <button className="px-2 py-1 text-xs border rounded"
                            onClick={()=>del(r.id)}>Delete</button>
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
