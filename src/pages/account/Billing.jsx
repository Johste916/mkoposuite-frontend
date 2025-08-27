import { useEffect, useState } from 'react';
import api from '../../api';

export default function Billing() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setErr('');
    try {
      const res = await api.get('/account/settings/billing');
      setData(res.data);
    } catch {
      setErr('Failed to load billing settings');
    }
  };

  useEffect(()=>{ load(); }, []);

  const save = async () => {
    setSaving(true); setErr('');
    try {
      await api.put('/account/settings/billing', {
        plan: data.plan,
        status: data.status,
        currency: data.currency,
        billingEmail: data.billingEmail || null,
        nextInvoiceAt: data.nextInvoiceAt || null,
        autoRenew: !!data.autoRenew,
        invoiceNotes: data.invoiceNotes || '',
        invoiceEmails: Array.isArray(data.invoiceEmails) ? data.invoiceEmails : [],
      });
      await load();
    } catch {
      setErr('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (!data) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-xl space-y-3">
      <h1 className="text-lg font-semibold">Billing</h1>
      {err && <div className="text-sm text-rose-600">{err}</div>}
      <label className="block text-sm">
        Plan
        <select className="mt-1 w-full border rounded px-2 py-1"
                value={data.plan}
                onChange={e=>setData(d=>({ ...d, plan: e.target.value }))}>
          <option value="free">Free</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
        </select>
      </label>
      <label className="block text-sm">
        Status
        <select className="mt-1 w-full border rounded px-2 py-1"
                value={data.status}
                onChange={e=>setData(d=>({ ...d, status: e.target.value }))}>
          <option value="active">Active</option>
          <option value="trialing">Trialing</option>
          <option value="past_due">Past Due</option>
          <option value="canceled">Canceled</option>
        </select>
      </label>
      <label className="block text-sm">
        Currency
        <input className="mt-1 w-full border rounded px-2 py-1"
               value={data.currency || 'USD'}
               onChange={e=>setData(d=>({ ...d, currency: e.target.value }))} />
      </label>
      <label className="block text-sm">
        Billing Email
        <input className="mt-1 w-full border rounded px-2 py-1"
               value={data.billingEmail || ''}
               onChange={e=>setData(d=>({ ...d, billingEmail: e.target.value }))} />
      </label>
      <label className="block text-sm">
        Next Invoice (ISO)
        <input className="mt-1 w-full border rounded px-2 py-1"
               value={data.nextInvoiceAt || ''}
               onChange={e=>setData(d=>({ ...d, nextInvoiceAt: e.target.value }))} />
      </label>
      <label className="block text-sm">
        Auto Renew
        <input type="checkbox" className="ml-2"
               checked={!!data.autoRenew}
               onChange={e=>setData(d=>({ ...d, autoRenew: e.target.checked }))} />
      </label>
      <label className="block text-sm">
        Invoice Notes
        <textarea className="mt-1 w-full border rounded px-2 py-1"
                  rows={3}
                  value={data.invoiceNotes || ''}
                  onChange={e=>setData(d=>({ ...d, invoiceNotes: e.target.value }))} />
      </label>
      <button disabled={saving}
              onClick={save}
              className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}
