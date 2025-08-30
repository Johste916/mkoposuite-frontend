import { useEffect, useState } from "react";
import api from "../../api";

export default function Attendance() {
  const [rows, setRows] = useState([]);
  const [date, setDate] = useState(()=>new Date().toISOString().slice(0,10));

  const load = async ()=>{
    try{
      const { data } = await api.get("/hr/attendance", { params:{ date }});
      setRows(data?.items || []);
    }catch{}
  };
  useEffect(()=>{ load(); },[date]);

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Attendance</h1>
      <div className="bg-white border rounded-xl p-3 flex gap-2 items-center">
        <label className="text-xs text-gray-500">Date</label>
        <input type="date" className="border rounded px-2 py-1 text-sm" value={date} onChange={(e)=>setDate(e.target.value)} />
      </div>
      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead><tr className="text-left text-gray-600 border-b">
            <th className="py-2 px-3">Employee</th><th className="py-2 px-3">Status</th><th className="py-2 px-3">In</th><th className="py-2 px-3">Out</th>
          </tr></thead>
          <tbody>
            {rows.length===0 ? <tr><td colSpan={4} className="p-3 text-gray-500">No entries.</td></tr> :
              rows.map(r=>(
                <tr key={r.id} className="border-b">
                  <td className="py-2 px-3">{r.employee?.name || r.employeeName}</td>
                  <td className="py-2 px-3">{r.status}</td>
                  <td className="py-2 px-3">{r.timeIn || "—"}</td>
                  <td className="py-2 px-3">{r.timeOut || "—"}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
