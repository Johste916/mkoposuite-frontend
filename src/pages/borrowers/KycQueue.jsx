import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";

/* ---------- Token-based styles ---------- */
const ui = {
  container: "w-full px-4 md:px-6 lg:px-8 py-6 min-h-screen bg-[var(--bg)] text-[var(--fg)]",
  card: "rounded-2xl border-2 border-[var(--border-strong)] bg-[var(--card)] shadow-lg",
  link:
    "inline-flex items-center gap-1 font-bold underline decoration-2 underline-offset-4 rounded " +
    "text-[var(--ring)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
  uploadBtn:
    "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-[var(--border-strong)] bg-[var(--card)] hover:bg-[var(--kpi-bg)] " +
    "cursor-pointer font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
  th: "px-3 py-3 font-semibold border-b-2 border-[var(--border)] text-left",
  head: "bg-[var(--kpi-bg)] sticky top-0",
  row: "odd:bg-[var(--card)] even:bg-[var(--kpi-bg)] border-t border-[var(--border)]",
  muted: "text-[var(--muted)]",
};

const statusBadge = () =>
  "px-2 py-0.5 text-xs font-semibold rounded-full border bg-[var(--chip-soft)] border-[var(--border)] text-[var(--fg)]";

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
    <div className={ui.container}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight">KYC Queue</h1>
        <button
          onClick={() => load()}
          className="px-3 py-2 rounded-lg border-2 border-[var(--border-strong)] bg-[var(--card)] hover:bg-[var(--kpi-bg)] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          aria-busy={loading}
        >
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className={`${ui.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-[15px] border-collapse">
            <thead className={ui.head}>
              <tr className="text-left">
                <th className={ui.th}>Borrower</th>
                <th className={ui.th}>Phone</th>
                <th className={ui.th}>Status</th>
                <th className={ui.th}>Upload</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className={`p-4 ${ui.muted}`} colSpan={4}>
                    Loading…
                  </td>
                </tr>
              ) : err ? (
                <tr>
                  <td className="p-4" style={{ color: "var(--danger-fg)" }} colSpan={4}>
                    {err}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className={`p-4 ${ui.muted}`} colSpan={4}>
                    Queue is empty.
                  </td>
                </tr>
              ) : (
                rows.map((b) => (
                  <tr key={b.id} className={ui.row}>
                    <td className="px-3 py-2">
                      <Link to={`/borrowers/${encodeURIComponent(b.id)}`} className={ui.link}>
                        {nameOf(b)}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{b.phone || "—"}</td>
                    <td className="px-3 py-2">
                      <span className={statusBadge()}>{b.kycStatus || b.status || "pending"}</span>
                    </td>
                    <td className="px-3 py-2">
                      <label className={ui.uploadBtn}>
                        <span>Choose files…</span>
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
    </div>
  );
};

export default BorrowerKYC;
