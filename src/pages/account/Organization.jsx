// src/pages/account/Organization.jsx
import React, { useEffect, useState } from "react";
import api from "../../api";

/** Safely convert any ISO/string date to input[type=date] (YYYY-MM-DD). */
function toDateInput(v) {
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;            // already date-only
  try {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export default function Organization() {
  const [t, setT] = useState(null);
  const [ent, setEnt] = useState(null);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setErr("");
    setLoading(true);
    try {
      const me = await api.get("/tenants/me");
      const en = await api.get("/tenants/me/entitlements");
      // normalize values we bind to inputs
      const tenant = {
        ...me.data,
        trialEndsAt: toDateInput(me.data?.trialEndsAt),
        planCode: me.data?.planCode || "basic",
        graceDays: typeof me.data?.graceDays === "number" ? me.data.graceDays : 7,
        autoDisableOverdue: !!me.data?.autoDisableOverdue,
        billingEmail: me.data?.billingEmail || "",
      };
      setT(tenant);
      setEnt(en.data || {});
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!t) return;
    setSaving(true);
    setErr("");
    try {
      await api.patch("/tenants/me", {
        planCode: t.planCode,
        trialEndsAt: t.trialEndsAt || null,
        autoDisableOverdue: !!t.autoDisableOverdue,
        graceDays: Number(t.graceDays ?? 0),
        billingEmail: t.billingEmail || null,
      });
      await load();
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  if (err) {
    return (
      <div className="p-4 text-sm text-rose-600 dark:text-rose-400">
        Error: {err}
      </div>
    );
  }
  if (loading || !t || !ent) {
    return (
      <div className="p-4 text-sm text-slate-500 dark:text-slate-400">
        Loading…
      </div>
    );
  }

  const modules = ent?.modules && typeof ent.modules === "object" ? ent.modules : {};

  return (
    <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-4 md:p-6 space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Organization
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Plan, tenant details and entitlements
        </p>
      </header>

      {/* Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 text-sm">
        <label className="block">
          <span className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Plan</span>
          <select
            value={t.planCode}
            onChange={(e) => setT({ ...t, planCode: e.target.value })}
            className="ms-select w-full h-10"
          >
            <option value="basic">Basic</option>
            <option value="pro">Pro</option>
            <option value="premium">Premium</option>
          </select>
        </label>

        <label className="block">
          <span className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Trial ends</span>
          <input
            type="date"
            value={t.trialEndsAt || ""}
            onChange={(e) => setT({ ...t, trialEndsAt: e.target.value })}
            className="ms-input h-10 w-full"
          />
        </label>

        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!t.autoDisableOverdue}
            onChange={(e) => setT({ ...t, autoDisableOverdue: e.target.checked })}
            className="h-4 w-4"
          />
          <span>Auto suspend overdue</span>
        </label>

        <label className="block">
          <span className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Grace days</span>
          <input
            type="number"
            min={0}
            value={t.graceDays ?? 7}
            onChange={(e) => setT({ ...t, graceDays: Number(e.target.value) })}
            className="ms-input h-10 w-full"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Billing email</span>
          <input
            type="email"
            value={t.billingEmail || ""}
            onChange={(e) => setT({ ...t, billingEmail: e.target.value })}
            className="ms-input h-10 w-full"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="ms-btn h-9 px-3 text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button onClick={load} className="ms-btn h-9 px-3">
          Refresh
        </button>
      </div>

      {/* Entitlements */}
      <section className="pt-3 border-t border-slate-200 dark:border-slate-800">
        <h2 className="font-semibold mb-2 text-slate-900 dark:text-slate-100">
          Entitlements
        </h2>

        {Object.keys(modules).length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No entitlements found for this tenant.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
            {Object.entries(modules).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <span className="w-48 shrink-0 capitalize text-slate-700 dark:text-slate-200">
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
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
