import React, { useEffect, useMemo, useState } from "react";
import api from "../api";

function ManageDrawer({ tenant, onClose, onSaved }) {
  const [form, setForm] = useState({
    planCode: "",
    seats: "",
    billingEmail: "",
    status: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (tenant) {
      setForm({
        planCode: tenant.planCode || "",
        seats: tenant.seats ?? "",
        billingEmail: tenant.billingEmail || "",
        status: tenant.status || "",
      });
    }
  }, [tenant]);

  async function save() {
    if (!tenant) return;
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
          status: form.status || undefined,
        }
      );
      onSaved(resp?.tenant || { ...tenant, ...form });
      onClose();
    } catch (e) {
      setErr(e.normalizedMessage || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (!tenant) return null;
  return (
    <div style={{
      position: "fixed", right: 0, top: 0, bottom: 0, width: 380,
      background: "#fff", borderLeft: "1px solid #ddd", padding: 16,
      boxShadow: "-6px 0 16px rgba(0,0,0,0.05)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>Manage Tenant</h3>
        <button onClick={onClose}>✕</button>
      </div>
      <p><b>{tenant.name}</b></p>
      <div style={{ display: "grid", gap: 8 }}>
        <label>
          Plan
          <input value={form.planCode} onChange={(e) => setForm({ ...form, planCode: e.target.value })} />
        </label>
        <label>
          Seats
          <input type="number" value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} />
        </label>
        <label>
          Billing Email
          <input value={form.billingEmail} onChange={(e) => setForm({ ...form, billingEmail: e.target.value })} />
        </label>
        <label>
          Status
          <input value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
        </label>
        {err ? <p style={{ color: "crimson" }}>{err}</p> : null}
        <div>
          <button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

export default function TenantsAdmin() {
  const [list, setList] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [drawer, setDrawer] = useState(null);
  const [syncing, setSyncing] = useState(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter(
      (t) =>
        String(t.name || "")
          .toLowerCase()
          .includes(s) || String(t.id).includes(s)
    );
  }, [q, list]);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await api.getFirst(["/tenants", "/admin/tenants"]);
      const items = Array.isArray(data) ? data : data.items || data.tenants || [];
      setList(items);

      const st = await api.getFirst([
        "/tenants/stats",
        "/admin/tenants/stats",
        "/system/tenants/stats",
        "/orgs/stats",
        "/organizations/stats",
      ]).catch(() => ({ items: [] }));
      const statMap = {};
      (st.items || []).forEach((i) => { statMap[i.id] = i; });
      setStats(statMap);
    } catch (e) {
      setErr(e.normalizedMessage || "Failed to load tenants.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function syncInvoices(id) {
    setSyncing(id);
    setErr("");
    try {
      await api.postFirst(
        [
          `/admin/tenants/${id}/invoices/sync`,
          `/billing/tenants/${id}/invoices/sync`,
          `/tenants/${id}/invoices/sync`,
        ],
        {}
      );
      alert("Sync requested.");
    } catch (e) {
      setErr(e.normalizedMessage || "Sync failed.");
    } finally {
      setSyncing(null);
    }
  }

  async function viewInvoices(id) {
    try {
      const inv = await api.getFirst([
        `/admin/tenants/${id}/invoices`,
        `/tenants/${id}/invoices`,
        `/orgs/${id}/invoices`,
        `/organizations/${id}/invoices`,
      ]);
      const items = Array.isArray(inv) ? inv : inv.invoices || inv.items || [];
      alert(`Invoices for ${id}\n\n` + JSON.stringify(items, null, 2));
    } catch (e) {
      setErr(e.normalizedMessage || "Failed to fetch invoices.");
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Tenants (Admin)</h1>
      <p style={{ margin: "6px 0 14px", color: "#64748b", fontSize: 12 }}>
        Platform charges per active <b>Staff seat</b>. Tenant Admins invite/disable their staff.
        This view lets you review plan, seats and invoices — not tenant staff.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <input
          placeholder="Search by name or ID…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ minWidth: 280 }}
        />
        <a href="/impersonate-tenant" style={{ alignSelf: "center" }}>
          Impersonate Tenant →
        </a>
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
            <th align="left">Staff</th>
            <th align="left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((t) => {
            const st = stats[t.id] || {};
            const staffCount = st.staffCount ?? "—";
            const seats = t.seats ?? st.seats ?? "—";
            const over =
              typeof staffCount === "number" &&
              typeof seats === "number" &&
              staffCount > seats;
            return (
              <tr key={t.id}>
                <td>{t.id}</td>
                <td>{t.name}</td>
                <td>{t.planCode || "—"}</td>
                <td>{t.status || "—"}</td>
                <td>
                  {seats}
                  {over ? ` (over by ${staffCount - seats})` : ""}
                </td>
                <td>{staffCount}</td>
                <td>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <a href={`/subscription?id=${encodeURIComponent(t.id)}`}>Subscription</a>
                    <button onClick={() => setDrawer(t)}>Manage</button>
                    <button onClick={() => viewInvoices(t.id)}>Invoices</button>
                    <button onClick={() => syncInvoices(t.id)} disabled={syncing === t.id}>
                      {syncing === t.id ? "Syncing…" : "Sync Invoices"}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {filtered.length === 0 && !loading && <p style={{ opacity: 0.7 }}>No tenants.</p>}

      {drawer ? (
        <ManageDrawer
          tenant={drawer}
          onClose={() => setDrawer(null)}
          onSaved={(updated) => {
            setList((prev) => prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
          }}
        />
      ) : null}
    </div>
  );
}
