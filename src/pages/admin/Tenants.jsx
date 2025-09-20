/*  ----------  src/pages/admin/Tenants.jsx  ---------- */
import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api";
import {
  FiSearch,
  FiEdit2,
  FiSend,
  FiAlertCircle,
  FiX,
  FiSave,
  FiRefreshCw,
} from "react-icons/fi";

/* -------------------------------------------
   Tolerant API helpers with per-attempt timeout
-------------------------------------------- */
const withTimeout = (ms = 9000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort("timeout"), ms);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
};

const tryGet = async (urls, config = {}) => {
  let lastErr;
  for (const u of urls) {
    const t = withTimeout(config.timeoutMs || 9000);
    try {
      const res = await api.get(u, { ...config, signal: t.signal });
      t.done();
      return res?.data;
    } catch (e) {
      t.done();
      lastErr = e;
    }
  }
  throw lastErr || new Error("All GET endpoints failed");
};

const tryPost = async (urls, body, config = {}) => {
  let lastErr;
  for (const u of urls) {
    const t = withTimeout(config.timeoutMs || 9000);
    try {
      const res = await api.post(u, body, { ...config, signal: t.signal });
      t.done();
      return res?.data ?? true;
    } catch (e) {
      t.done();
      lastErr = e;
    }
  }
  throw lastErr || new Error("All POST endpoints failed");
};

const tryPatch = async (urls, body, config = {}) => {
  let lastErr;
  for (const u of urls) {
    const t = withTimeout(config.timeoutMs || 9000);
    try {
      const res = await api.patch(u, body, { ...config, signal: t.signal });
      t.done();
      return res?.data ?? true;
    } catch (e) {
      t.done();
      const code = e?.response?.status;
      if (code !== 404 && code !== 405) lastErr = e; // tolerate 404/405
    }
  }
  if (lastErr) throw lastErr;
  throw new Error("No PATCH endpoint matched");
};

/* -------------------------------------------
   Normalizers
-------------------------------------------- */
function normalizeTenant(t = {}) {
  const id =
    t.id ?? t.tenantId ?? t.orgId ?? t.organizationId ?? t.uuid ?? t._id ?? null;
  const name =
    t.name ?? t.tenantName ?? t.company ?? t.orgName ?? t.organization ?? "—";
  const planCode = (
    t.planCode ??
    t.plan_code ??
    t.plan?.code ??
    t.subscription?.plan_code ??
    t.subscription?.planCode ??
    t.plan ??
    ""
  )
    .toString()
    .toLowerCase();
  const planLabel =
    t.plan?.name ??
    t.subscription?.plan_name ??
    t.subscription?.plan?.name ??
    (planCode
      ? planCode.replace(/(^|_)(\w)/g, (_, a, c) => (a ? " " : "") + c.toUpperCase())
      : "—");
  const status = (
    t.status ??
    t.subscription?.status ??
    t.billing?.status ??
    (t.active === true ? "active" : t.active === false ? "inactive" : "unknown")
  )
    .toString()
    .toLowerCase();
  const seats =
    t.seats ??
    t.subscription?.seats ??
    t.limits?.staff ??
    t.limits?.users ??
    t.maxUsers ??
    null;
  const staffCount =
    t.staffCount ??
    t.staff_count ??
    t.usersCount ??
    t.users_count ??
    t.employeesCount ??
    t.membersCount ??
    t.staff?.length ??
    t.users?.length ??
    null;
  const trialEndsAt =
    t.trialEndsAt ?? t.trial_end ?? t.trial_ends_at ?? t.subscription?.trial_end ?? "";
  const billingEmail =
    t.billingEmail ?? t.billing_email ?? t.billing?.email ?? t.ownerEmail ?? "";
  const currency = t.currency ?? t.billing?.currency ?? t.payment?.currency ?? "USD";
  const createdAt = t.createdAt ?? t.created_at ?? t.created ?? t.meta?.createdAt ?? "";

  return {
    raw: t,
    id,
    name,
    planCode,
    planLabel,
    status,
    seats,
    staffCount,
    trialEndsAt,
    billingEmail,
    currency,
    createdAt,
  };
}

