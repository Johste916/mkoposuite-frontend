import React, { useEffect, useState } from 'react';
import api from '../../api';

export default function Billing() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const [form, setForm] = useState({
    plan: 'free',
    currency: 'USD',
    status: 'active',
    billingEmail: '',
    invoiceEmails: [],
    invoiceNotes: '',
    autoRenew: false,
    paymentProvider: '',
    paymentMethod: '',
    nextInvoiceDate: '',
  });

  const load = async () => {
    setLoading(true); setErr(''); setMsg('');
    try {
      const { data } = await api.get('/account/billing');
      const s = data?.settings || {};
      setForm({
        plan: s.plan || 'free',
        currency: s.currency || 'USD',
        status: s.status || 'active',
        billingEmail: s.billingEmail || '',
        invoiceEmails: Array.isArray(s.invoiceEmails) ? s.invoiceEmails : [],
        invoiceNotes: s.invoiceNotes || '',
        autoRenew: !!s.autoRenew,
        paymentProvider: s.paymentProvider || '',
        paymentMethod: s.paymentMethod || '',
        nextInvoiceDate: s.nextInvoiceDate || '',
      });
    } catch (e) {
      setErr('Failed to load billing settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true); setErr(''); setMsg('');
    try {
      const payload = { ...form, invoiceEmails: form.invoiceEmails.filter(Boolean) };
      const { data } = await api.put('/account/billing', payload);
      setMsg('Saved.');
      // refresh with canonical server copy
      const s = data?.settings || {};
      setForm((prev) => ({ ...prev, ...s }));
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const onEmailsChange = (v) => set('invoiceEmails', v.split(',').map(x => x.trim()).filter(Boolean));

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;

  return (
    <div className="max-w-2xl bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
      <h1 className="text-lg font-semibold">Billing</h1>
      <p className="text-sm text-slate-500 mt-1">Manage your plan, invoices, and payment methods.</p>

      {msg && <div className="mt-3 text-sm text-emerald-600">{msg}</div>}
      {err && <div className="mt-3 text-sm text-rose-600">{err}</div>}

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-sm">
          <div className="mb-1">Plan</div>
          <select className="w-full border rounded px-2 py-2"
                  value={form.plan} onChange={e => set('plan', e.target.value)}>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </label>

        <label className="text-sm">
          <div className="mb-1">Currency</div>
          <input className="w-full border rounded px-3 py-2"
                 value={form.currency} onChange={e => set('currency', e.target.value)} />
        </label>

        <label className="text-sm">
          <div className="mb-1">Billing Email</div>
          <input className="w-full border rounded px-3 py-2"
                 value={form.billingEmail} onChange={e => set('billingEmail', e.target.value)} />
        </label>

        <label className="text-sm">
          <div className="mb-1">Invoice Emails (comma separated)</div>
          <input className="w-full border rounded px-3 py-2"
                 value={form.invoiceEmails.join(', ')} onChange={e => onEmailsChange(e.target.value)} />
        </label>

        <label className="text-sm sm:col-span-2">
          <div className="mb-1">Invoice Notes</div>
          <textarea className="w-full border rounded px-3 py-2"
                    rows={3}
                    value={form.invoiceNotes} onChange={e => set('invoiceNotes', e.target.value)} />
        </label>

        <label className="text-sm">
          <div className="mb-1">Auto Renew</div>
          <input type="checkbox"
                 className="h-4 w-4 align-middle"
                 checked={form.autoRenew}
                 onChange={e => set('autoRenew', e.target.checked)} /> <span className="ml-1">Enabled</span>
        </label>

        <label className="text-sm">
          <div className="mb-1">Payment Provider</div>
          <input className="w-full border rounded px-3 py-2"
                 value={form.paymentProvider} onChange={e => set('paymentProvider', e.target.value)} />
        </label>

        <label className="text-sm">
          <div className="mb-1">Payment Method (masked)</div>
          <input className="w-full border rounded px-3 py-2"
                 value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)} />
        </label>

        <label className="text-sm">
          <div className="mb-1">Next Invoice Date (ISO)</div>
          <input className="w-full border rounded px-3 py-2"
                 value={form.nextInvoiceDate || ''} onChange={e => set('nextInvoiceDate', e.target.value)} />
        </label>
      </div>

      <div className="mt-4">
        <button
          onClick={save}
          disabled={saving}
          className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
