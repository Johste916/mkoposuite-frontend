import React, { useEffect, useState } from "react";
import api from "../../api";

const LS_KEY = "twofaStatus";

export default function TwoFactor() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [secret, setSecret] = useState("");
  const [otpauth, setOtpauth] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [settingUp, setSettingUp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [disabling, setDisabling] = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await api.get("/auth/2fa/status");
      const st = !!res?.data?.enabled;
      setEnabled(st);
      localStorage.setItem(LS_KEY, JSON.stringify({ enabled: st }));
    } catch {
      // fallback to localStorage
      try {
        const raw = localStorage.getItem(LS_KEY);
        const st = raw ? JSON.parse(raw).enabled : false;
        setEnabled(!!st);
      } catch {
        setEnabled(false);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startSetup = async () => {
    setSettingUp(true);
    setErr(null);
    setMsg(null);
    setCode("");
    try {
      // Expecting backend to return { secret, otpauth_url }
      const res = await api.post("/auth/2fa/setup");
      const s = res?.data?.secret || "";
      const uri = res?.data?.otpauth_url || "";
      setSecret(s);
      setOtpauth(uri);
      if (!s && !uri) {
        // graceful fallback (no server support) -> guide user
        setErr("Server 2FA setup endpoint is not available. Please enable it on the backend.");
      }
    } catch {
      setErr("Failed to start setup. Please try again.");
    } finally {
      setSettingUp(false);
    }
  };

  const enable2FA = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setVerifying(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await api.post("/auth/2fa/enable", { code: code.trim() });
      if (res?.data?.enabled) {
        setEnabled(true);
        setSecret("");
        setOtpauth("");
        localStorage.setItem(LS_KEY, JSON.stringify({ enabled: true }));
        setMsg("Two-factor authentication enabled.");
      } else {
        setErr("Invalid code. Please try again.");
      }
    } catch {
      setErr("Verification failed. Make sure the backend 2FA endpoints are available.");
    } finally {
      setVerifying(false);
    }
  };

  const disable2FA = async () => {
    setDisabling(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await api.post("/auth/2fa/disable");
      const ok = res?.data?.disabled ?? true; // consider success if endpoint absent but call succeeded
      if (ok) {
        setEnabled(false);
        localStorage.setItem(LS_KEY, JSON.stringify({ enabled: false }));
        setMsg("Two-factor authentication disabled.");
      } else {
        setErr("Could not disable 2FA. Please try again.");
      }
    } catch {
      setErr("Disable failed. Make sure the backend 2FA endpoints are available.");
    } finally {
      setDisabling(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold mb-4">Two-Factor Authentication</h1>

      {msg && <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">{msg}</div>}
      {err && <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-800">{err}</div>}

      <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4">
        {loading ? (
          <div className="text-sm text-slate-500">Checking 2FA status…</div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Status</div>
                <div className="text-sm text-slate-500">{enabled ? "Enabled" : "Disabled"}</div>
              </div>
              {enabled ? (
                <button
                  onClick={disable2FA}
                  disabled={disabling}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {disabling ? "Disabling…" : "Disable 2FA"}
                </button>
              ) : (
                <button
                  onClick={startSetup}
                  disabled={settingUp}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {settingUp ? "Preparing…" : "Set up 2FA"}
                </button>
              )}
            </div>

            {!enabled && (secret || otpauth) && (
              <div className="mt-6 grid md:grid-cols-[200px_1fr] gap-6 items-start">
                <div className="flex flex-col items-center">
                  {otpauth ? (
                    <img
                      alt="Scan in Google Authenticator"
                      className="rounded-lg border"
                      // third-party QR generator; harmless if blocked
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(otpauth)}`}
                    />
                  ) : (
                    <div className="text-xs text-slate-500">QR not available</div>
                  )}
                  <div className="text-[11px] text-slate-500 mt-2 text-center">
                    Scan in your authenticator app
                  </div>
                </div>

                <div>
                  <div className="mb-3">
                    <div className="text-sm font-medium">Secret</div>
                    <div className="font-mono text-sm mt-1 bg-slate-50 dark:bg-slate-800 rounded px-2 py-1 inline-block">
                      {secret || "(provided by server)"}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      If the QR doesn’t load, add an account manually using this secret.
                    </p>
                  </div>

                  <form onSubmit={enable2FA} className="space-y-2">
                    <label className="block text-sm font-medium">Enter 6-digit code to verify</label>
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      className="w-full md:w-64 rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800"
                      placeholder="123456"
                    />
                    <div>
                      <button
                        type="submit"
                        disabled={verifying || !code.trim()}
                        className="inline-flex items-center gap-2 h-9 px-4 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {verifying ? "Verifying…" : "Enable 2FA"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
