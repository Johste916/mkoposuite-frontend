import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../api";

async function tryGet(paths, opts) {
  let lastErr = null;
  for (const p of paths) {
    try {
      const res = await api.get(p, opts);
      return res?.data ?? null;
    } catch (e) { lastErr = e; }
  }
  if (lastErr) throw lastErr;
  return null;
}
async function tryPatch(paths, body, opts) {
  let lastErr = null;
  for (const p of paths) {
    try {
      const res = await api.patch(p, body, opts);
      return res?.data ?? true;
    } catch (e) { lastErr = e; }
  }
  if (lastErr) throw lastErr;
  return null;
}
async function tryPost(paths, body, opts) {
  let lastErr = null;
  for (const p of paths) {
    try {
      const res = await api.post(p, body, opts);
      return res?.data ?? true;
    } catch (e) { lastErr = e; }
  }
  if (lastErr) throw lastErr;
  return null;
}

const MODULE_KEYS = [
  "savings","loans","collections","accounting","sms","esignatures",
  "payroll","investors","assets","collateral","reports"
];

export default function TenantEdit() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [t, setT] = useState(null);
  const [modules, setModules] = useState({});
  const [limits, setLimits] = useState({});
  const [status, setStatus] = useState("loading");
  const [err, setErr] = useState("");

  const load = async () => {
    setStatus("loading");
    setErr("");
    try {
      const tenant = await tryGet(
        [
          `/admin/tenants/${tenantId}`,
          `/system/tenants/${tenantId}`,
          `/org/admin/tenants/${tenantId}`,
        ],
        {}
      ).catch(() => ({}));
      setT(tenant || {});

      const ent = await tryGet(
        [
          `/admin/tenants/${tenantId}/entitlements`,
          `/system/tenants/${tenantId}/entitlements`,
          `/org/admin/tenants/${tenantId}/entitlements`,
        ],
        {}
      ).catch(() => ({}));

      const entModules =
        ent?.modules && typeof ent.modules === "object"
          ? ent.modules
          : Array.isArray(ent)
          ? Object.fromEntries(ent.map((k) => [k, true]))
          : {};
      setModules({ ...Object.fromEntries(MODULE_KEYS.map(k => [k, false])), ...entModules });

      const limRaw = await tryGet(
        [
          `/admin/tenants/${tenantId}/limits`,
          `/system/tenants/${tenantId}/limits`,
          `/org/admin/tenants/${tenantId}/limits`,
        ],
        {}
      ).catch(() => ({}));
      const normalizedLimits = limRaw && limRaw.limits ? limRaw.limits : (limRaw || {});
      setLimits(normalizedLimits);

      setStatus("ready");
    } catch (e) {
      setStatus("error");
      setErr(e?.response?.data?.error || e.message || "Failed to load tenant");
    }
  };

  useEffect(() => { load(); }, [tenantId]);

  const onSave = async () => {
    try {
      setStatus("loading");

      // 1) Update tenant core fields
      await tryPatch(
        [
          `/admin/tenants/${tenantId}`,
          `/system/tenants/${tenantId}`,
          `/org/admin/tenants/${tenantId}`,
        ],
        {
          planCode: t.planCode || t.plan_code || "basic",
          trialEndsAt: t.trialEndsAt || t.trial_ends_at || null,
          billingEmail: t.billingEmail || t.billing_email || "",
          autoDisableOverdue:
            typeof t.autoDisableOverdue !== "undefined"
              ? t.autoDisableOverdue
              : t.auto_disable_overdue ?? false,
          graceDays: typeof t.graceDays !== "undefined" ? t.graceDays : t.grace_days ?? 7,
          status: t.status || undefined,
        },
        {}
      ).catch(() => {});

      // 2) Update entitlements (send either modules object or flat keys)
      await tryPost(
        [
          `/admin/tenants/${tenantId}/entitlements`,
          `/system/tenants/${tenantId}/entitlements`,
          `/org/admin/tenants/${tenantId}/entitlements`,
        ],
        { modules },
        {}
      ).catch(() => {});

      // 3) Update limits
      await tryPost(
        [
          `/admin/tenants/${tenantId}/limits`,
          `/system/tenants/${tenantId}/limits`,
          `/org/admin/tenants/${tenantId}/limits`,
        ],
        { limits },
        {}
      ).catch(() => {});

      await load();
      setStatus("ready");
    } catch (e) {
      setStatus("error");
      setErr(e?.response?.data?.error || e.message || "Save failed");
    }
  };

  if (status === "loading") {
    return <div className="p-4 text-sm text-slate-500 dark:text-slate-400">Loading…</div>;
  }
  if (status === "error") {
    return (
      <div className="p-4 text-sm text-rose-600 dark:text-rose-400">
        Error: {err}
        <div className="mt-3">
          <button onClick={load} className="h-9 px-3 rounded ms-btn">Retry</button>
        </div>
      </div>
    );
  }

  const plan = t.planCode || t.plan_code || "basic";

  return (
    <div className="ms-card p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Edit Tenant</h2>
        <button onClick={() => navigate("..")} className="ms-btn h-9 px-3">Back</button>
      </div>

      {/* Core settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <label>
          <div className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Plan</div>
          <select
            value={plan}
            onChange={(e) => setT({ ...t, planCode: e.target.value, plan_code: e.target.value })}
            className="border rounded px-2 py-2 w-full bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
          >
            <option value="basic">Basic</option>
            <option value="pro">Pro</option>
            <option value="premium">Premium</option>
          </select>
        </label>

        <label>
          <div className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Trial ends</div>
          <input
            type="date"
            value={t.trialEndsAt || t.trial_ends_at || ""}
            onChange={(e) => setT({ ...t, trialEndsAt: e.target.value, trial_ends_at: e.target.value })}
            className="border rounded px-2 py-2 w-full bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
          />
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!(t.autoDisableOverdue ?? t.auto_disable_overdue)}
            onChange={(e) => setT({ ...t, autoDisableOverdue: e.target.checked, auto_disable_overdue: e.target.checked })}
            className="h-4 w-4"
          />
          <span>Auto suspend overdue</span>
        </label>

        <label>
          <div className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Grace days</div>
          <input
            type="number"
            value={(t.graceDays ?? t.grace_days) ?? 7}
            onChange={(e) => setT({ ...t, graceDays: Number(e.target.value || 0), grace_days: Number(e.target.value || 0) })}
            className="border rounded px-2 py-2 w-full bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
            min={0} max={90}
          />
        </label>

        <label className="md:col-span-2">
          <div className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Billing email</div>
          <input
            type="email"
            value={t.billingEmail || t.billing_email || ""}
            onChange={(e) => setT({ ...t, billingEmail: e.target.value, billing_email: e.target.value })}
            className="border rounded px-2 py-2 w-full bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
          />
        </label>
      </div>

      {/* Entitlements */}
      <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
        <h3 className="font-semibold mb-2 text-slate-900 dark:text-slate-100">Entitlements</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
          {MODULE_KEYS.map((k) => (
            <label key={k} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!modules[k]}
                onChange={(e) => setModules({ ...modules, [k]: e.target.checked })}
                className="h-4 w-4"
              />
              <span className="capitalize">{k.replace(/_/g, " ")}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Limits */}
      <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
        <h3 className="font-semibold mb-2 text-slate-900 dark:text-slate-100">Limits</h3>
        {Object.keys(limits || {}).length === 0 ? (
          <div className="text-sm text-slate-500 dark:text-slate-400">No limits set. You can add keys manually below.</div>
        ) : null}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
          {Object.entries(limits || {}).map(([k, v]) => (
            <label key={k} className="flex items-center gap-2">
              <span className="w-40 capitalize text-slate-700 dark:text-slate-200">{k.replace(/_/g, " ")}</span>
              <input
                type="number"
                value={v === null ? "" : v}
                placeholder="Unlimited"
                onChange={(e) => {
                  const val = e.target.value === "" ? null : Number(e.target.value);
                  setLimits({ ...limits, [k]: val });
                }}
                className="border rounded px-2 py-1 w-40 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
              />
            </label>
          ))}
        </div>

        {/* Add new limit key */}
        <div className="mt-3 flex gap-2 items-center">
          <input
            id="newLimitKey"
            placeholder="new_limit_key"
            className="border rounded px-2 py-1 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
          />
          <input
            id="newLimitValue"
            placeholder="value (blank = unlimited)"
            className="border rounded px-2 py-1 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
          />
          <button
            className="ms-btn h-8 px-3"
            onClick={() => {
              const keyEl = document.getElementById("newLimitKey");
              const valEl = document.getElementById("newLimitValue");
              const key = keyEl.value.trim();
              if (!key) return;
              const value = valEl.value === "" ? null : Number(valEl.value);
              setLimits({ ...limits, [key]: value });
              keyEl.value = ""; valEl.value = "";
            }}
          >
            Add
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={onSave} className="h-9 px-3 rounded bg-blue-600 text-white hover:bg-blue-700">Save</button>
        <button onClick={load} className="h-9 px-3 rounded ms-btn">Refresh</button>
      </div>
    </div>
  );
}
