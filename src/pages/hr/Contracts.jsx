import React, { useEffect, useState } from "react";
import api from "../../api";

export default function Contracts() {
  const [employees, setEmployees] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ employeeId: "", startDate: "", endDate: "", title: "", salary: "" });

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const [emps, cons] = await Promise.all([api.get("/hr/employees"), api.get("/hr/contracts")]);
      setEmployees(Array.isArray(emps.data) ? emps.data : emps.data?.items || []);
      setRows(Array.isArray(cons.data) ? cons.data : cons.data?.items || []);
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load contracts.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const add = async (e) => {
    e.preventDefault();
    setMsg(""); setErr("");
    try {
      await api.post("/hr/contracts", {
        ...form,
        salary: Number(form.salary) || 0,
      });
      setMsg("Contract saved.");
      setForm({ employeeId: "", startDate: "", endDate: "", title: "", salary: "" });
      await load();
    } catch (e2) {
      setErr(e2?.response?.data?.error || e2?.message || "Failed to save contract.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <h1 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-slate-100">Contracts</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Create and review staff contracts.</p>
      </div>

      {msg && <div className="text-sm text-emerald-600">{msg}</div>}
      {err && <div className="text-sm text-rose-600">{err}</div>}

      <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <select required value={form.employeeId} onChange={(e) => set("employeeId", e.target.value)} className="px-3 py-2 border rounded bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <option value="">Employee</option>
          {employees.map((e) => (<option key={e.id} value={e.id}>{e.name || e.email}</option>))}
        </select>
        <input placeholder="Title (e.g. Loan Officer)" value={form.title} onChange={(e) => set("title", e.target.value)} className="px-3 py-2 border rounded bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
        <input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} className="px-3 py-2 border rounded bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
        <input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} className="px-3 py-2 border rounded bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
        <input type="number" min="0" step="1" placeholder="Salary (TZS)" value={form.salary} onChange={(e) => set("salary", e.target.value)} className="px-3 py-2 border rounded bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
        <div className="sm:col-span-2 lg:col-span-5">
          <button className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Save Contract</button>
        </div>
      </form>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
        {loading ? (
          <div className="h-24 animate-pulse bg-slate-100 dark:bg-slate-800" />
        ) : rows.length === 0 ? (
          <div className="p-4 text-sm text-slate-600 dark:text-slate-400">No contracts.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-2 px-3">Employee</th>
                <th className="py-2 px-3">Title</th>
                <th className="py-2 px-3">Start</th>
                <th className="py-2 px-3">End</th>
                <th className="py-2 px-3">Salary</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">{r.employee?.name || r.employeeName || r.employeeId}</td>
                  <td className="py-2 px-3">{r.title || "—"}</td>
                  <td className="py-2 px-3">{r.startDate ? new Date(r.startDate).toLocaleDateString() : "—"}</td>
                  <td className="py-2 px-3">{r.endDate ? new Date(r.endDate).toLocaleDateString() : "—"}</td>
                  <td className="py-2 px-3">{Number.isFinite(Number(r.salary)) ? `TZS ${Number(r.salary).toLocaleString()}` : "TZS —"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
