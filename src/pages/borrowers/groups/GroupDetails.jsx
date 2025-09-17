// src/pages/borrowers/groups/GroupDetails.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../../api";

/* -------------------------------------------------------------------------- */
/* Local, page-scoped BorrowerPicker (Autocomplete)                           */
/* Keeps build stable without relying on external import paths                */
/* -------------------------------------------------------------------------- */
function useDebounced(value, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/**
 * Props:
 * - value: borrower object or null
 * - onChange: (id, borrowerObj)
 * - placeholder
 */
function BorrowerPicker({ value, onChange, placeholder = "Search name, phone or ID…" }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);
  const q = useDebounced(query, 250);

  useEffect(() => {
    const onDoc = (e) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!q || q.length < 1) {
        setOptions([]);
        return;
      }
      setLoading(true);
      try {
        // Compatible with your backend: /api/borrowers/search?q=...
        const res = await api._get?.(`/borrowers/search?q=${encodeURIComponent(q)}`)
          .catch(() => api.get(`/borrowers/search?q=${encodeURIComponent(q)}`));
        const data = Array.isArray(res?.data) ? res.data : [];
        if (!cancelled) setOptions(data);
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [q]);

  const handlePick = (b) => {
    setQuery(`${b.name ?? ""} (${b.id})`);
    setOpen(false);
    onChange?.(b.id, b);
  };

  const suffix = loading ? "Searching…" : (open && options.length === 0 && q ? "No matches" : "");

  return (
    <div ref={boxRef} className="relative w-[320px]">
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="border px-3 py-2 rounded w-full dark:bg-slate-700 dark:border-slate-600"
      />
      {suffix && <div className="absolute right-2 top-2 text-xs text-slate-400">{suffix}</div>}
      {open && options.length > 0 && (
        <div className="absolute mt-1 z-50 w-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded shadow max-h-64 overflow-auto">
          {options.map((b) => (
            <button
              key={b.id}
              className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700"
              onClick={() => handlePick(b)}
              type="button"
            >
              <div className="text-sm font-medium">{b.name}</div>
              <div className="text-xs text-slate-500">ID: {b.id} • {b.phone || "—"}</div>
            </button>
          ))}
        </div>
      )}
      {value?.id ? <input type="hidden" value={value.id} /> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* GroupDetails                                                               */
/* -------------------------------------------------------------------------- */
const GroupDetails = () => {
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // pick/add member
  const [picked, setPicked] = useState(null); // borrower object
  const [adding, setAdding] = useState(false);

  const load = async (signal) => {
    try {
      setLoading(true);
      const res = await api.get(`/borrowers/groups/${groupId}`, { signal });
      setGroup(res.data || null);
      setError("");
    } catch {
      setError("Failed to load group");
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
      await api.post(`/borrowers/groups/${groupId}/members`, { borrowerId: picked.id });
      setPicked(null);
      await load();
    } catch {
      // optionally show a toast
    } finally {
      setAdding(false);
    }
  };

  const removeMember = async (borrowerId) => {
    try {
      await api.delete(`/borrowers/groups/${groupId}/members/${borrowerId}`);
      await load();
    } catch {}
  };

  const members = useMemo(() => (Array.isArray(group?.members) ? group.members : []), [group]);

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
              <BorrowerPicker
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
              members.map((m) => {
                const name = m.name || `${m.firstName || ""} ${m.lastName || ""}`.trim() || m.id;
                return (
                  <li key={m.id} className="py-2 flex items-center justify-between">
                    <div>
                      {name} <span className="text-gray-500">• {m.phone || "—"}</span>
                      {m.role && <span className="ml-2 text-xs uppercase text-gray-400">{m.role}</span>}
                    </div>
                    <button
                      className="px-2 py-1 border rounded hover:bg-gray-50"
                      onClick={() => removeMember(m.id)}
                    >
                      Remove
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>

      <div className="bg-white rounded shadow p-4">
        <h3 className="font-semibold mb-2">Loans & Repayments</h3>
        <div className="text-sm text-gray-600">TODO: group loans, outstanding, next repayments, PAR</div>
      </div>

      <div className="bg-white rounded shadow p-4">
        <h3 className="font-semibold mb-2">Meetings & Attendance</h3>
        <div className="text-sm text-gray-600">TODO: schedule, attendance register, minutes</div>
      </div>
    </div>
  );
};

export default GroupDetails;
