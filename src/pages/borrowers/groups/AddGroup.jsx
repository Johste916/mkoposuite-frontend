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
  return arr.map(b => ({
    id: b.id ?? b._id ?? b.branchId ?? b.code ?? String(b.name || "branch"),
    name: b.name ?? b.title ?? b.label ?? String(b.code || "—"),
  }));
}
function toUsers(raw) {
  const arr = Array.isArray(raw) ? raw : raw?.items || raw?.rows || raw?.data || [];
  return arr.map(u => ({
    id: u.id ?? u._id ?? u.userId ?? String(u.email || u.phone || "user"),
    name:
      u.name ||
      [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
      u.username || u.email || u.phone || "—",
    roles: (u.roles || u.Roles || []).map(r => (r.name || r.code || "").toString().toLowerCase()),
    title: (u.title || u.jobTitle || "").toString().toLowerCase(),
  }));
}
function isLoanOfficer(u) {
  const hay = [...(u.roles || []), u.title || ""].join(" ");
  return /loan.*officer|credit.*officer|field.*officer/i.test(hay);
}

const MEETING_DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

const AddGroup = () => {
  const [form, setForm] = useState({
    name: "",
    branchId: "",
    meetingDay: "",
    officerId: "",
    notes: "",
  });

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
        const data = await tryGET(
          [
            ...apiVariants("branches"),
            ...apiVariants("org/branches"),
          ],
          { signal: ac.signal }
        );
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
          [
            ...apiVariants("users?role=loan_officer"),
            ...apiVariants("admin/staff?role=loan_officer"),
            ...apiVariants("users"),
            ...apiVariants("admin/staff"),
          ],
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

  const branchOptions = useMemo(
    () => branches.map((b) => ({ value: String(b.id), label: b.name || String(b.id) })), [branches]
  );
  const officerOptions = useMemo(
    () => officers.map((u) => ({ value: String(u.id), label: u.name || String(u.id) })), [officers]
  );

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
      await tryPOST(
        [
          ...apiVariants("borrowers/groups"),
          ...apiVariants("groups"),
          ...apiVariants("borrower-groups"),
        ],
        payload
      );
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
    <div className="p-4 max-w-2xl bg-[var(--bg)] text-[var(--fg)]">
      <h1 className="text-2xl font-semibold mb-4">Add Group</h1>
      <form onSubmit={handleSubmit} className="card p-4 space-y-4">
        <div>
          <label className="block text-xs muted mb-1">Name</label>
          <input
            name="name"
            value={form.name}
            onChange={onChange}
            required
            className="input"
            placeholder="Group name"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs muted mb-1">Branch</label>
            <select
              name="branchId"
              value={form.branchId}
              onChange={onChange}
              className="input"
              disabled={loadingBranches || !branchOptions.length}
            >
              <option value="">{loadingBranches ? "Loading…" : "(Select branch)"}</option>
              {branchOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs muted mb-1">Loan Officer</label>
            <select
              name="officerId"
              value={form.officerId}
              onChange={onChange}
              className="input"
              disabled={loadingOfficers || !officerOptions.length}
            >
              <option value="">{loadingOfficers ? "Loading…" : "(None yet)"}</option>
              {officerOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs muted mb-1">Meeting Day</label>
            <select
              name="meetingDay"
              value={form.meetingDay}
              onChange={onChange}
              className="input"
            >
              <option value="">(None)</option>
              {MEETING_DAYS.map((d) => <option key={d} value={d}>{d[0].toUpperCase()+d.slice(1)}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs muted mb-1">Notes</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={onChange}
            className="input"
            rows={3}
            placeholder="Optional notes about this group"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Create Group"}
          </button>
          {msg && <div className="text-sm">{msg}</div>}
        </div>
      </form>
    </div>
  );
};

export default AddGroup;
