import React, { useEffect, useState } from "react";
import api from "../../api";

export default function Organization() {
  const [tenant, setTenant] = useState(null);
  const [ent, setEnt] = useState(null);
  const [limits, setLimits] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | unavailable | error
  const [errMsg, setErrMsg] = useState("");

  // Try a few likely endpoints, stop on the first success.
  async function tryGet(paths, opts) {
    for (const p of paths) {
      try {
        const res = await api.get(p, opts);
        if (res?.data !== undefined) return res.data;
      } catch (e) {
        if (e?.response?.status !== 404) throw e; // ignore only 404s
      }
    }
    const nf = new Error("Not Found"); nf.code = 404; throw nf;
  }

  // Map ['loans.view', ...] -> { loans: true, ... } for the badges UI
  function entitlementsToModules(keys = []) {
    const on = (k) => keys.includes(k);
    return {
      savings:     on('savings.view'),
      loans:       on('loans.view'),
      collections: on('collections.view'),
      accounting:  on('accounting.view'),
      sms:         on('sms.send') || on('sms.view'),
      esignatures: on('esign.view') || on('esignatures.view'),
      payroll:     on('payroll.view'),
      investors:   on('investors.view'),
      assets:      on('assets.view'),
      collateral:  on('collateral.view'),
      reports:     on('reports.view'),
    };
  }

  const load = async () => {
    setStatus("loading");
    setErrMsg("");
    try {
      const t = await tryGet(
        ["/tenants/me", "/tenant/me", "/account/tenant", "/account/organization"],
        {}
      );
      setTenant(t);

      // Entitlements (old endpoints first)
      const e = await tryGet(
        ["/tenants/me/entitlements","/tenant/me/entitlements","/account/tenant/entitlements","/account/organization/entitlements"],
        {}
      ).catch(() => ({}));
      setEnt(e || {});

      // Limits — now also try the new /org/limits
      const lim = await tryGet(
        ["/tenants/me/limits","/tenant/me/limits","/account/tenant/limits","/account/organization/limits","/org/limits"],
        {}
      ).catch(() => ({}));
      setLimits(lim || {});

      // If entitlements endpoint wasn’t available, try to derive from /org/limits
      const hasEntModules = e && e.modules && Object.keys(e.modules).length > 0;
      if (!hasEntModules && Array.isArray(lim?.entitlements)) {
        setEnt({
          modules: entitlementsToModules(lim.entitlements),
          planCode: (lim?.plan?.code || lim?.plan?.name || t?.planCode || 'basic').toString().toLowerCase(),
          status: t?.status || 'trial',
        });
      }

      // Invoices — now also try the new /org/invoices
      const inv = await tryGet(
        ["/tenants/me/invoices","/tenant/me/invoices","/account/tenant/invoices","/account/organization/invoices","/org/invoices"],
        {}
      ).catch(() => []);
      // normalize array or { invoices: [...] }
      const invList = Array.isArray(inv) ? inv : (Array.isArray(inv?.invoices) ? inv.invoices : []);
      setInvoices(invList);

      setStatus("ready");
    } catch (e) {
      if (e?.code === 404) setStatus("unavailable");
      else {
        setStatus("error");
        setErrMsg(e?.response?.data?.error || e.message || "Unknown error");
      }
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  if (status === "loading") {
    return <div className="p-4 text-sm text-slate-500 dark:text-slate-400">Loading…</div>;
  }

  if (status === "unavailable") {
    return (
      <div className="ms-card p-4 space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Organization</h2>
        <div className="rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-3">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Organization settings aren’t available on this server (the <code>/tenants/me</code> API is not implemented).
            If you don’t need this module you can ignore this page.
          </p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="p-4 text-sm text-rose-600 dark:text-rose-400">
        Error: {errMsg}
        <div className="mt-3">
          <button onClick={load} className="h-9 px-3 rounded ms-btn">Retry</button>
        </div>
      </div>
    );
  }

  // ----- READY -----
  const t = tenant || {};
  const e = ent || {};

  const save = async () => {
    try {
      await api.patch("/tenants/me", {
        planCode: t.planCode,
        trialEndsAt: t.trialEndsAt,
        autoDisableOverdue: t.autoDisableOverdue,
        graceDays: t.graceDays,
        billingEmail: t.billingEmail,
      });
      await load();
    } catch (err) {
      setStatus("error");
      setErrMsg(err?.response?.data?.error || err.message || "Save failed");
    }
  };

  return (
    <div className="ms-card p-4 space-y-6">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Organization</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <label>
          <div className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Plan</div>
          <select
            value={t.planCode || "basic"}
            onChange={(e) => setTenant({ ...t, planCode: e.target.value })}
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
            value={t.trialEndsAt || ""}
            onChange={(e) => setTenant({ ...t, trialEndsAt: e.target.value })}
            className="border rounded px-2 py-2 w-full bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
          />
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!t.autoDisableOverdue}
            onChange={(e) => setTenant({ ...t, autoDisableOverdue: e.target.checked })}
            className="h-4 w-4"
          />
          <span>Auto suspend overdue</span>
        </label>

        <label>
          <div className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Grace days</div>
          <input
            type="number"
            value={t.graceDays ?? 7}
            onChange={(e) => setTenant({ ...t, graceDays: Number(e.target.value || 0) })}
            className="border rounded px-2 py-2 w-full bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
            min={0} max={90}
          />
        </label>

        <label className="md:col-span-2">
          <div className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Billing email</div>
          <input
            type="email"
            value={t.billingEmail || ""}
            onChange={(e) => setTenant({ ...t, billingEmail: e.target.value })}
            className="border rounded px-2 py-2 w-full bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
          />
        </label>
      </div>

      <div className="flex gap-2">
        <button onClick={save} className="h-9 px-3 rounded bg-blue-600 text-white hover:bg-blue-700">Save</button>
        <button onClick={load} className="h-9 px-3 rounded ms-btn">Refresh</button>
      </div>

      {/* Entitlements */}
      <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
        <h3 className="font-semibold mb-2 text-slate-900 dark:text-slate-100">Entitlements</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
          {Object.entries(e.modules || {}).length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400">No entitlements available.</p>
          ) : (
            Object.entries(e.modules || {}).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <span className="w-44 capitalize text-slate-700 dark:text-slate-200">{k.replace(/_/g, " ")}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  v ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}>{v ? "enabled" : "disabled"}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Limits */}
      <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
        <h3 className="font-semibold mb-2 text-slate-900 dark:text-slate-100">Limits</h3>
        {!limits || Object.keys(limits).length === 0 ? (
          <div className="text-sm text-slate-500 dark:text-slate-400">No limits configured.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
            {Object.entries(limits).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <span className="w-44 capitalize text-slate-700 dark:text-slate-200">{k.replace(/_/g, " ")}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 dark:text-slate-200">{String(v === null ? 'Unlimited' : v)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invoices */}
      <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
        <h3 className="font-semibold mb-2 text-slate-900 dark:text-slate-100">Invoices</h3>
        {invoices.length === 0 ? (
          <div className="text-sm text-slate-500 dark:text-slate-400">No invoices yet.</div>
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
                  <tr key={inv.id} className="border-top border-slate-100 dark:border-slate-800">
                    <td className="py-2 pr-4">{inv.number || inv.id}</td>
                    <td className="py-2 pr-4">
                      {Number((inv.amount_cents ?? inv.amountCents ?? 0) / 100)
                        .toLocaleString(undefined, { style: "currency", currency: inv.currency || "USD" })}
                    </td>
                    <td className="py-2 pr-4">{(inv.due_date || inv.dueDate) ? String(inv.due_date || inv.dueDate).slice(0,10) : "-"}</td>
                    <td className="py-2 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        (inv.status || "open") === "paid" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                        : (inv.status || "open") === "past_due" ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}>
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
