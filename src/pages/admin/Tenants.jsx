// src/pages/admin/Tenants.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../api";

/** Sequential fallback GET (tries each path until one succeeds) */
async function tryGet(paths, opts) {
  let lastErr;
  for (const p of paths) {
    try {
      const { data } = await api.get(p, opts);
      return data;
    } catch (e) {
      lastErr = e;
      // keep trying next path
    }
  }
  throw lastErr || new Error("All GET endpoints failed");
}

/** Sequential fallback PATCH/POST for updates */
async function trySend(method, paths, body, opts) {
  let lastErr;
  for (const p of paths) {
    try {
      const res =
        method === "patch"
          ? await api.patch(p, body, opts)
          : await api.post(p, body, opts);
      return res?.data;
    } catch (e) {
      const code = e?.response?.status;
      // ignore 404/405 and try next candidate
      if (code !== 404 && code !== 405) lastErr = e;
    }
  }
  throw lastErr || new Error(`No ${method.toUpperCase()} endpoint matched`);
}

/** Best-effort normalization so the UI works with any API shape */
function normalizeTenant(raw) {
  const t = raw || {};
  const id =
    t.id ??
    t.tenantId ??
    t.orgId ??
    t.organizationId ??
    t._id ??
    t.uuid ??
    null;

  // name/company/slug variants
  const name =
    t.name ||
    t.company ||
    t.company_name ||
    t.organization ||
    t.displayName ||
    t.slug ||
    `Tenant ${id ?? ""}`.trim();

  // plan code/name in multiple places
  const planCode =
    (t.planCode || t.plan_code || t.plan?.code || t.subscription?.planCode || t.subscription?.plan?.code || t.plan || "")
      .toString()
      .toLowerCase();

  const planName =
    t.planName ||
    t.plan_name ||
    t.plan?.name ||
    t.subscription?.plan?.name ||
    (planCode ? planCode.replace(/(^|_)(\w)/g, (_, a, c) => (a ? " " : "") + c.toUpperCase()) : "—");

  // status / active flags
  const status =
    t.status ||
    (t.active === true ? "active" : t.active === false ? "inactive" : undefined) ||
    t.subscription?.status ||
    "unknown";

  // trials
  const trialEnds =
    t.trialEndsAt || t.trial_ends_at || t.trialEnd || t.trial_end || null;

  // staff/user counts
  const staffCount =
    t.staffCount ??
    t.userCount ??
    t.users_count ??
    t.staff_count ??
    t.membersCount ??
    t.members_count ??
    t.stats?.staff ??
    t.stats?.users ??
    null;

  return {
    id,
    name,
    planCode,
    planName,
    status,
    trialEnds,
    staffCount,
    raw: t,
  };
}

/** Local plan catalog as a fallback when there is no plans API */
const LOCAL_PLANS = [
  { code: "basic", name: "Basic", price: 0, staffLimit: 5 },
  { code: "pro", name: "Pro", price: 49, staffLimit: 50 },
  { code: "premium", name: "Premium", price: 149, staffLimit: 250 },
];

