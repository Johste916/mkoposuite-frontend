import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createCashAccount } from '../../api/cash';

export default function CashAccountForm() {
  const nav = useNavigate();
  const [form, setForm] = React.useState({
    name: '',
    openingBalance: '',
    currentBalance: '',
    currency: 'TZS',
    isActive: true,
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(null);

  function set(k, v) { setForm(s => ({ ...s, [k]: v })); }

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) return setError('Name is required');
    try {
      setSaving(true);
      await createCashAccount({
        name: form.name.trim(),
        openingBalance: Number(form.openingBalance || 0),
        currentBalance: form.currentBalance === '' ? undefined : Number(form.currentBalance),
        currency: (form.currency || 'TZS').toUpperCase(),
        isActive: !!form.isActive,
      });
      nav('/banking/cash-accounts');
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 max-w-2xl">
      <h2 className="text-2xl font-bold mb-4">Add Cash Account</h2>

      {error && <div className="mb-3 text-red-600">{error}</div>}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Name</label>
          <input className="w-full border rounded p-2" value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">Currency</label>
            <input className="w-full border rounded p-2" value={form.currency} onChange={e => set('currency', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Opening Balance</label>
            <input type="number" step="0.01" className="w-full border rounded p-2"
                   value={form.openingBalance} onChange={e => set('openingBalance', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Current Balance (optional)</label>
            <input type="number" step="0.01" className="w-full border rounded p-2"
                   value={form.currentBalance} onChange={e => set('currentBalance', e.target.value)} />
          </div>
        </div>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} />
          <span>Active</span>
        </label>

        <div className="flex gap-2">
          <button disabled={saving} className="px-4 py-2 rounded bg-blue-600 text-white">
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={() => nav(-1)} className="px-4 py-2 rounded border">Cancel</button>
        </div>
      </form>
    </div>
  );
}
