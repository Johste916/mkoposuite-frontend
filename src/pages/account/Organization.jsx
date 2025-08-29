import React, { useEffect, useState } from 'react';
import api from '../../api';

export default function Organization() {
  const [t, setT] = useState(null);
  const [ent, setEnt] = useState(null);
  const [err, setErr] = useState('');

  const load = async () => {
    setErr('');
    try {
      const me = await api.get('/tenants/me');
      setT(me.data);
      const en = await api.get('/tenants/me/entitlements');
      setEnt(en.data);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      await api.patch('/tenants/me', {
        planCode: t.planCode,
        trialEndsAt: t.trialEndsAt,
        autoDisableOverdue: t.autoDisableOverdue,
        graceDays: t.graceDays,
        billingEmail: t.billingEmail
      });
      await load();
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    }
  };

  if (err) return <div className="p-4 text-sm text-red-600">Error: {err}</div>;
  if (!t || !ent) return <div className="p-4 text-sm text-gray-500">Loading…</div>;

  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-4">
      <h2 className="text-lg font-semibold">Organization</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <label className="block text-xs opacity-70">Plan</label>
          <select value={t.planCode} onChange={e=>setT({...t, planCode:e.target.value})} className="border rounded px-2 py-1 w-full dark:bg-slate-800">
            <option value="basic">Basic</option>
            <option value="pro">Pro</option>
            <option value="premium">Premium</option>
          </select>
        </div>
        <div>
          <label className="block text-xs opacity-70">Trial ends</label>
          <input type="date" value={t.trialEndsAt || ''} onChange={e=>setT({...t, trialEndsAt:e.target.value})} className="border rounded px-2 py-1 w-full dark:bg-slate-800" />
        </div>
        <div>
          <label className="block text-xs opacity-70">Auto suspend overdue</label>
          <input type="checkbox" checked={!!t.autoDisableOverdue} onChange={e=>setT({...t, autoDisableOverdue:e.target.checked})} />
        </div>
        <div>
          <label className="block text-xs opacity-70">Grace days</label>
          <input type="number" value={t.graceDays ?? 7} onChange={e=>setT({...t, graceDays:Number(e.target.value)})} className="border rounded px-2 py-1 w-full dark:bg-slate-800" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs opacity-70">Billing email</label>
          <input type="email" value={t.billingEmail || ''} onChange={e=>setT({...t, billingEmail:e.target.value})} className="border rounded px-2 py-1 w-full dark:bg-slate-800" />
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={save} className="h-9 px-3 rounded bg-blue-600 text-white">Save</button>
        <button onClick={load} className="h-9 px-3 rounded border">Refresh</button>
      </div>

      <div className="border-t pt-3">
        <h3 className="font-semibold mb-2">Entitlements</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
          {Object.entries(ent.modules || {}).map(([k,v])=>(
            <div key={k} className="flex items-center gap-2">
              <span className="w-44 capitalize">{k.replace(/_/g,' ')}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${v?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-600'}`}>{v?'enabled':'disabled'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
