import React, { useEffect, useState } from "react";
import api from "../../api";

const BorrowerBlacklist = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ borrowerId: "", reason: "", until: "" });

  const load = async (signal) => {
    try {
      setLoading(true);
      const cfg = signal ? { signal } : {};
      const res = await api.get("/borrowers/blacklist/list", cfg);
      const list = Array.isArray(res.data) ? res.data : res.data?.items || res.data?.data || [];
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

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.borrowerId) return;
    try {
      await api.post(`/borrowers/${encodeURIComponent(form.borrowerId)}/blacklist`, {
        reason: form.reason || null,
        until: form.until || null,
      });
      setForm({ borrowerId: "", reason: "", until: "" });
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
  const nameOf = (r) => r?.name || `${r?.firstName || ""} ${r?.lastName || ""}`.trim() || r?.id || "—";

  return (
    <div className="p-4 md:p-6 space-y-4 bg-[var(--bg)] text-[var(--fg)]">
      <h1 className="text-2xl font-semibold">Blacklist</h1>

      {/* Add form */}
      <form onSubmit={onSubmit} className="card p-4 space-y-3 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            name="borrowerId"
            placeholder="Borrower ID"
            className="input"
            value={form.borrowerId}
            onChange={onChange}
            required
          />
          <input
            name="reason"
            placeholder="Reason"
            className="input"
            value={form.reason}
            onChange={onChange}
          />
          <input
            name="until"
            type="date"
            className="input"
            value={form.until}
            onChange={onChange}
          />
        </div>
        <button className="inline-flex items-center px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700">
          Add to Blacklist
        </button>
      </form>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--table-head-bg,transparent)]">
            <tr className="text-left text-[var(--fg)]/80">
              <th className="px-3 py-2">Borrower</th>
              <th className="px-3 py-2">Reason</th>
              <th className="px-3 py-2">Until</th>
              <th className="px-3 py-2 text-right pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-4 muted" colSpan={4}>Loading…</td>
              </tr>
            ) : err ? (
              <tr>
                <td className="p-4 text-rose-600 dark:text-rose-400" colSpan={4}>{err}</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="p-4 muted" colSpan={4}>No blacklisted borrowers.</td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-[var(--border)] odd:bg-[var(--table-row-odd,transparent)] even:bg-[var(--table-row-even,transparent)]">
                  <td className="px-3 py-2">{nameOf(r)}</td>
                  <td className="px-3 py-2">{r.reason || "—"}</td>
                  <td className="px-3 py-2">{fmtDate(r.until)}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      className="px-2 py-1 border rounded-lg hover:bg-[var(--hover,#f9fafb)] dark:hover:bg-[color-mix(in_oklab,var(--fg)_8%,transparent)] border-[var(--border)]"
                      onClick={() => remove(r.id)}
                    >
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
