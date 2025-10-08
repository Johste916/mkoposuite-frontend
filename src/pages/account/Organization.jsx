// src/pages/account/Organization.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../api";

/**
 * Organization (Tenant) console — upgraded
 * - Tolerant loaders (multiple endpoint candidates)
 * - Editable subset with validation + dirty state + reset
 * - Inline toasts + clearer error states
 * - Readable entitlements/limits + invoice open/download
 */

// -------------------- tiny helpers --------------------
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function tryGet(paths, opts) {
  let lastErr = null;
  for (const p of paths) {
    try {
      const res = await api.get(p, opts);
      if (res?.data !== undefined) return res.data;
    } catch (e) {
      lastErr = e; // continue to next
    }
  }
  if (lastErr) throw lastErr;
  throw Object.assign(new Error("Not Found"), { code: 404 });
}

async function tryPatch(paths, body, opts) {
  let lastErr = null;
  for (const p of paths) {
    try {
      const res = await api.patch(p, body, opts);
      return res?.data ?? true;
    } catch (e) {
      const code = e?.response?.status;
      // ignore 404/405 and try next candidate
      if (code !== 404 && code !== 405) lastErr = e;
    }
  }
  if (lastErr) throw lastErr;
  throw Object.assign(new Error("No PATCH endpoint matched"), { code: 404 });
}

// Map ['loans.view', ...] -> { loans: true, ... } for badges UI
function entitlementsToModules(keys = []) {
  const on = (k) => keys.includes(k);
  return {
    savings: on("savings.view"),
    loans: on("loans.view"),
    collections: on("collections.view"),
    accounting: on("accounting.view"),
    sms: on("sms.send") || on("sms.view"),
    esignatures: on("esign.view") || on("esignatures.view"),
    payroll: on("payroll.view"),
    investors: on("investors.view"),
    assets: on("assets.view"),
    collateral: on("collateral.view"),
    reports: on("reports.view"),
  };
}

// Derive the editable shape from the raw tenant payload
function toEditableTenant(t = {}) {
  return {
    planCode:
      t.planCode || t.plan_code || "basic",
    trialEndsAt:
      t.trialEndsAt || t.trial_ends_at || "",
    autoDisableOverdue:
      (typeof t.autoDisableOverdue !== "undefined"
        ? t.autoDisableOverdue
        : t.auto_disable_overdue) ?? false,
    graceDays:
      (typeof t.graceDays !== "undefined"
        ? t.graceDays
        : t.grace_days) ?? 7,
    billingEmail:
      t.billingEmail || t.billing_email || "",
  };
}

