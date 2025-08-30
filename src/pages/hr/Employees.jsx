import { useEffect, useState } from "react";
import api from "../../api";

export default function Employees() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ firstName:"", lastName:"", email:"", role:"staff", baseSalary:0 });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async ()=>{
    setError("");
    try {
      const { data } = await api.get("/hr/employees", { params:{ limit:1000 } });
      setRows(data?.items || []);
    } catch (e) {
      setError(
        e?.response?.data?.message?.includes("Required table is missing")
          ? "Required table is missing. Run DB migrations on the backend (npx sequelize-cli db:migrate)."
          : (e?.response?.data?.message || e.message)
      );
    }
  };

  useEffect(()=>{ load(); },[]);

  const add = async ()=>{
    setSaving(true);
    setError("");
    try{
      await api.post("/hr/employees", form);
      setForm({ firstName:"", lastName:"", email:"", role:"staff", baseSalary:0 });
      await load();
    }catch(e){
      setError(e?.response?.data?.message || e.message);
    }finally{ setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Employees</h1>
      {error && (
        <div className="text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="bg-white border rounded-xl p-3 grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
        {["firstName","lastName","email"].map((k)=>(
          <div key={k}>
            <label className="block text-xs text-gray-500 capitalize">{k}</label>
            <input className="border rounded px-2 py-1 text-sm w-full" value={form[k]} onChange={(e)=>setForm(s=>({...s,[k]:e.target.value}))} />
          </div>
        ))}
        <div>
          <label className="block text-xs text-gray-500">Role</label>
          <select className="border rounded px-2 py-1 text-sm w-full" value={form.role} onChange={(e)=>setForm(s=>({...s,role:e.target.value}))}>
            <option value="staff">Staff</option>
            <option value="payroll_admin">Payroll Admin</option>
            <option value="branch_manager">Branch Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500">Base Salary (TZS)</label>
          <input type="number" className="border rounded px-2 py-1 text-sm w-full" value={form.baseSalary} onChange={(e)=>setForm(s=>({...s,baseSalary:Number(e.target.value||0)}))} />
        </div>
        <button onClick={add} disabled={saving} className="px-3 py-2 border rounded-lg bg-white hover:bg-gray-50 text-sm md:col-span-1">
          {saving ? "Saving…" : "Add"}
        </button>
      </div>

      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600 border-b">
              <th className="py-2 px-3">Name</th><th className="py-2 px-3">Email</th>
              <th className="py-2 px-3">Role</th><th className="py-2 px-3">Base Salary</th>
            </tr>
          </thead>
          <tbody>
            {rows.length===0 ? (
              <tr><td colSpan={4} className="p-3 text-gray-500">No employees.</td></tr>
            ) : rows.map(e=>(
              <tr key={e.id} className="border-b">
                <td className="py-2 px-3">{e.firstName} {e.lastName}</td>
                <td className="py-2 px-3">{e.email}</td>
                <td className="py-2 px-3">{e.role}</td>
                <td className="py-2 px-3">TZS {Number(e.baseSalary||0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
