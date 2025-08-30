import { useEffect, useState } from "react";
import api from "../../api";

export default function Leave() {
  const [types, setTypes] = useState([]);
  const [mine, setMine] = useState([]);
  const [form, setForm] = useState({ typeId:"", from:"", to:"", reason:"", paid:1 });
  const [error, setError] = useState("");

  const load = async ()=>{
    setError("");
    try{
      const [{data:t},{data:r}] = await Promise.all([
        api.get("/hr/leave/types"),
        api.get("/hr/leave/my-requests")
      ]);
      setTypes(t?.items || []);
      setMine(r?.items || []);
    }catch(e){
      setError(
        e?.response?.data?.message?.includes("Required table is missing")
          ? "Required table is missing. Run DB migrations (sequelize)."
          : (e?.response?.data?.message || e.message)
      );
    }
  };
  useEffect(()=>{ load(); },[]);

  const submit = async ()=>{
    try{
      await api.post("/hr/leave/requests", form);
      setForm({ typeId:"", from:"", to:"", reason:"", paid:1 });
      await load();
    }catch(e){ setError(e?.response?.data?.message || e.message); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Leave Management</h1>
      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="bg-white border rounded-xl p-3 grid gap-2 md:grid-cols-5 items-end">
        <div>
          <label className="block text-xs text-gray-500">Type</label>
          <select className="border rounded px-2 py-1 text-sm w-full" value={form.typeId} onChange={(e)=>setForm(s=>({...s,typeId:e.target.value}))}>
            <option value="">Select Type</option>
            {types.map(t=><option key={t.id} value={t.id}>{t.name} — {t.days} days/yr</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500">From</label>
          <input type="date" className="border rounded px-2 py-1 text-sm w-full" value={form.from} onChange={(e)=>setForm(s=>({...s,from:e.target.value}))} />
        </div>
        <div>
          <label className="block text-xs text-gray-500">To</label>
          <input type="date" className="border rounded px-2 py-1 text-sm w-full" value={form.to} onChange={(e)=>setForm(s=>({...s,to:e.target.value}))} />
        </div>
        <div>
          <label className="block text-xs text-gray-500">Paid?</label>
          <select className="border rounded px-2 py-1 text-sm w-full" value={form.paid} onChange={(e)=>setForm(s=>({...s,paid:Number(e.target.value)}))}>
            <option value={1}>Paid</option><option value={0}>Unpaid</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-gray-500">Reason</label>
          <input className="border rounded px-2 py-1 text-sm w-full" value={form.reason} onChange={(e)=>setForm(s=>({...s,reason:e.target.value}))} />
        </div>
        <button onClick={submit} className="px-3 py-2 border rounded-lg bg-white hover:bg-gray-50 text-sm">Request</button>
      </div>

      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead><tr className="text-left text-gray-600 border-b">
            <th className="py-2 px-3">Type</th><th className="py-2 px-3">From → To</th>
            <th className="py-2 px-3">Paid</th><th className="py-2 px-3">Status</th>
          </tr></thead>
          <tbody>
            {mine.length===0 ? <tr><td colSpan={4} className="p-3 text-gray-500">No requests yet.</td></tr> :
              mine.map(x=>(
                <tr key={x.id} className="border-b">
                  <td className="py-2 px-3">{x.type?.name}</td>
                  <td className="py-2 px-3">{x.from} → {x.to}</td>
                  <td className="py-2 px-3">{x.paid ? "Paid":"Unpaid"}</td>
                  <td className="py-2 px-3">{x.status}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
