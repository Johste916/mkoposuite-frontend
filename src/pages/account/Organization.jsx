// src/pages/account/Organization.jsx
import React, { useEffect, useState } from "react";
import api from "../../api";

export default function Organization() {
  const [tenant, setTenant] = useState(null);
  const [ent, setEnt] = useState(null);
  const [limits, setLimits] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [errMsg, setErrMsg] = useState("");

  /** -------------------- tiny helpers -------------------- */
  // GET: try a list of paths, keep going on errors
  async function tryGet(paths, opts) {
    let lastErr = null;
    for (const p of paths) {
      try {
        const res = await api.get(p, opts);
        if (res?.data !== undefined) return res.data;
      } catch (e) {
        lastErr = e; // keep trying next candidate (even if 4xx/5xx)
      }
    }
    if (lastErr) throw lastErr;
    throw Object.assign(new Error("Not Found"), { code: 404 });
  }

  // PATCH: attempt multiple endpoints; ignore 404/405 and keep trying
  async function tryPatch(paths, body, opts) {
    let lastErr = null;
    for (const p of paths) {
      try {
        const res = await api.patch(p, body, opts);
        return res?.data ?? true;
      } catch (e) {
        const code = e?.response?.status;
        if (code !== 404 && code !== 405) lastErr = e;
      }
    }
    if (lastErr) throw lastErr;
    throw Object.assign(new Error("No PATCH endpoint matched"), { code: 404 });
  }

  // Map ['loans.view', ...] -> { loans: true, ... } for the badges UI
  function entitlementsToModules(keys = []) {
    const on = (k) => keys.includes(k);
    return {
      savings:     on("savings.view"),
      loans:       on("loans.view"),
      collections: on("collections.view"),
      accounting:  on("accounting.view"),
      sms:         on("sms.send") || on("sms.view"),
      esignatures: on("esign.view") || on("esignatures.view"),
      payroll:     on("payroll.view"),
      investors:   on("investors.view"),
      assets:      on("assets.view"),
      collateral:  on("collateral.view"),
      reports:     on("reports.view"),
    };
  }

  /** -------------------- main loader -------------------- */
  const load = async () => {
    setStatus("loading");
    setErrMsg("");

    try {
      // 1) Tenant (be tolerant: if all endpoints fail, continue with {})
      const t = await tryGet(
        [
          "/tenants/me",
          "/tenant/me",
          "/account/tenant",
          "/account/organization",
          // possible org-style self endpoints:
          "/org/tenant",
          "/org/me",
          "/org",
        ],
        {}
      ).catch(() => ({}));
      setTenant(t);

      // Remember tenant id for optional header downstream
      const tenantId = t?.id || t?.tenantId || null;
      if (tenantId) localStorage.setItem("tenantId", tenantId);
      const withTenant = (extra = {}) =>
        tenantId
          ? { ...extra, headers: { ...(extra.headers || {}), "x-tenant-id": tenantId } }
          : extra;

      // 2) Entitlements (support both {modules:{...}} and ['keys',...])
      const entRaw = await tryGet(
        [
          "/tenants/me/entitlements",
          "/tenant/me/entitlements",
          "/account/tenant/entitlements",
          "/account/organization/entitlements",
          "/org/entitlements",
        ],
        withTenant()
      ).catch(() => ({}));

      let entData = {};
      if (entRaw?.modules && typeof entRaw.modules === "object") {
        entData = entRaw;
      } else if (Array.isArray(entRaw)) {
        entData = { modules: entitlementsToModules(entRaw) };
      } else {
        entData = entRaw || {};
      }
      setEnt(entData);

      // 3) Limits — normalize /org/limits shape { plan, limits, entitlements, usage }
      const limRaw = await tryGet(
        [
          "/tenants/me/limits",
          "/tenant/me/limits",
          "/account/tenant/limits",
          "/account/organization/limits",
          "/org/limits",
        ],
        withTenant()
      ).catch(() => ({}));

      const normalizedLimits =
        limRaw && typeof limRaw === "object" && limRaw.limits
          ? limRaw.limits
          : limRaw || {};
      setLimits(normalizedLimits || {});

      // If entitlements missing but /org/limits contains entitlements[], derive modules
      const hasEntModules =
        entData && entData.modules && Object.keys(entData.modules).length > 0;
      if (!hasEntModules && Array.isArray(limRaw?.entitlements)) {
        setEnt({
          modules: entitlementsToModules(limRaw.entitlements),
          planCode:
            (limRaw?.plan?.code ||
              limRaw?.plan?.name ||
              t?.planCode ||
              t?.plan_code ||
              "basic")
              .toString()
              .toLowerCase(),
          status: t?.status || "trial",
        });
      }

      // 4) Invoices — allow { invoices: [...] } or array
      const inv = await tryGet(
        [
          "/tenants/me/invoices",
          "/tenant/me/invoices",
          "/account/tenant/invoices",
          "/account/organization/invoices",
          "/org/invoices",
        ],
        withTenant()
      ).catch(() => []);
      const invList = Array.isArray(inv)
        ? inv
        : Array.isArray(inv?.invoices)
        ? inv.invoices
        : [];
      setInvoices(invList);

      setStatus("ready");
    } catch (e) {
      setStatus("error");
      setErrMsg(e?.response?.data?.error || e.message || "Unknown error");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** -------------------- render states -------------------- */
  if (status === "loading") {
    return (
      <div className="p-4 text-sm text-slate-500 dark:text-slate-400">Loading…</div>
    );
  }

  if (status === "error") {
    return (
      <div className="p-4 text-sm text-rose-600 dark:text-rose-400">
        Error: {errMsg}
        <div className="mt-3">
          <button onClick={load} className="h-9 px-3 rounded ms-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ----- READY -----
  const t = tenant || {};
  const e = ent || {};

  const currentPlan =
    t.planCode || t.plan_code || e.planCode || e.plan_code || "basic";

  const save = async () => {
    try {
      const tid = t?.id || t?.tenantId || localStorage.getItem("tenantId") || null;
      const withTenant = (extra = {}) =>
        tid
          ? { ...extra, headers: { ...(extra.headers || {}), "x-tenant-id": tid } }
          : extra;

      await tryPatch(
        [
          "/tenants/me",
          "/tenant/me",
          "/account/tenant",
          "/account/organization",
          // optional org-style update endpoints if present in your API
          "/org/tenant",
          "/org",
        ],
        {
          planCode: t.planCode || t.plan_code || currentPlan,
          trialEndsAt: t.trialEndsAt || t.trial_ends_at || null,
          autoDisableOverdue:
            typeof t.autoDisableOverdue !== "undefined"
              ? t.autoDisableOverdue
              : t.auto_disable_overdue ?? false,
          graceDays: typeof t.graceDays !== "undefined" ? t.graceDays : t.grace_days ?? 7,
          billingEmail: t.billingEmail || t.billing_email || "",
        },
        withTenant()
      );

      await load();
    } catch (err) {
      setStatus("error");
      setErrMsg(err?.response?.data?.error || err.message || "Save failed");
    }
  };

  return (
    <div className="ms-card p-4 space-y-6">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        Organization
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <label>
          <div className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
            Plan
          </div>
          <select
            value={currentPlan}
            onChange={(e) =>
              setTenant({ ...t, planCode: e.target.value, plan_code: e.target.value })
            }
            className="border rounded px-2 py-2 w-full bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
          >
            <option value="basic">Basic</option>
            <option value="pro">Pro</option>
            <option value="premium">Premium</option>
          </select>
        </label>

        <label>
          <div className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
            Trial ends
          </div>
          <input
            type="date"
            value={t.trialEndsAt || t.trial_ends_at || ""}
            onChange={(e) =>
              setTenant({ ...t, trialEndsAt: e.target.value, trial_ends_at: e.target.value })
            }
            className="border rounded px-2 py-2 w-full bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
          />
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!(t.autoDisableOverdue ?? t.auto_disable_overdue)}
            onChange={(e) =>
              setTenant({
                ...t,
                autoDisableOverdue: e.target.checked,
                auto_disable_overdue: e.target.checked,
              })
            }
            className="h-4 w-4"
          />
          <span>Auto suspend overdue</span>
        </label>

        <label>
          <div className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
            Grace days
          </div>
          <input
            type="number"
            value={(t.graceDays ?? t.grace_days) ?? 7}
            onChange={(e) =>
              setTenant({
                ...t,
                graceDays: Number(e.target.value || 0),
                grace_days: Number(e.target.value || 0),
              })
            }
            className="border rounded px-2 py-2 w-full bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
            min={0}
            max={90}
          />
        </label>

        <label className="md:col-span-2">
          <div className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
            Billing email
          </div>
          <input
            type="email"
            value={t.billingEmail || t.billing_email || ""}
            onChange={(e) =>
              setTenant({
                ...t,
                billingEmail: e.target.value,
                billing_email: e.target.value,
              })
            }
            className="border rounded px-2 py-2 w-full bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
          />
        </label>
      </div>

      <div className="flex gap-2">
        <button
          onClick={save}
          className="h-9 px-3 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          Save
        </button>
        <button onClick={load} className="h-9 px-3 rounded ms-btn">
          Refresh
        </button>
      </div>

      {/* Entitlements */}
      <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
        <h3 className="font-semibold mb-2 text-slate-900 dark:text-slate-100">
          Entitlements
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
          {Object.entries(e.modules || {}).length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400">
              No entitlements available.
            </p>
          ) : (
            Object.entries(e.modules || {}).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <span className="w-44 capitalize text-slate-700 dark:text-slate-200">
                  {k.replace(/_/g, " ")}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    v
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {v ? "enabled" : "disabled"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Limits */}
      <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
        <h3 className="font-semibold mb-2 text-slate-900 dark:text-slate-100">
          Limits
        </h3>
        {!limits || Object.keys(limits).length === 0 ? (
          <div className="text-sm text-slate-500 dark:text-slate-400">
            No limits configured.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
            {Object.entries(limits).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <span className="w-44 capitalize text-slate-700 dark:text-slate-200">
                  {k.replace(/_/g, " ")}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 dark:text-slate-200">
                  {v === null ? "Unlimited" : String(v)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invoices */}
      <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
        <h3 className="font-semibold mb-2 text-slate-900 dark:text-slate-100">
          Invoices
        </h3>
        {invoices.length === 0 ? (
          <div className="text-sm text-slate-500 dark:text-slate-400">
            No invoices yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-2 pr-4">Number</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Due date</th>
                  <th className="py-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody className="align-top">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id || inv.number}
                    className="border-top border-slate-100 dark:border-slate-800"
                  >
                    <td className="py-2 pr-4">{inv.number || inv.id}</td>
                    <td className="py-2 pr-4">
                      {Number(
                        (inv.amount_cents ?? inv.amountCents ?? 0) / 100
                      ).toLocaleString(undefined, {
                        style: "currency",
                        currency: inv.currency || "USD",
                      })}
                    </td>
                    <td className="py-2 pr-4">
                      {(inv.due_date || inv.dueDate)
                        ? String(inv.due_date || inv.dueDate).slice(0, 10)
                        : "-"}
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          (inv.status || "open") === "paid"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : (inv.status || "open") === "past_due"
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {inv.status || "open"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
