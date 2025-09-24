import React, { useEffect, useState } from "react";
import api from "../../api";

const BorrowerKYC = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = async (signal) => {
    try {
      setLoading(true);
      const cfg = signal ? { signal } : {};
      const res = await api.get("/borrowers/kyc/queue", cfg);
      const list = Array.isArray(res.data) ? res.data : res.data?.items || res.data?.data || [];
      setRows(list);
      setErr("");
    } catch {
      setErr("Failed to load KYC queue");
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

  const uploadFor = async (borrowerId, files) => {
    if (!files?.length) return;
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("file", f));
      await api.post(`/borrowers/${encodeURIComponent(borrowerId)}/kyc`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await load();
      alert("KYC uploaded");
    } catch {
      alert("Failed to upload KYC");
    }
  };

  const nameOf = (b) =>
    b?.name || `${b?.firstName || ""} ${b?.lastName || ""}`.trim() || b?.id || "—";

  return (
    <div className="p-4 md:p-6 space-y-4 bg-[var(--bg)] text-[var(--fg)]">
      <h1 className="text-2xl font-semibold">KYC Queue</h1>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--table-head-bg,transparent)]">
            <tr className="text-left text-[var(--fg)]/80">
              <th className="px-3 py-2">Borrower</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Upload</th>
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
                <td className="p-4 muted" colSpan={4}>Queue is empty.</td>
              </tr>
            ) : (
              rows.map((b) => (
                <tr
                  key={b.id}
                  className="border-t border-[var(--border)] odd:bg-[var(--table-row-odd,transparent)] even:bg-[var(--table-row-even,transparent)]"
                >
                  <td className="px-3 py-2">{nameOf(b)}</td>
                  <td className="px-3 py-2">{b.phone || "—"}</td>
                  <td className="px-3 py-2 capitalize">{b.kycStatus || b.status || "pending"}</td>
                  <td className="px-3 py-2">
                    <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--hover,rgba(0,0,0,0.03))] cursor-pointer">
                      <span className="text-sm">Choose files…</span>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => uploadFor(b.id, e.target.files)}
                      />
                    </label>
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

export default BorrowerKYC;