export default function TenantsAdmin() {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const [tenants, setTenants] = useState([]);
  const [plans, setPlans] = useState(LOCAL_PLANS);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");

  // toast-lite
  const toast = (m, t = "ok") => {
    setMsg(m);
    setTimeout(() => setMsg(""), 2500);
    if (t === "error") console.warn(m);
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      // 1) Fetch tenants (sequential fallbacks; stops at first success)
      const listRaw = await tryGet(
        [
          "/admin/tenants",        // preferred (if you add it)
          "/system/tenants",       // some backends
          "/tenants",              // generic
          "/org/tenants",          // org-style
          "/organizations",        // plural orgs
          "/orgs",                 // alt
        ],
        {}
      );

      const list = Array.isArray(listRaw)
        ? listRaw
        : Array.isArray(listRaw?.items)
        ? listRaw.items
        : Array.isArray(listRaw?.data)
        ? listRaw.data
        : [];

      setTenants(list.map(normalizeTenant));

      // 2) Try to load a plans catalog; if all endpoints fail keep LOCAL_PLANS
      try {
        const plansRaw = await tryGet(
          [
            "/admin/tenants/plans",
            "/admin/plans",
            "/system/plans",
            "/billing/plans",
            "/plans",
          ],
          {}
        );
        const arr = Array.isArray(plansRaw)
          ? plansRaw
          : Array.isArray(plansRaw?.items)
          ? plansRaw.items
          : Array.isArray(plansRaw?.data)
          ? plansRaw.data
          : [];

        const normalizedPlans = arr.map((p) => ({
          code:
            p.code ||
            p.planCode ||
            p.slug ||
            (p.name ? p.name.toString().toLowerCase().replace(/\s+/g, "-") : "plan"),
          name: p.name || p.title || p.displayName || p.code || "Plan",
          price:
            p.price ??
            p.priceMonthly ??
            p.amount ??
            p.amountCents / 100 ??
            0,
          staffLimit:
            p.staffLimit ??
            p.usersLimit ??
            p.maxUsers ??
            p.limits?.users ??
            null,
        }));
        if (normalizedPlans.length) setPlans(normalizedPlans);
      } catch {
        // keep LOCAL_PLANS silently
      }

      setLoading(false);
    } catch (e) {
      setLoading(false);
      setError(
        e?.response?.data?.message ||
          e?.response?.data?.error ||
          e?.message ||
          "Failed to load tenants"
      );
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return tenants;
    return tenants.filter((t) => {
      return (
        t.name.toLowerCase().includes(s) ||
        t.planName.toLowerCase().includes(s) ||
        (t.planCode || "").toLowerCase().includes(s) ||
        (t.status || "").toLowerCase().includes(s)
      );
    });
  }, [q, tenants]);

  const changePlan = async (tenant, newCode) => {
    setSavingId(tenant.id);
    setError("");
    try {
      // prefer PATCH, then POST, multiple shapes
      await trySend(
        "patch",
        [
          `/admin/tenants/${tenant.id}/plan`,
          `/admin/tenants/${tenant.id}/subscription`,
          `/tenants/${tenant.id}/plan`,
          `/tenants/${tenant.id}/assign-plan`,
          `/orgs/${tenant.id}/plan`,
          `/organizations/${tenant.id}/plan`,
          `/billing/tenants/${tenant.id}/plan`,
        ],
        { planCode: newCode, plan: newCode, code: newCode }
      ).catch(async () => {
        // try POST variants if PATCH series didn’t match
        await trySend(
          "post",
          [
            `/admin/tenants/${tenant.id}/plan`,
            `/admin/tenants/${tenant.id}/subscription`,
            `/tenants/${tenant.id}/plan`,
            `/tenants/${tenant.id}/assign-plan`,
            `/orgs/${tenant.id}/plan`,
            `/organizations/${tenant.id}/plan`,
            `/billing/tenants/${tenant.id}/plan`,
          ],
          { planCode: newCode, plan: newCode, code: newCode }
        );
      });

      toast("Plan updated");
      await load();
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          e?.response?.data?.error ||
          "Failed to change plan"
      );
    } finally {
      setSavingId(null);
    }
  };

  const notifyTenant = async (tenant) => {
    setSavingId(tenant.id);
    try {
      await trySend(
        "post",
        [
          `/admin/tenants/${tenant.id}/notify`,
          `/tenants/${tenant.id}/notify`,
          `/orgs/${tenant.id}/notify`,
          `/organizations/${tenant.id}/notify`,
          `/support/tenants/${tenant.id}/message`,
        ],
        { subject: "Update from your administrator", message: "Hello! This is a test notification from the admin console." }
      );
      toast("Notification sent");
    } catch (e) {
      toast("No notify endpoint available on this server", "error");
    } finally {
      setSavingId(null);
    }
  };

  const forceSyncInvoices = async (tenant) => {
    setSavingId(tenant.id);
    try {
      await trySend(
        "post",
        [
          `/admin/tenants/${tenant.id}/invoices/sync`,
          `/billing/tenants/${tenant.id}/invoices/sync`,
          `/tenants/${tenant.id}/invoices/sync`,
        ],
        {}
      );
      toast("Invoice sync triggered");
    } catch {
      toast("No invoice sync endpoint available", "error");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-sm text-slate-500 dark:text-slate-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Admin · Tenants</h1>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="h-9 px-3 rounded border bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
          />
          <button onClick={load} className="h-9 px-3 rounded ms-btn">
            Refresh
          </button>
        </div>
      </div>

      {!!msg && (
        <div className="text-sm text-emerald-600 dark:text-emerald-400">
          {msg}
        </div>
      )}
      {!!error && (
        <div className="text-sm text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      <div className="overflow-x-auto bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="text-slate-600 dark:text-slate-300">
            <tr>
              <th className="text-left py-2 px-3">Name</th>
              <th className="text-left py-2 px-3">Plan</th>
              <th className="text-left py-2 px-3">Status</th>
              <th className="text-left py-2 px-3">Trial ends</th>
              <th className="text-left py-2 px-3">Staff</th>
              <th className="text-left py-2 px-3 w-[280px]">Actions</th>
            </tr>
          </thead>
          <tbody className="text-slate-800 dark:text-slate-200">
            {filtered.length === 0 ? (
              <tr>
                <td className="py-6 px-3 text-slate-500 dark:text-slate-400" colSpan={6}>
                  No tenants found.
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr
                  key={t.id || t.name}
                  className="border-t border-slate-200 dark:border-slate-800"
                >
                  <td className="py-2 px-3">{t.name}</td>
                  <td className="py-2 px-3">{t.planName}</td>
                  <td className="py-2 px-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        (t.status || "unknown") === "active"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : (t.status || "").includes("trial")
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          : (t.status || "").includes("past_due")
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {t.status || "unknown"}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    {t.trialEnds ? String(t.trialEnds).slice(0, 10) : "—"}
                  </td>
                  <td className="py-2 px-3">{t.staffCount ?? "—"}</td>
                  <td className="py-2 px-3">
                    <div className="flex flex-wrap gap-2 items-center">
                      <select
                        defaultValue={t.planCode || ""}
                        onChange={(e) => changePlan(t, e.target.value)}
                        disabled={savingId === t.id}
                        className="h-9 px-2 rounded border bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                        title="Change plan"
                      >
                        <option value="" disabled>
                          Assign plan…
                        </option>
                        {plans.map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.name}
                          </option>
                        ))}
                      </select>

                      <button
                        className="h-9 px-3 rounded border bg-white dark:bg-slate-900 dark:border-slate-700"
                        onClick={() => notifyTenant(t)}
                        disabled={savingId === t.id}
                        title="Send a notification to this tenant"
                      >
                        Notify
                      </button>

                      <button
                        className="h-9 px-3 rounded border bg-white dark:bg-slate-900 dark:border-slate-700"
                        onClick={() => forceSyncInvoices(t)}
                        disabled={savingId === t.id}
                        title="Trigger invoice sync"
                      >
                        Sync Invoices
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        This console is visible only to system administrators/owners (and any roles you allowed in routing).
      </p>
    </div>
  );
}
