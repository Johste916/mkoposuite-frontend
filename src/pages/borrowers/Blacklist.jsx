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
      const res = await api.get("/borrowers/blacklist/list", { signal });
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

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Blacklist</h1>

      <form onSubmit={onSubmit} className="bg-white rounded-xl border shadow p-4 space-y-3 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            name="borrowerId"
            placeholder="Borrower ID"
            className="border rounded-lg px-3 py-2"
            value={form.borrowerId}
            onChange={onChange}
            required
          />
          <input
            name="reason"
            placeholder="Reason"
            className="border rounded-lg px-3 py-2"
            value={form.reason}
            onChange={onChange}
          />
          <input
            name="until"
            type="date"
            className="border rounded-lg px-3 py-2"
            value={form.until}
            onChange={onChange}
          />
        </div>
        <button className="px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700">
          Add to Blacklist
        </button>
      </form>

      <div className="bg-white rounded-xl shadow border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left">Borrower</th>
              <th className="px-3 py-2 text-left">Reason</th>
              <th className="px-3 py-2 text-left">Until</th>
              <th className="px-3 py-2 text-right pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-4 text-gray-500" colSpan={4}>Loading…</td></tr>
            ) : err ? (
              <tr><td className="p-4 text-red-600" colSpan={4}>{err}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="p-4 text-gray-500" colSpan={4}>No blacklisted borrowers.</td></tr>
            ) : (
              rows.map((r) => {
                const name = r.name || `${r.firstName || ""} ${r.lastName || ""}`.trim() || r.id;
                return (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">{name}</td>
                    <td className="px-3 py-2">{r.reason || "—"}</td>
                    <td className="px-3 py-2">{r.until ? new Date(r.until).toLocaleDateString() : "—"}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        className="px-2 py-1 border rounded hover:bg-gray-50"
                        onClick={() => remove(r.id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BorrowerBlacklist;
