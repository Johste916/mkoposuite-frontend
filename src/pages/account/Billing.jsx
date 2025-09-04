import React, { useEffect, useState } from "react";
import api from "../../api";

export default function Billing() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    plan: "free",
    currency: "USD",
    status: "active",
    billingEmail: "",
    invoiceEmails: [],
    invoiceNotes: "",
    autoRenew: false,
    paymentProvider: "",
    paymentMethod: "",
    nextInvoiceDate: "",
  });

  const [invoices, setInvoices] = useState([]);

  const tryGet = async () => {
    try {
      const { data } = await api.get("/account/billing");
      return { settings: data?.settings || data };
    } catch {}
    try {
      const ov = await api.get("/billing/overview");
      const inv = await api.get("/billing/invoices").catch(() => ({ data: [] }));
      return { settings: ov.data || {}, invoices: inv.data || [] };
    } catch {}
    const any = await api.get("/billing");
    return { settings: any.data || {} };
  };

  const tryPut = async (payload) => {
    try { return await api.put("/account/billing", payload); } catch {}
    try { return await api.put("/billing/overview", payload); } catch {}
    try { return await api.put("/billing", payload); } catch {}
    try { return await api.post("/billing/overview", payload); } catch {}
    throw new Error("No billing endpoint available");
  };

  const load = async () => {
    setLoading(true); setErr(""); setMsg("");
    try {
      const data = await tryGet();
      const s = data?.settings || {};
      setForm({
        plan: s.plan || "free",
        currency: s.currency || "USD",
        status: s.status || "active",
        billingEmail: s.billingEmail || "",
        invoiceEmails: Array.isArray(s.invoiceEmails) ? s.invoiceEmails : [],
        invoiceNotes: s.invoiceNotes || "",
        autoRenew: !!s.autoRenew,
        paymentProvider: s.paymentProvider || "",
        paymentMethod: s.paymentMethod || "",
        nextInvoiceDate: s.nextInvoiceDate || "",
      });
      setInvoices(Array.isArray(data?.invoices) ? data.invoices : []);
    } catch (e) {
      setErr("Failed to load billing settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true); setErr(""); setMsg("");
    try {
      const payload = { ...form, invoiceEmails: form.invoiceEmails.filter(Boolean) };
      const { data } = await tryPut(payload);
      setMsg(data?.message || "Saved.");
      const s = data?.settings || data || {};
      setForm((prev) => ({ ...prev, ...s }));
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const onEmailsChange = (v) => set("invoiceEmails", v.split(",").map((x) => x.trim()).filter(Boolean));

  if (loading) return <div className="p-4 text-sm text-slate-500 dark:text-slate-400">Loading…</div>;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="ms-card p-4">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Billing</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your plan, invoices, and payment methods.</p>

        {msg && <div className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">{msg}</div>}
        {err && <div className="mt-3 text-sm text-rose-600 dark:text-rose-400">{err}</div>}

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-sm">
            <div className="mb-1">Plan</div>
            <select className="w-full border rounded px-2 py-2 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                    value={form.plan} onChange={(e) => set("plan", e.target.value)}>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </label>

          <label className="text-sm">
            <div className="mb-1">Currency</div>
            <input className="w-full border rounded px-3 py-2 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                   value={form.currency} onChange={(e) => set("currency", e.target.value)} />
          </label>

          <label className="text-sm">
            <div className="mb-1">Billing Email</div>
            <input className="w-full border rounded px-3 py-2 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                   value={form.billingEmail} onChange={(e) => set("billingEmail", e.target.value)} />
          </label>

          <label className="text-sm">
            <div className="mb-1">Invoice Emails (comma separated)</div>
            <input className="w-full border rounded px-3 py-2 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                   value={form.invoiceEmails.join(", ")} onChange={(e) => onEmailsChange(e.target.value)} />
          </label>

          <label className="text-sm sm:col-span-2">
            <div className="mb-1">Invoice Notes</div>
            <textarea className="w-full border rounded px-3 py-2 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                      rows={3}
                      value={form.invoiceNotes} onChange={(e) => set("invoiceNotes", e.target.value)} />
          </label>

          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4"
                   checked={form.autoRenew} onChange={(e) => set("autoRenew", e.target.checked)} />
            Auto Renew
          </label>

          <label className="text-sm">
            <div className="mb-1">Payment Provider</div>
            <input className="w-full border rounded px-3 py-2 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                   value={form.paymentProvider} onChange={(e) => set("paymentProvider", e.target.value)} />
          </label>

          <label className="text-sm">
            <div className="mb-1">Payment Method (masked)</div>
            <input className="w-full border rounded px-3 py-2 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                   value={form.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)} />
          </label>

          <label className="text-sm">
            <div className="mb-1">Next Invoice Date (ISO)</div>
            <input className="w-full border rounded px-3 py-2 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                   value={form.nextInvoiceDate || ""} onChange={(e) => set("nextInvoiceDate", e.target.value)} />
          </label>
        </div>

        <div className="mt-4">
          <button
            onClick={save}
            disabled={saving}
            className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Invoices (optional) */}
      {invoices.length > 0 && (
        <div className="ms-card p-4">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Invoices</h2>
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
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="py-2 pr-4">{inv.date || inv.createdAt || ""}</td>
                    <td className="py-2 pr-4">{inv.number || inv.invoiceNo || inv.id}</td>
                    <td className="py-2 pr-4">{inv.amountFormatted || inv.amount}</td>
                    <td className="py-2 pr-4">{inv.status}</td>
                    <td className="py-2">
                      {inv.pdfUrl ? (
                        <a href={inv.pdfUrl} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-300 underline">
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
        </div>
      )}
    </div>
  );
}
