// src/pages/borrowers/groups/AddGroup.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api";
import BorrowerAutoComplete from "../../../components/inputs/BorrowerAutoComplete";

/* ---------- tenant + headers ---------- */
const getEffectiveTenantId = () =>
  (typeof api.getTenantId === "function" ? api.getTenantId() : null) ||
  localStorage.getItem("activeTenantId") ||
  null;
const NULL_TENANT = "00000000-0000-0000-0000-000000000000";
const isValidTenant = (t) => !!t && t !== NULL_TENANT && t !== "null" && t !== "undefined";
const withTenant = (tenantId) => (tenantId ? { headers: { "x-tenant-id": tenantId } } : {});

/* ---------- robust path variants ---------- */
function apiVariants(p) {
  const core = (p || "").replace(/^\/+/, "");
  return Array.from(new Set([`/${core}`, `/api/${core}`, `/api/v1/${core}`, `/v1/${core}`]));
}

/* ---------- tiny HTTP helpers ---------- */
async function tryGET(paths = [], opts = {}) {
  let lastErr;
  for (const p of paths) {
    try {
      const res = await api.get(p, opts);
      return res?.data;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("No endpoint succeeded");
}
async function tryPOST(paths = [], body = {}, opts = {}) {
  let lastErr;
  for (const p of paths) {
    try {
      const res = await api.post(p, body, opts);
      return res?.data;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("No endpoint succeeded");
}

/* ---------- normalizers ---------- */
function toBranches(raw) {
  const arr = Array.isArray(raw) ? raw : raw?.items || raw?.rows || raw?.data || [];
  return arr.map((b) => ({
    id: b.id ?? b._id ?? b.branchId ?? b.code ?? String(b.name || "branch"),
    name: b.name ?? b.title ?? b.label ?? String(b.code || "—"),
  }));
}
function toUsers(raw) {
  const arr = Array.isArray(raw) ? raw : raw?.items || raw?.rows || raw?.data || raw?.results || [];
  return arr.map((u) => ({
    id: u.id ?? u._id ?? u.userId ?? u.uuid ?? String(u.email || u.phone || "user"),
    name:
      u.name ||
      [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
      u.username ||
      u.email ||
      u.phone ||
      "—",
    roles: (u.roles || u.Roles || []).map((r) => (r?.name || r?.code || "").toString().toLowerCase()),
    title: (u.title || u.jobTitle || "").toString().toLowerCase(),
  }));
}
const isLoanOfficer = (u) =>
  /loan.*officer|credit.*officer|field.*officer/i.test([...(u.roles || []), u.title || ""].join(" "));

const MEETING_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

/* ---------- UI tokens ---------- */
const ui = {
  container: "w-full px-4 md:px-6 lg:px-8 py-6 bg-[var(--bg)] text-[var(--fg)]",
  h1: "text-3xl font-extrabold tracking-tight mb-4",
  card: "rounded-2xl border-2 border-[var(--border-strong)] bg-[var(--card)] shadow p-4",
  label: "block text-xs uppercase tracking-wide text-[var(--muted)] mb-1 font-semibold",
  input:
    "h-10 w-full rounded-lg border-2 px-3 outline-none focus:ring-2 focus:ring-[var(--ring)] " +
    "bg-[var(--input-bg)] text-[var(--input-fg)] border-[var(--input-border)]",
  textarea:
    "w-full rounded-lg border-2 px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--ring)] " +
    "bg-[var(--input-bg)] text-[var(--input-fg)] border-[var(--input-border)]",
  primary:
    "inline-flex items-center rounded-lg bg-indigo-600 text-white px-4 py-2 font-semibold hover:bg-indigo-700 disabled:opacity-60 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
  btn: "inline-flex items-center rounded-lg border-2 border-[var(--border-strong)] px-3 py-2 hover:bg-[var(--kpi-bg)]",
  chip:
    "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--chip-soft)] text-[var(--fg)] ring-1 ring-[var(--border)]",
};

export default function AddGroup() {
  const rawTenant = useMemo(() => getEffectiveTenantId(), []);
  const tenantId = isValidTenant(rawTenant) ? rawTenant : null;
  const tenantOpts = withTenant(tenantId);

  const [form, setForm] = useState({
    name: "",
    branchId: "",
    meetingDay: "",
    loanOfficerId: "",
    notes: "",
  });

  const [branches, setBranches] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loadingOfficers, setLoadingOfficers] = useState(true);

  // staged members before create
  const [picked, setPicked] = useState(null);
  const [members, setMembers] = useState([]); // [{id,name,phone}]

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  /* branches */
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoadingBranches(true);
        const paths = [
          tenantId && `tenants/${tenantId}/branches`,
          "branches",
          "org/branches",
        ]
          .filter(Boolean)
          .flatMap(apiVariants);
        const data = await tryGET(paths, { ...tenantOpts, signal: ac.signal });
        setBranches(toBranches(data));
      } catch {
        setBranches([]);
      } finally {
        setLoadingBranches(false);
      }
    })();
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  /* officers */
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoadingOfficers(true);
        const paths = [
          tenantId && `tenants/${tenantId}/users?role=loan_officer`,
          "users?role=loan_officer",
          "users?role=officer",
          tenantId && `tenants/${tenantId}/users`,
          "users",
          "admin/staff?role=loan_officer",
          "admin/staff",
        ]
          .filter(Boolean)
          .flatMap(apiVariants);

        const raw = await tryGET(paths, { ...tenantOpts, signal: ac.signal });
        const all = toUsers(raw);
        const filtered = all.filter(isLoanOfficer);
        setOfficers(filtered.length ? filtered : all);
      } catch {
        setOfficers([]);
      } finally {
        setLoadingOfficers(false);
      }
    })();
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const branchOptions = useMemo(
    () => branches.map((b) => ({ value: String(b.id), label: b.name || String(b.id) })),
    [branches]
  );
  const officerOptions = useMemo(
    () => officers.map((u) => ({ value: String(u.id), label: u.name || String(u.id) })),
    [officers]
  );

  function addStagedMember() {
    if (!picked?.id) return;
    setMembers((prev) => {
      if (prev.some((m) => String(m.id) === String(picked.id))) return prev;
      return [...prev, picked];
    });
    setPicked(null);
  }
  function removeStagedMember(id) {
    setMembers((prev) => prev.filter((m) => String(m.id) !== String(id)));
  }

  // Try to pick the new group's id from create response
  function extractGroupId(r) {
    const g =
      r?.data ||
      r ||
      {};
    return (
      g.id ||
      g.groupId ||
      g._id ||
      g.uuid ||
      g.code ||
      g.slug ||
      (Array.isArray(g.items) && g.items[0]?.id) ||
      null
    );
  }

  async function addMembersToGroup(groupId) {
    if (!groupId || !members.length) return;

    const borrowerIds = members.map((m) => m.id);

    // 1) Try bulk endpoints
    const bulkBodies = [
      { borrowerIds },
      { members: borrowerIds },
      { memberIds: borrowerIds },
      { borrowers: borrowerIds },
      { items: borrowerIds },
    ];
    const bulkPaths = [
      ...apiVariants(`groups/${groupId}/members/bulk`),
      ...apiVariants(`borrowers/groups/${groupId}/members/bulk`),
      ...apiVariants(`loan-groups/${groupId}/members/bulk`),
      ...apiVariants(`groups/${groupId}/members/import`),
    ];
    for (const body of bulkBodies) {
      try {
        await tryPOST(bulkPaths, body, tenantOpts);
        return; // success
      } catch {
        // try next body
      }
    }

    // 2) Fallback: per-member POST
    const singlePaths = [
      ...apiVariants(`groups/${groupId}/members`),
      ...apiVariants(`borrowers/groups/${groupId}/members`),
      ...apiVariants(`loan-groups/${groupId}/members`),
    ];
    for (const id of borrowerIds) {
      try {
        await tryPOST(singlePaths, { borrowerId: id }, tenantOpts);
      } catch {
        // keep trying others; partial add is better than none
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const loanOfficerId = (form.loanOfficerId || "").trim() || null;

      // Include members in payload for APIs that accept it
      const memberIds = members.map((m) => m.id);
      const payload = {
        name: form.name.trim(),
        branchId: form.branchId?.trim() || null,
        meetingDay: form.meetingDay ? String(form.meetingDay).toLowerCase() : null,
        loanOfficerId,
        loan_officer_id: loanOfficerId,
        notes: form.notes || null,
        // possible accepted keys:
        members: memberIds,
        memberIds,
        borrowers: memberIds,
        groupMembers: memberIds,
      };

      const createPaths = [
        tenantId && `tenants/${tenantId}/groups`,
        "groups",
        "borrowers/groups",
        "borrower-groups",
      ]
        .filter(Boolean)
        .flatMap(apiVariants);

      const created = await tryPOST(createPaths, payload, tenantOpts);
      const newGroupId = extractGroupId(created);

      // If backend ignored members in create payload, push them now
      await addMembersToGroup(newGroupId);

      setMsg("✅ Group created.");
      setForm({ name: "", branchId: "", meetingDay: "", loanOfficerId: "", notes: "" });
      setMembers([]);
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
            <input
              name="name"
              value={form.name}
              onChange={onChange}
              required
              className={ui.input}
              placeholder="Group name"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className={ui.label}>Branch</label>
              <select
                name="branchId"
                value={form.branchId}
                onChange={onChange}
                className={ui.input}
                disabled={loadingBranches || !branchOptions.length}
              >
                <option value="">{loadingBranches ? "Loading…" : "(Select branch)"}</option>
                {branchOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={ui.label}>Loan Officer</label>
              <select
                name="loanOfficerId"
                value={form.loanOfficerId}
                onChange={onChange}
                className={ui.input}
                disabled={loadingOfficers || !officerOptions.length}
              >
                <option value="">{loadingOfficers ? "Loading…" : "(None yet)"}</option>
                {officerOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={ui.label}>Meeting Day</label>
              <select
                name="meetingDay"
                value={form.meetingDay}
                onChange={onChange}
                className={ui.input}
              >
                <option value="">(None)</option>
                {MEETING_DAYS.map((d) => (
                  <option key={d} value={d}>
                    {d[0].toUpperCase() + d.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stage Members (new) */}
          <div>
            <label className={ui.label}>Add Members (optional)</label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <BorrowerAutoComplete
                  value={picked}
                  onChange={(_id, b) => setPicked(b)}
                  placeholder="Search borrower…"
                />
              </div>
              <button type="button" className={ui.btn} onClick={addStagedMember}>
                Add
              </button>
            </div>
            {members.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {members.map((m) => (
                  <span className={ui.chip} key={m.id}>
                    {m.name || m.id}
                    <button
                      type="button"
                      className="ml-2 underline"
                      onClick={() => removeStagedMember(m.id)}
                    >
                      remove
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className={ui.label}>Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={onChange}
              rows={3}
              className={ui.textarea}
              placeholder="Optional notes about this group"
            />
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
}
