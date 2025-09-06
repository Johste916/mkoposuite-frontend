import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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

export default function TenantBilling() {
  const { tenantId } = useParams();
  const [invoices, setInvoices] = useState([]);
  const [status, setStatus] = useState("loading");
  const [err, setErr] = useState("");

  const load = async () => {
    setStatus("loading");
    setErr("");
    try {
      const inv = await tryGet(
        [
          `/admin/tenants/${tenantId}/invoices`,
          `/system/tenants/${tenantId}/invoices`,
          `/org/admin/tenants/${tenantId}/invoices`,
          // sometimes it’s under a generic invoices endpoint with query
          `/admin/invoices?tenantId=${tenantId}`,
        ],
        {}
      ).catch(() => []);

      const list = Array.isArray(inv) ? inv : Array.isArray(inv?.invoices) ? inv.invoices : [];
      setInvoices(list);
      setStatus("ready");
    } catch (e) {
      setStatus("error");
      setErr(e?.response?.data?.error || e.message || "Failed to load invoices");
    }
  };

  useEffect(() => { load(); }, [tenantId]);

  const markPaid = async (invoiceId) => {
    try {
      await tryPost(
        [
          `/admin/tenants/${tenantId}/invoices/${invoiceId}/pay`,
          `/system/tenants/${tenantId}/invoices/${invoiceId}/pay`,
          `/admin/invoices/${invoiceId}/pay`,
          `/org/admin/invoices/${invoiceId}/pay`,
        ],
        {},
        {}
      );
      await load();
    } catch (e) {
      alert(e?.response?.data?.error || e.message || "Failed to mark as paid");
    }
  };

  if (status === "loading") {
    return <div className="p-4 text-sm text-slate-500 dark:text-slate-400">Loading…</div>;
  }
  if (status === "error") {
    return <div className="p-4 text-sm text-rose-600 dark:text-rose-400">Error: {err}</div>;
  }

  return (
    <div className="ms-card p-4 space-y-4">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Billing & Invoices</h2>
      {invoices.length === 0 ? (
        <div className="text-sm text-slate-500 dark:text-slate-400">No invoices yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-2 pr-4">Number</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Due</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id || inv.number} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="py-2 pr-4">{inv.number || inv.id}</td>
                  <td className="py-2 pr-4">
                    {Number((inv.amount_cents ?? inv.amountCents ?? 0) / 100).toLocaleString(undefined, {
                      style: "currency",
                      currency: inv.currency || "USD",
                    })}
                  </td>
                  <td className="py-2 pr-4">{(inv.due_date || inv.dueDate) ? String(inv.due_date || inv.dueDate).slice(0,10) : "-"}</td>
                  <td className="py-2 pr-4">{inv.status || "open"}</td>
                  <td className="py-2 pr-4">
                    {(inv.status || "open") !== "paid" ? (
                      <button onClick={() => markPaid(inv.id)} className="h-8 px-3 rounded bg-emerald-600 text-white hover:bg-emerald-700">
                        Mark paid
                      </button>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div>
        <button onClick={load} className="ms-btn h-9 px-3">Refresh</button>
      </div>
    </div>
  );
}
