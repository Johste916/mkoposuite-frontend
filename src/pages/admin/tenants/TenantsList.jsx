/*  ----------  TenantsList.jsx  ---------- */
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../../api";

const withTimeout = (ms=9000)=>{const c=new AbortController();const t=setTimeout(()=>c.abort("timeout"),ms);return{signal:c.signal,done:()=>clearTimeout(t)}};

async function tryGet(paths, opts) {
  let lastErr = null;
  for (const p of paths) {
    const t = withTimeout();
    try {
      const res = await api.get(p, { ...(opts||{}), signal: t.signal });
      t.done();
      return res?.data ?? null;
    } catch (e) { t.done(); lastErr = e; }
  }
  if (lastErr) throw lastErr;
  return null;
}

const norm = (t={}) => ({
  id: t.id ?? t.tenantId ?? t._id ?? t.uuid ?? null,
  name: t.name ?? t.tenantName ?? t.company ?? "—",
  plan: (t.planCode ?? t.plan_code ?? t.plan?.code ?? "basic").toString().toLowerCase(),
  status: (t.status ?? t.subscription?.status ?? "active").toString().toLowerCase(),
  created: t.createdAt ?? t.created_at ?? "",
  code: t.code ?? t.slug ?? "",
});

export default function TenantsList() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const load = async () => {
    setStatus("loading");
    setErr("");
    try {
      const data = await tryGet(
        ["/admin/tenants","/system/tenants","/org/admin/tenants","/tenants/all"],
        {}
      );

      let list = Array.isArray(data?.tenants) ? data.tenants : Array.isArray(data) ? data : [];
      if (!list.length) {
        // fallback to self org
        const self = await tryGet(
          ["/tenants/me","/account/tenant","/org/me","/organization"],
          {}
        ).catch(()=>null);
        list = self ? [self] : [];
      }

      setRows(list.map(norm));
      setStatus("ready");
    } catch (e) {
      setStatus("error");
      setErr(e?.response?.data?.error || e.message || "Failed to load tenants");
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      [r.name, r.code, r.plan, r.status]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
    );
  }, [rows, q]);

  return (
    <div className="ms-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Tenants</h2>
        <button onClick={load} className="ms-btn h-9 px-3">Refresh</button>
      </div>

      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, code, plan, status…"
          className="w-80 border rounded px-3 py-2 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
        />
      </div>

      {status === "loading" && (
        <div className="text-sm text-slate-500 dark:text-slate-400">Loading…</div>
      )}
      {status === "error" && (
        <div className="text-sm text-rose-600 dark:text-rose-400">Error: {err}</div>
      )}

      {status === "ready" && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Code</th>
                <th className="py-2 pr-4">Plan</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Created</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const created = t.created ? String(t.created).slice(0,10) : "-";
                return (
                  <tr key={t.id || t.code || t.name} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="py-2 pr-4">{t.name}</td>
                    <td className="py-2 pr-4">{t.code || "-"}</td>
                    <td className="py-2 pr-4 capitalize">{t.plan}</td>
                    <td className="py-2 pr-4">{t.status || "-"}</td>
                    <td className="py-2 pr-4">{created}</td>
                    <td className="py-2 pr-4 flex gap-2">
                      <Link to={String(t.id)} className="text-blue-600 hover:underline">View</Link>
                      <button onClick={() => navigate(`${t.id}/edit`)} className="text-slate-700 dark:text-slate-300 hover:underline">Edit</button>
                      <Link to={`${t.id}/billing`} className="text-slate-700 dark:text-slate-300 hover:underline">Billing</Link>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500 dark:text-slate-400">
                    No tenants found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
