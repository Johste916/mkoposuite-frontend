import { useEffect, useState } from "react";
import api from "../../api";

export default function Contracts() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ employeeId:"", title:"", startDate:"", endDate:"", file:null });
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState("");

  const load = async ()=>{
    setError("");
    try{
      const [{data:e},{data:c}] = await Promise.all([
        api.get("/hr/employees", { params:{ limit:500 }}),
        api.get("/hr/contracts")
      ]);
      setEmployees(e?.items || []); setRows(c?.items || []);
    }catch(err){
      setError(
        err?.response?.data?.message?.includes("Required table is missing")
          ? "Required table is missing. Run DB migrations (sequelize)."
          : (err?.response?.data?.message || err.message)
      );
    }
  };
  useEffect(()=>{ load(); },[]);

  const upload = async ()=>{
    try{
      const fd = new FormData();
      Object.entries(form).forEach(([k,v])=> fd.append(k,v));
      await api.post("/hr/contracts", fd, { headers:{ "Content-Type":"multipart/form-data"}});
      setForm({ employeeId:"", title:"", startDate:"", endDate:"", file:null });
      await load();
    }catch(e){ setError(e?.response?.data?.message || e.message); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Contracts</h1>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="bg-white border rounded-xl p-3 grid gap-2 md:grid-cols-6 items-end">
        <div className="md:col-span-2">
          <label className="block text-xs text-gray-500">Employee</label>
          <select className="border rounded px-2 py-1 text-sm w-full" value={form.employeeId} onChange={(e)=>setForm(s=>({...s,employeeId:e.target.value}))}>
            <option value="">Select</option>
            {employees.map(e=><option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500">Title</label>
          <input className="border rounded px-2 py-1 text-sm w-full" value={form.title} onChange={(e)=>setForm(s=>({...s,title:e.target.value}))}/>
        </div>
        <div>
          <label className="block text-xs text-gray-500">Start</label>
          <input type="date" className="border rounded px-2 py-1 text-sm w-full" value={form.startDate} onChange={(e)=>setForm(s=>({...s,startDate:e.target.value}))}/>
        </div>
        <div>
          <label className="block text-xs text-gray-500">End</label>
          <input type="date" className="border rounded px-2 py-1 text-sm w-full" value={form.endDate} onChange={(e)=>setForm(s=>({...s,endDate:e.target.value}))}/>
        </div>
        <div>
          <label className="block text-xs text-gray-500">PDF</label>
          <input type="file" accept="application/pdf" onChange={(e)=>setForm(s=>({...s,file:e.target.files?.[0]||null}))}/>
        </div>
        <button onClick={upload} className="px-3 py-2 border rounded-lg bg-white hover:bg-gray-50 text-sm">Upload</button>
      </div>

      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead><tr className="text-left text-gray-600 border-b">
            <th className="py-2 px-3">Employee</th><th className="py-2 px-3">Title</th>
            <th className="py-2 px-3">Start→End</th><th className="py-2 px-3">Status</th><th className="py-2 px-3">File</th>
          </tr></thead>
          <tbody>
            {rows.length===0 ? <tr><td colSpan={5} className="p-3 text-gray-500">No contracts.</td></tr> :
              rows.map(c=>(
                <tr key={c.id} className="border-b">
                  <td className="py-2 px-3">{c.employee?.name || c.employeeName}</td>
                  <td className="py-2 px-3">{c.title}</td>
                  <td className="py-2 px-3">{c.startDate} → {c.endDate}</td>
                  <td className="py-2 px-3">{c.status || (new Date(c.endDate) >= new Date() ? "active" : "expired")}</td>
                  <td className="py-2 px-3">{c.fileUrl ? <a href={c.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">Open</a> : "—"}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
