/*  ----------  TenantDetail.jsx  ---------- */
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../../api";

const ALL_KEYS = [
  'savings.view','accounting.view','payroll.view','collateral.view',
  'loans.view','sms.send','investors.view','collections.view',
  'esign.view','assets.view','reports.view'
];

export default function TenantDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [patching, setPatching] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    setMsg("");
    try {
      const res = await api.get(`/admin/tenants/${id}`).catch(async () => {
        const alt = await api.get(`/system/tenants/${id}`).catch(()=>null);
        return alt;
      });
      setData(res?.data || null);
    } catch (e) {
      setMsg(e?.response?.data?.error || e.message);
    }
  }
  useEffect(() => { load(); }, [id]); // eslint-disable-line

  async function saveBasics() {
    setPatching(true);
    setMsg("");
    try {
      const t = data.tenant || data; // tolerate both shapes
      await api.patch(`/admin/tenants/${id}`, {
        name: t.name,
        status: t.status,
        planCode: t.plan_code || t.plan?.code || t.planCode,
        trialEndsAt: t.trial_ends_at || t.trialEndsAt,
        graceDays: t.grace_days ?? t.graceDays,
        autoDisableOverdue: t.auto_disable_overdue ?? t.autoDisableOverdue,
        billingEmail: t.billing_email ?? t.billingEmail,
      }).catch(() => api.patch(`/system/tenants/${id}`, {
        name: t.name,
        status: t.status,
        planCode: t.plan_code || t.plan?.code || t.planCode,
        trialEndsAt: t.trial_ends_at || t.trialEndsAt,
        graceDays: t.grace_days ?? t.graceDays,
        autoDisableOverdue: t.auto_disable_overdue ?? t.autoDisableOverdue,
        billingEmail: t.billing_email ?? t.billingEmail,
      }));
      await load();
      setMsg("Saved.");
    } catch (e) {
      setMsg(e?.response?.data?.error || e.message);
    } finally { setPatching(false); }
  }

  async function setOverride(key, enabled) {
    setMsg("");
    try {
      await api.post(`/admin/tenants/${id}/entitlements`, { key, enabled })
        .catch(()=>api.post(`/system/tenants/${id}/entitlements`, { key, enabled }));
      await load();
    } catch (e) {
      setMsg(e?.response?.data?.error || e.message);
    }
  }

  async function clearOverride(key) {
    setMsg("");
    try {
      await api.delete(`/admin/tenants/${id}/entitlements/${encodeURIComponent(key)}`)
        .catch(()=>api.delete(`/system/tenants/${id}/entitlements/${encodeURIComponent(key)}`));
      await load();
    } catch (e) {
      setMsg(e?.response?.data?.error || e.message);
    }
  }

  async function createInvoice() {
    const amountCents = Number(prompt("Amount in cents (e.g., 5000 for $50)"));
    if (!amountCents) return;
    try {
      await api.post(`/admin/tenants/${id}/invoices`, { amountCents })
        .catch(()=>api.post(`/system/tenants/${id}/invoices`, { amountCents }));
      await load();
    } catch (e) {
      setMsg(e?.response?.data?.error || e.message);
    }
  }

  async function markPaid(invId) {
    try {
      await api.post(`/admin/tenants/${id}/invoices/${invId}/pay`)
        .catch(()=>api.post(`/system/tenants/${id}/invoices/${invId}/pay`));
      await load();
    } catch (e) {
      setMsg(e?.response?.data?.error || e.message);
    }
  }

  async function impersonate() {
    try {
      const { data: { token } } = await api.post(`/admin/tenants/${id}/impersonate`)
        .catch(()=>api.post(`/system/tenants/${id}/impersonate`));
      window.open(`/?token=${encodeURIComponent(token)}`, '_blank', 'noopener');
    } catch (e) {
      setMsg(e?.response?.data?.error || e.message);
    }
  }

  if (!data) return <div className="p-4 text-sm text-slate-500">Loading… {msg && <span className="text-rose-600 ml-2">{msg}</span>}</div>;

  const { tenant: t = data, plan, modules = {}, overrides = {}, invoices = [] } = data;

  return (
    <div className="ms-card p-4 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t.name}</h2>
          {t.id && <div className="text-xs text-slate-500">ID: {t.id}</div>}
          {t.slug && <div className="text-xs text-slate-500">Slug: {t.slug}</div>}
        </div>
        <div className="flex gap-2">
          <button onClick={impersonate} className="h-9 px-3 rounded bg-indigo-600 text-white">Impersonate</button>
          <button onClick={load} className="h-9 px-3 rounded ms-btn">Refresh</button>
        </div>
      </div>

      {msg && <div className="text-sm text-rose-600">{msg}</div>}

      {/* Basics */}
      <div className="grid md:grid-cols-2 gap-4 text-sm">
        <label>
          <div className="text-xs text-slate-500 mb-1">Status</div>
          <select value={t.status || 'active'} onChange={e=>setData({...data, tenant:{...t, status:e.target.value}})} className="border rounded px-2 py-2 w-full">
            <option value="trial">trial</option>
            <option value="trialing">trialing</option>
            <option value="active">active</option>
            <option value="past_due">past_due</option>
            <option value="suspended">suspended</option>
          </select>
        </label>
        <label>
          <div className="text-xs text-slate-500 mb-1">Plan</div>
          <select value={t.plan_code || plan?.code || t.planCode || 'basic'} onChange={e=>setData({...data, tenant:{...t, plan_code:e.target.value, planCode:e.target.value}})} className="border rounded px-2 py-2 w-full">
            <option value="basic">Basic</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
            <option value="premium">Premium</option>
          </select>
        </label>
        <label>
          <div className="text-xs text-slate-500 mb-1">Trial ends</div>
          <input type="date" value={t.trial_ends_at || t.trialEndsAt || ''} onChange={e=>setData({...data, tenant:{...t, trial_ends_at:e.target.value, trialEndsAt:e.target.value}})} className="border rounded px-2 py-2 w-full"/>
        </label>
        <label>
          <div className="text-xs text-slate-500 mb-1">Grace days</div>
          <input type="number" value={t.grace_days ?? t.graceDays ?? 7} min={0} max={90} onChange={e=>setData({...data, tenant:{...t, grace_days:Number(e.target.value||0), graceDays:Number(e.target.value||0)}})} className="border rounded px-2 py-2 w-full"/>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={!!(t.auto_disable_overdue ?? t.autoDisableOverdue)} onChange={e=>setData({...data, tenant:{...t, auto_disable_overdue:e.target.checked, autoDisableOverdue:e.target.checked}})} />
          <span>Auto suspend overdue</span>
        </label>
        <label className="md:col-span-2">
          <div className="text-xs text-slate-500 mb-1">Billing email</div>
          <input type="email" value={t.billing_email || t.billingEmail || ''} onChange={e=>setData({...data, tenant:{...t, billing_email:e.target.value, billingEmail:e.target.value}})} className="border rounded px-2 py-2 w-full"/>
        </label>
      </div>

      <div className="flex gap-2">
        <button disabled={patching} onClick={saveBasics} className="h-9 px-3 rounded bg-blue-600 text-white">{patching?'Saving…':'Save basics'}</button>
      </div>

      {/* Entitlements */}
      <div className="border-t pt-4">
        <h3 className="font-semibold mb-2">Entitlements</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
          {ALL_KEYS.map((key) => {
            const label = key.replace('.view','').replace('.',' ').replace('_',' ');
            const map = { 'savings.view':'savings','accounting.view':'accounting','payroll.view':'payroll','collateral.view':'collateral','loans.view':'loans','sms.send':'sms','investors.view':'investors','collections.view':'collections','esign.view':'esignatures','assets.view':'assets','reports.view':'reports' };
            const modEnabled = modules ? !!modules[map[key]] : false;
            const overridden = overrides && Object.prototype.hasOwnProperty.call(overrides, key);
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="w-44 capitalize">{label}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${modEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  {modEnabled ? 'enabled' : 'disabled'}
                </span>
                <div className="ml-2 flex gap-1">
                  <button className="h-7 px-2 rounded ms-btn" onClick={() => setOverride(key, true)}>Enable</button>
                  <button className="h-7 px-2 rounded ms-btn" onClick={() => setOverride(key, false)}>Disable</button>
                  {overridden && <button className="h-7 px-2 rounded ms-btn" onClick={() => clearOverride(key)}>Clear</button>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoices */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold mb-2">Invoices</h3>
          <button className="h-9 px-3 rounded ms-btn" onClick={createInvoice}>New invoice</button>
        </div>
        {(!invoices || invoices.length===0) ? (
          <div className="text-sm text-slate-500">No invoices.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Number</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Due</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-t">
                    <td className="py-2 pr-4">{inv.number || inv.id}</td>
                    <td className="py-2 pr-4">
                      {(Number(inv.amount_cents||inv.total_cents||0) / 100).toLocaleString(undefined, { style: "currency", currency: inv.currency || "USD" })}
                    </td>
                    <td className="py-2 pr-4">{inv.due_date ? String(inv.due_date).slice(0,10) : '-'}</td>
                    <td className="py-2 pr-4">{inv.status}</td>
                    <td className="py-2 pr-4">
                      {inv.status !== 'paid' && (
                        <button className="h-7 px-2 rounded bg-emerald-600 text-white" onClick={() => markPaid(inv.id)}>Mark paid</button>
                      )}
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
