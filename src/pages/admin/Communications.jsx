import React from "react";
import { SettingsAPI } from "../../api/settings";

export default function Communications() {
  const [rows, setRows] = React.useState([]);
  const [err, setErr] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [form, setForm] = React.useState({ title:"", channel:"email", body:"" });

  const load = async () => {
    setErr(""); setLoading(true);
    try {
      const data = await SettingsAPI.listComms();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) { setErr(e?.response?.data?.error || e.message); }
    finally { setLoading(false); }
  };
  React.useEffect(()=>{ load(); },[]);

  const add = async () => {
    try {
      await SettingsAPI.createComm(form);
      setForm({ title:"", channel:"email", body:"" });
      await load();
    } catch (e) { setErr(e?.response?.data?.error || e.message); }
  };
  const del = async (id) => {
    if (!confirm("Delete?")) return;
    try { await SettingsAPI.deleteComm(id); await load(); }
    catch (e) { setErr(e?.response?.data?.error || e.message); }
  };

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;

  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-4">
      <h1 className="text-xl font-semibold">Communications</h1>
      {err && <div className="text-sm text-rose-600">{err}</div>}

      <div className="grid md:grid-cols-2 gap-2 items-start">
        <div>
          <label className="block text-xs">Title</label>
          <input className="w-full border rounded px-2 py-1 text-sm"
                 value={form.title} onChange={(e)=>setForm(s=>({...s,title:e.target.value}))}/>
        </div>
        <div>
          <label className="block text-xs">Channel</label>
          <select className="w-full border rounded px-2 py-1 text-sm"
                  value={form.channel} onChange={(e)=>setForm(s=>({...s,channel:e.target.value}))}>
            <option value="email">email</option>
            <option value="sms">sms</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs">Body</label>
          <textarea rows={5} className="w-full border rounded px-2 py-1 text-sm"
                    value={form.body} onChange={(e)=>setForm(s=>({...s,body:e.target.value}))}/>
        </div>
        <div><button onClick={add} className="px-3 py-2 border rounded bg-white">Add</button></div>
      </div>

      <div className="overflow-x-auto border rounded-xl">
        <table className="min-w-full text-sm">
          <thead><tr className="border-b"><th className="p-2 text-left">Title</th><th className="p-2">Channel</th><th className="p-2 w-28"></th></tr></thead>
          <tbody>
            {rows.length===0 ? <tr><td className="p-3" colSpan={3}>No items</td></tr> :
              rows.map(r=>(
                <tr key={r.id} className="border-b">
                  <td className="p-2">{r.title}</td>
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
