// src/pages/groups/AddGroup.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api";

function apiVariants(p) {
  const clean = p.startsWith("/") ? p : `/${p}`;
  const noApi = clean.replace(/^\/api\//, "/");
  const withApi = noApi.startsWith("/api/") ? noApi : `/api${noApi}`;
  return Array.from(new Set([noApi, withApi]));
}
async function tryGET(paths = [], opts = {}) {
  let lastErr;
  for (const p of paths) {
    try { const res = await api.get(p, opts); return res?.data; }
    catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("No endpoint succeeded");
}
async function tryPOST(paths = [], body = {}, opts = {}) {
  let lastErr;
  for (const p of paths) {
    try { const res = await api.post(p, body, opts); return res?.data; }
    catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("No endpoint succeeded");
}
function toBranches(raw) {
  const arr = Array.isArray(raw) ? raw : raw?.items || raw?.rows || raw?.data || [];
  return arr.map(b => ({ id: b.id ?? b._id ?? b.branchId ?? b.code ?? String(b.name || "branch"), name: b.name ?? b.title ?? b.label ?? String(b.code || "—") }));
}
function toUsers(raw) {
  const arr = Array.isArray(raw) ? raw : raw?.items || raw?.rows || raw?.data || [];
  return arr.map(u => ({
    id: u.id ?? u._id ?? u.userId ?? String(u.email || u.phone || "user"),
    name: u.name || [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.username || u.email || u.phone || "—",
    roles: (u.roles || u.Roles || []).map(r => (r.name || r.code || "").toString().toLowerCase()),
    title: (u.title || u.jobTitle || "").toString().toLowerCase(),
  }));
}
function isLoanOfficer(u) {
  const hay = [...(u.roles || []), u.title || ""].join(" ");
  return /loan.*officer|credit.*officer|field.*officer/i.test(hay);
}

const MEETING_DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

const ui = {
  container: 'w-full px-4 md:px-6 lg:px-8 py-6 text-slate-900',
  h1: 'text-3xl font-extrabold tracking-tight mb-4',
  card: 'rounded-2xl border-2 border-slate-300 bg-white shadow p-4',
  label: 'block text-xs uppercase tracking-wide text-slate-600 mb-1 font-semibold',
  input: 'h-10 w-full rounded-lg border-2 border-slate-300 px-3 outline-none focus:ring-2 focus:ring-indigo-500/40',
  textarea: 'w-full rounded-lg border-2 border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/40',
  primary: 'inline-flex items-center rounded-lg bg-indigo-600 text-white px-4 py-2 font-semibold hover:bg-indigo-700 disabled:opacity-60',
};

const AddGroup = () => {
  const [form, setForm] = useState({ name: "", branchId: "", meetingDay: "", officerId: "", notes: "" });
  const [branches, setBranches] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loadingOfficers, setLoadingOfficers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoadingBranches(true);
        const data = await tryGET([...apiVariants("branches"), ...apiVariants("org/branches")], { signal: ac.signal });
        setBranches(toBranches(data));
      } catch { setBranches([]); }
      finally { setLoadingBranches(false); }
    })();
    return () => ac.abort();
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoadingOfficers(true);
        const raw = await tryGET(
          [...apiVariants("users?role=loan_officer"), ...apiVariants("admin/staff?role=loan_officer"), ...apiVariants("users"), ...apiVariants("admin/staff")],
          { signal: ac.signal }
        );
        const all = toUsers(raw);
        const filtered = all.filter(isLoanOfficer);
        setOfficers(filtered.length ? filtered : all);
      } catch { setOfficers([]); }
      finally { setLoadingOfficers(false); }
    })();
    return () => ac.abort();
  }, []);

  const branchOptions = useMemo(() => branches.map((b) => ({ value: String(b.id), label: b.name || String(b.id) })), [branches]);
  const officerOptions = useMemo(() => officers.map((u) => ({ value: String(u.id), label: u.name || String(u.id) })), [officers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const payload = {
        name: form.name.trim(),
        branchId: form.branchId?.trim() || null,
        meetingDay: form.meetingDay ? String(form.meetingDay).toLowerCase() : null,
        officerId: form.officerId?.trim() || null,
        notes: form.notes || null,
      };
      await tryPOST([...apiVariants("borrowers/groups"), ...apiVariants("groups"), ...apiVariants("borrower-groups")], payload);
      setMsg("✅ Group created.");
      setForm({ name: "", branchId: "", meetingDay: "", officerId: "", notes: "" });
    } catch (err) {
      const apiMsg = err?.response?.data?.error || err?.message || "Failed to create group.";
      setMsg(`❌ ${apiMsg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={ui.container}>
      <h1 className={ui.h1}>Add Group</h1>
      <form onSubmit={handleSubmit} className={ui.card}>
        <div className="space-y-4">
          <div>
            <label className={ui.label}>Name</label>
            <input name="name" value={form.name} onChange={onChange} required className={ui.input} placeholder="Group name" />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className={ui.label}>Branch</label>
              <select name="branchId" value={form.branchId} onChange={onChange} className={ui.input} disabled={loadingBranches || !branchOptions.length}>
                <option value="">{loadingBranches ? "Loading…" : "(Select branch)"}</option>
                {branchOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={ui.label}>Loan Officer</label>
              <select name="officerId" value={form.officerId} onChange={onChange} className={ui.input} disabled={loadingOfficers || !officerOptions.length}>
                <option value="">{loadingOfficers ? "Loading…" : "(None yet)"}</option>
                {officerOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={ui.label}>Meeting Day</label>
              <select name="meetingDay" value={form.meetingDay} onChange={onChange} className={ui.input}>
                <option value="">(None)</option>
                {MEETING_DAYS.map((d) => <option key={d} value={d}>{d[0].toUpperCase()+d.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={ui.label}>Notes</label>
            <textarea name="notes" value={form.notes} onChange={onChange} rows={3} className={ui.textarea} placeholder="Optional notes about this group" />
          </div>

          <div className="flex items-center gap-2">
            <button type="submit" disabled={saving} className={ui.primary}>
              {saving ? "Saving…" : "Create Group"}
            </button>
            {msg && <div className="text-sm">{msg}</div>}
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddGroup;
