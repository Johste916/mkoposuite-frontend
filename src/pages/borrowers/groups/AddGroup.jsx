import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api";

const API_BASE = "/api/borrowers";
const MEETING_DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

function toBranches(raw) {
  const arr = Array.isArray(raw) ? raw : raw?.items || raw?.rows || raw?.data || [];
  return arr.map((b) => ({
    id: String(b.id ?? b._id ?? b.branchId ?? b.code ?? b.name ?? "branch"),
    name: b.name ?? b.title ?? b.label ?? String(b.code || "—"),
  }));
}
function toUsers(raw) {
  const arr = Array.isArray(raw) ? raw : raw?.items || raw?.rows || raw?.data || [];
  return arr.map((u) => ({
    id: String(u.id ?? u._id ?? u.userId ?? u.email ?? u.phone ?? "user"),
    name:
      u.name ||
      [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
      u.username || u.email || u.phone || "—",
    roles: (u.roles || u.Roles || []).map((r) => (r.name || r.code || "").toString().toLowerCase()),
    title: (u.title || u.jobTitle || "").toString().toLowerCase(),
  }));
}
const isLoanOfficer = (u) => /loan.*officer|credit.*officer|field.*officer/i.test(
  [...(u.roles || []), u.title || ""].join(" ")
);

const AddGroup = () => {
  const [form, setForm] = useState({ name: "", branchId: "", meetingDay: "", officerId: "", notes: "" });
  const [branches, setBranches] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loadingOfficers, setLoadingOfficers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  // branches
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoadingBranches(true);
        const { data } = await api.get("/api/branches", { signal: ac.signal });
        setBranches(toBranches(data));
      } catch { setBranches([]); }
      finally { setLoadingBranches(false); }
    })();
    return () => ac.abort();
  }, []);

  // officers
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoadingOfficers(true);
        let raw;
        try {
          raw = (await api.get("/api/users?role=loan-officer", { signal: ac.signal })).data;
        } catch {
          raw = (await api.get("/api/users", { signal: ac.signal })).data;
        }
        const all = toUsers(raw);
        const filtered = all.filter(isLoanOfficer);
        setOfficers(filtered.length ? filtered : all);
      } catch { setOfficers([]); }
      finally { setLoadingOfficers(false); }
    })();
    return () => ac.abort();
  }, []);

  const branchOptions = useMemo(() => branches.map((b) => ({ value: b.id, label: b.name || b.id })), [branches]);
  const officerOptions = useMemo(() => officers.map((u) => ({ value: u.id, label: u.name || u.id })), [officers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const payload = {
        name: form.name.trim(),
        branchId: form.branchId || null,
        meetingDay: form.meetingDay ? form.meetingDay.toLowerCase() : null, // ENUM-safe
        officerId: form.officerId || null,
        notes: form.notes || null,
      };
      await api.post(`${API_BASE}/groups`, payload);
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
    <div className="p-4 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-4">Add Group</h1>

      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded-xl border shadow">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Name</label>
          <input
            name="name"
            value={form.name}
            onChange={onChange}
            required
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Group name"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Branch</label>
            <select
              name="branchId"
              value={form.branchId}
              onChange={onChange}
              className="w-full border rounded-lg px-3 py-2 bg-white"
              disabled={loadingBranches || !branchOptions.length}
            >
              <option value="">{loadingBranches ? "Loading…" : "(Select branch)"}</option>
              {branchOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Loan Officer</label>
            <select
              name="officerId"
              value={form.officerId}
              onChange={onChange}
              className="w-full border rounded-lg px-3 py-2 bg-white"
              disabled={loadingOfficers || !officerOptions.length}
            >
              <option value="">{loadingOfficers ? "Loading…" : "(None yet)"}</option>
              {officerOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Meeting Day</label>
            <select
              name="meetingDay"
              value={form.meetingDay}
              onChange={onChange}
              className="w-full border rounded-lg px-3 py-2 bg-white"
            >
              <option value="">(None)</option>
              {MEETING_DAYS.map((d) => (
                <option key={d} value={d}>{d[0].toUpperCase() + d.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Notes</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={onChange}
            className="w-full border rounded-lg px-3 py-2"
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
