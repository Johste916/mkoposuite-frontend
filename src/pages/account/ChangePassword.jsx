import { useState } from 'react';
import api from '../../api';

export default function ChangePassword() {
  const [oldPassword, setOld] = useState('');
  const [newPassword, setNew] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setMsg(''); setErr('');
    if (newPassword !== confirm) return setErr('Passwords do not match');
    if (newPassword.length < 8) return setErr('New password must be at least 8 characters');

    setSaving(true);
    try {
      await api.post('/account/change-password', { oldPassword, newPassword });
      setMsg('Password updated successfully');
      setOld(''); setNew(''); setConfirm('');
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-md">
      <h1 className="text-lg font-semibold">Change Password</h1>
      {msg && <div className="mt-2 text-sm text-emerald-600">{msg}</div>}
      {err && <div className="mt-2 text-sm text-rose-600">{err}</div>}
      <form className="mt-4 space-y-3" onSubmit={submit}>
        <input className="w-full border rounded px-3 py-2 text-sm"
               type="password" placeholder="Current password"
               value={oldPassword} onChange={e=>setOld(e.target.value)} />
        <input className="w-full border rounded px-3 py-2 text-sm"
               type="password" placeholder="New password"
               value={newPassword} onChange={e=>setNew(e.target.value)} />
        <input className="w-full border rounded px-3 py-2 text-sm"
               type="password" placeholder="Confirm new password"
               value={confirm} onChange={e=>setConfirm(e.target.value)} />
        <button disabled={saving}
                className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
          {saving ? 'Saving…' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}
