import React, { useEffect, useState } from "react";
import api from "../../api";

async function tryGet(urls) {
  for (const u of urls) {
    try { const { data } = await api.get(u); return data; } catch {}
  }
  throw new Error("All GET endpoints failed");
}
async function tryPost(urls, body) {
  for (const u of urls) {
    try { const { data } = await api.post(u, body); return data; } catch {}
  }
  throw new Error("All POST endpoints failed");
}

export default function TwoFactor() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [secret, setSecret] = useState("");
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState(""); // optional from API
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  const statusEndpoints = ["/auth/2fa/status", "/account/2fa/status", "/2fa/status"];
  const setupEndpoints  = ["/auth/2fa/setup",  "/account/2fa/setup",  "/2fa/setup"];
  const verifyEndpoints = ["/auth/2fa/verify", "/account/2fa/verify", "/2fa/verify"];
  const disableEndpoints= ["/auth/2fa/disable","/account/2fa/disable","/2fa/disable"];

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await tryGet(statusEndpoints);
      setEnabled(Boolean(data?.enabled));
    } catch (e) {
      setError("Failed to load 2FA status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const beginSetup = async () => {
    setError("");
    try {
      const data = await tryPost(setupEndpoints, {});
      setSecret(data?.secret || "");
      setOtpauthUrl(data?.otpauthUrl || "");
      setQrDataUrl(data?.qrDataUrl || data?.qr || data?.qrSvg || "");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to start setup");
    }
  };

  const verify = async () => {
    setError("");
    try {
      await tryPost(verifyEndpoints, { token });
      setEnabled(true);
      setSecret(""); setOtpauthUrl(""); setQrDataUrl(""); setToken("");
    } catch (e) {
      setError(e?.response?.data?.message || "Invalid code");
    }
  };

  const disable = async () => {
    setError("");
    try {
      await tryPost(disableEndpoints, { token });
      setEnabled(false);
      setToken("");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to disable");
    }
  };

  if (loading) return <div className="p-4 text-sm text-slate-500 dark:text-slate-400">Loading…</div>;

  return (
    <div className="ms-card p-4 max-w-xl">
      <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Two-Factor Authentication</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
        Status:&nbsp;
        <span className={enabled ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
          {enabled ? "Enabled" : "Disabled"}
        </span>
      </p>

      {!!error && <div className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</div>}

      {!enabled && (
        <div className="mt-4 space-y-3">
          {!secret ? (
            <button onClick={beginSetup} className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
              Enable 2FA
            </button>
          ) : (
            <>
              <div className="text-sm">
                <div className="font-medium">Secret</div>
                <div className="font-mono break-all">{secret}</div>
                <div className="mt-1 text-slate-500 dark:text-slate-400">
                  Scan the QR below (or use “Enter a setup key”) in your authenticator app.
                </div>
              </div>

              {qrDataUrl ? (
                // backend-provided QR (data URL or SVG string)
                typeof qrDataUrl === "string" && qrDataUrl.startsWith("<svg")
                  ? <div className="p-2 bg-white dark:bg-slate-800 rounded" dangerouslySetInnerHTML={{ __html: qrDataUrl }} />
                  : <img src={qrDataUrl} alt="Authenticator QR" className="w-40 h-40 object-contain bg-white rounded" />
              ) : null}

              {otpauthUrl && (
                <div className="text-xs break-all text-slate-500 dark:text-slate-400">{otpauthUrl}</div>
              )}

              <div className="flex items-center gap-2">
                <input
                  className="border rounded px-2 py-1 text-sm bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                  placeholder="Enter 6-digit code"
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
                <button onClick={verify} className="px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700">
                  Verify & Turn On
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {enabled && (
        <div className="mt-4 space-y-2">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            To disable, confirm a current code from your authenticator app.
          </div>
          <div className="flex items-center gap-2">
            <input
              className="border rounded px-2 py-1 text-sm bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
              placeholder="Enter 6-digit code"
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            <button onClick={disable} className="px-3 py-1.5 rounded bg-rose-600 text-white hover:bg-rose-700">
              Disable 2FA
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
