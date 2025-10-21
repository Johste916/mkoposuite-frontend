// src/pages/groups/GroupDetails.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../../../api";
import BorrowerAutoComplete from "../../../components/inputs/BorrowerAutoComplete";

/* ---------------- shared utils ---------------- */
const withTenant = (tenantId) =>
  tenantId ? { headers: { "x-tenant-id": tenantId } } : {};
const effectiveTenantId = (explicitTenant) =>
  explicitTenant || (typeof api.getTenantId === "function" ? api.getTenantId() : null);
const NULL_TENANT = "00000000-0000-0000-0000-000000000000";
const isValidTenant = (t) => !!t && t !== NULL_TENANT && t !== "null" && t !== "undefined";

/* ---------------- resilient HTTP helpers (try absolute + baseURL variants) ---------------- */
function computeRoots() {
  // Try to discover the axios baseURL if present
  const raw = api?.defaults?.baseURL || api?.baseURL || "";
  const roots = new Set();

  if (raw) {
    const trimmed = raw.replace(/\/+$/, "/");
    roots.add(trimmed); // e.g. https://host/api/ or https://host/api/v1/
    // Strip trailing /api or /api/vX if present
    const noApi = trimmed.replace(/\/api(?:\/v\d+)?\/$/i, "/");
    roots.add(noApi); // e.g. https://host/
  }

  return Array.from(roots);
}

