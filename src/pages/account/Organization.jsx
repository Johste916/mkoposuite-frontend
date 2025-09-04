import React, { useEffect, useState } from "react";
import api from "../../api";

export default function Organization() {
  const [t, setT] = useState(null);
  const [ent, setEnt] = useState(null);
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    try {
      const me = await api.get("/tenants/me");
      setT(me.data);
      const en = await api.get("/tenants/me/entitlements");
      setEnt(en.data);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    }
  };
  useEffect(() => { load(); }, []);

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
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    }
  };

  if (err) return <div className="p-4 text-sm text-rose-600 dark:text-rose-400">Error: {err}</div>;
  if (!t || !ent) return <div className="p-4 text-sm text-slate-500 dark:text-slate-400">Loading…</div>;

  return (
    <div className="ms-card p-4 space-y-4">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Organization</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <label>
          <div className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Plan</div>
          <select
            value={t.planCode}
            onChange={(e) => setT({ ...t, planCode: e.target.value })}
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
            onChange={(e) => setT({ ...t, trialEndsAt: e.target.value })}
            className="border rounded px-2 py-2 w-full bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
          />
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!t.autoDisableOverdue}
            onChange={(e) => setT({ ...t, autoDisableOverdue: e.target.checked })}
            className="h-4 w-4"
          />
          <span>Auto suspend overdue</span>
        </label>

        <label>
          <div className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Grace days</div>
          <input
            type="number"
            value={t.graceDays ?? 7}
            onChange={(e) => setT({ ...t, graceDays: Number(e.target.value) })}
            className="border rounded px-2 py-2 w-full bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
          />
        </label>

        <label className="md:col-span-2">
          <div className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Billing email</div>
          <input
            type="email"
            value={t.billingEmail || ""}
            onChange={(e) => setT({ ...t, billingEmail: e.target.value })}
            className="border rounded px-2 py-2 w-full bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
          />
        </label>
      </div>

      <div className="flex gap-2">
        <button onClick={save} className="h-9 px-3 rounded bg-blue-600 text-white hover:bg-blue-700">Save</button>
        <button onClick={load} className="h-9 px-3 rounded ms-btn">Refresh</button>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
        <h3 className="font-semibold mb-2 text-slate-900 dark:text-slate-100">Entitlements</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
          {Object.entries(ent.modules || {}).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2">
              <span className="w-44 capitalize text-slate-700 dark:text-slate-200">{k.replace(/_/g, " ")}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  v ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {v ? "enabled" : "disabled"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
