import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function Employees() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        // Prefer a dedicated endpoint if you add one
        // GET /api/hr/employees
        let data;
        try {
          data = await api("/api/hr/employees");
        } catch {
          // Fallback to /api/hr or dummy object
          const any = await api("/api/hr");
          data = Array.isArray(any) ? any : (any.employees || []);
        }
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold mb-3">Employees</h1>
      {loading && <div className="text-sm text-gray-500">Loading…</div>}
      {err && <div className="text-sm text-red-600">Error: {err}</div>}
      {!loading && !rows.length && <div className="text-sm text-gray-500">No employees found.</div>}
      {!!rows.length && (
        <table className="w-full text-sm rounded-2xl border bg-white dark:bg-slate-900">
          <thead>
            <tr className="text-left">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id}>
                <td className="px-3 py-2">{e.name || e.fullName || '-'}</td>
                <td className="px-3 py-2">{e.email || '-'}</td>
                <td className="px-3 py-2">{e.role || e.title || '-'}</td>
                <td className="px-3 py-2">{e.status || 'active'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