function buildUrlsForCore(corePath) {
  const core = corePath.replace(/^\//, ""); // officers, v1/officers, etc.
  const roots = computeRoots();

  // If no baseURL known, also try relative origins
  if (roots.length === 0 && typeof window !== "undefined") {
    const origin = window.location.origin.replace(/\/+$/, "/");
    roots.push(origin);
  }

  const urls = new Set();

  for (const r of roots) {
    const root = r.replace(/\/+$/, "/"); // ensure trailing slash
    urls.add(`${root}${core}`);                   // https://host/officers
    urls.add(`${root}api/${core}`);               // https://host/api/officers
    urls.add(`${root}api/v1/${core}`);            // https://host/api/v1/officers
    urls.add(`${root}v1/${core}`);                // https://host/v1/officers
  }

  // Also add relative fallbacks (in case proxying is used)
  urls.add(`/${core}`);
  urls.add(`/api/${core}`);
  urls.add(`/api/v1/${core}`);
  urls.add(`/v1/${core}`);

  return Array.from(urls);
}

async function runFirst(fns) {
  let lastErr;
  for (const fn of fns) {
    try {
      const res = await fn();
      return res?.data ?? res;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("No endpoint succeeded");
}

function makeCallFactories(method, paths = [], body, opts) {
  const fns = [];
  for (const p of paths) {
    if (!p) continue;
    // Normalize to "core" (no leading slash, no hard-coded /api)
    let core = p.startsWith("/") ? p.slice(1) : p;
    core = core.replace(/^api\/v\d+\//i, "").replace(/^api\//i, "").replace(/^v\d+\//i, "");
    const urls = buildUrlsForCore(core);
    for (const url of urls) {
      fns.push(() => {
        if (method === "get" || method === "delete") {
          return api[method](url, opts);
        }
        return api[method](url, body, opts);
      });
    }
  }
  return fns;
}

async function tryGET(paths = [], opts = {}) {
  return runFirst(makeCallFactories("get", paths, undefined, opts));
}
async function tryPOST(paths = [], body = {}, opts = {}) {
  return runFirst(makeCallFactories("post", paths, body, opts));
}
async function tryPATCH(paths = [], body = {}, opts = {}) {
  // Some backends only support PUT or POST for updates
  const patchFns = makeCallFactories("patch", paths, body, opts);
  const putFns = makeCallFactories("put", paths, body, opts);
  const postFns = makeCallFactories("post", paths, body, opts);
  return runFirst([...patchFns, ...putFns, ...postFns]);
}
async function tryDELETE(paths = [], opts = {}) {
  return runFirst(makeCallFactories("delete", paths, undefined, opts));
}

const placeholderFrom = (status, okText, emptyText = "No options") =>
  status === "loading" ? "Loading…" : status === "error" ? "Failed to load — Retry" : status === "empty" ? emptyText : okText;

/* ---------------- normalizers ---------------- */
function normalizeMember(m) {
  return {
    id: m.id ?? m._id ?? m.borrowerId ?? m.memberId,
    name: m.name || `${m.firstName || ""} ${m.lastName || ""}`.trim() || m.fullName || m.id,
    phone: m.phone ?? m.msisdn ?? m.mobile,
    role: m.role || m.memberRole,
  };
}
function normalizeGroup(g) {
  if (!g || typeof g !== "object") return null;
  const members = Array.isArray(g.members) ? g.members : g.groupMembers || g.items || [];
  return {
    id: g.id ?? g._id ?? g.groupId ?? g.code,
    name: g.name ?? g.groupName ?? g.title ?? "—",
    branchId: g.branchId ?? g.branch_id ?? g.branch?.id ?? null,
    branchName: g.branchName ?? g.branch?.name ?? "—",
    loanOfficerId: g.loanOfficerId ?? g.loan_officer_id ?? g.officer?.id ?? null,
    officerName: g.officerName ?? g.officer?.name ?? "—",
    meetingDay: g.meetingDay ?? g.meeting?.day ?? "",
    status: g.status ?? "active",
    members: members.map(normalizeMember),
  };
}

/** very forgiving group fetcher (handles your 404s) */
async function fetchGroupFlexible(id, signal) {
  const enc = encodeURIComponent(id);

  // 1) Direct endpoints
  const direct = await tryGET(
    [
      `groups/${enc}`,
      `borrowers/groups/${enc}`,
      `loan-groups/${enc}`,
      `/groups/${enc}`,
      `/borrowers/groups/${enc}`,
      `/loan-groups/${enc}`,
    ],
    { signal }
  ).catch(() => null);
  if (direct) return normalizeGroup(direct?.data ?? direct);

  // 2) Query endpoints (id/groupId/code/name)
  const byQuery = await tryGET(
    [
      `groups?id=${enc}`, `groups?groupId=${enc}`, `groups?code=${enc}`, `groups?name=${enc}`,
      `borrowers/groups?id=${enc}`, `borrowers/groups?groupId=${enc}`, `borrowers/groups?code=${enc}`, `borrowers/groups?name=${enc}`,
      `loan-groups?id=${enc}`, `loan-groups?groupId=${enc}`, `loan-groups?code=${enc}`, `loan-groups?name=${enc}`,
    ],
    { signal }
  ).catch(() => null);
  if (byQuery) {
    const arr = Array.isArray(byQuery) ? byQuery : byQuery.items || byQuery.rows || byQuery.data || [];
    if (arr?.length) {
      const found =
        arr.find((g) =>
          [g.id, g._id, g.groupId, g.code, g.slug, g.uuid, g.name, g.groupName]
            .filter(Boolean).map(String).includes(String(id))
        ) || arr[0];
      if (found) return normalizeGroup(found);
    }
  }

  // 3) Plain list endpoints
  const list = await tryGET(
    [
      "groups?include=members", "groups",
      "borrowers/groups?include=members", "borrowers/groups",
      "loan-groups?include=members", "loan-groups",
      "/groups?include=members", "/groups",
      "/borrowers/groups?include=members", "/borrowers/groups",
      "/loan-groups?include=members", "/loan-groups",
    ],
    { signal }
  ).catch(() => null);

  if (list) {
    const arr = Array.isArray(list) ? list : list.items || list.rows || list.data || [];
    const found =
      arr.find((g) =>
        [g.id, g._id, g.groupId, g.code, g.slug, g.uuid, g.name, g.groupName]
          .filter(Boolean).map(String).includes(String(id))
      ) || null;
    if (found) return normalizeGroup(found);
  }
  return null;
}

/* ---------------- token UI ---------------- */
const ui = {
  container: "w-full px-4 md:px-6 lg:px-8 py-6 bg-[var(--bg)] text-[var(--fg)]",
  h1: "text-3xl font-extrabold tracking-tight",
  h1Muted: "font-medium text-[var(--muted)]",
  card: "rounded-2xl border-2 border-[var(--border-strong)] bg-[var(--card)] shadow",
  btn: "inline-flex items-center rounded-lg border-2 border-[var(--border-strong)] px-3 py-2 hover:bg-[var(--kpi-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
  primary: "inline-flex items-center rounded-lg bg-indigo-600 text-white px-4 py-2 font-semibold hover:bg-indigo-700 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
  input: "h-10 rounded-lg border-2 px-3 outline-none focus:ring-2 focus:ring-[var(--ring)] bg-[var(--input-bg)] text-[var(--input-fg)] border-[var(--input-border)]",
  tableWrap: "rounded-2xl border-2 border-[var(--border-strong)] bg-[var(--card)] shadow overflow-x-auto",
  th: "bg-[var(--kpi-bg)] text-left text-[13px] uppercase tracking-wide text-[var(--muted)] font-semibold px-3 py-2 border-2 border-[var(--border)]",
  td: "px-3 py-2 border-2 border-[var(--border)] text-sm",
  chip: "ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--chip-soft)] text-[var(--fg)] ring-1 ring-[var(--border)]",
  label: "text-[12px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1",
  muted: "text-[var(--muted)]",
};

const meetingDays = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const statusOptions = [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }];

export default function GroupDetails() {
  const { groupId } = useParams();
  const navigate = useNavigate();

  const rawTenant = useMemo(() => effectiveTenantId(), []);
  const tenantId = isValidTenant(rawTenant) ? rawTenant : null;

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", branchId: "", loanOfficerId: "", meetingDay: "", status: "active" });

  const [picked, setPicked] = useState(null);
  const [adding, setAdding] = useState(false);

  // options
  const [branches, setBranches] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [branchesStatus, setBranchesStatus] = useState("loading");
  const [officersStatus, setOfficersStatus] = useState("loading");
  const [reloadBranchesKey, setReloadBranchesKey] = useState(0);
  const [reloadOfficersKey, setReloadOfficersKey] = useState(0);

  const load = async (signal) => {
    try {
      setLoading(true);
      setError("");
      const data = await fetchGroupFlexible(groupId, signal);
      if (!data) {
        setError("Group not found.");
        setGroup(null);
      } else {
        setGroup(data);
        setForm({
          name: data.name || "",
          branchId: data.branchId || "",
          loanOfficerId: data.loanOfficerId || "",
          meetingDay: data.meetingDay || "",
          status: data.status || "active",
        });
      }
    } catch {
      setError("Failed to load group.");
      setGroup(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [groupId]);

  /* branches — lazy load only while editing */
  useEffect(() => {
    if (!editing) return;

    const t = tenantId;
    const candidatePaths = [
      t ? `tenants/${t}/branches` : null,
      "branches",
      "loan-branches",
      "/branches",
      "/loan-branches",
      "v1/branches",
      "v1/loan-branches",
      "/v1/branches",
      "/v1/loan-branches",
      // harmless alternates:
      "organization/branches",
      "org/branches",
      "/organization/branches",
      "/org/branches",
    ].filter(Boolean);

    let ignore = false;
    setBranchesStatus("loading");
    (async () => {
      try {
        const data = await tryGET(candidatePaths, withTenant(t));
        const arr = (Array.isArray(data) && data) || data?.items || data?.data || data?.rows || [];
        const mapped = (arr || []).map((br) => ({
          id: br.id ?? br.code ?? br.uuid ?? br.branchId ?? br.slug,
          name: br.name ?? br.branchName ?? br.title ?? (br.code ? String(br.code) : "—"),
        }));
        if (!ignore) {
          setBranches(mapped);
          setBranchesStatus(mapped.length ? "ok" : "empty");
        }
      } catch {
        if (!ignore) { setBranches([]); setBranchesStatus("error"); }
      }
    })();
    return () => { ignore = true; };
  }, [editing, tenantId, reloadBranchesKey]);

  /* officers — lazy load only while editing */
  useEffect(() => {
    if (!editing) return;

    const t = tenantId;
    const candidatePaths = [
      t ? `tenants/${t}/officers` : null,
      "officers",
      "loan-officers",
      "users?role=loan_officer",
      "users?role=officer",
      "/officers",
      "/loan-officers",
      "/users?role=loan_officer",
      "/users?role=officer",
      "v1/officers",
      "v1/users?role=officer",
      "/v1/officers",
      "/v1/users?role=officer",
      // harmless alternates:
      "employees?role=loan_officer",
      "staff?role=loan_officer",
      "/employees?role=loan_officer",
      "/staff?role=loan_officer",
    ].filter(Boolean);

    let ignore = false;
    setOfficersStatus("loading");
    (async () => {
      try {
        const data = await tryGET(candidatePaths, withTenant(t));
        const pickList = (d) =>
          (Array.isArray(d) && d) || d?.items || d?.data || d?.rows || d?.results || d?.officers || d?.users || [];
        const list = pickList(data);
        const mapped = (list || []).map((o) => ({
          id: o.loanOfficerId ?? o.id ?? o.userId ?? o.uuid ?? o.code ?? o.employeeId,
          name: o.name || o.fullName || [o.firstName, o.lastName].filter(Boolean).join(" ") || o.email || String(o.id ?? o.userId ?? ""),
        }));
        if (!ignore) {
          setOfficers(mapped);
          setOfficersStatus(mapped.length ? "ok" : "empty");
        }
      } catch {
        if (!ignore) { setOfficers([]); setOfficersStatus("error"); }
      }
    })();
    return () => { ignore = true; };
  }, [editing, tenantId, reloadOfficersKey]);

  /* Seed options from the loaded group when lists are empty */
  useEffect(() => {
    if (!editing) return;
    if (group?.branchId && !branches.length) {
      setBranches([{ id: group.branchId, name: group.branchName || String(group.branchId) }]);
      setBranchesStatus("ok");
    }
  }, [editing, group, branches.length]);

  useEffect(() => {
    if (!editing) return;
    if (group?.loanOfficerId && !officers.length) {
      setOfficers([{ id: group.loanOfficerId, name: group.officerName || String(group.loanOfficerId) }]);
      setOfficersStatus("ok");
    }
  }, [editing, group, officers.length]);

  const refresh = () => load();

  /* save edits */
  const save = async () => {
    setSaving(true);
    try {
      const body = {
        name: form.name || null,
        branchId: form.branchId || null,
        loanOfficerId: form.loanOfficerId || null,
        meetingDay: form.meetingDay || null,
        status: form.status || "active",
      };
      await tryPATCH(
        [
          `borrowers/groups/${groupId}`,
          `groups/${groupId}`,
          `loan-groups/${groupId}`,
          `/borrowers/groups/${groupId}`,
          `/groups/${groupId}`,
          `/loan-groups/${groupId}`,
        ],
        body,
        withTenant(tenantId)
      );
      await load();
      setEditing(false);
    } catch {
      alert("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  /* members */
  const addMember = async () => {
    if (!picked?.id) return;
    try {
      setAdding(true);
      await tryPOST(
        [
          `borrowers/groups/${groupId}/members`,
          `groups/${groupId}/members`,
          `loan-groups/${groupId}/members`,
          `/borrowers/groups/${groupId}/members`,
          `/groups/${groupId}/members`,
          `/loan-groups/${groupId}/members`,
        ],
        { borrowerId: picked.id },
        withTenant(tenantId)
      );
      setPicked(null);
      await load();
    } catch {
      alert("Failed to add member.");
    } finally {
      setAdding(false);
    }
  };

  const removeMember = async (borrowerId) => {
    try {
      await tryDELETE(
        [
          `borrowers/groups/${groupId}/members/${borrowerId}`,
          `groups/${groupId}/members/${borrowerId}`,
          `loan-groups/${groupId}/members/${borrowerId}`,
          `/borrowers/groups/${groupId}/members/${borrowerId}`,
          `/groups/${groupId}/members/${borrowerId}`,
          `/loan-groups/${groupId}/members/${borrowerId}`,
        ],
        withTenant(tenantId)
      );
      await load();
    } catch {
      alert("Failed to remove member.");
    }
  };

  /* CSV import/export */
  const fileRef = useRef(null);
  const onImportCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append("file", file);
      await tryPOST(
        [
          `borrowers/groups/${groupId}/members/import`,
          `groups/${groupId}/members/import`,
          `loan-groups/${groupId}/members/import`,
          `/borrowers/groups/${groupId}/members/import`,
          `/groups/${groupId}/members/import`,
          `/loan-groups/${groupId}/members/import`,
        ],
        fd,
        {
          ...withTenant(tenantId),
          headers: {
            ...(tenantId ? { "x-tenant-id": tenantId } : {}),
            "Content-Type": "multipart/form-data",
          },
        }
      );
      alert("Import complete");
      await load();
    } catch {
      alert("Failed to import CSV.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const exportCSV = () => {
    const rows = (group?.members || []).map((m) => ({
      borrowerId: m.id, name: m.name, phone: m.phone || "", role: m.role || "",
    }));
    const header = ["borrowerId", "name", "phone", "role"];
    const csv = [header.join(","), ...rows.map(r => header.map(h => `"${String(r[h] ?? "").replace(/"/g,'""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `group-${groupId}-members.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const members = Array.isArray(group?.members) ? group.members : [];
  const officerPlaceholder = placeholderFrom(officersStatus, "Select loan officer…", "No officers");
  const branchPlaceholder  = placeholderFrom(branchesStatus, "Select branch…", "No branches");

  return (
    <div className={ui.container}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h1 className={ui.h1}>
          Group #{groupId}
          {group?.name ? <span className={`ml-2 ${ui.h1Muted}`}>• {group.name}</span> : null}
        </h1>
        <div className="flex gap-2">
          <button onClick={() => load()} className={ui.btn}>Refresh</button>
          {!editing ? (
            <button onClick={() => setEditing(true)} className={ui.primary}>Edit</button>
          ) : (
            <>
              <button disabled={saving} onClick={save} className={ui.primary}>{saving ? "Saving…" : "Save Changes"}</button>
              <button onClick={() => { setEditing(false); setForm({
                name: group?.name || "", branchId: group?.branchId || "", loanOfficerId: group?.loanOfficerId || "", meetingDay: group?.meetingDay || "", status: group?.status || "active",
              }); }} className={ui.btn}>Cancel</button>
            </>
          )}
        </div>
      </div>

      {loading && <div className={`${ui.card} px-4 py-3`}>Loading…</div>}
      {error && (
        <div className="rounded-2xl border-2 px-4 py-3" style={{ borderColor: "var(--danger-border)", background: "var(--danger-bg)", color: "var(--danger-fg)" }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <section className={`${ui.card} p-4`}>
            <h3 className="mb-3 text-lg font-semibold">{editing ? "Edit Group" : "Overview"}</h3>
            {!editing ? (
              <ul className="space-y-1 text-[15px]">
                <li><b>Name:</b> {group?.name ?? "—"}</li>
                <li><b>Branch:</b> {group?.branchName ?? "—"}</li>
                <li><b>Officer:</b> {group?.officerName ?? "—"}</li>
                <li><b>Meeting Day:</b> {group?.meetingDay || "—"}</li>
                <li><b>Status:</b> {group?.status || "active"}</li>
              </ul>
            ) : (
              <div className="grid gap-3">
                <Field label="Name">
                  <input className={ui.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </Field>

                <Field label="Branch">
                  <div className="flex gap-2">
                    <select className={ui.input} value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
                      <option value="">{branchPlaceholder}</option>
                      {branches.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.id})</option>)}
                    </select>
                    {branchesStatus === "error" && <button type="button" className={ui.btn} onClick={() => setReloadBranchesKey(k => k + 1)}>Retry</button>}
                  </div>
                </Field>

                <Field label="Loan Officer">
                  <div className="flex gap-2">
                    <select className={ui.input} value={form.loanOfficerId} onChange={(e) => setForm({ ...form, loanOfficerId: e.target.value })}>
                      <option value="">{officerPlaceholder}</option>
                      {officers.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                    {officersStatus === "error" && <button type="button" className={ui.btn} onClick={() => setReloadOfficersKey(k => k + 1)}>Retry</button>}
                  </div>
                </Field>

                <Field label="Meeting Day">
                  <select className={ui.input} value={form.meetingDay} onChange={(e) => setForm({ ...form, meetingDay: e.target.value })}>
                    {meetingDays.map((d) => <option key={d || "_"} value={d}>{d || "—"}</option>)}
                  </select>
                </Field>

                <Field label="Status">
                  <select className={ui.input} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
              </div>
            )}
          </section>

          <section className={`${ui.card} p-4 lg:col-span-2`}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Members</h3>
              <div className="flex items-center gap-2">
                <label className={ui.btn}>
                  Import CSV
                  <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onImportCSV} />
                </label>
                <button className={ui.btn} onClick={exportCSV}>Export CSV</button>
              </div>
            </div>

            <div className="mb-4 flex items-center gap-2">
              <div className="flex-1">
                <BorrowerAutoComplete value={picked} onChange={(_id, b) => setPicked(b)} placeholder="Add borrower…" />
              </div>
              <button onClick={addMember} disabled={!picked || adding} className={ui.primary}>
                {adding ? "Adding…" : "Add"}
              </button>
            </div>

            <div className={ui.tableWrap}>
              <table className="min-w-full table-auto">
                <thead>
                  <tr>
                    <th className={ui.th}>Borrower</th>
                    <th className={ui.th}>Phone</th>
                    <th className={ui.th}>Role</th>
                    <th className={ui.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(members) ? members : []).length === 0 ? (
                    <tr><td className={ui.td} colSpan={4}><span className={ui.muted}>No members yet.</span></td></tr>
                  ) : (
                    members.map((m) => (
                      <tr key={m.id}>
                        <td className={ui.td}>
                          <Link to={`/borrowers/${encodeURIComponent(m.id)}`} className="font-semibold underline decoration-2 underline-offset-2 hover:opacity-90 text-[var(--fg)]">
                            {m.name}
                          </Link>
                        </td>
                        <td className={ui.td}>{m.phone || "—"}</td>
                        <td className={ui.td}>{m.role ? <span className={ui.chip}>{String(m.role).toUpperCase()}</span> : "—"}</td>
                        <td className={ui.td}>
                          <button className={ui.btn} onClick={() => removeMember(m.id)}>Remove</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="min-w-0">
      <div className={ui.label}>{label}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
