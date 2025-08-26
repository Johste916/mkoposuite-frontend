import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api";

function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

/**
 * Props:
 * - value (borrowerId or null)
 * - onChange(id, borrowerObj)
 * - placeholder
 */
export default function BorrowerAutoComplete({ value, onChange, placeholder = "Search name, phone or ID…" }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);
  const q = useDebounced(query, 250);

  useEffect(() => {
    function onDoc(e) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!q || q.length < 1) { setOptions([]); return; }
      setLoading(true);
      try {
        const res = await api._get(`/borrowers/search?q=${encodeURIComponent(q)}`);
        if (!cancelled) setOptions(Array.isArray(res.data) ? res.data : []);
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [q]);

  const handlePick = (b) => {
    setQuery(`${b.name} (${b.id})`);
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
      {/* hidden value mirror: */}
      {value ? <input type="hidden" value={value} /> : null}
    </div>
  );
}