/* -------------------------------------------
   Fetchers
-------------------------------------------- */
async function fetchTenantStats() {
  const raw = await tryGet(
    [
      "/admin/tenants/stats",
      "/system/tenants/stats",
      "/tenants/stats",
      "/orgs/stats",
      "/organizations/stats",
    ],
    { timeoutMs: 8000 }
  ).catch(() => null);
  if (!raw) return {};
  const list = Array.isArray(raw) ? raw : raw?.items || raw?.data || raw?.tenants || [];
  const arr = Array.isArray(list) ? list : [];
  const map = {};
  arr.forEach((s) => {
    const id =
      s.id ?? s.tenantId ?? s.orgId ?? s.organizationId ?? s.uuid ?? s._id ?? null;
    if (!id) return;
    map[id] = {
      staffCount:
        s.staffCount ?? s.usersCount ?? s.membersCount ?? s.users ?? s.staff ?? null,
      seats:
        s.seats ?? s.staffLimit ?? s.usersLimit ?? s.maxUsers ?? s.limits?.users ?? null,
    };
  });
  return map;
}

async function fetchSelfTenant() {
  const data = await tryGet(
    [
      "/tenants/me",
      "/tenant/me",
      "/account/tenant",
      "/account/organization",
      "/org/tenant",
      "/org/me",
      "/org",
      "/organization",
    ],
    { timeoutMs: 6000 }
  ).catch(() => null);
  if (data && typeof data === "object") return [normalizeTenant(data)];
  try {
    const { data: me } = await api.get("/auth/me");
    const t = me?.tenant || me?.organization || me?.org || null;
    return t ? [normalizeTenant(t)] : [];
  } catch {
    return [];
  }
}

async function fetchTenants({ q = "" } = {}) {
  const endpoints = ["/admin/tenants", "/system/tenants", "/tenants", "/orgs", "/organizations"];
  const paramAttempts = q
    ? [{ params: { q } }, { params: { query: q } }, { params: { search: q } }]
    : [{}];

  for (const params of paramAttempts) {
    try {
      const data = await tryGet(endpoints, { ...params, timeoutMs: 9000 });
      const list = Array.isArray(data) ? data : data?.items || data?.data || data?.results || [];
      const arr = Array.isArray(list) ? list : [];
      if (arr.length) {
        const rows = arr.map(normalizeTenant);
        if (rows.some((r) => r.staffCount == null || r.seats == null)) {
          const stats = await fetchTenantStats().catch(() => ({}));
          rows.forEach((r) => {
            if (!r.id) return;
            const s = stats[r.id];
            if (s) {
              if (r.staffCount == null && s.staffCount != null) r.staffCount = s.staffCount;
              if (r.seats == null && s.seats != null) r.seats = s.seats;
            }
          });
        }
        return rows;
      }
    } catch {
      /* keep trying */
    }
  }
  // fallback to self org if no list endpoints exist
  return await fetchSelfTenant();
}

async function fetchTenantInvoices(tenantId) {
  const data = await tryGet(
    [
      `/admin/tenants/${tenantId}/invoices`,
      `/tenants/${tenantId}/invoices`,
      `/orgs/${tenantId}/invoices`,
      `/organizations/${tenantId}/invoices`,
    ],
    { timeoutMs: 9000 }
  ).catch(() => []);
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.invoices)
    ? data.invoices
    : [];
  return list.map((inv) => ({
    id: inv.id ?? inv.number,
    number: inv.number ?? inv.id ?? "—",
    currency: inv.currency ?? "USD",
    amount:
      inv.amount ??
      (inv.amount_cents ?? inv.amountCents ?? inv.total_cents ?? inv.total ?? 0) /
        (inv.amount ? 1 : 100),
    date: inv.date ?? inv.createdAt ?? inv.created_at ?? "",
    status: (inv.status ?? "open").toLowerCase(),
    pdfUrl: inv.pdfUrl ?? inv.url ?? "",
    due: inv.due_date ?? inv.dueDate ?? "",
  }));
}

async function fetchPlans() {
  const data = await tryGet(
    ["/admin/plans", "/system/plans", "/billing/plans", "/plans"],
    { timeoutMs: 7000 }
  ).catch(() => []);
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.plans)
    ? data.plans
    : Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.data)
    ? data.data
    : [];
  const mapped = list.map((p) => ({
    code: (p.code ?? p.id ?? p.planCode ?? "").toString().toLowerCase(),
    label: p.name ?? p.label ?? (p.code ?? p.planCode ?? "").toString(),
  }));
  if (mapped.length) return mapped;
  return [
    { code: "basic", label: "Basic" },
    { code: "pro", label: "Pro" },
    { code: "premium", label: "Premium" },
  ];
}

