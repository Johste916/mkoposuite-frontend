import React, { useEffect, useState } from "react";
import api from "../../api";

export default function TwoFactor() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState("");
  const [setup, setSetup] = useState(null); // { qrDataUrl, otpauthUrl, secret }
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get("/auth/2fa/status"); // { enabled: boolean }
        if (!mounted) return;
        setEnabled(!!res.data?.enabled);
      } catch {
        if (!mounted) return;
        setError("2FA status endpoint not configured yet.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const startEnable = async () => {
    setBusy(true); setError("");
    try {
      const res = await api.post("/auth/2fa/enable"); // { qrDataUrl?, otpauthUrl?, secret }
      setSetup(res.data || {});
    } catch {
      setError("Failed to start 2FA setup (endpoint missing?).");
    } finally {
      setBusy(false);
    }
  };

  const verifyEnable = async () => {
    if (!code.trim()) return setError("Enter the 6-digit code from your authenticator app.");
    setBusy(true); setError("");
    try {
      await api.post("/auth/2fa/verify", { code: code.trim() });
      setEnabled(true);
      setSetup(null);
      setCode("");
    } catch (e) {
      setError(e?.response?.data?.error || "Invalid code.");
    } finally {
      setBusy(false);
    }
  };

  const disable2fa = async () => {
    setBusy(true); setError("");
    try {
      await api.post("/auth/2fa/disable", { code: code.trim() || undefined });
      setEnabled(false);
      setSetup(null);
      setCode("");
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to disable 2FA.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="text-sm text-slate-500">Loading 2FA…</div>;

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-xl font-semibold">Two-Factor Authentication</h1>
      {error && <div className="p-3 rounded bg-rose-50 text-rose-700 text-sm">{error}</div>}

      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Status</div>
            <div className="text-sm text-slate-600">{enabled ? "Enabled" : "Disabled"}</div>
          </div>
          {!enabled ? (
            <button
              onClick={startEnable}
              disabled={busy}
              className="h-9 px-3 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {busy ? "Starting…" : "Enable 2FA"}
            </button>
          ) : (
            <button
              onClick={disable2fa}
              disabled={busy}
              className="h-9 px-3 rounded bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {busy ? "Disabling…" : "Disable 2FA"}
            </button>
          )}
        </div>

        {/* Setup block */}
        {!enabled && setup && (
          <div className="mt-4 space-y-3">
            <div className="text-sm">
              Scan this QR in Google Authenticator / Authy and enter the 6-digit code to confirm.
            </div>
            {setup.qrDataUrl ? (
              <img src={setup.qrDataUrl} alt="2FA QR" className="w-48 h-48 border rounded" />
            ) : setup.otpauthUrl ? (
              <div className="p-2 rounded bg-slate-50 text-[11px] break-all">{setup.otpauthUrl}</div>
            ) : (
              <div className="text-xs text-slate-500">No QR/URL provided by server.</div>
            )}

            {setup.secret && (
              <div className="text-xs">
                Secret: <span className="font-mono">{setup.secret}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                placeholder="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="px-3 py-2 border rounded bg-white dark:bg-slate-800 text-sm"
              />
              <button
                onClick={verifyEnable}
                disabled={busy}
                className="h-9 px-3 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                Verify & Enable
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
