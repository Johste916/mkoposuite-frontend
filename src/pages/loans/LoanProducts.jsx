import React, { useEffect, useState } from 'react';
import api from '../../api';

export default function LoanProducts() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [form, setForm] = useState({
    name: '', code: '',
    status: 'active',
    interestMethod: 'flat', interestRate: 0,
    minPrincipal: '', maxPrincipal: '',
    minTermMonths: '', maxTermMonths: '',
    penaltyRate: '',
    fees: [],     // keep simple for now
    eligibility: {}
  });
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    const res = await api.get('/loan-products', { params: { q }});
    setItems(res.data.items || []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (editingId) {
      await api.put(`/loan-products/${editingId}`, form);
    } else {
      await api.post('/loan-products', form);
    }
    setForm({
      name:'', code:'', status:'active',
      interestMethod:'flat', interestRate:0,
      minPrincipal:'', maxPrincipal:'', minTermMonths:'', maxTermMonths:'',
      penaltyRate:'', fees:[], eligibility:{}
    });
    setEditingId(null);
    load();
  };

  const edit = (p) => {
    setEditingId(p.id);
    setForm({
      name: p.name, code: p.code, status: p.status,
      interestMethod: p.interestMethod, interestRate: p.interestRate,
      minPrincipal: p.minPrincipal ?? '', maxPrincipal: p.maxPrincipal ?? '',
      minTermMonths: p.minTermMonths ?? '', maxTermMonths: p.maxTermMonths ?? '',
      penaltyRate: p.penaltyRate ?? '', fees: p.fees || [], eligibility: p.eligibility || {}
    });
  };

  const remove = async (id) => {
    if (!confirm('Delete product?')) return;
    await api.delete(`/loan-products/${id}`);
    load();
  };

  const toggle = async (id) => {
    await api.patch(`/loan-products/${id}/toggle`);
    load();
  };

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-2xl font-bold">Loan Products</h2>

      <form onSubmit={submit} className="grid sm:grid-cols-2 gap-3 card">
        <input className="input" placeholder="Name"
          value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} required/>
        <input className="input" placeholder="Code"
          value={form.code} onChange={(e)=>setForm({...form,code:e.target.value})} required/>
        <select className="input" value={form.status}
          onChange={(e)=>setForm({...form,status:e.target.value})}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select className="input" value={form.interestMethod}
          onChange={(e)=>setForm({...form,interestMethod:e.target.value})}>
          <option value="flat">Flat</option>
          <option value="reducing">Reducing</option>
        </select>
        <input type="number" step="0.0001" className="input" placeholder="Interest Rate (%)"
          value={form.interestRate} onChange={(e)=>setForm({...form,interestRate:e.target.value})} required/>
        <input type="number" className="input" placeholder="Min Principal"
          value={form.minPrincipal} onChange={(e)=>setForm({...form,minPrincipal:e.target.value})}/>
        <input type="number" className="input" placeholder="Max Principal"
          value={form.maxPrincipal} onChange={(e)=>setForm({...form,maxPrincipal:e.target.value})}/>
        <input type="number" className="input" placeholder="Min Term (months)"
          value={form.minTermMonths} onChange={(e)=>setForm({...form,minTermMonths:e.target.value})}/>
        <input type="number" className="input" placeholder="Max Term (months)"
          value={form.maxTermMonths} onChange={(e)=>setForm({...form,maxTermMonths:e.target.value})}/>
        <input type="number" step="0.0001" className="input" placeholder="Penalty Rate (%)"
          value={form.penaltyRate} onChange={(e)=>setForm({...form,penaltyRate:e.target.value})}/>
        <button className="col-span-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700">
          {editingId ? 'Update Product' : 'Create Product'}
        </button>
      </form>

      <div className="flex items-center justify-between">
        <div />
        <input className="input md:w-80" placeholder="Search name/code"
          value={q} onChange={(e)=>setQ(e.target.value)} onKeyDown={(e)=>e.key==='Enter'&&load()}/>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full rounded border border-[var(--border)] bg-transparent text-sm">
          <thead className="text-[var(--fg)]">
            <tr>
              <th className="p-2 border border-[var(--border)]">Name</th>
              <th className="p-2 border border-[var(--border)]">Code</th>
              <th className="p-2 border border-[var(--border)]">Method</th>
              <th className="p-2 border border-[var(--border)]">Rate (%)</th>
              <th className="p-2 border border-[var(--border)]">Principal Range</th>
              <th className="p-2 border border-[var(--border)]">Term Range</th>
              <th className="p-2 border border-[var(--border)]">Status</th>
              <th className="p-2 border border-[var(--border)]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(p=>(
              <tr key={p.id} className="border-t border-[var(--border)]">
                <td className="border border-[var(--border)] px-2">{p.name}</td>
                <td className="border border-[var(--border)] px-2">{p.code}</td>
                <td className="border border-[var(--border)] px-2">{p.interestMethod}</td>
                <td className="border border-[var(--border)] px-2">{p.interestRate}</td>
                <td className="border border-[var(--border)] px-2">
                  {p.minPrincipal ?? '—'} — {p.maxPrincipal ?? '—'}
                </td>
                <td className="border border-[var(--border)] px-2">
                  {p.minTermMonths ?? '—'} — {p.maxTermMonths ?? '—'}
                </td>
                <td className="border border-[var(--border)] px-2">{p.status}</td>
                <td className="border border-[var(--border)] px-2 space-x-2">
                  <button className="text-indigo-600 hover:underline" onClick={()=>edit(p)}>Edit</button>
                  <button className="text-amber-700 hover:underline" onClick={()=>toggle(p.id)}>
                    {p.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                  <button className="text-rose-600 hover:underline" onClick={()=>remove(p.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td className="p-4 text-center muted" colSpan="8">No products found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
