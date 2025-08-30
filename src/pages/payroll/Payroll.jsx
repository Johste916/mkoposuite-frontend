import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";

const canAll = (u) =>
  !!u && (u.role === "admin" || u.role === "director" || u.permissions?.includes("payroll:read_all"));

export default function Payroll() {
  const [me, setMe] = useState(null);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  // default to admin in dev if /auth/me is missing
  const isAdmin = useMemo(() => (me ? canAll(me) : true), [me]);

  useEffect(() => {
    let unsub = false;
    (async () => {
      try {
        const [meReq, empReq] = await Promise.allSettled([
          api.get("/auth/me"),
          api.get("/hr/employees", { params: { limit: 500 } }),
        ]);
        if (unsub) return;
        if (meReq.status === "fulfilled") setMe(meReq.value.data || null);
        if (empReq.status === "fulfilled") setEmployees(empReq.value.data?.items || []);
      } catch { /* soft */ }
    })();
    return () => (unsub = true);
  }, []);

  const fetchRuns = async () => {
    setLoading(true);
    setError("");
    try {
      const params = { from: from || undefined, to: to || undefined };
      if (!isAdmin) params.scope = "me";
      if (isAdmin && employeeId) params.employeeId = employeeId;

      const [listRes, statsRes] = await Promise.all([
        api.get("/hr/payroll/runs", { params }),
        api.get("/hr/payroll/stats", { params }),
      ]);
      setRuns(listRes?.data?.items || []);
      setStats(statsRes?.data || null);
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to load payroll."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRuns(); /* initial */ }, [/* eslint-disable-line */ isAdmin]);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">View Payroll</h1>
        <div className="flex gap-2">
          {isAdmin && (
            <Link
              to="/payroll/add"
              className="px-3 py-2 text-sm border rounded-lg bg-white hover:bg-gray-50"
            >
              Run Payroll
            </Link>
          )}
        </div>
      </header>

      <div className="bg-white border rounded-xl p-3 flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-xs text-gray-500">From</label>
          <input type="date" className="border rounded px-2 py-1 text-sm" value={from} onChange={(e)=>setFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-500">To</label>
          <input type="date" className="border rounded px-2 py-1 text-sm" value={to} onChange={(e)=>setTo(e.target.value)} />
        </div>
        {isAdmin && (
          <div>
            <label className="block text-xs text-gray-500">Employee</label>
            <select className="border rounded px-2 py-1 text-sm min-w-[220px]" value={employeeId} onChange={(e)=>setEmployeeId(e.target.value)}>
              <option value="">All employees</option>
              {employees.map((e)=>(
                <option key={e.id} value={e.id}>{e.firstName} {e.lastName} {e.staffNo ? `(${e.staffNo})`:""}</option>
              ))}
            </select>
          </div>
        )}
        <button onClick={fetchRuns} className="px-3 py-2 border rounded-lg bg-white hover:bg-gray-50 text-sm">Apply</button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI title="Employees" value={stats.employees} tone="indigo" />
          <KPI title="On Leave" value={stats.onLeave} tone="amber" />
          <KPI title="Active Contracts" value={stats.activeContracts} tone="emerald" />
          <KPI title="This Period Net" value={`TZS ${Number(stats.netThisPeriod||0).toLocaleString()}`} tone="blue" />
        </div>
      )}

      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600 border-b">
              <th className="py-2 px-3">Period</th>
              <th className="py-2 px-3">Employee</th>
              <th className="py-2 px-3">Gross</th>
              <th className="py-2 px-3">Deductions</th>
              <th className="py-2 px-3">Net</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-3 text-gray-500" colSpan={7}>Loading…</td></tr>
            ) : error ? (
              <tr><td className="p-3 text-red-600" colSpan={7}>{error}</td></tr>
            ) : runs.length === 0 ? (
              <tr><td className="p-3 text-gray-500" colSpan={7}>No payroll found.</td></tr>
            ) : (
              runs.map((r)=>(
                <tr key={r.id || r.runId} className="border-b">
                  <td className="py-2 px-3">{r.periodLabel || `${r.periodFrom} → ${r.periodTo}`}</td>
                  <td className="py-2 px-3">{r.employee?.name || r.employeeName || '—'}</td>
                  <td className="py-2 px-3">TZS {Number(r.totalGross || r.gross || 0).toLocaleString()}</td>
                  <td className="py-2 px-3">TZS {Number(r.deductions || 0).toLocaleString()}</td>
                  <td className="py-2 px-3 font-medium">TZS {Number(r.totalNet || r.net || 0).toLocaleString()}</td>
                  <td className="py-2 px-3">{r.status || "finalized"}</td>
                  <td className="py-2 px-3">
                    <div className="flex gap-2">
                      <a className="text-blue-600 underline text-xs" href={r.payslipUrl || "#"} target="_blank" rel="noreferrer">Payslip</a>
                      <Link className="text-xs border rounded px-2 py-0.5" to={`/payroll/report?runId=${r.runId || r.id}`}>Run report</Link>
                      <Link className="text-xs border rounded px-2 py-0.5" to={`/payroll/add?clone=${r.runId || r.id}`}>Clone</Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KPI({ title, value, tone="indigo" }) {
  const tones = {
    indigo:"text-indigo-600 bg-indigo-50", amber:"text-amber-600 bg-amber-50",
    emerald:"text-emerald-600 bg-emerald-50", blue:"text-blue-600 bg-blue-50"
  }[tone] || "text-slate-600 bg-slate-50";
  return (
    <div className="bg-white border rounded-xl p-3 flex items-center gap-3">
      <div className={`px-2 py-1 rounded ${tones}`}>{title}</div>
      <div className="font-semibold">{value ?? "—"}</div>
    </div>
  );
}
