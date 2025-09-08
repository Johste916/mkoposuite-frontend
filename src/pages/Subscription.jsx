import React, { useEffect, useMemo, useState } from "react";
import api from "../api";

function useQuery() {
  const [q, setQ] = useState(() => new URLSearchParams(window.location.search));
  useEffect(() => {
    const onPop = () => setQ(new URLSearchParams(window.location.search));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return q;
}

export default function Subscription() {
  const query = useQuery();
  const routeId = query.get("id");
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [limits, setLimits] = useState(null);
  const [err, setErr] = useState("");

  const tenantId = useMemo(() => {
    return routeId || api.getTenantId() || "me";
  }, [routeId]);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setErr("");
      try {
        // tenant details
        const data =
          tenantId === "me"
            ? await api.getFirst(["/tenants/me", "/org/me"])
            : await api.getFirst([`/tenants/${tenantId}`, `/org/${tenantId}`]);

        if (!alive) return;
        setTenant(data);

        // invoices
        const inv = await api.getFirst(
          [
            `/admin/tenants/${tenantId}/invoices`,
            `/tenants/${tenantId}/invoices`,
            `/orgs/${tenantId}/invoices`,
            `/organizations/${tenantId}/invoices`,
          ].filter(Boolean)
        ).catch(() => ({ invoices: [] }));
        if (!alive) return;
        setInvoices(inv?.invoices || []);

        // limits / entitlements (optional)
        const lim = await api.getFirst(
          ["/org/limits", "/orgs/limits", "/organizations/limits"]
        ).catch(() => null);
        if (!alive) return;
        setLimits(lim || null);
      } catch (e) {
        if (!alive) return;
        setErr(e.normalizedMessage || "Failed to load subscription.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [tenantId]);

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ planCode: "", seats: "", billingEmail: "" });
  useEffect(() => {
    if (tenant) {
      setForm({
        planCode: tenant.planCode || "",
        seats: tenant.seats ?? "",
        billingEmail: tenant.billingEmail || "",
      });
    }
  }, [tenant]);

  async function save() {
    if (!tenant || tenantId === "me") return;
    setSaving(true);
    setErr("");
    try {
      const resp = await api.patchFirst(
        [
          `/tenants/${tenant.id}`,
          `/org/${tenant.id}`,
          `/organizations/${tenant.id}`,
        ],
        {
          planCode: form.planCode || undefined,
          seats: form.seats === "" ? null : Number(form.seats),
          billingEmail: form.billingEmail || undefined,
        }
      );
      setTenant(resp?.tenant || tenant);
    } catch (e) {
      setErr(e.normalizedMessage || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function syncInvoices() {
    if (!tenant) return;
    setErr("");
    try {
      await api.postFirst(
        [
          `/admin/tenants/${tenant.id}/invoices/sync`,
          `/billing/tenants/${tenant.id}/invoices/sync`,
          `/tenants/${tenant.id}/invoices/sync`,
        ],
        {}
      );
      // reload invoices
      const inv = await api.getFirst(
        [
          `/admin/tenants/${tenant.id}/invoices`,
          `/tenants/${tenant.id}/invoices`,
          `/orgs/${tenant.id}/invoices`,
          `/organizations/${tenant.id}/invoices`,
        ]
      );
      setInvoices(inv?.invoices || []);
    } catch (e) {
      setErr(e.normalizedMessage || "Sync failed.");
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Subscription</h1>
      {loading ? <p>Loading…</p> : null}
      {err ? <p style={{ color: "crimson" }}>{err}</p> : null}
      {tenant && (
        <div className="card" style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8, marginBottom: 16 }}>
          <h2 style={{ marginTop: 0 }}>{tenant.name || "Tenant"}</h2>
          <p><b>Status:</b> {tenant.status || "unknown"}</p>
          <p><b>Plan:</b> {tenant.planCode || "basic"}</p>
          <p><b>Seats:</b> {tenant.seats ?? "—"}</p>
          {typeof tenant.trialDaysLeft === "number" && (
            <p><b>Trial Days Left:</b> {tenant.trialDaysLeft}</p>
          )}
          <p><b>Billing Email:</b> {tenant.billingEmail || "—"}</p>

          {tenantId !== "me" && (
            <>
              <hr />
              <h3>Edit</h3>
              <div style={{ display: "grid", gap: 8, maxWidth: 420 }}>
                <label>
                  Plan Code
                  <input
                    value={form.planCode}
                    onChange={(e) => setForm({ ...form, planCode: e.target.value })}
                    placeholder="basic | pro | enterprise"
                    style={{ width: "100%" }}
                  />
                </label>
                <label>
                  Seats
                  <input
                    type="number"
                    value={form.seats}
                    onChange={(e) => setForm({ ...form, seats: e.target.value })}
                    placeholder="e.g. 10"
                    style={{ width: "100%" }}
                  />
                </label>
                <label>
                  Billing Email
                  <input
                    value={form.billingEmail}
                    onChange={(e) => setForm({ ...form, billingEmail: e.target.value })}
                    placeholder="billing@example.com"
                    style={{ width: "100%" }}
                  />
                </label>
                <div>
                  <button onClick={save} disabled={saving}>
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="card" style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Invoices</h2>
          <button onClick={syncInvoices}>Sync</button>
        </div>
        {invoices.length === 0 ? (
          <p style={{ opacity: 0.7 }}>No invoices.</p>
        ) : (
          <table width="100%" cellPadding={8}>
            <thead>
              <tr>
                <th align="left">Number</th>
                <th align="left">Date</th>
                <th align="left">Status</th>
                <th align="right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id || inv.number}>
                  <td>{inv.number || inv.id}</td>
                  <td>{inv.date || inv.issuedAt || inv.createdAt}</td>
                  <td>{inv.status || "—"}</td>
                  <td align="right">
                    {inv.totalFormatted || inv.total || inv.amount || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {limits && (
        <div className="card" style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8 }}>
          <h2 style={{ marginTop: 0 }}>Plan Limits</h2>
          <pre style={{ background: "#f8f8f8", padding: 12, borderRadius: 6, overflowX: "auto" }}>
            {JSON.stringify(limits, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
