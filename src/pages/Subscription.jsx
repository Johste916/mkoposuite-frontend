import React, { useEffect, useMemo, useState } from "react";
import api from "../api";
import { FiRefreshCw, FiCloudLightning, FiShield, FiAlertTriangle } from "react-icons/fi";

/**
 * Subscription page
 * - Guarantees we have a tenant id (x-tenant-id) before hitting billing endpoints.
 * - Falls back to /tenants/me and persists to localStorage + api.setTenantId.
 * - Shows plan/status/limits + invoices; supports invoice sync.
 */

function Stat({ label, value, muted }) {
  return (
    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`mt-1 text-sm ${muted ? "text-slate-500 dark:text-slate-400" : "text-slate-800 dark:text-slate-100"}`}>
        {value ?? "—"}
      </div>
    </div>
  );
}

export default function Subscription() {
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState(null);
  const [error, setError] = useState("");

  // Data
  const [limits, setLimits] = useState(null);      // /org/limits
  const [billing, setBilling] = useState(null);    // /billing
  const [plans, setPlans] = useState([]);          // /plans
  const [invoices, setInvoices] = useState([]);    // /tenants/:id/invoices

  const tenantId = useMemo(() => api.getTenantId?.() || null, []);

  // Ensure x-tenant-id is set. If not, resolve from /tenants/me.
  const ensureTenantContext = async () => {
    let id = api.getTenantId?.() || null;

    if (!id) {
      try {
        const { data } = await api.get("/tenants/me");
        const t = data || {};
        const tid = t.id || t.tenantId || t.orgId || null;

        if (tid) {
          api.setTenantId?.(tid);
          try {
            localStorage.setItem("tenant", JSON.stringify({ id: tid, name: t.name || "Organization" }));
            localStorage.setItem("tenantId", tid);
            if (t.name) localStorage.setItem("tenantName", t.name);
          } catch {}
          id = tid;
        }
        setTenant({ id, name: t.name || "Organization", planCode: t.planCode, status: t.status });
      } catch (e) {
        // If /tenants/me failed, surface a friendly message.
        const msg =
          e?.response?.data?.error ||
          e?.normalizedMessage ||
          e?.message ||
          "Failed to resolve tenant.";
        setError(msg);
        return null;
      }
    } else {
      // Try to populate tenant name (optional)
      try {
        const { data } = await api.get("/tenants/me");
        setTenant({ id, name: data?.name || "Organization", planCode: data?.planCode, status: data?.status });
      } catch {
        setTenant({ id, name: "Organization" });
      }
    }

    return api.getTenantId?.() || id || null;
  };

  const loadAll = async () => {
    setLoading(true);
    setError("");

    const id = await ensureTenantContext();
    if (!id) {
      setLoading(false);
      setError("Missing tenant id. Please choose an organization.");
      return;
    }

    try {
      const [limitsRes, billingRes, plansRes, invoicesRes] = await Promise.all([
        api.get("/org/limits").catch(() => ({ data: null })),
        api.get("/billing").catch(() => ({ data: null })),
        // Provide plans from any of the tolerant mounts the API exposes
        api.get("/plans").catch(async () => (await api.get("/billing/plans")).data).catch(() => ({ data: [] })),
        api.get(`/tenants/${id}/invoices`).catch(() => ({ data: { invoices: [] } })),
      ]);

      setLimits(limitsRes?.data || null);
      setBilling(billingRes?.data || null);
      setPlans(plansRes?.data || []);
      setInvoices((invoicesRes?.data?.invoices || []).slice().sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))));
    } catch (e) {
      const msg =
        e?.response?.data?.error ||
        e?.normalizedMessage ||
        e?.message ||
        "Failed to load subscription.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSyncInvoices = async () => {
    setError("");
    const id = api.getTenantId?.();
    if (!id) return setError("Missing tenant id.");
    try {
      await api.post(`/tenants/${id}/invoices/sync`, {});
      await loadAll();
    } catch (e) {
      const msg =
        e?.response?.data?.error ||
        e?.normalizedMessage ||
        e?.message ||
        "Failed to sync invoices.";
      setError(msg);
    }
  };

  const onManualSetTenant = async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const tid = String(form.get("tenantId") || "").trim();
    if (!tid) return;

    api.setTenantId?.(tid);
    try {
      localStorage.setItem("tenant", JSON.stringify({ id: tid, name: "Organization" }));
      localStorage.setItem("tenantId", tid);
    } catch {}
    await loadAll();
  };

  const PlanBadge = ({ plan }) => (
    <span className="px-2 py-0.5 rounded-full text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
      {String(plan || "basic").toUpperCase()}
    </span>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight">Subscription</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={loadAll}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm"
            title="Refresh"
          >
            <FiRefreshCw /> Refresh
          </button>
          <button
            onClick={onSyncInvoices}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm"
            title="Sync invoices from billing provider"
          >
            <FiCloudLightning /> Sync Invoices
          </button>
        </div>
      </div>

      {/* Missing tenant warning & manual picker */}
      {!tenant?.id && (
        <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200 flex items-center gap-2">
          <FiAlertTriangle className="shrink-0" />
          <div className="flex-1 text-sm">
            Tenant is not selected. Some subscription details require a tenant id.
          </div>
          <form onSubmit={onManualSetTenant} className="flex items-center gap-2">
            <input
              type="text"
              name="tenantId"
              placeholder="Enter Tenant ID"
              className="px-2 py-1 rounded border border-amber-300 bg-white dark:bg-slate-900 dark:border-amber-800 text-sm"
            />
            <button
              className="px-2.5 py-1 rounded bg-amber-600 text-white text-sm hover:bg-amber-700"
              type="submit"
            >
              Set
            </button>
          </form>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg border border-rose-300 bg-rose-50 text-rose-800 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-200 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Overview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Current Subscription</div>
              {tenant?.planCode && <PlanBadge plan={tenant.planCode} />}
            </div>

            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Tenant" value={tenant?.name || "Organization"} />
              <Stat label="Tenant ID" value={tenant?.id || "—"} muted />
              <Stat label="Status" value={billing?.status || tenant?.status || "—"} />
              <Stat label="Plan" value={billing?.plan || tenant?.planCode || limits?.plan?.code || "—"} />
            </div>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Borrowers Limit" value={limits?.limits?.borrowers ?? "—"} />
              <Stat label="Loans Limit" value={limits?.limits?.loans ?? "—"} />
              <Stat label="Borrowers Used" value={limits?.usage?.borrowers ?? "—"} muted />
              <Stat label="Loans Used" value={limits?.usage?.loans ?? "—"} muted />
            </div>
          </div>

          {/* Invoices */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="p-4 flex items-center justify-between">
              <div className="font-semibold">Invoices</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {invoices?.length || 0} items
              </div>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {(invoices || []).length === 0 && (
                <div className="px-4 py-8 text-sm text-slate-500 dark:text-slate-400">
                  No invoices yet.
                </div>
              )}
              {(invoices || []).map((inv, i) => (
                <div key={inv.id || i} className="px-4 py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      {inv.number || inv.id || "Invoice"}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {inv.date || inv.createdAt || "—"} · {inv.status || "—"}
                    </div>
                  </div>
                  <div className="text-sm font-semibold">
                    {typeof inv.amount === "number" ? inv.amount.toLocaleString() : (inv.amount || "—")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Plans / Actions */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center gap-2 font-semibold">
              <FiShield /> Plans
            </div>
            <div className="mt-3 space-y-2">
              {(Array.isArray(plans) ? plans : []).map((p) => (
                <div key={p.code || p.id} className="p-2 rounded border border-slate-200 dark:border-slate-800">
                  <div className="text-sm font-medium">{p.name || (p.code || "").toUpperCase()}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {p.description || "—"}
                  </div>
                </div>
              ))}
              {(!plans || plans.length === 0) && (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  No plans available.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="font-semibold mb-2">Troubleshooting</div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              If you still see “Missing tenant id”, make sure you are logged in and your tenant is selected.
            </div>
            <form onSubmit={onManualSetTenant} className="mt-3 flex items-center gap-2">
              <input
                name="tenantId"
                placeholder="Enter Tenant ID"
                className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              />
              <button className="px-3 py-1.5 rounded bg-slate-800 text-white text-sm hover:bg-slate-900" type="submit">
                Set Tenant
              </button>
            </form>
          </div>
        </div>
      </div>

      {loading && (
        <div className="fixed inset-x-0 bottom-4 flex justify-center pointer-events-none">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs shadow-lg">
            <FiRefreshCw className="animate-spin" /> Loading…
          </div>
        </div>
      )}
    </div>
  );
}