async function updateSubscription(tenantId, body) {
  const payload = {
    planCode: body.planCode,
    seats: body.seats ?? null,
    trialEndsAt: body.trialEndsAt ?? null,
    billingEmail: body.billingEmail ?? undefined,
    status: body.status ?? undefined,
  };
  const urls = [
    `/admin/tenants/${tenantId}/subscription`,
    `/admin/tenants/${tenantId}`,
    `/tenants/${tenantId}`,
    `/orgs/${tenantId}`,
    `/organizations/${tenantId}`,
  ];
  return tryPatch(urls, payload, { timeoutMs: 9000 });
}

async function sendAnnouncement(tenantId, payload) {
  const urls = [
    `/admin/tenants/${tenantId}/notify`,
    `/notifications/tenants/${tenantId}`,
    `/announce/tenants/${tenantId}`,
  ];
  return tryPost(urls, payload, { timeoutMs: 9000 });
}

async function openSupportTicket(tenantId, payload) {
  const urls = [
    `/admin/tenants/${tenantId}/support`,
    `/support/tickets`,
    `/system/support/tickets`,
  ];
  const enriched = { ...payload, tenantId };
  return tryPost(urls, enriched, { timeoutMs: 9000 });
}

async function syncInvoices(tenantId) {
  const urls = [
    `/admin/tenants/${tenantId}/invoices/sync`,
    `/billing/tenants/${tenantId}/invoices/sync`,
    `/tenants/${tenantId}/invoices/sync`,
  ];
  return tryPost(urls, {}, { timeoutMs: 9000 });
}

/* -------------------------------------------
   Tiny toast
-------------------------------------------- */
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const add = (msg, type = "ok") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  };
  const View = () => (
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
  );
  return { add, View };
}

