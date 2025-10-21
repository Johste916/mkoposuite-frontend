import React, { useEffect, useState } from "react";
import api from "../../api";

const ui = {
  container: "w-full px-4 md:px-6 lg:px-8 py-6 bg-[var(--bg)] text-[var(--fg)]",
  h1: "text-3xl font-extrabold tracking-tight",
  card: "rounded-2xl border-2 border-[var(--border-strong)] bg-[var(--card)] shadow",
  input:
    "h-10 w-full rounded-lg border-2 px-3 outline-none focus:ring-2 focus:ring-[var(--ring)] " +
    "bg-[var(--input-bg)] text-[var(--input-fg)] border-[var(--input-border)]",
  primary:
    "inline-flex items-center rounded-lg bg-rose-600 text-white px-4 py-2 font-semibold hover:bg-rose-700 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-60",
  tableWrap:
    "rounded-2xl border-2 border-[var(--border-strong)] bg-[var(--card)] shadow overflow-x-auto",
  th: "bg-[var(--kpi-bg)] text-left text-[13px] uppercase tracking-wide text-[var(--muted)] font-semibold px-3 py-2 border-2 border-[var(--border)]",
  td: "px-3 py-2 border-2 border-[var(--border)] text-sm",
  btn:
    "inline-flex items-center rounded-lg border-2 border-[var(--border-strong)] px-3 py-1.5 hover:bg-[var(--kpi-bg)] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
  alert: "rounded-2xl px-4 py-3",
  info: "rounded-2xl border-2 border-[var(--border-strong)] bg-[var(--card)] px-4 py-3",
  dropdown:
    "absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded-lg border-2 border-[var(--border-strong)] bg-[var(--card)] shadow",
  option:
    "w-full text-left px-3 py-2 hover:bg-[var(--kpi-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
  muted: "text-[var(--muted)]",
};

function toArray(maybe) {
  if (Array.isArray(maybe)) return maybe;
  if (Array.isArray(maybe?.items)) return maybe.items;
  if (Array.isArray(maybe?.rows)) return maybe.rows;
  if (Array.isArray(maybe?.data)) return maybe.data;
  return [];
}
const displayName = (b) =>
  (b?.name ||
    `${b?.firstName || ""} ${b?.lastName || ""}`.trim() ||
    b?.fullName ||
    b?.customerName ||
    b?.businessName ||
    "") || "—";

