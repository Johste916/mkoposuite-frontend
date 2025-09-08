// src/pages/admin/tenants/TenantBilling.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../../api";
import {
  FiRefreshCw,
  FiPlus,
  FiSend,
  FiDownload,
  FiCheck,
  FiSearch,
} from "react-icons/fi";

/* -------------------------------------------
   Utilities: timeouts + tolerant requests
-------------------------------------------- */
const withTimeout = (ms = 9000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort("timeout"), ms);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
};

async function tryGet(paths, opts = {}, { timeoutMs = 9000 } = {}) {
  let lastErr = null;
  for (const p of paths) {
    const t = withTimeout(timeoutMs);
    try {
      const res = await api.get(p, { ...opts, signal: t.signal });
      t.done();
      return res?.data ?? null;
    } catch (e) {
      t.done();
      lastErr = e;
    }
  }
  if (lastErr) throw lastErr;
  return null;
}
async function tryPost(paths, body, opts = {}, { timeoutMs = 9000 } = {}) {
  let lastErr = null;
  for (const p of paths) {
    const t = withTimeout(timeoutMs);
    try {
      const res = await api.post(p, body, { ...opts, signal: t.signal });
      t.done();
      return res?.data ?? true;
    } catch (e) {
      t.done();
      lastErr = e;
    }
  }
  if (lastErr) throw lastErr;
  return null;
}

/* -------------------------------------------
   Tiny toast (self-contained)
-------------------------------------------- */
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const add = (msg, type = "ok") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(
      () => setToasts((t) => t.filter((x) => x.id !== id)),
      type === "error" ? 3600 : 2600
    );
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
   Normalizer
-------------------------------------------- */
function normalizeInvoice(inv = {}) {
  // Prefer cents if available, fallback to amount
  const cents =
    inv.amount_cents ??
    inv.amountCents ??
    inv.total_cents ??
    (typeof inv.amount === "number" ? Math.round(inv.amount * 100) : null);

  const amount =
    typeof inv.amount === "number"
      ? inv.amount
      : typeof cents === "number"
      ? cents / 100
      : 0;

  return {
    raw: inv,
    id: inv.id ?? inv.number ?? inv.uuid,
    number: inv.number ?? inv.id ?? "—",
    currency: inv.currency ?? inv.curr ?? "USD",
    amount,
    amountCents: typeof cents === "number" ? cents : Math.round(amount * 100),
    date:
      inv.date ??
      inv.created_at ??
      inv.createdAt ??
      inv.issued_at ??
      inv.issuedAt ??
      "",
    due: inv.due_date ?? inv.dueDate ?? "",
    status: (inv.status ?? "open").toString().toLowerCase(),
    pdfUrl: inv.pdfUrl ?? inv.pdf_url ?? inv.url ?? "",
  };
}

/* -------------------------------------------
   Data access
-------------------------------------------- */
async function fetchInvoices(tenantId, { q = "", status = "" } = {}) {
  const endpoints = [
    `/admin/tenants/${tenantId}/invoices`,
    `/system/tenants/${tenantId}/invoices`,
    `/org/admin/tenants/${tenantId}/invoices`,
    // generic fallbacks
    `/admin/invoices`,
    `/billing/invoices`,
  ];

  // Try several param shapes the backend may support
  const paramVariants = q || status
    ? [
        { params: { q, status } },
        { params: { query: q, status } },
        { params: { search: q, status } },
        { params: { tenantId } }, // generic fallback
      ]
    : [{ params: { tenantId } }, {}];

  for (const params of paramVariants) {
    try {
      const data = await tryGet(endpoints, params, { timeoutMs: 10000 });
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.invoices)
        ? data.invoices
        : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.data)
        ? data.data
        : [];
      if (list.length) return list.map(normalizeInvoice);
    } catch {
      /* keep trying next combo */
    }
  }
  return [];
}

async function markPaid(tenantId, invoiceId) {
  return tryPost(
    [
      `/admin/tenants/${tenantId}/invoices/${invoiceId}/pay`,
      `/system/tenants/${tenantId}/invoices/${invoiceId}/pay`,
      `/admin/invoices/${invoiceId}/pay`,
      `/org/admin/invoices/${invoiceId}/pay`,
      `/billing/invoices/${invoiceId}/pay`,
    ],
    {},
    {},
    { timeoutMs: 9000 }
  );
}

async function resendInvoice(tenantId, invoiceId) {
  return tryPost(
    [
      `/admin/tenants/${tenantId}/invoices/${invoiceId}/send`,
      `/admin/tenants/${tenantId}/invoices/${invoiceId}/resend`,
      `/system/tenants/${tenantId}/invoices/${invoiceId}/send`,
      `/admin/invoices/${invoiceId}/send`,
    ],
    {},
    {},
    { timeoutMs: 9000 }
  );
}

