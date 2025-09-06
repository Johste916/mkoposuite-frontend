import React, { useState } from "react";
import api from "../../../api";

async function tryPost(paths, body, opts) {
  let lastErr = null;
  for (const p of paths) {
    try {
      const res = await api.post(p, body, opts);
      return res?.data ?? {};
    } catch (e) { lastErr = e; }
  }
  if (lastErr) throw lastErr;
  return {};
}

export default function TenantImpersonateButton({ tenantId }) {
  const [busy, setBusy] = useState(false);

  const doImpersonate = async () => {
    setBusy(true);
    try {
      const data = await tryPost(
        [
          `/admin/tenants/${tenantId}/impersonate`,
          `/system/tenants/${tenantId}/impersonate`,
          `/org/admin/tenants/${tenantId}/impersonate`,
        ],
        {},
        {}
      );
      const token = data?.token || data?.jwt || null;
      if (!token) throw new Error("No token returned from impersonation endpoint");

      // store & open a new tab (your main.jsx already supports ?token=… bootstrap)
      const url = new URL(window.location.origin);
      url.searchParams.set("token", token);

      // open new session/tab as tenant admin
      window.open(url.toString(), "_blank", "noopener,noreferrer");
    } catch (e) {
      alert(e?.response?.data?.error || e.message || "Impersonation failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={doImpersonate}
      disabled={busy}
      className="h-8 px-3 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
      title="Open a new tab as this tenant"
    >
      {busy ? "Impersonating…" : "Impersonate"}
    </button>
  );
}
