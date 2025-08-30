import React, { useEffect, useState } from "react";
import api from "../../api";

export default function Employees() {
  const [rows, setRows] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ name: "", email: "", position: "", branchId: "" });

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const [emp, bres] = await Promise.all([api.get("/hr/employees"), api.get("/branches")]);
      setRows(Array.isArray(emp.data) ? emp.data : emp.data?.items || []);
      setBranches(Array.isArray(bres.data) ? bres.data : bres.data?.data || []);
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load employees.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const add = async (e) => {
    e.preventDefault();
    setSaving(true); setErr(""); setMsg("");
    try {
      await api.post("/hr/employees", { ...form });
      setMsg("Employee added.");
      setForm({ name: "", email: "", position: "", branchId: "" });
      await load();
    } catch (e2) {
      setErr(e2?.response?.data?.error || e2?.message || "Failed to add employee.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <h1 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-slate-100">Employees</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Manage staff records.</p>
      </div>

      {msg && <div className="text-sm text-emerald-600">{msg}</div>}
      {err && <div className="text-sm text-rose-600">{err}</div>}

      {/* Add form */}
      <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <input className="border rounded px-3 py-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" placeholder="Name" value={form.name} onChange={(e) => set("name", e.target.value)} required />
        <input className="border rounded px-3 py-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" placeholder="Email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        <input className="border rounded px-3 py-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" placeholder="Position" value={form.position} onChange={(e) => set("position", e.target.value)} />
        <select className="border rounded px-3 py-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" value={form.branchId} onChange={(e) => set("branchId", e.target.value)}>
          <option value="">Branch</option>
          {branches.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
        </select>
        <div className="sm:col-span-2 lg:col-span-4">
          <button disabled={saving} className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">{saving ? "Saving…" : "Add Employee"}</button>
        </div>
      </form>

      {/* List */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
        {loading ? (
          <div className="h-24 animate-pulse bg-slate-100 dark:bg-slate-800" />
        ) : rows.length === 0 ? (
          <div className="p-4 text-sm text-slate-600 dark:text-slate-400">No employees yet.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-2 px-3">Name</th>
                <th className="py-2 px-3">Email</th>
                <th className="py-2 px-3">Position</th>
                <th className="py-2 px-3">Branch</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">{r.name}</td>
                  <td className="py-2 px-3">{r.email || "—"}</td>
                  <td className="py-2 px-3">{r.position || "—"}</td>
                  <td className="py-2 px-3">{r.branch?.name || r.branchName || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
