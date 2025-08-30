import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../api";

export default function PayrollReport() {
  const [sp] = useSearchParams();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [employees, setEmployees] = useState([]);
  const [rows, setRows] = useState([]);
  const [sum, setSum] = useState({ gross:0, deductions:0, net:0 });
  const [error, setError] = useState("");

  const runId = sp.get("runId") || "";

  useEffect(()=>{ (async()=>{
    try {
      const { data } = await api.get("/hr/employees", { params:{ limit:500 } });
      setEmployees(data?.items || []);
    } catch {}
  })(); },[]);

  const fetchReport = async ()=>{
    setError("");
    try{
      const params = { from: from||undefined, to: to||undefined, employeeId: employeeId||undefined, runId: runId||undefined };
      const { data } = await api.get("/hr/payroll/report", { params });
      setRows(data?.items || []);
      setSum(data?.summary || {gross:0,deductions:0,net:0});
    }catch(e){
      setError(e?.response?.data?.message || e.message);
    }
  };

  useEffect(()=>{ if(runId) fetchReport(); /* auto if runId present */},[runId]);

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Payroll Report</h1>
      <div className="bg-white border rounded-xl p-3 flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-xs text-gray-500">From</label>
          <input type="date" className="border rounded px-2 py-1 text-sm" value={from} onChange={(e)=>setFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-500">To</label>
          <input type="date" className="border rounded px-2 py-1 text-sm" value={to} onChange={(e)=>setTo(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-500">Employee</label>
          <select className="border rounded px-2 py-1 text-sm min-w-[220px]" value={employeeId} onChange={(e)=>setEmployeeId(e.target.value)}>
            <option value="">All</option>
            {employees.map(e=>(
              <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
            ))}
          </select>
        </div>
        <button onClick={fetchReport} className="px-3 py-2 border rounded-lg bg-white hover:bg-gray-50 text-sm">Run</button>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600 border-b">
              <th className="py-2 px-3">Employee</th>
              <th className="py-2 px-3">Period</th>
              <th className="py-2 px-3">Gross</th>
              <th className="py-2 px-3">Deductions</th>
              <th className="py-2 px-3">Net</th>
            </tr>
          </thead>
          <tbody>
            {rows.length===0 ? (
              <tr><td className="p-3 text-gray-500" colSpan={5}>No data</td></tr>
            ) : rows.map(r=>(
              <tr key={r.id} className="border-b">
                <td className="py-2 px-3">{r.employee?.name || r.employeeName}</td>
                <td className="py-2 px-3">{r.periodLabel || `${r.periodFrom} → ${r.periodTo}`}</td>
                <td className="py-2 px-3">TZS {Number(r.gross||0).toLocaleString()}</td>
                <td className="py-2 px-3">TZS {Number(r.deductions||0).toLocaleString()}</td>
                <td className="py-2 px-3 font-medium">TZS {Number(r.net||0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td className="py-2 px-3" colSpan={2}>Totals</td>
              <td className="py-2 px-3">TZS {Number(sum.gross||0).toLocaleString()}</td>
              <td className="py-2 px-3">TZS {Number(sum.deductions||0).toLocaleString()}</td>
              <td className="py-2 px-3">TZS {Number(sum.net||0).toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
