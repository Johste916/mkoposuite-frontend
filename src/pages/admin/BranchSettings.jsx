import React, { useEffect, useState } from "react";
import { SettingsAPI } from "../../api/settings";

export default function BranchSettings() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const list = await SettingsAPI.listBranches();
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Failed to load branches");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async (id, payload) => {
    setSavingId(id); setErr("");
    try {
      await SettingsAPI.updateBranch(id, payload);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Failed to update branch");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <header className="bg-white dark:bg-slate-900 border rounded-2xl p-4">
        <h1 className="text-xl font-semibold">Branch Settings</h1>
        <p className="text-sm text-slate-500">Edit branch information.</p>
      </header>

      <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4">
        {err && <div className="text-sm text-rose-600 mb-2">{err}</div>}
        {loading ? (
          <div className="text-sm text-slate-500">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-slate-500">No branches found.</div>
        ) : (
          <div className="space-y-3">
            {items.map((b) => (
              <BranchRow key={b.id} b={b} onSave={save} saving={savingId === b.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BranchRow({ b, onSave, saving }) {
  const [data, setData] = useState(b);
  const [edit, setEdit] = useState(false);

  const submit = () =>
    onSave(b.id, {
      name: data.name,
      code: data.code,
      location: data.location,
      manager: data.manager,
    }).then(() => setEdit(false));

  return (
    <div className="p-3 border rounded-lg grid grid-cols-1 md:grid-cols-5 gap-2">
      <input disabled={!edit} className="rounded border px-3 py-2 text-sm" value={data.name || ""} onChange={(e)=>setData({...data,name:e.target.value})} placeholder="Name"/>
      <input disabled={!edit} className="rounded border px-3 py-2 text-sm" value={data.code || ""} onChange={(e)=>setData({...data,code:e.target.value})} placeholder="Code"/>
      <input disabled={!edit} className="rounded border px-3 py-2 text-sm" value={data.location || ""} onChange={(e)=>setData({...data,location:e.target.value})} placeholder="Location"/>
      <input disabled={!edit} className="rounded border px-3 py-2 text-sm" value={data.manager || ""} onChange={(e)=>setData({...data,manager:e.target.value})} placeholder="Manager"/>
      <div className="flex items-center gap-2">
        {edit ? (
          <>
            <button className="px-3 py-1.5 rounded bg-blue-600 text-white" onClick={submit} disabled={saving}>Save</button>
            <button className="px-3 py-1.5 rounded bg-slate-100" onClick={()=>{setData(b); setEdit(false);}}>Cancel</button>
          </>
        ) : (
          <button className="px-3 py-1.5 rounded bg-slate-100" onClick={()=>setEdit(true)}>Edit</button>
        )}
      </div>
    </div>
  );
}
