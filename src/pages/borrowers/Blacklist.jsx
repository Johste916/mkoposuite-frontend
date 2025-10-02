// src/pages/borrowers/BorrowerBlacklist.jsx
import React, { useEffect, useState } from "react";
import api from "../../api";

const ui = {
  container: 'w-full px-4 md:px-6 lg:px-8 py-6 text-slate-900',
  h1: 'text-3xl font-extrabold tracking-tight',
  card: 'rounded-2xl border-2 border-slate-300 bg-white shadow',
  input: 'h-10 w-full rounded-lg border-2 border-slate-300 px-3 outline-none focus:ring-2 focus:ring-indigo-500/40',
  primary: 'inline-flex items-center rounded-lg bg-rose-600 text-white px-4 py-2 font-semibold hover:bg-rose-700',
  tableWrap: 'rounded-2xl border-2 border-slate-300 bg-white shadow overflow-x-auto',
  th: 'bg-slate-100 text-left text-[13px] uppercase tracking-wide text-slate-700 font-semibold px-3 py-2 border-2 border-slate-200',
  td: 'px-3 py-2 border-2 border-slate-200 text-sm',
  btn: 'inline-flex items-center rounded-lg border-2 border-slate-300 px-3 py-1.5 hover:bg-slate-50',
  alert: 'rounded-2xl border-2 border-rose-300 bg-rose-50 px-4 py-3 text-rose-800',
  info: 'rounded-2xl border-2 border-slate-300 bg-white px-4 py-3',
};

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
    <div className={ui.container}>
      <h1 className={ui.h1}>Blacklist</h1>

      {/* Add form */}
      <form onSubmit={onSubmit} className={`${ui.card} mt-4 p-4`}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input name="borrowerId" placeholder="Borrower ID" className={ui.input} value={form.borrowerId} onChange={onChange} required />
          <input name="reason" placeholder="Reason" className={ui.input} value={form.reason} onChange={onChange} />
          <input name="until" type="date" className={ui.input} value={form.until} onChange={onChange} />
        </div>
        <div className="mt-3">
          <button className={ui.primary}>Add to Blacklist</button>
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
              <tr><td className={ui.td} colSpan={4}>Loading…</td></tr>
            ) : err ? (
              <tr><td className={`${ui.td} text-rose-700`} colSpan={4}>{err}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className={ui.td} colSpan={4}>No blacklisted borrowers.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td className={ui.td}>{nameOf(r)}</td>
                  <td className={ui.td}>{r.reason || "—"}</td>
                  <td className={ui.td}>{fmtDate(r.until)}</td>
                  <td className={ui.td}>
                    <button className={ui.btn} onClick={() => remove(r.id)}>Remove</button>
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
