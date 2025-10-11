import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api";

/* ---------------- Small UI bits ---------------- */
const BADGE = {
  slate:   "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-100",
  blue:    "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-100",
  indigo:  "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-100",
  emerald: "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100",
  teal:    "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-100",
  violet:  "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-100",
  amber:   "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-100",
};
const Badge = ({ tone = "slate", children }) => <span className={BADGE[tone] || BADGE.slate}>{children}</span>;
const tones = { auth:"blue", users:"indigo", loans:"emerald", repayments:"teal", permissions:"violet", system:"slate" };
const toneFor = (c) => tones[c] || "slate";

/* ---------------- Component ---------------- */
export default function AuditManagement() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [filters, setFilters] = useState({ category:"", action:"", from:"", to:"" });
  const [live, setLive] = useState(false);
  const evtRef = useRef(null);
  const [diffRow, setDiffRow] = useState(null);

  const normalize = (p) => (Array.isArray(p) ? p : (p?.items || []));

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const listRes = await api.get("/admin/audit", { params: { ...filters, q, limit: 300 } });
      const sumRes  = await api.get("/admin/audit/summary");
      setRows(normalize(listRes.data));
      setTotal(listRes.data?.total ?? normalize(listRes.data).length ?? 0);
      setSummary(sumRes.data || null);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || "Failed to load audits");
      setRows([]); setTotal(0); setSummary(null);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const id = setTimeout(() => { if (!loading) load(); }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, filters.category, filters.action, filters.from, filters.to]);

  // Live tail (SSE)
  useEffect(() => {
    if (!live) { evtRef.current?.close?.(); return; }
    const base = (api.defaults.baseURL || "").replace(/\/$/, "");
    const es = new EventSource(`${base}/admin/audit/stream`);
    evtRef.current = es;

    const push = (items) => setRows(prev => [...items, ...prev].slice(0, 500));

    es.addEventListener("init", (ev) => {
      try { const data = JSON.parse(ev.data); push(data.items || []); } catch {}
    });
    es.addEventListener("append", (ev) => {
      try { const data = JSON.parse(ev.data); push(data.items || []); } catch {}
    });
    es.addEventListener("audit", (ev) => { // legacy single-row event name
      try { const row = JSON.parse(ev.data); push([row]); } catch {}
    });
    es.onerror = () => {};
    return () => es.close();
  }, [live]);

  // Enhance rows: derive user/branch labels and decode diff info from message JSON (if any)
  const enhanced = useMemo(() => {
    const list = normalize(rows);
    return list.map(r => {
      const userName   = r?.User?.name || r?.user?.name || r.userName || r.userEmail || r.userId || "-";
      const branchName = r?.Branch?.name || r.branchName || r.branchId || "-";

      let before, after, meta;
      try {
        const m = typeof r.message === "string" ? JSON.parse(r.message) : r.message;
        if (m && typeof m === "object") {
          before = m.before ?? m.prev ?? undefined;
          after  = m.after  ?? m.next ?? undefined;
          meta   = m.meta   ?? undefined;
        }
      } catch { /* ignore non-JSON messages */ }

      return { ...r, userName, branchName, before, after, meta };
    });
  }, [rows]);

  const filtered = useMemo(() => {
    const term = q.toLowerCase().trim();
    if (!term) return enhanced;
    return enhanced.filter((r) =>
      [r.userName, r.branchName, r.category, r.action, r.message, r.entity, r.entityId]
        .some(v => String(v || "").toLowerCase().includes(term))
    );
  }, [enhanced, q]);

  const exportCsv = () => {
    const header = ["time","branch","staff","category","action","message","ip"];
    const lines = filtered.map(r => [
      new Date(r.createdAt || Date.now()).toISOString(),
      r.branchName || "",
      r.userName || "",
      r.category || "",
      r.action || "",
      (typeof r.message === "string" ? r.message : JSON.stringify(r.message || "")).replace(/"/g,'""'),
      r.ip || ""
    ].map(v => `"${String(v)}"`).join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "audit.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const Card = ({ label, value }) => (
    <div className="rounded-2xl border p-3 bg-white dark:bg-slate-900">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );

  const Row = ({ r }) => (
    <tr className="border-b last:border-0">
      <td className="py-2 pr-3 whitespace-nowrap">{new Date(r.createdAt || Date.now()).toLocaleString()}</td>
      <td className="py-2 pr-3">{r.branchName || "-"}</td>
      <td className="py-2 pr-3">{r.userName || "-"}</td>
      <td className="py-2 pr-3"><Badge tone={toneFor(r.category)}>{r.category || "—"}</Badge></td>
      <td className="py-2 pr-3"><Badge tone="amber">{r.action || "—"}</Badge></td>
      <td className="py-2 pr-3">{r.entity ? <span className="opacity-80">{r.entity}</span> : "—"} {r.entityId ? <span className="opacity-60">#{r.entityId}</span> : ""}</td>
      <td className="py-2 pr-3">
        {(() => {
          try {
            const m = typeof r.message === "string" ? JSON.parse(r.message) : r.message;
            if (m && typeof m === "object") {
              if (m?.meta?.method && m?.meta?.path) return `${m.meta.method} ${m.meta.path}`;
              if (m?.body) {
                const s = JSON.stringify(m.body);
                return s.length > 120 ? s.slice(0,120) + "…" : s;
              }
            }
            return typeof r.message === "string" ? r.message : JSON.stringify(r.message || "-");
          } catch { return r.message || "-"; }
        })()}
      </td>
      <td className="py-2 pr-3">{r.ip || "-"}</td>
      <td className="py-2 pr-3">
        {(r.before || r.after || r.meta) ? (
          <button className="px-2 py-1 rounded border bg-white hover:bg-slate-50 dark:bg-slate-900"
                  onClick={() => setDiffRow(r)}>View</button>
        ) : <span className="opacity-50">—</span>}
      </td>
    </tr>
  );

  return (
    <div className="space-y-4">
      <header className="bg-white dark:bg-slate-900 border rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Audit Management</h1>
          <p className="text-sm text-slate-500">Live trail of sensitive changes across the system.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input className="rounded border px-3 py-2 text-sm w-56" value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search…" />
          <select className="rounded border px-2 py-2 text-sm" value={filters.category} onChange={e=>setFilters(s=>({...s,category:e.target.value}))}>
            <option value="">All categories</option>
            {['auth','users','loans','repayments','permissions','system'].map(c=> <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="rounded border px-2 py-2 text-sm" value={filters.action} onChange={e=>setFilters(s=>({...s,action:e.target.value}))}>
            <option value="">All actions</option>
            {['create','update','delete','login:success','login:failed'].map(a=> <option key={a} value={a}>{a}</option>)}
          </select>
          <input type="date" className="rounded border px-2 py-2 text-sm" value={filters.from} onChange={e=>setFilters(s=>({...s,from:e.target.value}))}/>
          <input type="date" className="rounded border px-2 py-2 text-sm" value={filters.to} onChange={e=>setFilters(s=>({...s,to:e.target.value}))}/>
          <button className="px-3 py-2 rounded-lg text-sm border bg-white hover:bg-slate-50" onClick={load}>Apply</button>
          <button className="px-3 py-2 rounded-lg text-sm border bg-white hover:bg-slate-50" onClick={exportCsv}>Export CSV</button>
          <label className="inline-flex items-center gap-2 text-sm ml-2">
            <input type="checkbox" checked={live} onChange={e=>setLive(e.target.checked)} />
            Live tail
          </label>
        </div>
      </header>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card label="Events (30d)" value={summary?.totals?.all ?? 0} />
        <Card label="Creates" value={summary?.totals?.create ?? 0} />
        <Card label="Updates" value={summary?.totals?.update ?? 0} />
        <Card label="Deletes" value={summary?.totals?.delete ?? 0} />
        <Card label="Logins (OK)" value={summary?.totals?.loginSuccess ?? 0} />
        <Card label="Logins (Failed)" value={summary?.totals?.loginFailed ?? 0} />
      </div>

      {err && <div className="text-sm text-rose-600">{err}</div>}

      <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4">
        {loading ? (
          <div className="text-sm text-slate-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-slate-500">No entries.</div>
        ) : (
          <>
            <div className="text-xs text-slate-500 mb-2">Showing {filtered.length} of {total} events</div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left">
                  <tr className="border-b">
                    <th className="py-2 pr-3">Time</th>
                    <th className="py-2 pr-3">Branch</th>
                    <th className="py-2 pr-3">Staff</th>
                    <th className="py-2 pr-3">Category</th>
                    <th className="py-2 pr-3">Action</th>
                    <th className="py-2 pr-3">Entity</th>
                    <th className="py-2 pr-3">Message</th>
                    <th className="py-2 pr-3">IP</th>
                    <th className="py-2 pr-3">Diff</th>
                  </tr>
                </thead>
                <tbody>{filtered.map(r => <Row key={r.id} r={r} />)}</tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Diff modal */}
      {diffRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={()=>setDiffRow(null)}>
          <div className="bg-white dark:bg-slate-900 border rounded-xl w-full max-w-4xl p-4" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Change details</h3>
              <button className="px-2 py-1 rounded border" onClick={()=>setDiffRow(null)}>✕</button>
            </div>
            <div className="grid md:grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-slate-500 mb-1">Before</div>
                <pre className="p-2 rounded border overflow-auto max-h-[50vh]">{JSON.stringify(diffRow.before ?? {}, null, 2)}</pre>
              </div>
              <div>
                <div className="text-slate-500 mb-1">After</div>
                <pre className="p-2 rounded border overflow-auto max-h-[50vh]">{JSON.stringify(diffRow.after ?? {}, null, 2)}</pre>
              </div>
            </div>
            {diffRow.meta && (
              <div className="mt-3">
                <div className="text-slate-500 mb-1 text-xs">Meta</div>
                <pre className="p-2 rounded border overflow-auto text-xs max-h-48">{JSON.stringify(diffRow.meta, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
