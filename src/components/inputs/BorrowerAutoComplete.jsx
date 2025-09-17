import React, { useEffect, useRef, useState } from "react";
import api from "../../api";

/**
 * BorrowerAutoComplete
 * Props:
 *  - value: { id, name, phone } | null
 *  - onChange: (id, borrowerObj) => void
 *  - placeholder?: string
 *  - disabled?: boolean
 *
 * Safe defaults; won’t break other usages.
 */
const BorrowerAutoComplete = ({ value, onChange, placeholder = "Search borrower…", disabled = false }) => {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const acRef = useRef(null);

  // Prefill when parent passes full object
  useEffect(() => {
    if (value && typeof value === "object") {
      const label = value.name || [value.firstName, value.lastName].filter(Boolean).join(" ") || value.id;
      setQuery(`${label}${value.id ? ` (${value.id})` : ""}`);
    }
  }, [value]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setItems([]);
      return;
    }
    setLoading(true);
    if (acRef.current) acRef.current.abort();
    acRef.current = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await api.get("/borrowers/search", {
          signal: acRef.current.signal,
          params: { q: query.trim() },
        });
        const arr = Array.isArray(res.data) ? res.data : res.data?.items || res.data?.data || [];
        setItems(arr);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      if (acRef.current) acRef.current.abort();
    };
  }, [query]);

  return (
    <div className="relative w-full">
      <input
        className="w-full border rounded-lg px-3 py-2"
        placeholder={placeholder}
        disabled={disabled}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (!e.target.value.trim()) onChange?.(null, null);
        }}
      />
      {open && (
        <div
          className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow max-h-64 overflow-auto"
          onMouseDown={(e) => e.preventDefault()}
        >
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-500">Searching…</div>
          ) : items.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">No results</div>
          ) : (
            items.map((b) => {
              const name =
                b.name ||
                `${b.firstName || ""} ${b.lastName || ""}`.trim() ||
                b.id ||
                "Borrower";
              return (
                <button
                  key={b.id || name}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                  onClick={() => {
                    setQuery(`${name}${b.id ? ` (${b.id})` : ""}`);
                    setOpen(false);
                    onChange?.(b.id, b);
                  }}
                >
                  <div className="font-medium text-gray-800">{name}</div>
                  <div className="text-xs text-gray-500">
                    {b.phone || "—"} {b.branchName ? `• ${b.branchName}` : ""}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default BorrowerAutoComplete;