// -------------------- component --------------------
export default function Organization() {
  const [tenantRaw, setTenantRaw] = useState(null);
  const [ent, setEnt] = useState(null);
  const [limits, setLimits] = useState(null);
  const [invoices, setInvoices] = useState([]);

  // editable (and its server snapshot for dirty-state)
  const [edit, setEdit] = useState(toEditableTenant());
  const [serverEdit, setServerEdit] = useState(toEditableTenant());

  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [errMsg, setErrMsg] = useState("");

  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState([]);

  const toast = (msg, type = "ok") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  };

  const isDirty = useMemo(
    () => JSON.stringify(edit) !== JSON.stringify(serverEdit),
    [edit, serverEdit]
  );

  // -------------------- load --------------------
  const load = async () => {
    setStatus("loading");
    setErrMsg("");

    try {
      // 1) Tenant
      const t = await tryGet(
        [
          "/tenants/me",
          "/tenant/me",
          "/account/tenant",
          "/account/organization",
          "/org/tenant",
          "/org/me",
          "/org",
        ],
        {}
      ).catch(() => ({}));
      setTenantRaw(t);

      const tenantId = t?.id || t?.tenantId || null;
      if (tenantId) localStorage.setItem("tenantId", tenantId);
      const withTenant = (extra = {}) =>
        tenantId
          ? {
              ...extra,
              headers: { ...(extra.headers || {}), "x-tenant-id": tenantId },
            }
          : extra;

      // 2) Entitlements
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

      // 3) Limits (normalize)
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

      // If entitlements missing but limits had entitlements[]
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

      // 4) Invoices
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

      // setup editable
      const nextEdit = toEditableTenant(t);
      setEdit(nextEdit);
      setServerEdit(nextEdit);

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

  // -------------------- validation --------------------
  const [errors, setErrors] = useState({});
  const validate = (e = edit) => {
    const v = {};
    if (e.billingEmail && !EMAIL_RX.test(e.billingEmail)) {
      v.billingEmail = "Enter a valid email";
    }
    const g = Number(e.graceDays ?? 0);
    if (!Number.isFinite(g) || g < 0 || g > 90) {
      v.graceDays = "Grace days must be 0–90";
    }
    if (e.trialEndsAt && !/^\d{4}-\d{2}-\d{2}$/.test(String(e.trialEndsAt))) {
      v.trialEndsAt = "Use YYYY-MM-DD";
    }
    return v;
  };

  // -------------------- actions --------------------
  const save = async () => {
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length) {
      toast("Fix validation errors", "error");
      return;
    }

    setSaving(true);
    try {
      const tid =
        tenantRaw?.id ||
        tenantRaw?.tenantId ||
        localStorage.getItem("tenantId") ||
        null;

      const withTenant = (extra = {}) =>
        tid
          ? {
              ...extra,
              headers: { ...(extra.headers || {}), "x-tenant-id": tid },
            }
          : extra;

      await tryPatch(
        [
          "/tenants/me",
          "/tenant/me",
          "/account/tenant",
          "/account/organization",
          "/org/tenant",
          "/org",
        ],
        {
          planCode: edit.planCode,
          trialEndsAt: edit.trialEndsAt || null,
          autoDisableOverdue: !!edit.autoDisableOverdue,
          graceDays: Number(edit.graceDays ?? 0),
          billingEmail: edit.billingEmail || "",
        },
        withTenant()
      );

      setServerEdit(edit);
      toast("Saved organization");
      await load(); // refresh read-only bits (limits/plan mirroring)
    } catch (err) {
      setStatus("error");
      setErrMsg(err?.response?.data?.error || err.message || "Save failed");
      toast("Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setEdit(serverEdit);
    setErrors({});
  };

  // -------------------- UI helpers --------------------
  const t = tenantRaw || {};
  const e = ent || {};
  const currentPlan =
    edit.planCode || t.planCode || t.plan_code || e.planCode || "basic";

  const openInvoice = (inv) => {
    const url =
      inv.hosted_url ||
      inv.url ||
      inv.pdf_url ||
      inv.pdfUrl ||
      inv.download_url ||
      null;
    if (url) {
      try {
        window.open(url, "_blank", "noopener,noreferrer");
      } catch {}
    }
  };

  // -------------------- render --------------------
  if (status === "loading") {
    return <div className="p-4 text-sm text-slate-500 dark:text-slate-400">Loading…</div>;
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

  return (
    <div className="ms-card p-4 space-y-6">
      {/* toasts */}
      <div className="fixed right-4 top-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-3 py-2 rounded shadow text-sm text-white ${
              t.type === "error" ? "bg-rose-600" : "bg-emerald-600"
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Organization
        </h2>
        {isDirty && (
          <span className="text-[11px] px-2 py-0.5 rounded bg-amber-100 text-amber-700">
            Unsaved changes
          </span>
        )}
      </div>

      {/* Editable core */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <label>
          <div className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
            Plan
          </div>
          <select
            value={currentPlan}
            onChange={(e) => setEdit((x) => ({ ...x, planCode: e.target.value }))}
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
            value={edit.trialEndsAt || ""}
            onChange={(e) => setEdit((x) => ({ ...x, trialEndsAt: e.target.value }))}
            className={`border rounded px-2 py-2 w-full bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 ${
              errors.trialEndsAt ? "border-rose-400" : ""
            }`}
          />
          {errors.trialEndsAt && (
            <div className="text-[11px] text-rose-600 mt-1">{errors.trialEndsAt}</div>
          )}
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!edit.autoDisableOverdue}
            onChange={(e) =>
              setEdit((x) => ({ ...x, autoDisableOverdue: e.target.checked }))
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
            min={0}
            max={90}
            value={String(edit.graceDays ?? 0)}
            onChange={(e) =>
              setEdit((x) => ({ ...x, graceDays: Number(e.target.value || 0) }))
            }
            className={`border rounded px-2 py-2 w-full bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 ${
              errors.graceDays ? "border-rose-400" : ""
            }`}
          />
          {errors.graceDays && (
            <div className="text-[11px] text-rose-600 mt-1">{errors.graceDays}</div>
          )}
        </label>

        <label className="md:col-span-2">
          <div className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
            Billing email
          </div>
          <input
            type="email"
            value={edit.billingEmail || ""}
            onChange={(e) =>
              setEdit((x) => ({ ...x, billingEmail: e.target.value }))
            }
            className={`border rounded px-2 py-2 w-full bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 ${
              errors.billingEmail ? "border-rose-400" : ""
            }`}
            placeholder="billing@company.com"
          />
          {errors.billingEmail && (
            <div className="text-[11px] text-rose-600 mt-1">{errors.billingEmail}</div>
          )}
        </label>
      </div>

      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={!isDirty || saving}
          className="h-9 px-3 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={reset}
          disabled={!isDirty || saving}
          className="h-9 px-3 rounded border bg-white hover:bg-slate-50 disabled:opacity-60"
        >
          Reset
        </button>
        <button onClick={load} disabled={saving} className="h-9 px-3 rounded ms-btn">
          Refresh
        </button>
      </div>

      {/* Entitlements */}
      <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
        <h3 className="font-semibold mb-2 text-slate-900 dark:text-slate-100">
          Entitlements
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
          {Object.entries(e?.modules || {}).length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400">
              No entitlements available.
            </p>
          ) : (
            Object.entries(e.modules).map(([k, v]) => (
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
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody className="align-top">
                {invoices.map((inv) => {
                  const amt =
                    (inv.amount_cents ?? inv.amountCents ?? inv.total_cents ?? 0) /
                    100;
                  const ccy = inv.currency || inv.ccy || "USD";
                  const due =
                    (inv.due_date || inv.dueDate || inv.due_at || "")
                      ?.toString()
                      .slice(0, 10) || "-";
                  const st = inv.status || "open";
                  const canOpen =
                    !!(inv.hosted_url || inv.url || inv.pdf_url || inv.download_url);
                  return (
                    <tr
                      key={inv.id || inv.number}
                      className="border-top border-slate-100 dark:border-slate-800"
                    >
                      <td className="py-2 pr-4">{inv.number || inv.id}</td>
                      <td className="py-2 pr-4">
                        {Number(amt).toLocaleString(undefined, {
                          style: "currency",
                          currency: ccy,
                        })}
                      </td>
                      <td className="py-2 pr-4">{due}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            st === "paid"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                              : st === "past_due"
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {st}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        {canOpen && (
                          <button
                            onClick={() => openInvoice(inv)}
                            className="h-8 px-2 rounded border bg-white hover:bg-slate-50"
                          >
                            Open
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