const BorrowerBlacklist = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // form state
  const [form, setForm] = useState({ borrowerId: "", reason: "", until: "" });

  // search state (typeahead)
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = async (signal) => {
    try {
      setLoading(true);
      const cfg = signal ? { signal } : {};
      const res = await api.get("/borrowers/blacklist/list", cfg);
      const list = toArray(res.data);
      setRows(list);
      setErr("");
    } catch {
      setErr("Failed to load blacklist");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, []);

  // search borrowers by name/phone with debounce
  useEffect(() => {
    const q = search.trim();
    if (!q || q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const ac = new AbortController();
    const t = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await api.get("/borrowers", {
          signal: ac.signal,
          params: { q, pageSize: 10 },
        });
        const list = toArray(res.data).map((b) => ({
          id: b.id,
          name: displayName(b),
          phone: b.phone || b.msisdn || b.mobile || "",
        }));
        setSuggestions(list);
        setOpen(true);
      } catch {
        setSuggestions([]);
        setOpen(false);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [search]);

  const onChangeField = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const selectBorrower = (b) => {
    setSelected(b);
    setForm((f) => ({ ...f, borrowerId: b.id }));
    setSearch(b.name); // keep the name in the input
    setOpen(false);
  };

  const clearSelected = () => {
    setSelected(null);
    setForm((f) => ({ ...f, borrowerId: "" }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.borrowerId) {
      alert("Please select a borrower from the search results.");
      return;
    }
    try {
      await api.post(
        `/borrowers/${encodeURIComponent(form.borrowerId)}/blacklist`,
        {
          reason: form.reason || null,
          until: form.until || null,
        }
      );
      setForm({ borrowerId: "", reason: "", until: "" });
      setSelected(null);
      setSearch("");
      await load();
    } catch {
      alert("Failed to blacklist");
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/borrowers/${encodeURIComponent(id)}/blacklist`);
      await load();
    } catch {
      // no-op
    }
  };

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");
  const nameOf = (r) =>
    r?.name ||
    `${r?.firstName || ""} ${r?.lastName || ""}`.trim() ||
    r?.id ||
    "—";
  const reasonOf = (r) => r?.blacklistReason ?? r?.reason ?? "—";
  const untilOf  = (r) => r?.blacklistUntil  ?? r?.until  ?? null;

  return (
    <div className={ui.container}>
      <h1 className={ui.h1}>Blacklist</h1>

      {/* Add form */}
      <form onSubmit={onSubmit} className={`${ui.card} mt-4 p-4`}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {/* Search by name/phone (select fills borrowerId) */}
          <div className="relative">
            <input
              placeholder="Search borrower by name or phone"
              className={ui.input}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setOpen(true);
                if (selected) clearSelected();
              }}
              onFocus={() => {
                if (suggestions.length) setOpen(true);
              }}
            />
            {open && suggestions.length > 0 && (
              <div className={ui.dropdown}>
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={ui.option}
                    onClick={() => selectBorrower(s)}
                  >
                    <div className="font-semibold">{s.name}</div>
                    <div className={`text-xs ${ui.muted}`}>
                      ID: {s.id}
                      {s.phone ? ` • ${s.phone}` : ""}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {searching && (
              <div className={`mt-1 text-xs ${ui.muted}`}>Searching…</div>
            )}
            {selected && (
              <div className={`mt-1 text-xs ${ui.muted}`}>
                Selected: <strong>{selected.name}</strong> (ID: {selected.id}){" "}
                <button
                  type="button"
                  className="underline decoration-2 underline-offset-4"
                  onClick={clearSelected}
                >
                  change
                </button>
              </div>
            )}
          </div>

          {/* Reason */}
          <input
            name="reason"
            placeholder="Reason"
            className={ui.input}
            value={form.reason}
            onChange={onChangeField}
          />

          {/* Until date */}
          <input
            name="until"
            type="date"
            className={ui.input}
            value={form.until}
            onChange={onChangeField}
            // Optional: prevent picking a past date
            // min={new Date().toISOString().slice(0,10)}
          />
        </div>

        <div className="mt-3">
          <button className={ui.primary} disabled={!form.borrowerId}>
            Add to Blacklist
          </button>
          {!form.borrowerId && (
            <span className={`ml-3 text-sm ${ui.muted}`}>
              Select a borrower above to enable.
            </span>
          )}
        </div>
      </form>

      {/* Table */}
      <div className={`${ui.tableWrap} mt-4`}>
        <table className="w-full table-auto text-sm">
          <thead>
            <tr>
              <th className={ui.th}>Borrower</th>
              <th className={ui.th}>Reason</th>
              <th className={ui.th}>Until</th>
              <th className={ui.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className={ui.td} colSpan={4}>
                  Loading…
                </td>
              </tr>
            ) : err ? (
              <tr>
                <td className={ui.td} colSpan={4}>
                  <div
                    className={ui.alert}
                    style={{
                      border: "2px solid var(--danger-border)",
                      background: "var(--danger-bg)",
                      color: "var(--danger-fg)",
                      borderRadius: "1rem",
                    }}
                  >
                    {err}
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className={ui.td} colSpan={4}>
                  No blacklisted borrowers.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td className={ui.td}>{nameOf(r)}</td>
                  <td className={ui.td}>{reasonOf(r)}</td>
                  <td className={ui.td}>{fmtDate(untilOf(r))}</td>
                  <td className={ui.td}>
                    <button className={ui.btn} onClick={() => remove(r.id)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BorrowerBlacklist;
