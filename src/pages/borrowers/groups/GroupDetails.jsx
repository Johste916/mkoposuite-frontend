// GroupDetails.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../../api";
import BorrowerAutoComplete from "../../../components/inputs/BorrowerAutoComplete";

/* ---------------- tolerant helpers ---------------- */
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
async function tryDELETE(paths = [], opts = {}) {
  let lastErr;
  for (const p of paths) {
    try {
      const res = await api.delete(p, opts);
      return res?.data;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("No endpoint succeeded");
}

/* ---------------- normalizers ---------------- */
function normalizeMember(m) {
  return {
    id: m.id ?? m._id ?? m.borrowerId ?? m.memberId,
    name:
      m.name ||
      `${m.firstName || ""} ${m.lastName || ""}`.trim() ||
      m.fullName ||
      m.id,
    phone: m.phone ?? m.msisdn ?? m.mobile,
    role: m.role || m.memberRole,
  };
}

function normalizeGroup(g) {
  if (!g || typeof g !== "object") return null;
  const members = Array.isArray(g.members)
    ? g.members
    : g.groupMembers || g.items || [];

  return {
    id: g.id ?? g._id ?? g.groupId ?? g.code,
    name: g.name ?? g.groupName ?? g.title ?? "—",
    branchName: g.branchName ?? g.branch?.name ?? "—",
    officerName: g.officerName ?? g.officer?.name ?? "—",
    meetingDay: g.meetingDay ?? g.meeting?.day ?? "—",
    members: members.map(normalizeMember),
  };
}

/* Best-effort fetcher (id, query, list fallback) */
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

  const byQuery =
    (await tryGET(
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
    const arr = Array.isArray(byQuery)
      ? byQuery
      : byQuery.items || byQuery.rows || byQuery.data || [];
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
    const arr = Array.isArray(list)
      ? list
      : list.items || list.rows || list.data || [];
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

/* ---------- Shared styles ---------- */
const containerCls =
  "w-full px-4 md:px-6 lg:px-8 py-6 min-h-screen bg-white text-slate-900";
const card = "rounded-2xl border-2 border-slate-300 bg-white shadow";

/* ---------------- component ---------------- */
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
    <div className={containerCls}>
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Group #{groupId}
          {group?.name ? (
            <span className="text-slate-700 font-medium"> • {group.name}</span>
          ) : null}
        </h1>
        <button
          onClick={refresh}
          className="px-3 py-2 rounded-lg border-2 border-slate-300 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {/* Alerts */}
      {loading && <div className="text-slate-700 mb-3">Loading…</div>}
      {error && <div className="text-rose-700 mb-3">{error}</div>}

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Overview */}
        <section className={`${card} p-4`}>
          <h3 className="font-semibold text-lg mb-3">Overview</h3>
          <ul className="text-[15px] space-y-1">
            <li>
              <b>Name:</b> {group?.name ?? "—"}
            </li>
            <li>
              <b>Branch:</b> {group?.branchName ?? "—"}
            </li>
            <li>
              <b>Officer:</b> {group?.officerName ?? "—"}
            </li>
            <li>
              <b>Meeting Day:</b> {group?.meetingDay ?? "—"}
            </li>
          </ul>
        </section>

        {/* Members */}
        <section className={`${card} p-4 lg:col-span-2`}>
          <h3 className="font-semibold text-lg mb-3">Members</h3>

          {/* Add member */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1">
              <BorrowerAutoComplete
                value={picked}
                onChange={(_id, b) => setPicked(b)}
                placeholder="Add borrower…"
              />
            </div>
            <button
              onClick={addMember}
              disabled={!picked || adding}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 font-semibold"
            >
              {adding ? "Adding…" : "Add"}
            </button>
          </div>

          {/* List */}
          <ul className="text-[15px] divide-y divide-slate-200">
            {members.length === 0 ? (
              <li className="py-3 text-slate-600">No members yet.</li>
            ) : (
              members.map((m) => (
                <li key={m.id} className="py-2 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/borrowers/${encodeURIComponent(m.id)}`}
                        className="font-medium text-slate-900 underline underline-offset-2 decoration-2 hover:text-slate-950"
                      >
                        {m.name}
                      </Link>
                      <span className="text-slate-500">• {m.phone || "—"}</span>
                      {m.role ? (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                          {String(m.role).toUpperCase()}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <button
                    className="px-3 py-1.5 rounded-lg border-2 border-slate-300 hover:bg-slate-50"
                    onClick={() => removeMember(m.id)}
                  >
                    Remove
                  </button>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
};

export default GroupDetails;
