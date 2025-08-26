import React, { useEffect, useState } from 'react';
import api from '../../api';

export default function TwoFactor() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [secret, setSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/auth/2fa/status');
      setEnabled(Boolean(data.enabled));
    } catch (e) {
      setError('Failed to load 2FA status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const beginSetup = async () => {
    setError('');
    try {
      const { data } = await api.post('/auth/2fa/setup');
      setSecret(data.secret);
      setOtpauthUrl(data.otpauthUrl);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to start setup');
    }
  };

  const verify = async () => {
    setError('');
    try {
      await api.post('/auth/2fa/verify', { token });
      setEnabled(true);
      setSecret('');
      setOtpauthUrl('');
      setToken('');
    } catch (e) {
      setError(e?.response?.data?.message || 'Invalid code');
    }
  };

  const disable = async () => {
    setError('');
    try {
      await api.post('/auth/2fa/disable', { token });
      setEnabled(false);
      setToken('');
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to disable');
    }
  };

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;

  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 max-w-xl">
      <h1 className="text-lg font-semibold">Two-Factor Authentication</h1>
      <p className="text-sm text-slate-500 mt-1">
        Status: <span className={enabled ? 'text-green-600' : 'text-rose-600'}>
          {enabled ? 'Enabled' : 'Disabled'}
        </span>
      </p>

      {!!error && <div className="mt-3 text-sm text-rose-600">{error}</div>}

      {!enabled && (
        <div className="mt-4 space-y-3">
          {!secret ? (
            <button
              onClick={beginSetup}
              className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Enable 2FA
            </button>
          ) : (
            <>
              <div className="text-sm">
                <div className="font-medium">Secret:</div>
                <div className="font-mono break-all">{secret}</div>
                <div className="mt-1 text-slate-500">
                  Scan the QR (using “Enter a setup key”) or paste secret in your authenticator app.
                </div>
              </div>
              {/* If you want, render a QR using a small lib; for now we show key/URL */}
              <div className="text-xs break-all">{otpauthUrl}</div>
              <div className="flex items-center gap-2">
                <input
                  className="border rounded px-2 py-1 text-sm"
                  placeholder="Enter 6-digit code"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
                <button
                  onClick={verify}
                  className="px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Verify & Turn On
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {enabled && (
        <div className="mt-4 space-y-2">
          <div className="text-sm text-slate-500">
            To disable, confirm a current code from your authenticator app.
          </div>
          <div className="flex items-center gap-2">
            <input
              className="border rounded px-2 py-1 text-sm"
              placeholder="Enter 6-digit code"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <button
              onClick={disable}
              className="px-3 py-1.5 rounded bg-rose-600 text-white hover:bg-rose-700"
            >
              Disable 2FA
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
