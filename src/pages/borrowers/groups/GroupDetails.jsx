// src/pages/groups/GroupDetails.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../../api";
import BorrowerAutoComplete from "../../../components/inputs/BorrowerAutoComplete";

/* Helpers (unchanged) */
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
async function tryDELETE(paths = [], opts = {}) {
  let lastErr;
  for (const p of paths) {
    try { const res = await api.delete(p, opts); return res?.data; }
    catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("No endpoint succeeded");
}

/* Normalizers (unchanged) */
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
    branchName: g.branchName ?? g.branch?.name ?? "—",
    officerName: g.officerName ?? g.officer?.name ?? "—",
    meetingDay: g.meetingDay ?? g.meeting?.day ?? "—",
    members: members.map(normalizeMember),
  };
}
async function fetchGroupFlexible(id, signal) {
  const enc = encodeURIComponent(id);
  const direct = await tryGET(
    [
      `/borrowers/groups/${enc}`,
      `/groups/${enc}`,
      `/borrower-groups/${enc}`,
      `/api/borrowers/groups/${enc}`,
      `/api/groups/${enc}`,
      `/api/borrower-groups/${enc}`,
    ],
    { signal }
  ).catch(() => null);
  if (direct) return normalizeGroup(direct);

  const byQuery = (await tryGET(
    [
      `/borrowers/groups?id=${enc}&include=members`,
      `/borrowers/groups?groupId=${enc}&include=members`,
      `/borrowers/groups?code=${enc}&include=members`,
      `/groups?id=${enc}&include=members`,
      `/groups?groupId=${enc}&include=members`,
      `/groups?code=${enc}&include=members`,
      `/borrower-groups?id=${enc}&include=members`,
      `/borrower-groups?groupId=${enc}&include=members`,
      `/borrower-groups?code=${enc}&include=members`,
      `/api/borrowers/groups?id=${enc}&include=members`,
      `/api/borrowers/groups?groupId=${enc}&include=members`,
      `/api/borrowers/groups?code=${enc}&include=members`,
      `/api/groups?id=${enc}&include=members`,
      `/api/groups?groupId=${enc}&include=members`,
      `/api/groups?code=${enc}&include=members`,
      `/api/borrower-groups?id=${enc}&include=members`,
      `/api/borrower-groups?groupId=${enc}&include=members`,
      `/api/borrower-groups?code=${enc}&include=members`,
    ],
    { signal }
  ).catch(() => null)) || null;

  if (byQuery) {
    const arr = Array.isArray(byQuery) ? byQuery : byQuery.items || byQuery.rows || byQuery.data || [];
    if (arr.length) {
      const found =
        arr.find(
          (g) =>
            String(g.id) === String(id) ||
            String(g._id) === String(id) ||
            String(g.groupId) === String(id) ||
            String(g.code) === String(id) ||
            String(g.name) === String(id) ||
            String(g.groupName) === String(id)
        ) || arr[0];
      if (found) return normalizeGroup(found);
    }
  }

  const list = await tryGET(
    [
      `/borrowers/groups?include=members`,
      `/groups?include=members`,
      `/borrower-groups?include=members`,
      `/api/borrowers/groups?include=members`,
      `/api/groups?include=members`,
      `/api/borrower-groups?include=members`,
    ],
    { signal }
  ).catch(() => null);

  if (list) {
    const arr = Array.isArray(list) ? list : list.items || list.rows || list.data || [];
    const found = arr.find(
      (g) =>
        String(g.id) === String(id) ||
        String(g._id) === String(id) ||
        String(g.groupId) === String(id) ||
        String(g.code) === String(id) ||
        String(g.name) === String(id) ||
        String(g.groupName) === String(id)
    );
    if (found) return normalizeGroup(found);
  }
  return null;
}

/* ---------- Token-based UI ---------- */
const ui = {
  container: "w-full px-4 md:px-6 lg:px-8 py-6 bg-[var(--bg)] text-[var(--fg)]",
  h1: "text-3xl font-extrabold tracking-tight",
  h1Muted: "font-medium text-[var(--muted)]",
  card: "rounded-2xl border-2 border-[var(--border-strong)] bg-[var(--card)] shadow",
  btn: "inline-flex items-center rounded-lg border-2 border-[var(--border-strong)] px-3 py-2 hover:bg-[var(--kpi-bg)] " +
       "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
  primary: "inline-flex items-center rounded-lg bg-indigo-600 text-white px-4 py-2 font-semibold hover:bg-indigo-700 " +
           "disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
  input: "h-10 rounded-lg border-2 px-3 outline-none focus:ring-2 focus:ring-[var(--ring)] " +
         "bg-[var(--input-bg)] text-[var(--input-fg)] border-[var(--input-border)]",
  tableWrap: "rounded-2xl border-2 border-[var(--border-strong)] bg-[var(--card)] shadow overflow-x-auto",
  th: "bg-[var(--kpi-bg)] text-left text-[13px] uppercase tracking-wide text-[var(--muted)] font-semibold px-3 py-2 border-2 border-[var(--border)]",
  td: "px-3 py-2 border-2 border-[var(--border)] text-sm",
  chip: "ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold " +
        "bg-[var(--chip-soft)] text-[var(--fg)] ring-1 ring-[var(--border)]",
};

