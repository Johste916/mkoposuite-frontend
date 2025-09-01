import React from "react";
import api from "../../api";

/** Uses SettingsAPI.getBranchSettings + updateBranch endpoints that you exposed */
export default function BranchSettings() {
  const [rows, setRows] = React.useState([]);
  const [err, setErr] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [savingId, setSavingId] = React.useState(null);

  const load = async () => {
    setErr(""); setLoading(true);
    try {
      const { data } = await api.get("/api/settings/branch-settings");
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    } finally { setLoading(false); }
  };
  React.useEffect(()=>{ load(); },[]);

  const save = async (row) => {
    setSavingId(row.id); setErr("");
    try {
      await api.put(`/api/settings/branch-settings/${row.id}`, { name: row.name, code: row.code, meta: row.meta ?? null });
      await load();
    } catch (e) { setErr(e?.response?.data?.error || e.message); }
    finally { setSavingId(null); }
  };

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;

  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3">
      <h1 className="text-xl font-semibold">Branches</h1>
      {err && <div className="text-sm text-rose-600">{err}</div>}

      <div className="overflow-x-auto border rounded-xl">
        <table className="min-w-full text-sm">
          <thead><tr className="border-b">
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">Code</th>
            <th className="p-2 text-left">Meta (JSON)</th>
            <th className="p-2"></th>
          </tr></thead>
          <tbody>
            {rows.map((r)=>(
              <tr key={r.id} className="border-b align-top">
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
                <td className="p-2">
                  <textarea rows={3} className="w-full border rounded px-2 py-1 font-mono"
                            value={r.meta ? JSON.stringify(r.meta, null, 2) : ""}
                            onChange={(e)=>{
                              const t = e.target.value;
                              let v = t;
                              try { v = JSON.parse(t); } catch {}
                              setRows(s=>s.map(x=>x.id===r.id?{...x,meta:v}:x));
                            }}/>
                </td>
                <td className="p-2 text-right">
                  <button onClick={()=>save(r)} disabled={savingId===r.id}
                          className="px-2 py-1 text-xs border rounded">
                    {savingId===r.id ? "Saving…" : "Save"}
                  </button>
                </td>
              </tr>
            ))}
            {rows.length===0 && <tr><td className="p-3" colSpan={4}>No branches</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
