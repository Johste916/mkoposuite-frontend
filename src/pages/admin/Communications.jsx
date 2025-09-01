// src/pages/admin/Communications.jsx
import React, { useEffect, useRef, useState } from "react";
import { SettingsAPI } from "../../api/settings";

export default function Communications() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({ title: "", channel: "email", body: "" });
  const fileRef = useRef(null);

  const load = async () => {
    setErr(""); setLoading(true);
    try {
      const data = await SettingsAPI.listComms();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    try {
      await SettingsAPI.createComm(form);
      setForm({ title: "", channel: "email", body: "" });
      await load();
    } catch (e) { setErr(e?.response?.data?.error || e.message); }
  };

  const del = async (id) => {
    if (!confirm("Delete this communication?")) return;
    try {
      await SettingsAPI.deleteComm(id);
      await load();
    } catch (e) { setErr(e?.response?.data?.error || e.message); }
  };

  const uploadAttachment = async (id) => {
    const f = fileRef.current?.files?.[0];
    if (!f) return;
    const fd = new FormData();
    fd.append("file", f);
    try {
      await SettingsAPI.addCommAttachment(id, fd);
      fileRef.current.value = "";
      await load();
    } catch (e) { setErr(e?.response?.data?.error || e.message); }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
      <h1 className="text-xl font-semibold">Communications</h1>
      {err && <div className="text-sm text-rose-600">{err}</div>}
      <div className="grid md:grid-cols-2 gap-3">
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
            <option value="inapp">inapp</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs">Body</label>
          <textarea rows={6} className="w-full border rounded px-2 py-1 text-sm"
                    value={form.body} onChange={(e)=>setForm(s=>({...s,body:e.target.value}))}/>
        </div>
        <div>
          <button onClick={add} className="px-3 py-2 border rounded bg-white">Add</button>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-xl">
        <table className="min-w-full text-sm">
          <thead><tr className="border-b">
            <th className="p-2 text-left">Title</th>
            <th className="p-2 text-left">Channel</th>
            <th className="p-2">Attachments</th>
            <th className="p-2"></th>
          </tr></thead>
          <tbody>
          {loading ? (
            <tr><td colSpan={4} className="p-3">Loading…</td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={4} className="p-3">No communications</td></tr>
          ) : rows.map(r => (
            <tr key={r.id} className="border-b align-top">
              <td className="p-2">{r.title}</td>
              <td className="p-2">{r.channel}</td>
              <td className="p-2">
                <div className="space-y-1">
                  {(r.attachments || []).map(att => (
                    <div key={att.id} className="flex items-center justify-between gap-2">
                      <a href={att.url} target="_blank" rel="noreferrer" className="underline">{att.name || "file"}</a>
                      <button
                        className="text-xs px-2 py-1 border rounded"
                        onClick={()=>SettingsAPI.removeCommAttachment(r.id, att.id).then(load).catch(e=>setErr(e?.response?.data?.error||e.message))}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <input ref={fileRef} type="file" className="text-xs"/>
                    <button className="text-xs px-2 py-1 border rounded" onClick={()=>uploadAttachment(r.id)}>Upload</button>
                  </div>
                </div>
              </td>
              <td className="p-2 text-right">
                <button onClick={()=>del(r.id)} className="px-2 py-1 text-xs border rounded">Delete</button>
              </td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