const GroupDetails = () => {
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState(null);
  const [adding, setAdding] = useState(false);

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
      }
    } catch {
      setError("Failed to load group (endpoint not implemented).");
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

  const refresh = () => load();

  const addMember = async () => {
    if (!picked?.id) return;
    setAdding(true);
    try {
      await tryPOST(
        [
          `/borrowers/groups/${groupId}/members`,
          `/groups/${groupId}/members`,
          `/borrower-groups/${groupId}/members`,
          `/api/borrowers/groups/${groupId}/members`,
          `/api/groups/${groupId}/members`,
          `/api/borrower-groups/${groupId}/members`,
        ],
        { borrowerId: picked.id }
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
          `/borrowers/groups/${groupId}/members/${borrowerId}`,
          `/groups/${groupId}/members/${borrowerId}`,
          `/borrower-groups/${groupId}/members/${borrowerId}`,
          `/api/borrowers/groups/${groupId}/members/${borrowerId}`,
          `/api/groups/${groupId}/members/${borrowerId}`,
          `/api/borrower-groups/${groupId}/members/${borrowerId}`,
        ]
      );
      await load();
    } catch {
      alert("Failed to remove member.");
    }
  };

  const members = Array.isArray(group?.members) ? group.members : [];

  return (
    <div className={ui.container}>
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h1 className={ui.h1}>
          Group #{groupId}
          {group?.name ? <span className={`ml-2 ${ui.h1Muted}`}>• {group.name}</span> : null}
        </h1>
        <button onClick={refresh} className={ui.btn}>Refresh</button>
      </div>

      {/* Alerts */}
      {loading && <div className={`${ui.card} px-4 py-3`}>Loading…</div>}
      {error && (
        <div
          className="rounded-2xl border-2 px-4 py-3"
          style={{ borderColor: "var(--danger-border)", background: "var(--danger-bg)", color: "var(--danger-fg)" }}
        >
          {error}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Overview */}
        <section className={`${ui.card} p-4`}>
          <h3 className="mb-3 text-lg font-semibold">Overview</h3>
          <ul className="space-y-1 text-[15px]">
            <li><b>Name:</b> {group?.name ?? "—"}</li>
            <li><b>Branch:</b> {group?.branchName ?? "—"}</li>
            <li><b>Officer:</b> {group?.officerName ?? "—"}</li>
            <li><b>Meeting Day:</b> {group?.meetingDay ?? "—"}</li>
          </ul>
        </section>

        {/* Members */}
        <section className={`${ui.card} p-4 lg:col-span-2`}>
          <h3 className="mb-3 text-lg font-semibold">Members</h3>

          {/* Add member */}
          <div className="mb-4 flex items-center gap-2">
            <div className="flex-1">
              <BorrowerAutoComplete
                value={picked}
                onChange={(_id, b) => setPicked(b)}
                placeholder="Add borrower…"
              />
            </div>
            <button onClick={addMember} disabled={!picked || adding} className={ui.primary}>
              {adding ? "Adding…" : "Add"}
            </button>
          </div>

          {/* Members Table */}
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
                {members.length === 0 ? (
                  <tr>
                    <td className={ui.td} colSpan={4}>
                      <span className="text-[var(--muted)]">No members yet.</span>
                    </td>
                  </tr>
                ) : (
                  members.map((m) => (
                    <tr key={m.id}>
                      <td className={ui.td}>
                        <Link
                          to={`/borrowers/${encodeURIComponent(m.id)}`}
                          className="font-semibold underline decoration-2 underline-offset-2 hover:opacity-90 text-[var(--fg)]"
                        >
                          {m.name}
                        </Link>
                      </td>
                      <td className={ui.td}>{m.phone || "—"}</td>
                      <td className={ui.td}>
                        {m.role ? <span className={ui.chip}>{String(m.role).toUpperCase()}</span> : "—"}
                      </td>
                      <td className={ui.td}>
                        <button className={ui.btn} onClick={() => removeMember(m.id)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default GroupDetails;
