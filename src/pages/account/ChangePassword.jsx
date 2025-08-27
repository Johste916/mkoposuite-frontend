import React, { useState } from 'react';
import api from '../../api';

export default function ChangePassword() {
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null); setErr(null);

    if (newPassword !== confirm) {
      setErr('New password and confirmation do not match.');
      return;
    }

    setSaving(true);
    try {
      const { data } = await api.post('/account/change-password', { currentPassword, newPassword });
      setMsg(data?.message || 'Password updated.');
      setCurrent(''); setNext(''); setConfirm('');
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
      <h1 className="text-lg font-semibold">Change Password</h1>
      <p className="text-sm text-slate-500 mt-1">Set a strong password to keep your account secure.</p>

      {msg && <div className="mt-3 text-sm text-emerald-600">{msg}</div>}
      {err && <div className="mt-3 text-sm text-rose-600">{err}</div>}

      <form onSubmit={submit} className="mt-4 space-y-3">
        <div>
          <label className="text-sm block mb-1">Current password</label>
          <input
            type="password"
            className="w-full border rounded px-3 py-2 text-sm"
            value={currentPassword}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="text-sm block mb-1">New password</label>
          <input
            type="password"
            className="w-full border rounded px-3 py-2 text-sm"
            value={newPassword}
            onChange={(e) => setNext(e.target.value)}
            required
            minLength={8}
          />
          <div className="text-xs text-slate-500 mt-1">Minimum 8 characters.</div>
        </div>

        <div>
          <label className="text-sm block mb-1">Confirm new password</label>
          <input
            type="password"
            className="w-full border rounded px-3 py-2 text-sm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}
