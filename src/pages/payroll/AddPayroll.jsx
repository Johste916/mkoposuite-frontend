import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../../api";

const canRun = (u) =>
  !!u && (u.role === "admin" || u.role === "director" || u.permissions?.includes("payroll:run"));

export default function AddPayroll() {
  const [me, setMe] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [sp] = useSearchParams();
  const navigate = useNavigate();

  // Default-allow when /auth/me isn’t wired in dev
  const allowed = useMemo(()=> me ? canRun(me) : true ,[me]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const [meReq, empReq] = await Promise.allSettled([
          api.get("/auth/me"),
          api.get("/hr/employees", { params: { active: 1, limit: 1000 } }),
        ]);
        if (cancel) return;
        if (meReq.status === "fulfilled") setMe(meReq.value.data || null);
        const items = (empReq.status === "fulfilled" ? (empReq.value.data?.items || []) : []).map((e) => ({
          employeeId: e.id,
          name: `${e.firstName} ${e.lastName}`,
          base: Number(e.baseSalary || 0),
          allowances: 0,
          deductions: 0,
          overtime: 0,
          advances: 0,
          savings: 0,
          loans: 0,
        }));
        setEmployees(empReq.status === "fulfilled" ? (empReq.value.data?.items || []) : []);
        setLines(items);
      } catch (e) {
        setErr(e?.response?.data?.message || e.message);
      } finally {
        setLoading(false);
      }
    })();
    return () => (cancel = true);
  }, []);

  useEffect(()=>{
    const clone = sp.get("clone");
    if (!clone) return;
    (async () => {
      try {
        const { data } = await api.get(`/hr/payroll/runs/${clone}`);
        setFrom(data?.periodFrom || data?.periodStart || "");
        setTo(data?.periodTo || data?.periodEnd || "");
        if (Array.isArray(data?.lines)) setLines(data.lines);
      } catch {}
    })();
  }, [sp]);

  const total = (l)=> Number(l.base||0)+Number(l.allowances||0)+Number(l.overtime||0)
    - Number(l.deductions||0) - Number(l.advances||0) - Number(l.savings||0) - Number(l.loans||0);

  const submit = async () => {
    if (!allowed) { setErr("You don't have permission to run payroll."); return; }
    if (!from || !to) { setErr("Select a period"); return; }
    setSaving(true);
    setErr("");
    try {
      const payload = { periodFrom: from, periodTo: to, lines };
      const { data } = await api.post("/hr/payroll/runs", payload);
      navigate(`/payroll/report?runId=${data.runId}`);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Payroll failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">Loading…</div>;
  if (!allowed) return <div className="p-4 text-red-600">You don't have permission to run payroll.</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Run Payroll</h1>
      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="bg-white border rounded-xl p-3 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500">Period From</label>
          <input type="date" className="border rounded px-2 py-1 text-sm" value={from} onChange={(e)=>setFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-500">Period To</label>
          <input type="date" className="border rounded px-2 py-1 text-sm" value={to} onChange={(e)=>setTo(e.target.value)} />
        </div>
        <button onClick={submit} disabled={saving} className="px-3 py-2 border rounded-lg bg-white hover:bg-gray-50 text-sm">
          {saving ? "Running…" : "Run"}
        </button>
      </div>

      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600 border-b">
              <th className="py-2 px-3">Employee</th>
              <th className="py-2 px-3">Base</th>
              <th className="py-2 px-3">Allowances</th>
              <th className="py-2 px-3">Overtime</th>
              <th className="py-2 px-3">Deductions</th>
              <th className="py-2 px-3">Advances</th>
              <th className="py-2 px-3">Savings</th>
              <th className="py-2 px-3">Loans</th>
              <th className="py-2 px-3">Net</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, idx)=>(
              <tr key={l.employeeId} className="border-b">
                <td className="py-2 px-3">{l.name}</td>
                {["base","allowances","overtime","deductions","advances","savings","loans"].map((k)=>(
                  <td key={k} className="py-2 px-3">
                    <input
                      type="number"
                      className="border rounded px-2 py-1 w-28"
                      value={l[k]}
                      onChange={(e)=>{
                        const x=[...lines];
                        x[idx]={...x[idx],[k]:Number(e.target.value||0)};
                        setLines(x);
                      }}
                    />
                  </td>
                ))}
                <td className="py-2 px-3 font-medium">TZS {total(l).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