async function syncTenantInvoices(tenantId) {
  return tryPost(
    [
      `/admin/tenants/${tenantId}/invoices/sync`,
      `/billing/tenants/${tenantId}/invoices/sync`,
      `/system/tenants/${tenantId}/invoices/sync`,
    ],
    {},
    {},
    { timeoutMs: 12000 }
  );
}

async function createInvoice(tenantId, payload) {
  // Normalized: amountCents preferred, currency optional, dueDate/note optional
  const body = {
    amountCents:
      payload.amountCents ??
      (typeof payload.amount === "number"
        ? Math.round(payload.amount * 100)
        : undefined),
    currency: payload.currency || "USD",
    dueDate: payload.dueDate || undefined,
    note: payload.note || undefined,
  };
  return tryPost(
    [
      `/admin/tenants/${tenantId}/invoices`,
      `/system/tenants/${tenantId}/invoices`,
      `/org/admin/tenants/${tenantId}/invoices`,
      `/admin/invoices?tenantId=${encodeURIComponent(tenantId)}`,
    ],
    body,
    {},
    { timeoutMs: 10000 }
  );
}

/* -------------------------------------------
   UI
-------------------------------------------- */
export default function TenantBilling() {
  const { tenantId } = useParams();
  const [invoices, setInvoices] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [busy, setBusy] = useState(false);

  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState({
    amount: "",
    currency: "USD",
    dueDate: "",
    note: "",
  });

  const { add: toast, View: Toasts } = useToasts();

  const load = async () => {
    setStatus("loading");
    setErr("");
    try {
      const list = await fetchInvoices(tenantId, { q, status: statusFilter });
      setInvoices(list);
      setStatus("ready");
    } catch (e) {
      setStatus("error");
      setErr(e?.response?.data?.error || e.message || "Failed to load invoices");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const totals = useMemo(() => {
    const curSet = new Set(invoices.map((i) => i.currency || "USD"));
    const isMulti = curSet.size > 1;
    const openStatuses = new Set(["open", "unpaid", "past_due", "due", "draft"]);
    let open = 0,
      paid = 0,
      count = invoices.length;
    invoices.forEach((i) => {
      if (i.status === "paid") paid += i.amount || 0;
      else if (openStatuses.has(i.status)) open += i.amount || 0;
    });
    return { count, open, paid, currency: isMulti ? "multi" : [...curSet][0] || "USD" };
  }, [invoices]);

  const onMarkPaid = async (id) => {
    setBusy(true);
    try {
      await markPaid(tenantId, id);
      toast("Invoice marked as paid");
      await load();
    } catch (e) {
      toast(e?.response?.data?.error || e.message || "Failed to mark as paid", "error");
    } finally {
      setBusy(false);
    }
  };

  const onResend = async (id) => {
    setBusy(true);
    try {
      await resendInvoice(tenantId, id);
      toast("Invoice sent");
    } catch (e) {
      toast(e?.response?.data?.error || e.message || "Failed to send invoice", "error");
    } finally {
      setBusy(false);
    }
  };

  const onSync = async () => {
    setBusy(true);
    try {
      await syncTenantInvoices(tenantId);
      toast("Sync started");
      await load();
    } catch (e) {
      toast(e?.response?.data?.error || e.message || "Sync failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const onCreate = async (e) => {
    e?.preventDefault?.();
    const amountNum = Number(draft.amount);
    if (!amountNum || amountNum <= 0) {
      toast("Enter a valid amount", "error");
      return;
    }
    setBusy(true);
    try {
      await createInvoice(tenantId, {
        amount: amountNum,
        currency: (draft.currency || "USD").toUpperCase(),
        dueDate: draft.dueDate || undefined,
        note: draft.note || undefined,
      });
      toast("Invoice created");
      setShowNew(false);
      setDraft({ amount: "", currency: "USD", dueDate: "", note: "" });
      await load();
    } catch (e) {
      toast(e?.response?.data?.error || e.message || "Create failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const onApplyFilters = async () => {
    await load();
  };

  if (status === "loading") {
    return <div className="p-4 text-sm text-slate-500 dark:text-slate-400">Loading…</div>;
  }
  if (status === "error") {
    return (
      <div className="p-4 text-sm text-rose-600 dark:text-rose-400">
        Error: {err}
        <div className="mt-3">
          <button onClick={load} className="ms-btn h-9 px-3">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="ms-card p-4 space-y-4">
      <Toasts />

      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Billing &amp; Invoices
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onSync}
            disabled={busy}
            className="h-9 px-3 rounded border bg-white dark:bg-slate-900 dark:border-slate-700 flex items-center gap-2"
            title="Trigger invoice sync"
          >
            <FiRefreshCw /> Sync
          </button>
          <button
            onClick={() => setShowNew((v) => !v)}
            className="h-9 px-3 rounded bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
          >
            <FiPlus /> New invoice
          </button>
          <button
            onClick={load}
            className="ms-btn h-9 px-3 flex items-center gap-2"
            title="Refresh"
          >
            <FiRefreshCw /> Refresh
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="text-xs text-slate-600 dark:text-slate-400">
        <span className="mr-4">Invoices: <b>{totals.count}</b></span>
        <span className="mr-4">
          Open balance:{" "}
          <b>
            {totals.currency === "multi"
              ? "—"
              : totals.open.toLocaleString(undefined, {
                  style: "currency",
                  currency: totals.currency || "USD",
                })}
          </b>
        </span>
        <span>
          Paid total:{" "}
          <b>
            {totals.currency === "multi"
              ? "—"
              : totals.paid.toLocaleString(undefined, {
                  style: "currency",
                  currency: totals.currency || "USD",
                })}
          </b>
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <FiSearch className="absolute left-2 top-[10px] text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search number…"
            className="pl-8 pr-3 py-2 border rounded-md w-64 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-2 py-2 border rounded-md bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
        >
          <option value="">All statuses</option>
          <option value="open">open</option>
          <option value="unpaid">unpaid</option>
          <option value="past_due">past_due</option>
          <option value="paid">paid</option>
          <option value="void">void</option>
          <option value="draft">draft</option>
        </select>
        <button onClick={onApplyFilters} className="ms-btn h-9 px-3">Apply</button>
      </div>

      {/* New invoice form */}
      {showNew && (
        <form onSubmit={onCreate} className="border rounded-xl p-3 bg-white/50 dark:bg-slate-900/50">
          <div className="font-medium mb-2">Create invoice</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
            <label className="block">
              <div className="text-xs text-slate-500 mb-1">Amount</div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={draft.amount}
                onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                className="w-full border rounded px-2 py-2 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                placeholder="e.g., 49.99"
                required
              />
            </label>
            <label className="block">
              <div className="text-xs text-slate-500 mb-1">Currency</div>
              <input
                value={draft.currency}
                onChange={(e) => setDraft({ ...draft, currency: e.target.value.toUpperCase() })}
                className="w-full border rounded px-2 py-2 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                placeholder="USD"
              />
            </label>
            <label className="block">
              <div className="text-xs text-slate-500 mb-1">Due date</div>
              <input
                type="date"
                value={draft.dueDate}
                onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
                className="w-full border rounded px-2 py-2 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
              />
            </label>
            <label className="block lg:col-span-1 sm:col-span-2">
              <div className="text-xs text-slate-500 mb-1">Note (optional)</div>
              <input
                value={draft.note}
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                className="w-full border rounded px-2 py-2 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                placeholder="Description"
              />
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="h-9 px-3 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowNew(false)}
              className="h-9 px-3 rounded ms-btn"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Invoices table */}
      {invoices.length === 0 ? (
        <div className="text-sm text-slate-500 dark:text-slate-400">No invoices yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Number</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Due</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr
                  key={inv.id || inv.number}
                  className="border-top border-slate-200 dark:border-slate-800"
                >
                  <td className="py-2 pr-4">
                    {inv.date ? String(inv.date).slice(0, 10) : "—"}
                  </td>
                  <td className="py-2 pr-4">{inv.number}</td>
                  <td className="py-2 pr-4">
                    {Number(inv.amount || 0).toLocaleString(undefined, {
                      style: "currency",
                      currency: inv.currency || "USD",
                    })}
                  </td>
                  <td className="py-2 pr-4">
                    {inv.due ? String(inv.due).slice(0, 10) : "—"}
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className={`text-xs px-2 py-0.5 rounded capitalize ${
                        inv.status === "paid"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : inv.status === "past_due"
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                          : inv.status === "open" || inv.status === "unpaid"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {inv.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex flex-wrap gap-2 items-center">
                      {inv.pdfUrl ? (
                        <a
                          href={inv.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="h-8 px-3 rounded border bg-white dark:bg-slate-900 dark:border-slate-700 inline-flex items-center gap-2"
                          title="Download PDF"
                        >
                          <FiDownload /> PDF
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">No PDF</span>
                      )}
                      <button
                        onClick={() => onResend(inv.id)}
                        disabled={busy}
                        className="h-8 px-3 rounded border bg-white dark:bg-slate-900 dark:border-slate-700 inline-flex items-center gap-2 disabled:opacity-60"
                        title="Resend invoice"
                      >
                        <FiSend /> Send
                      </button>
                      {(inv.status || "open") !== "paid" ? (
                        <button
                          onClick={() => onMarkPaid(inv.id)}
                          disabled={busy}
                          className="h-8 px-3 rounded bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-2 disabled:opacity-60"
                        >
                          <FiCheck /> Mark paid
                        </button>
                      ) : (
                        <span className="text-slate-500 text-xs">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div>
        <button onClick={load} className="ms-btn h-9 px-3 flex items-center gap-2">
          <FiRefreshCw /> Refresh
        </button>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Visible to system administrators/owners. Endpoints are tried in a tolerant order
        and requests include per-attempt timeouts so the UI remains responsive.
      </p>
    </div>
  );
}
