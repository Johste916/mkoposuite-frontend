import React, { useEffect, useMemo, useState } from "react";
import api from "../api";

function saveOriginal() {
  if (!sessionStorage.getItem("support_original_token")) {
    sessionStorage.setItem("support_original_token", localStorage.getItem("token") || "");
    sessionStorage.setItem("support_original_user", localStorage.getItem("user") || "");
    sessionStorage.setItem("support_original_tenant", localStorage.getItem("activeTenantId") || "");
  }
}
function restoreOriginal() {
  const t = sessionStorage.getItem("support_original_token");
  const u = sessionStorage.getItem("support_original_user");
  const ten = sessionStorage.getItem("support_original_tenant");
  if (t !== null) localStorage.setItem("token", t);
  if (u !== null) localStorage.setItem("user", u);
  if (ten !== null) localStorage.setItem("activeTenantId", ten);
  sessionStorage.removeItem("support_original_token");
  sessionStorage.removeItem("support_original_user");
  sessionStorage.removeItem("support_original_tenant");
}

export default function ImpersonateTenant() {
  const [search, setSearch] = useState("");
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [impersonating, setImpersonating] = useState(false);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return tenants;
    return tenants.filter(
      (t) =>
        String(t.name || "")
          .toLowerCase()
          .includes(s) || String(t.id).includes(s)
    );
  }, [search, tenants]);

  async function loadTenants() {
    setLoading(true);
    setErr("");
    try {
      const data = await api.getFirst(["/tenants", "/admin/tenants"]);
      const items = Array.isArray(data) ? data : data.items || data.tenants || [];
      setTenants(items);
    } catch (e) {
      setErr(e.normalizedMessage || "Failed to load tenants.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTenants();
  }, []);

  async function impersonate(t) {
    saveOriginal();
    setImpersonating(true);
    setErr("");
    try {
      // returns {token, user} or {ok:true, token:...}
      const resp = await api.postFirst(
        [
          `/admin/tenants/${t.id}/impersonate`,
          `/admin/impersonate`,
          `/auth/impersonate`,
          `/support/impersonate`,
        ],
        { tenantId: t.id }
      );
      if (resp?.token) {
        localStorage.setItem("token", resp.token);
      }
      if (resp?.user) {
        localStorage.setItem("user", JSON.stringify(resp.user));
        const tid = resp.user?.tenantId || resp.user?.tenant?.id || t.id;
        if (tid) localStorage.setItem("activeTenantId", tid);
        api.setTenantId(tid);
      } else {
        localStorage.setItem("activeTenantId", t.id);
        api.setTenantId(t.id);
      }
      window.location.href = "/";
    } catch (e) {
      setErr(e.normalizedMessage || "Impersonation failed.");
      restoreOriginal();
    } finally {
      setImpersonating(false);
    }
  }

  async function endImpersonation() {
    setErr("");
    try {
      await api.postFirst(
        ["/admin/impersonate/stop", "/auth/impersonate/stop", "/support/impersonate/stop"],
        {}
      ).catch(() => {});
    } finally {
      restoreOriginal();
      api.clearTenantId();
      window.location.href = "/";
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Impersonate Tenant</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          placeholder="Search by name or ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: 280 }}
        />
        <button onClick={loadTenants}>Refresh</button>
        <button onClick={endImpersonation} title="Revert to your original session">
          Revert
        </button>
      </div>
      {err ? <p style={{ color: "crimson" }}>{err}</p> : null}
      {loading ? <p>Loading…</p> : null}

      <table width="100%" cellPadding={8}>
        <thead>
          <tr>
            <th align="left">ID</th>
            <th align="left">Name</th>
            <th align="left">Plan</th>
            <th align="left">Status</th>
            <th align="left">Seats</th>
            <th align="left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((t) => (
            <tr key={t.id}>
              <td>{t.id}</td>
              <td>{t.name}</td>
              <td>{t.planCode || t.plan || "—"}</td>
              <td>{t.status || "—"}</td>
              <td>{t.seats ?? "—"}</td>
              <td>
                <div style={{ display: "flex", gap: 8 }}>
                  <a href={`/subscription?id=${encodeURIComponent(t.id)}`}>Subscription</a>
                  <button onClick={() => impersonate(t)} disabled={impersonating}>
                    {impersonating ? "Starting…" : "Impersonate"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {filtered.length === 0 && !loading && <p style={{ opacity: 0.7 }}>No tenants.</p>}
    </div>
  );
}
