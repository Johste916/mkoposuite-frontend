import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import api from "../../../api";
import BorrowerAutoComplete from "../../../components/inputs/BorrowerAutoComplete";

/* ---------------- shared utils ---------------- */
const withTenant = (tenantId) => (tenantId ? { headers: { "x-tenant-id": tenantId } } : {});
const effectiveTenantId = (explicitTenant) =>
  explicitTenant || (typeof api.getTenantId === "function" ? api.getTenantId() : null);
const NULL_TENANT = "00000000-0000-0000-0000-000000000000";
const isValidTenant = (t) => !!t && t !== NULL_TENANT && t !== "null" && t !== "undefined";

/* ---------------- per-tenant caches ---------------- */
const _tenantCache = { officers: new Map(), branches: new Map() };

/* ---------------- fast, resilient HTTP helpers ---------------- */
const ATTEMPT_TIMEOUT_MS = 1200;
const ROUND_SIZE = 3;

const ensureSlash = (s) => (s?.endsWith("/") ? s : `${s || ""}/`);
const rootHasApi = (r) => /\/api(?:\/v\d+)?\/$/i.test(r);
function computeRoots() {
  const raw = api?.defaults?.baseURL || api?.baseURL || "";
  const roots = new Set();
  if (raw) {
    const withSlash = ensureSlash(String(raw).trim());
    roots.add(withSlash); // e.g., https://host/api/
    const noApi = ensureSlash(withSlash.replace(/\/api(?:\/v\d+)?\/$/i, "/")); // e.g., https://host/
    roots.add(noApi);
  }
  return Array.from(roots);
}
function stripToCore(p) {
  if (!p) return null;
  let s = p.startsWith("/") ? p.slice(1) : p;
  s = s.replace(/^api\/v\d+\//i, "").replace(/^api\//i, "").replace(/^v\d+\//i, "");
  return s;
}
function buildUrlsForCore(corePath) {
  const core = stripToCore(corePath);
  if (!core) return [];
  const urls = new Set();
  const roots = computeRoots();

  for (const r of roots) {
    const root = ensureSlash(r);

    // Always: root + core
    urls.add(`${root}${core}`);

    // Only add prefixed variants when root itself isn't already /api/
    if (!rootHasApi(root)) {
      urls.add(`${root}api/${core}`);
      urls.add(`${root}api/v1/${core}`);
      urls.add(`${root}v1/${core}`);
    }
  }

  // Also try site-relative
  urls.add(`/${core}`);
  urls.add(`/api/${core}`);
  urls.add(`/api/v1/${core}`);
  urls.add(`/v1/${core}`);
  return Array.from(urls);
}
function factories(method, paths = [], body, opts) {
  const fns = [];
  for (const p of paths) {
    const core = stripToCore(p);
    if (!core) continue;
    for (const url of buildUrlsForCore(core)) {
      fns.push(() => {
        const localOpts = { timeout: ATTEMPT_TIMEOUT_MS, ...opts };
        return method === "get" || method === "delete"
          ? api[method](url, localOpts)
          : api[method](url, body, localOpts);
      });
    }
  }
  return dedupeByToString(fns);
}
function dedupeByToString(fns) {
  const seen = new Set();
  return fns.filter((fn) => {
    const key = fn.toString();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
async function raceRound(executors) {
  return Promise.any(
    executors.map(async (exec) => {
      const res = await exec();
      return res?.data ?? res;
    })
  );
}
async function raceFirst(executors, { roundSize = ROUND_SIZE } = {}) {
  let lastErr = null;
  for (let i = 0; i < executors.length; i += roundSize) {
    const slice = executors.slice(i, i + roundSize);
    try {
      return await raceRound(slice);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("No endpoint succeeded");
}
const tryGET = (paths = [], opts = {}) => raceFirst(factories("get", paths, undefined, opts));
const tryPOST = (paths = [], body = {}, opts = {}) => raceFirst(factories("post", paths, body, opts));
const tryPUT = (paths = [], body = {}, opts = {}) => raceFirst(factories("put", paths, body, opts));
const tryPATCH = (paths = [], body = {}, opts = {}) =>
  raceFirst([...factories("patch", paths, body, opts), ...factories("put", paths, body, opts), ...factories("post", paths, body, opts)]);
const tryDELETE = (paths = [], opts = {}) => raceFirst(factories("delete", paths, undefined, opts));

/* ---------------- optional env override for officers list ---------------- */
const OFFICERS_PATH = import.meta.env?.VITE_API_OFFICERS_PATH || null;

const placeholderFrom = (status, okText, emptyText = "No options") =>
  status === "loading" ? "Loading…" : status === "error" ? "Failed to load — Retry" : status === "empty" ? emptyText : okText;

/* ---------------- normalizers ---------------- */
function normalizeMember(m) {
  return {
    id: m.id ?? m._id ?? m.borrowerId ?? m.memberId,
    name: m.name || `${m.firstName || ""} ${m.lastName || ""}`.trim() || m.fullName || m.id,
    phone: m.phone ?? m.msisdn ?? m.mobile,
    role: m.role || m.memberRole,
    outstanding: m.outstanding ?? 0,
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
    loanOfficerId:
      g.loanOfficerId ?? g.loan_officer_id ?? g.officerId ?? g.officer_id ?? g.officer_user_id ?? g.officer?.id ?? null,
    officerName:
      g.officerName ?? g.loanOfficerName ?? g.officer_full_name ?? g.officer_fullname ?? g.officer?.name ?? "—",
    meetingDay: g.meetingDay ?? g.meeting_day ?? g.meeting?.day ?? "",
    status: g.status ?? "active",
    outstandingTotal: g.outstandingTotal ?? 0,
    members: members.map(normalizeMember),
  };
}

/* ---------------- small utils ---------------- */
const pickArray = (d) => (Array.isArray(d) ? d : d?.items || d?.rows || d?.data || d?.results || d?.groups || []);
function normalizeGroupLite(g) {
  if (!g || typeof g !== "object") return null;
  return { id: g.id ?? g._id ?? g.groupId ?? g.code ?? g.slug ?? g.uuid ?? null, name: g.name ?? g.groupName ?? g.title ?? g.code ?? "—" };
}
function apiVariantsLocal(p) {
  const core = (p || "").replace(/^\/+/, "");
  return Array.from(new Set([`/${core}`, `/api/${core}`, `/api/v1/${core}`, `/v1/${core}`]));
}

/* ---------------- borrower membership check ---------------- */
async function fetchBorrowerGroupsFlexible(borrowerId, tenantId, signal) {
  const enc = encodeURIComponent(borrowerId);
  const opts = { ...withTenant(tenantId), signal };
  const candidates = [
    ...apiVariantsLocal(`groups?memberId=${enc}`),
    ...apiVariantsLocal(`borrowers/${enc}/groups`),
    ...apiVariantsLocal(`group-memberships?borrowerId=${enc}`),
  ];
  try {
    const data = await tryGET(candidates, opts);
    const arr = pickArray(data) || [];
    const list = arr.map((x) => normalizeGroupLite(x.group || x)).filter(Boolean);
    const seen = new Set();
    return list.filter((g) => {
      const k = String(g.id || g.name);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  } catch {
    return [];
  }
}
async function ensureNotAssignedElsewhere(borrowerId, tenantId, { targetGroupId = null, signal } = {}) {
  const groups = await fetchBorrowerGroupsFlexible(borrowerId, tenantId, signal);
  const other = groups.find((g) => !targetGroupId || String(g.id) !== String(targetGroupId));
  if (other) {
    const gName = other.name ? `${other.name} (${other.id || "—"})` : other.id || "another group";
    const err = new Error(`Borrower #${borrowerId} already belongs to ${gName}.`);
    err.code = "BORROWER_ALREADY_ASSIGNED";
    throw err;
  }
}

/* ---------------- base-path discovery (favor /groups) ---------------- */
const _groupBaseCache = new Map(); // key: tenantId|__no_tenant__

async function discoverGroupBase(tenantId, signal) {
  const cacheKey = tenantId || "__no_tenant__";
  if (_groupBaseCache.has(cacheKey)) return _groupBaseCache.get(cacheKey);

  // Prefer /groups first on your backend
  const candidates = ["groups", "loan-groups", "borrowers/groups", "borrower-groups"];

  for (const base of candidates) {
    try {
      await tryGET(apiVariantsLocal(`${base}?limit=1`), withTenant(tenantId, signal));
      _groupBaseCache.set(cacheKey, base);
      return base;
    } catch {
      /* keep trying */
    }
  }
  _groupBaseCache.set(cacheKey, "groups");
  return "groups";
}

/** resolve officer name when only an ID is present */
async function resolveOfficerName(id, tenantId, signal) {
  if (!id) return null;
  const opts = { ...withTenant(tenantId), signal };

  const direct = await tryGET(
    [`officers/${id}`, `loan-officers/${id}`, `users/${id}`, `staff/${id}`, `employees/${id}`],
    opts
  ).catch(() => null);

  const pickName = (u) =>
    u?.name || u?.fullName || [u?.firstName, u?.lastName].filter(Boolean).join(" ").trim() || u?.email || u?.username || null;

  if (direct) return pickName(direct);

  const searched = await tryGET(
    [`users?id=${id}`, `users?userId=${id}`, `staff?id=${id}`, `officers?id=${id}`, `employees?id=${id}`],
    opts
  ).catch(() => null);

  if (searched) {
    const arr = Array.isArray(searched) ? searched : searched?.data || searched?.items || searched?.rows || [];
    const hit =
      arr?.find((u) => [u.id, u.userId, u.uuid, u.code, u.employeeId].map(String).includes(String(id))) || arr?.[0];
    return pickName(hit);
  }
  return null;
}

/** forgiving group fetcher (tenant-aware, with base hint) */
async function fetchGroupFlexible(id, tenantId, signal, baseHint) {
  const enc = encodeURIComponent(id);
  const opts = { ...withTenant(tenantId), signal };

  // Try hinted base first (if provided)
  if (baseHint) {
    try {
      const hit = await tryGET(apiVariantsLocal(`${baseHint}/${enc}`), opts);
      if (hit) return normalizeGroup(hit?.data ?? hit);
    } catch (e) {
      /* continue */
    }
  }

  const direct = await tryGET([`groups/${enc}`, `loan-groups/${enc}`, `borrowers/groups/${enc}`], opts).catch(() => null);
  if (direct) return normalizeGroup(direct?.data ?? direct);

  const byQuery = await tryGET(
    [
      `groups?id=${enc}`,
      `groups?groupId=${enc}`,
      `groups?code=${enc}`,
      `groups?name=${enc}`,
      `loan-groups?id=${enc}`,
      `loan-groups?code=${enc}`,
    ],
    opts
  ).catch(() => null);

  if (byQuery) {
    const arr = Array.isArray(byQuery) ? byQuery : byQuery.items || byQuery.rows || byQuery.data || [];
    if (arr?.length) {
      const found =
        arr.find((g) =>
          [g.id, g._id, g.groupId, g.code, g.slug, g.uuid, g.name, g.groupName]
            .filter(Boolean)
            .map(String)
            .includes(String(id))
        ) || arr[0];
      if (found) return normalizeGroup(found);
    }
  }
  return null;
}

/** add member (uses discovered base) */
async function postAddMemberFlexible(groupId, borrowerId, tenantId, baseHint) {
  const opts = withTenant(tenantId);

  const collectionBases = baseHint ? [baseHint] : ["groups", "loan-groups", "group-memberships"];
  const collectionPaths = collectionBases.flatMap((b) =>
    b === "group-memberships" ? [b] : [`${b}/${groupId}/members`, `${b}/${groupId}/borrowers`, `${b}/${groupId}/add-member`]
  );

  const bodies = [
    { borrowerId },
    { borrower_id: borrowerId },
    { borrower: borrowerId },
    { member: { borrowerId } },
    { member: { borrower_id: borrowerId } },
    { groupId: Number(groupId), borrowerId },
    { group_id: Number(groupId), borrower_id: borrowerId },
  ];
  for (const body of bodies) {
    try {
      await tryPOST(collectionPaths, body, opts);
      return;
    } catch {}
    try {
      await tryPUT(collectionPaths, body, opts);
      return;
    } catch {}
  }

  const memberBases = baseHint ? [baseHint] : ["groups", "loan-groups", "group-members"];
  const memberPaths = memberBases.flatMap((b) =>
    b === "group-members" ? [`${b}/${groupId}/${borrowerId}`] : [`${b}/${groupId}/members/${borrowerId}`, `${b}/${groupId}/borrowers/${borrowerId}`]
  );

  try {
    await tryPOST(memberPaths, {}, opts);
    return;
  } catch {}
  try {
    await tryPUT(memberPaths, {}, opts);
    return;
  } catch {}
  try {
    await tryPATCH(memberPaths, {}, opts);
    return;
  } catch (e) {
    const code = e?.response?.status;
    const msg =
      e?.response?.data?.error ||
      (code === 404
        ? "No membership endpoint exists on the server. Please add one of: POST /groups/:id/members, POST /group-members { groupId, borrowerId }, or PUT /groups/:id/members/:borrowerId."
        : "Failed to add member.");
    throw new Error(msg);
  }
}

/* ---------------- token UI ---------------- */
const ui = {
  container: "w-full px-4 md:px-6 lg:px-8 py-6 bg-[var(--bg)] text-[var(--fg)]",
  h1: "text-3xl font-extrabold tracking-tight",
  h1Muted: "font-medium text-[var(--muted)]",
  card: "rounded-2xl border-2 border-[var(--border-strong)] bg-[var(--card)] shadow",
  btn: "inline-flex items-center rounded-lg border-2 border-[var(--border-strong)] px-3 py-2 hover:bg-[var(--kpi-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
  primary:
    "inline-flex items-center rounded-lg bg-indigo-600 text-white px-4 py-2 font-semibold hover:bg-indigo-700 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
  input:
    "h-10 rounded-lg border-2 px-3 outline-none focus:ring-2 focus:ring-[var(--ring)] bg-[var(--input-bg)] text-[var(--input-fg)] border-[var(--input-border)]",
  tableWrap:
    "rounded-2xl border-2 border-[var(--border-strong)] bg-[var(--card)] shadow overflow-x-auto",
  th: "bg-[var(--kpi-bg)] text-left text-[13px] uppercase tracking-wide text-[var(--muted)] font-semibold px-3 py-2 border-2 border-[var(--border)]",
  td: "px-3 py-2 border-2 border-[var(--border)] text-sm",
  chip:
    "ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--chip-soft)] text-[var(--fg)] ring-1 ring-[var(--border)]",
  label: "text-[12px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1",
  muted: "text-[var(--muted)]",
};

const meetingDays = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export default function GroupDetails() {
  const { groupId } = useParams();
  const [searchParams] = useSearchParams();
  const tenantIdParam = searchParams.get("tenantId") || undefined;

  const rawTenant = useMemo(() => effectiveTenantId(tenantIdParam), [tenantIdParam]);
  const tenantId = isValidTenant(rawTenant) ? rawTenant : null;
  const tenantQuery = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    branchId: "",
    loanOfficerId: "",
    meetingDay: "",
    status: "active",
  });

  const [picked, setPicked] = useState(null);
  const [adding, setAdding] = useState(false);

  // options
  const [branches, setBranches] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [branchesStatus, setBranchesStatus] = useState("loading");
  const [officersStatus, setOfficersStatus] = useState("loading");
  const [reloadBranchesKey, setReloadBranchesKey] = useState(0);
  const [reloadOfficersKey, setReloadOfficersKey] = useState(0);

  // summary
  const [summary, setSummary] = useState({ outstandingTotal: 0, perBorrower: {} });

  // discovered base for this tenant (used for summary/members endpoints)
  const groupBaseRef = useRef("groups");

  const load = async (signal) => {
    try {
      setLoading(true);
      setError("");

      // Discover base first (now prefers /groups)
      const base = await discoverGroupBase(tenantId, signal);
      groupBaseRef.current = base;

      // Load group
      let data = await fetchGroupFlexible(groupId, tenantId, signal, base);

      if (!data) {
        setError("Group not found.");
        setGroup(null);
      } else {
        if (data.loanOfficerId && (!data.officerName || data.officerName === "—")) {
          const name = await resolveOfficerName(data.loanOfficerId, tenantId, signal).catch(() => null);
          if (name) data = { ...data, officerName: name };
        }
        setGroup(data);
        setForm({
          name: data.name || "",
          branchId: data.branchId || "",
          loanOfficerId: data.loanOfficerId || "",
          meetingDay: data.meetingDay || "",
          status: data.status || "active",
        });
      }

      // summary — use discovered base
      try {
        const s = await tryGET(apiVariantsLocal(`${groupBaseRef.current}/${groupId}/summary`), withTenant(tenantId));
        const per = s?.perBorrower || {};
        setSummary({ outstandingTotal: s?.outstandingTotal || 0, perBorrower: per });
      } catch {
        setSummary({ outstandingTotal: 0, perBorrower: {} });
      }
    } catch (e) {
      if (e?.name !== "CanceledError" && e?.code !== "ERR_CANCELED") {
        setError(e?.message || "Failed to load group.");
        setGroup(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const ac = new AbortController();
    if (!tenantId) {
      setLoading(false);
      setError("No tenant selected.");
      setGroup(null);
      return;
    }
    load(ac.signal);
    return () => ac.abort();
  }, [groupId, tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* branches */
  useEffect(() => {
    if (!editing) return;

    const t = tenantId;
    if (!t) {
      setBranchesStatus("error");
      return;
    }

    const cached = _tenantCache.branches.get(t);
    if (cached && reloadBranchesKey === 0) {
      setBranches(cached);
      setBranchesStatus(cached.length ? "ok" : "empty");
      return;
    }

    const candidatePaths = [t ? `tenants/${t}/branches` : null, "branches", "loan-branches"].filter(Boolean);

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
          if (mapped.length) _tenantCache.branches.set(t, mapped);
        }
      } catch {
        if (!ignore) {
          setBranches([]);
          setBranchesStatus("error");
        }
      }
    })();
    return () => {
      ignore = true;
    };
  }, [editing, tenantId, reloadBranchesKey]);

  /* officers */
  useEffect(() => {
    if (!editing) return;

    const t = tenantId;
    const cacheKey = t || "__no_tenant__";
    const cached = _tenantCache.officers.get(cacheKey);
    if (cached && cached.length && reloadOfficersKey === 0) {
      setOfficers(cached);
      setOfficersStatus("ok");
      return;
    }
    if (cached && !cached.length) _tenantCache.officers.delete(cacheKey);

    const candidatePaths = [
      t ? `tenants/${t}/officers` : null,
      OFFICERS_PATH,
      "loan-officers",
      "users?role=loan_officer",
      "users?role=officer",
      "admin/staff?role=loan_officer",
      "admin/staff",
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
          name:
            o.name ||
            o.fullName ||
            [o.firstName, o.lastName].filter(Boolean).join(" ") ||
            o.email ||
            String(o.id ?? o.userId ?? ""),
        }));
        if (!ignore) {
          setOfficers(mapped);
          setOfficersStatus(mapped.length ? "ok" : "empty");
          if (mapped.length) _tenantCache.officers.set(cacheKey, mapped);
        }
      } catch {
        if (!ignore) {
          setOfficers([]);
          setOfficersStatus("error");
        }
      }
    })();
    return () => {
      ignore = true;
    };
  }, [editing, tenantId, reloadOfficersKey]);

  /* Seed options from loaded group */
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

  /* save edits */
  const save = async () => {
    setSaving(true);
    try {
      const branchIdNum = form.branchId === "" || form.branchId == null ? null : Number(form.branchId);
      const body = {
        name: form.name || null,
        branchId: branchIdNum,
        loanOfficerId: form.loanOfficerId || null,
        loan_officer_id: form.loanOfficerId || null,
        meetingDay: form.meetingDay ? String(form.meetingDay).toLowerCase() : null,
        status: form.status || "active",
      };
      await tryPATCH([`groups/${groupId}`, `loan-groups/${groupId}`], body, withTenant(tenantId));
      await load();
      setEditing(false);
    } catch (e) {
      const apiMsg = e?.response?.data?.error || e?.message || "Failed to save changes.";
      alert(apiMsg);
    } finally {
      setSaving(false);
    }
  };

  /* members */
  const fileRef = useRef(null);

  const extractBorrowerId = (pickedVal) => {
    if (!pickedVal) return null;
    if (typeof pickedVal === "number" || /^\d+$/.test(String(pickedVal))) return Number(pickedVal);
    return Number(
      pickedVal.id ??
        pickedVal.value ??
        pickedVal.borrowerId ??
        pickedVal.item?.id ??
        pickedVal.item?.value ??
        NaN
    );
  };

  const addMember = async () => {
    const borrowerIdNum = extractBorrowerId(picked);
    if (!borrowerIdNum || Number.isNaN(borrowerIdNum)) {
      alert("Pick a borrower to add.");
      return;
    }

    try {
      setAdding(true);
      await ensureNotAssignedElsewhere(borrowerIdNum, tenantId, { targetGroupId: groupId });
      await postAddMemberFlexible(groupId, borrowerIdNum, tenantId, groupBaseRef.current);
      setPicked(null);
      await load();
    } catch (e) {
      alert(e?.message || "Failed to add member.");
    } finally {
      setAdding(false);
    }
  };

  const removeMember = async (borrowerId) => {
    try {
      const borrowerIdNum = Number(borrowerId);
      const base = groupBaseRef.current || "groups";
      await tryDELETE(apiVariantsLocal(`${base}/${groupId}/members/${borrowerIdNum}`), withTenant(tenantId));
      await load();
    } catch (e) {
      alert(e?.response?.data?.error || "Failed to remove member.");
    }
  };

  /* CSV import/export */
  const onImportCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append("file", file);
      const base = groupBaseRef.current || "groups";
      await tryPOST(apiVariantsLocal(`${base}/${groupId}/members/import`), fd, {
        ...withTenant(tenantId),
        headers: {
          ...(tenantId ? { "x-tenant-id": tenantId } : {}),
          "Content-Type": "multipart/form-data",
        },
      });
      alert("Import complete");
      await load();
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to import CSV.";
      alert(msg);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const exportCSV = () => {
    const rows = (group?.members || []).map((m) => ({
      borrowerId: m.id,
      name: m.name,
      phone: m.phone || "",
      role: m.role || "",
      outstanding: summary.perBorrower?.[String(m.id)] ?? 0,
    }));
    const header = ["borrowerId", "name", "phone", "role", "outstanding"];
    const csv = [header.join(","), ...rows.map((r) => header.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `group-${groupId}-members.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const members = Array.isArray(group?.members) ? group.members : [];
  const officerPlaceholder = placeholderFrom(officersStatus, "Select loan officer…", "No officers");
  const branchPlaceholder = placeholderFrom(branchesStatus, "Select branch…", "No branches");

  const fmtMoney = (v) => `TZS ${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

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
              <button disabled={saving} onClick={save} className={ui.primary}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setForm({
                    name: group?.name || "",
                    branchId: group?.branchId || "",
                    loanOfficerId: group?.loanOfficerId || "",
                    meetingDay: group?.meetingDay || "",
                    status: group?.status || "active",
                  });
                }}
                className={ui.btn}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {loading && <div className={`${ui.card} px-4 py-3`}>Loading…</div>}
      {error && (
        <div
          className="rounded-2xl border-2 px-4 py-3"
          style={{ borderColor: "var(--danger-border)", background: "var(--danger-bg)", color: "var(--danger-fg)" }}
        >
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Overview / Edit */}
          <section className={`${ui.card} p-4`}>
            <h3 className="mb-3 text-lg font-semibold">{editing ? "Edit Group" : "Overview"}</h3>
            {!editing ? (
              <ul className="space-y-1 text-[15px]">
                <li><b>Name:</b> {group?.name ?? "—"}</li>
                <li><b>Branch:</b> {group?.branchName ?? "—"}</li>
                <li><b>Officer:</b> {group?.officerName || (group?.loanOfficerId ? `#${group.loanOfficerId}` : "—")}</li>
                <li><b>Meeting Day:</b> {group?.meetingDay || "—"}</li>
                <li><b>Status:</b> {group?.status || "active"}</li>
                <li><b>Group Outstanding:</b> {fmtMoney(summary.outstandingTotal)}</li>
              </ul>
            ) : (
              <div className="grid gap-3">
                <Field label="Name">
                  <input className={ui.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/>
                </Field>

                <Field label="Branch">
                  <div className="flex gap-2">
                    <select
                      className={ui.input}
                      value={form.branchId}
                      onChange={(e) => setForm({ ...form, branchId: e.target.value === "" ? "" : String(Number(e.target.value)) })}
                    >
                      <option value="">{branchPlaceholder}</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name} ({b.id})</option>
                      ))}
                    </select>
                    {branchesStatus === "error" && (
                      <button type="button" className={ui.btn} onClick={() => setReloadBranchesKey((k) => k + 1)}>Retry</button>
                    )}
                  </div>
                </Field>

                <Field label="Loan Officer">
                  <div className="flex gap-2">
                    <select className={ui.input} value={form.loanOfficerId} onChange={(e) => setForm({ ...form, loanOfficerId: e.target.value })}>
                      <option value="">{officerPlaceholder}</option>
                      {officers.map((o) => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                    {officersStatus === "error" && (
                      <button type="button" className={ui.btn} onClick={() => setReloadOfficersKey((k) => k + 1)}>Retry</button>
                    )}
                  </div>
                </Field>

                <Field label="Meeting Day">
                  <select className={ui.input} value={form.meetingDay} onChange={(e) => setForm({ ...form, meetingDay: e.target.value })}>
                    {meetingDays.map((d) => (<option key={d || "_"} value={d}>{d || "—"}</option>))}
                  </select>
                </Field>

                <Field label="Status">
                  <select className={ui.input} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {statusOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                  </select>
                </Field>
              </div>
            )}
          </section>

          {/* Members */}
          <section className={`${ui.card} p-4 lg:col-span-2`}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Members</h3>
              <div className="flex items-center gap-2">
                <label className={ui.btn}>
                  Import CSV
                  <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onImportCSV}/>
                </label>
                <button className={ui.btn} onClick={exportCSV}>Export CSV</button>
              </div>
            </div>

            <div className="mb-4 flex items-center gap-2">
              <div className="flex-1">
                <BorrowerAutoComplete
                  value={picked}
                  onChange={(_id, val) => { const v = val?.item ?? val ?? _id; setPicked(v); }}
                  placeholder="Add borrower…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && picked && !adding) {
                      e.preventDefault();
                      addMember();
                    }
                  }}
                />
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
                    <th className={ui.th}>Outstanding</th>
                    <th className={ui.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(members) ? members : []).length === 0 ? (
                    <tr>
                      <td className={ui.td} colSpan={5}><span className={ui.muted}>No members yet.</span></td>
                    </tr>
                  ) : (
                    members.map((m) => {
                      const out = summary.perBorrower?.[String(m.id)] ?? 0;
                      return (
                        <tr key={m.id}>
                          <td className={ui.td}>
                            <Link
                              to={`/borrowers/${encodeURIComponent(m.id)}${tenantQuery}`}
                              className="font-semibold underline decoration-2 underline-offset-2 hover:opacity-90 text-[var(--fg)]"
                            >
                              {m.name}
                            </Link>
                          </td>
                          <td className={ui.td}>{m.phone || "—"}</td>
                          <td className={ui.td}>{m.role ? <span className={ui.chip}>{String(m.role).toUpperCase()}</span> : "—"}</td>
                          <td className={ui.td}>{fmtMoney(out)}</td>
                          <td className={ui.td}>
                            <button className={ui.btn} onClick={() => removeMember(m.id)}>Remove</button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {members.length > 0 && (
                  <tfoot>
                    <tr>
                      <td className={ui.td} colSpan={3}><b>Total Outstanding</b></td>
                      <td className={ui.td}><b>{fmtMoney(summary.outstandingTotal)}</b></td>
                      <td className={ui.td} />
                    </tr>
                  </tfoot>
                )}
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
