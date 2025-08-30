import React, { useEffect, useState } from "react";
import api from "../../api";

export default function Leave() {
  const [employees, setEmployees] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ employeeId: "", type: "annual", startDate: "", endDate: "", reason: "" });

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const [emps, leaves] = await Promise.all([api.get("/hr/employees"), api.get("/hr/leave")]);
      setEmployees(Array.isArray(emps.data) ? emps.data : emps.data?.items || []);
      setRows(Array.isArray(leaves.data) ? leaves.data : leaves.data?.items || []);
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load leaves.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setMsg("");
    try {
      await api.post("/hr/leave", { ...form });
      setMsg("Leave requested.");
      setForm({ employeeId: "", type: "annual", startDate: "", endDate: "", reason: "" });
      await load();
    } catch (e2) {
      setErr(e2?.response?.data?.error || e2?.message || "Failed to request leave.");
    }
  };

  const badge = (s) =>
    s === "approved" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200" :
    s === "rejected" ? "bg-rose-100 text-rose-800 dark:bg-rose-900/20 dark:text-rose-200" :
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <h1 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-slate-100">Leave Management</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Request and review leave.</p>
      </div>

      {msg && <div className="text-sm text-emerald-600">{msg}</div>}
      {err && <div className="text-sm text-rose-600">{err}</div>}

      <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <select required value={form.employeeId} onChange={(e) => set("employeeId", e.target.value)} className="px-3 py-2 border rounded bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <option value="">Employee</option>
          {employees.map((e) => (<option key={e.id} value={e.id}>{e.name || e.email}</option>))}
        </select>
        <select value={form.type} onChange={(e) => set("type", e.target.value)} className="px-3 py-2 border rounded bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <option value="annual">Annual</option>
          <option value="sick">Sick</option>
          <option value="unpaid">Unpaid</option>
          <option value="maternity">Maternity</option>
          <option value="paternity">Paternity</option>
        </select>
        <input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} className="px-3 py-2 border rounded bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
        <input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} className="px-3 py-2 border rounded bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
        <input placeholder="Reason" value={form.reason} onChange={(e) => set("reason", e.target.value)} className="px-3 py-2 border rounded bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 lg:col-span-2" />
        <div className="sm:col-span-2 lg:col-span-5">
          <button className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Request Leave</button>
        </div>
      </form>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
        {loading ? (
          <div className="h-24 animate-pulse bg-slate-100 dark:bg-slate-800" />
        ) : rows.length === 0 ? (
          <div className="p-4 text-sm text-slate-600 dark:text-slate-400">No leave requests.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-2 px-3">Employee</th>
                <th className="py-2 px-3">Type</th>
                <th className="py-2 px-3">Start</th>
                <th className="py-2 px-3">End</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Reason</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">{r.employee?.name || r.employeeName || r.employeeId}</td>
                  <td className="py-2 px-3 capitalize">{r.type || "—"}</td>
                  <td className="py-2 px-3">{r.startDate ? new Date(r.startDate).toLocaleDateString() : "—"}</td>
                  <td className="py-2 px-3">{r.endDate ? new Date(r.endDate).toLocaleDateString() : "—"}</td>
                  <td className="py-2 px-3"><span className={`px-2 py-0.5 rounded text-xs ${badge(r.status || "pending")}`}>{r.status || "pending"}</span></td>
                  <td className="py-2 px-3">{r.reason || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