/* -------------------------------------------
   UI
-------------------------------------------- */
export default function TenantsAdmin() {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [plans, setPlans] = useState([]);
  const [q, setQ] = useState("");
  const searchRef = useRef(null);

  const [drawer, setDrawer] = useState({
    open: false,
    t: null,
    invoices: [],
    busy: false,
    err: "",
  });

  const { add: toast, View: Toasts } = useToasts();

  const reload = async (query = q) => {
    setLoading(true);
    try {
      const [items, planList] = await Promise.all([
        fetchTenants({ q: query }),
        fetchPlans(),
      ]);
      setList(items);
      setPlans(planList);
      if (!items.length) {
        console.info(
          "[Admin/Tenants] No list returned. Backend may only expose self org endpoints."
        );
      }
    } catch (e) {
      toast(
        e?.response?.data?.error || e?.message || "Failed to load tenants",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearch = () => reload(q);

  const openDrawer = async (t) => {
    setDrawer((d) => ({
      ...d,
      open: true,
      t,
      invoices: [],
      busy: true,
      err: "",
    }));
    try {
      const invoices = await fetchTenantInvoices(t.id);
      setDrawer((d) => ({ ...d, invoices, busy: false }));
    } catch (e) {
      setDrawer((d) => ({
        ...d,
        busy: false,
        err: e?.message || "Failed to load invoices",
      }));
    }
  };

  const closeDrawer = () =>
    setDrawer({ open: false, t: null, invoices: [], busy: false, err: "" });

  const onSaveSubscription = async () => {
    const t = drawer.t;
    if (!t?.id) return;
    setDrawer((d) => ({ ...d, busy: true, err: "" }));
    try {
      await updateSubscription(t.id, {
        planCode: t.planCode,
        seats: t.seats,
        trialEndsAt: t.trialEndsAt || null,
        billingEmail: t.billingEmail,
        status: t.status,
      });
      toast("Subscription updated");
      await reload(q);
      const fresh =
        (await fetchTenants({ q })).find((x) => x.id === t.id) || t;
      setDrawer((d) => ({ ...d, t: fresh, busy: false }));
    } catch (e) {
      setDrawer((d) => ({
        ...d,
        busy: false,
        err: e?.response?.data?.error || e?.message || "Save failed",
      }));
    }
  };

  const onSendAnnouncement = async (subject, message) => {
    const t = drawer.t;
    setDrawer((d) => ({ ...d, busy: true, err: "" }));
    try {
      await sendAnnouncement(t.id, {
        subject,
        message,
        channels: ["in_app", "email"],
      });
      toast("Announcement sent");
      setDrawer((d) => ({ ...d, busy: false }));
    } catch (e) {
      setDrawer((d) => ({
        ...d,
        busy: false,
        err: e?.response?.data?.error || e?.message || "Failed to send",
      }));
    }
  };

  const onOpenTicket = async (subject, body) => {
    const t = drawer.t;
    setDrawer((d) => ({ ...d, busy: true, err: "" }));
    try {
      await openSupportTicket(t.id, {
        subject,
        body,
        priority: "normal",
        source: "admin",
      });
      toast("Support ticket created");
      setDrawer((d) => ({ ...d, busy: false }));
    } catch (e) {
      setDrawer((d) => ({
        ...d,
        busy: false,
        err: e?.response?.data?.error || e?.message || "Failed to create ticket",
      }));
    }
  };

  const onSyncInvoices = async () => {
    const t = drawer.t;
    if (!t?.id) return;
    setDrawer((d) => ({ ...d, busy: true, err: "" }));
    try {
      await syncInvoices(t.id);
      const invoices = await fetchTenantInvoices(t.id);
      setDrawer((d) => ({ ...d, invoices, busy: false }));
      toast("Invoice sync triggered");
    } catch (e) {
      setDrawer((d) => ({
        ...d,
        busy: false,
        err: e?.response?.data?.error || e?.message || "Failed to sync invoices",
      }));
    }
  };

  const totals = useMemo(() => {
    const staff = list.reduce((a, b) => a + (Number(b.staffCount) || 0), 0);
    const seats = list.reduce((a, b) => a + (Number(b.seats) || 0), 0);
    return { tenants: list.length, staff, seats };
  }, [list]);

  return (
    <div className="p-4">
      <Toasts />
      <h1 className="text-xl font-semibold mb-1">Admin · Tenants</h1>
      <p className="mb-3 text-xs text-slate-500">
        Billing is based on{" "}
        <b>active Staff seats</b> per tenant. Tenant Admins manage their staff
        (loan officers, CS, HR, accountant, manager, etc.). System Admins
        configure plans & seat limits and can review invoices; they do not manage
        tenant staff directly.
      </p>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="text-xs text-slate-500">
          <span className="mr-3">
            Total tenants: <b>{totals.tenants}</b>
          </span>
          <span className="mr-3">
            Total staff: <b>{totals.staff}</b>
          </span>
          <span>
            Allocated seats: <b>{totals.seats}</b>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <FiSearch className="absolute left-2 top-[10px] text-slate-400" />
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="pl-8 pr-3 py-2 border rounded-md w-72 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
            />
          </div>
          <button
            onClick={onSearch}
            className="px-3 py-2 rounded bg-slate-900 text-white hover:bg-slate-800"
          >
            Search
          </button>
          <button
            onClick={() => reload(q)}
            className="px-3 py-2 rounded border bg-white dark:bg-slate-900 dark:border-slate-700 flex items-center gap-2"
            title="Refresh"
          >
            <FiRefreshCw /> Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl">
        {loading ? (
          <div className="p-4 text-sm text-slate-500">Loading…</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="text-slate-600 dark:text-slate-300">
              <tr>
                <th className="text-left py-2 px-3">Name</th>
                <th className="text-left py-2 px-3">Plan</th>
                <th className="text-left py-2 px-3">Status</th>
                <th className="text-left py-2 px-3">Trial ends</th>
                <th className="text-left py-2 px-3">Staff</th>
                <th className="text-left py-2 px-3">Seats</th>
                <th className="text-left py-2 px-3">Billing</th>
                <th className="text-left py-2 px-3 w-1"></th>
              </tr>
            </thead>
            <tbody className="text-slate-800 dark:text-slate-200">
              {list.map((t) => {
                const over = Number(t.staffCount || 0) > Number(t.seats || 0);
                return (
                  <tr
                    key={t.id || t.name}
                    className="border-t border-slate-200 dark:border-slate-800"
                  >
                    <td className="py-2 px-3">{t.name}</td>
                    <td className="py-2 px-3">{t.planLabel}</td>
                    <td className="py-2 px-3 capitalize">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          t.status === "active"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : t.status === "trialing" || t.status === "trial"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                            : t.status === "past_due"
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      {t.trialEndsAt ? String(t.trialEndsAt).slice(0, 10) : "—"}
                    </td>
                    <td className="py-2 px-3">
                      {t.staffCount ?? "—"}{" "}
                      {over && (
                        <span className="ml-2 text-[10px] px-1.5 py-[1px] rounded bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">
                          over by {Number(t.staffCount) - Number(t.seats)}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3">{t.seats ?? "—"}</td>
                    <td className="py-2 px-3">{t.billingEmail || "—"}</td>
                    <td className="py-2 px-3">
                      <button
                        onClick={() => openDrawer(t)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
                        title="Manage"
                      >
                        <FiEdit2 /> Manage
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!list.length && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-500">
                    No tenants found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        This console is visible only to system administrators/owners (plus any
        roles you allowed in routing).
      </p>

      {/* Drawer / Modal */}
      {drawer.open && (
        <div className="fixed inset-0 z-[70] flex">
          <div className="flex-1 bg-black/40" onClick={closeDrawer} />
          <div className="w-[560px] max-w-[90vw] h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-xl overflow-y-auto">
            <div className="h-14 flex items-center justify-between px-3 border-b border-slate-200 dark:border-slate-800">
              <div className="font-semibold">Manage Tenant</div>
              <button
                className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={closeDrawer}
              >
                <FiX />
              </button>
            </div>

            {drawer.err && (
              <div className="m-3 px-3 py-2 rounded bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300 text-sm flex items-center gap-2">
                <FiAlertCircle /> {drawer.err}
              </div>
            )}

            {!drawer.t ? (
              <div className="p-4 text-sm text-slate-500">Loading…</div>
            ) : (
              <div className="p-4 space-y-6">
                {/* Summary */}
                <section className="border rounded-2xl p-3">
                  <div className="text-sm">
                    <div className="font-semibold">{drawer.t.name}</div>
                    <div className="text-slate-500 text-xs mt-0.5">
                      {drawer.t.id ? `ID: ${drawer.t.id}` : null}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      <b>Billing policy:</b> charges are per active staff seat.
                      Tenant Admins can invite/disable staff. If active staff
                      exceeds seats, usage may be prorated or blocked depending on plan.
                    </div>
                  </div>
                </section>

                {/* Subscription */}
                <section className="border rounded-2xl p-3">
                  <div className="font-semibold mb-2">Subscription</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="text-sm">
                      <div className="mb-1">Plan</div>
                      <select
                        value={drawer.t.planCode || ""}
                        onChange={(e) =>
                          setDrawer((d) => ({
                            ...d,
                            t: {
                              ...d.t,
                              planCode: e.target.value,
                              planLabel:
                                e.target.options[e.target.selectedIndex].text,
                            },
                          }))
                        }
                        className="w-full border rounded px-2 py-2 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                      >
                        <option value="">— Select —</option>
                        {plans.map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm">
                      <div className="mb-1">Seats (staff limit)</div>
                      <input
                        type="number"
                        value={drawer.t.seats ?? ""}
                        onChange={(e) =>
                          setDrawer((d) => ({
                            ...d,
                            t: {
                              ...d.t,
                              seats:
                                e.target.value === ""
                                  ? null
                                  : Number(e.target.value),
                            },
                          }))
                        }
                        className="w-full border rounded px-3 py-2 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                      />
                    </label>
                    <label className="text-sm">
                      <div className="mb-1">Billing email</div>
                      <input
                        value={drawer.t.billingEmail || ""}
                        onChange={(e) =>
                          setDrawer((d) => ({
                            ...d,
                            t: { ...d.t, billingEmail: e.target.value },
                          }))
                        }
                        className="w-full border rounded px-3 py-2 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                      />
                    </label>
                    <label className="text-sm">
                      <div className="mb-1">Trial ends</div>
                      <input
                        type="date"
                        value={
                          drawer.t.trialEndsAt
                            ? String(drawer.t.trialEndsAt).slice(0, 10)
                            : ""
                        }
                        onChange={(e) =>
                          setDrawer((d) => ({
                            ...d,
                            t: { ...d.t, trialEndsAt: e.target.value },
                          }))
                        }
                        className="w-full border rounded px-3 py-2 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                      />
                    </label>
                    <label className="text-sm">
                      <div className="mb-1">Status</div>
                      <select
                        value={drawer.t.status || "active"}
                        onChange={(e) =>
                          setDrawer((d) => ({
                            ...d,
                            t: { ...d.t, status: e.target.value },
                          }))
                        }
                        className="w-full border rounded px-2 py-2 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                      >
                        <option value="active">active</option>
                        <option value="trialing">trialing</option>
                        <option value="suspended">suspended</option>
                        <option value="cancelled">cancelled</option>
                        <option value="past_due">past_due</option>
                      </select>
                    </label>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={onSaveSubscription}
                      disabled={drawer.busy}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      <FiSave /> {drawer.busy ? "Saving…" : "Save subscription"}
                    </button>
                    <button
                      onClick={onSyncInvoices}
                      disabled={drawer.busy}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded border bg-white dark:bg-slate-900 dark:border-slate-700"
                      title="Trigger invoice sync"
                    >
                      <FiRefreshCw /> Sync invoices
                    </button>
                  </div>
                </section>

                {/* Reach out */}
                <section className="border rounded-2xl p-3">
                  <div className="font-semibold mb-2">Reach out</div>
                  <AnnouncementForm
                    onSend={(s, m) => onSendAnnouncement(s, m)}
                    busy={drawer.busy}
                  />
                  <div className="h-3" />
                  <SupportForm
                    onSend={(s, m) => onOpenTicket(s, m)}
                    busy={drawer.busy}
                  />
                </section>

                {/* Invoices */}
                <section className="border rounded-2xl p-3">
                  <div className="font-semibold mb-2">Invoices</div>
                  {drawer.busy && !drawer.invoices.length ? (
                    <div className="text-sm text-slate-500">
                      Loading invoices…
                    </div>
                  ) : drawer.invoices.length ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="text-slate-600 dark:text-slate-300">
                          <tr>
                            <th className="text-left py-2 pr-4">Date</th>
                            <th className="text-left py-2 pr-4">Number</th>
                            <th className="text-left py-2 pr-4">Amount</th>
                            <th className="text-left py-2 pr-4">Status</th>
                            <th className="text-left py-2">PDF</th>
                          </tr>
                        </thead>
                        <tbody className="text-slate-800 dark:text-slate-200">
                          {drawer.invoices.map((inv) => (
                            <tr
                              key={inv.id}
                              className="border-t border-slate-200 dark:border-slate-800"
                            >
                              <td className="py-2 pr-4">
                                {String(inv.date || "").slice(0, 10)}
                              </td>
                              <td className="py-2 pr-4">{inv.number}</td>
                              <td className="py-2 pr-4">
                                {Number(inv.amount || 0).toLocaleString(
                                  undefined,
                                  {
                                    style: "currency",
                                    currency: inv.currency || "USD",
                                  }
                                )}
                              </td>
                              <td className="py-2 pr-4">
                                <span
                                  className={`text-xs px-2 py-0.5 rounded ${
                                    inv.status === "paid"
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                      : inv.status === "past_due"
                                      ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                  }`}
                                >
                                  {inv.status}
                                </span>
                              </td>
                              <td className="py-2">
                                {inv.pdfUrl ? (
                                  <a
                                    href={inv.pdfUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-600 dark:text-blue-300 underline"
                                  >
                                    Download
                                  </a>
                                ) : (
                                  "—"
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500">No invoices.</div>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------- helper forms ----------------------- */
function Field({ label, children }) {
  return (
    <label className="block text-sm">
      <div className="mb-1">{label}</div>
      {children}
    </label>
  );
}

function AnnouncementForm({ onSend, busy }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  return (
    <div className="border rounded-lg p-3">
      <div className="text-sm font-medium mb-2">Send announcement</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Field label="Subject">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full border rounded px-3 py-2 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="Message">
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full border rounded px-3 py-2 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
            />
          </Field>
        </div>
      </div>
      <div className="mt-2">
        <button
          onClick={() => onSend(subject, message)}
          disabled={busy || !subject || !message}
          className="inline-flex items-center gap-2 px-3 py-2 rounded bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
        >
          <FiSend /> Send
        </button>
      </div>
    </div>
  );
}

function SupportForm({ onSend, busy }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  return (
    <div className="border rounded-lg p-3">
      <div className="text-sm font-medium mb-2">Open support ticket</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Field label="Subject">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full border rounded px-3 py-2 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="Details">
            <textarea
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full border rounded px-3 py-2 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
            />
          </Field>
        </div>
      </div>
      <div className="mt-2">
        <button
          onClick={() => onSend(subject, body)}
          disabled={busy || !subject || !body}
          className="inline-flex items-center gap-2 px-3 py-2 rounded bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
        >
          <FiAlertCircle /> Create ticket
        </button>
      </div>
    </div>
  );
}
