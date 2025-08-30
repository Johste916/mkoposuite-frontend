import { useEffect, useMemo, useState } from "react";
import api from "../api";

const canManage = (me) =>
  !!me && (
    me.role === "admin" ||
    me.role === "director" ||
    me.role === "branch_manager" ||
    me.permissions?.includes?.("branches:manage")
  );

export default function Branches() {
  const [me, setMe] = useState(null);
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", email: "", phone: "", address: "", status: "active" });
  const [editId, setEditId] = useState(null);

  const allowed = useMemo(() => canManage(me), [me]);

  const load = async () => {
    setError("");
    try {
      const [{ data: meRes }, { data: listRes }] = await Promise.all([
        api.get("/auth/me"),
        api.get("/branches/list", { params: { q } }), // NOTE: uses /api/branches/list via baseURL
      ]);
      setMe(meRes);
      setRows(listRes?.items || []);
    } catch (e) {
      const m = e?.response?.data?.error || e?.response?.data?.message || e.message;
      setError(
        (m || "").includes("Required table is missing")
          ? "Required table is missing. Create the branches table (see backend SQL)."
          : m
      );
    }
  };

  useEffect(() => { load(); /* initial */ }, []);
  useEffect(() => {
    const t = setTimeout(() => { if (q !== undefined) load(); }, 350);
    return () => clearTimeout(t);
  }, [q]); // debounce search

  const submit = async () => {
    if (!allowed) return;
    if (!form.name || !form.code) { setError("Name and Code are required."); return; }
    setSaving(true); setError("");
    try {
      if (editId) {
        await api.put(`/branches/${editId}`, form);
      } else {
        await api.post("/branches", form);
      }
      setForm({ name: "", code: "", email: "", phone: "", address: "", status: "active" });
      setEditId(null);
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e?.response?.data?.message || e.message);
    } finally { setSaving(false); }
  };

  const startEdit = (b) => {
    setEditId(b.id);
    setForm({
      name: b.name || "",
      code: b.code || "",
      email: b.email || "",
      phone: b.phone || "",
      address: b.address || "",
      status: b.status || "active",
    });
  };

  const remove = async (id) => {
    if (!allowed) return;
    if (!window.confirm("Archive this branch?")) return;
    try { await api.delete(`/branches/${id}`); await load(); }
    catch (e) { setError(e?.response?.data?.error || e.message); }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Branches</h1>
        <div className="flex items-center gap-2">
          <input
            className="border rounded-lg px-3 py-2 text-sm"
            placeholder="Search name or code…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </header>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {/* Create / Edit */}
      <div className={`bg-white border rounded-xl p-3 ${allowed ? "" : "opacity-60 pointer-events-none"}`}>
        <div className="grid gap-2 md:grid-cols-6 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500">Name</label>
            <input className="border rounded px-2 py-1 text-sm w-full" value={form.name}
                   onChange={(e)=>setForm(s=>({...s, name: e.target.value}))}/>
          </div>
          <div>
            <label className="block text-xs text-gray-500">Code</label>
            <input className="border rounded px-2 py-1 text-sm w-full" value={form.code}
                   onChange={(e)=>setForm(s=>({...s, code: e.target.value}))}/>
          </div>
          <div>
            <label className="block text-xs text-gray-500">Email</label>
            <input className="border rounded px-2 py-1 text-sm w-full" value={form.email}
                   onChange={(e)=>setForm(s=>({...s, email: e.target.value}))}/>
          </div>
          <div>
            <label className="block text-xs text-gray-500">Phone</label>
            <input className="border rounded px-2 py-1 text-sm w-full" value={form.phone}
                   onChange={(e)=>setForm(s=>({...s, phone: e.target.value}))}/>
          </div>
          <div>
            <label className="block text-xs text-gray-500">Status</label>
            <select className="border rounded px-2 py-1 text-sm w-full" value={form.status}
                    onChange={(e)=>setForm(s=>({...s, status: e.target.value}))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs text-gray-500">Address</label>
            <input className="border rounded px-2 py-1 text-sm w-full" value={form.address}
                   onChange={(e)=>setForm(s=>({...s, address: e.target.value}))}/>
          </div>

          <div className="flex gap-2">
            <button onClick={submit} disabled={saving}
                    className="px-3 py-2 border rounded-lg bg-white hover:bg-gray-50 text-sm">
              {saving ? (editId ? "Saving…" : "Adding…") : (editId ? "Save" : "Add")}
            </button>
            {editId && (
              <button onClick={()=>{ setEditId(null); setForm({ name:"", code:"", email:"", phone:"", address:"", status:"active" }); }}
                      className="px-3 py-2 border rounded-lg bg-white hover:bg-gray-50 text-sm">
                Cancel
              </button>
            )}
          </div>
        </div>
        {!allowed && <p className="text-xs text-gray-500 mt-2">Only Admin / Director / Branch Manager can add or edit branches.</p>}
      </div>

      {/* List */}
      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
          <tr className="text-left text-gray-600 border-b">
            <th className="py-2 px-3">Name</th>
            <th className="py-2 px-3">Code</th>
            <th className="py-2 px-3">Phone</th>
            <th className="py-2 px-3">Email</th>
            <th className="py-2 px-3">Status</th>
            <th className="py-2 px-3">Actions</th>
          </tr>
          </thead>
          <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={6} className="p-3 text-gray-500">No branches.</td></tr>
          ) : rows.map((b) => (
            <tr key={b.id} className="border-b">
              <td className="py-2 px-3">{b.name}</td>
              <td className="py-2 px-3">{b.code}</td>
              <td className="py-2 px-3">{b.phone || "—"}</td>
              <td className="py-2 px-3">{b.email || "—"}</td>
              <td className="py-2 px-3">{b.status || "active"}</td>
              <td className="py-2 px-3">
                <div className={`flex gap-2 ${allowed ? "" : "opacity-50 pointer-events-none"}`}>
                  <button className="text-xs border rounded px-2 py-0.5" onClick={()=>startEdit(b)}>Edit</button>
                  <button className="text-xs border rounded px-2 py-0.5" onClick={()=>remove(b.id)}>Archive</button>
                </div>
              </td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
