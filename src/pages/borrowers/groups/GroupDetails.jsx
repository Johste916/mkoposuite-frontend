import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../../api";
import BorrowerAutoComplete from "../../../components/input/BorrowerAutoComplete";

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
    members: members.map((m) => ({
      id: m.id ?? m._id ?? m.borrowerId ?? m.memberId,
      name: m.name || `${m.firstName || ""} ${m.lastName || ""}`.trim() || m.id,
      phone: m.phone,
      role: m.role || m.memberRole,
    })),
  };
}

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
      const data = await tryGET(
        [
          `/borrowers/groups/${groupId}`,
          `/groups/${groupId}`,
          `/borrower-groups/${groupId}`,
          `/api/borrowers/groups/${groupId}`,
        ],
        { signal }
      );
      setGroup(normalizeGroup(data));
      setError("");
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
        ]
      );
      await load();
    } catch {
      alert("Failed to remove member.");
    }
  };

  const members = Array.isArray(group?.members) ? group.members : [];

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Group #{groupId}</h1>
      {loading && <div>Loading…</div>}
      {error && <div className="text-red-600">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded shadow p-4">
          <h3 className="font-semibold mb-2">Overview</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li><b>Name:</b> {group?.name ?? "—"}</li>
            <li><b>Branch:</b> {group?.branchName ?? "—"}</li>
            <li><b>Officer:</b> {group?.officerName ?? "—"}</li>
            <li><b>Meeting Day:</b> {group?.meetingDay ?? "—"}</li>
          </ul>
        </div>

        <div className="bg-white rounded shadow p-4 lg:col-span-2">
          <h3 className="font-semibold mb-2">Members</h3>

          <div className="flex items-center gap-2 mb-3">
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
              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
            >
              {adding ? "Adding…" : "Add"}
            </button>
          </div>

          <ul className="text-sm divide-y">
            {members.length === 0 ? (
              <li className="py-2 text-gray-500">No members yet.</li>
            ) : (
              members.map((m) => (
                <li key={m.id} className="py-2 flex items-center justify-between">
                  <div>
                    {m.name} <span className="text-gray-500">• {m.phone || "—"}</span>
                    {m.role && <span className="ml-2 text-xs uppercase text-gray-400">{m.role}</span>}
                  </div>
                  <button
                    className="px-2 py-1 border rounded hover:bg-gray-50"
                    onClick={() => removeMember(m.id)}
                  >
                    Remove
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default GroupDetails;
