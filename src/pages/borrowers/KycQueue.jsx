// BorrowerKYC.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";

/* ---------- Shared styles ---------- */
const containerCls = "w-full px-4 md:px-6 lg:px-8 py-6 min-h-screen bg-white text-slate-900";
const cardCls = "rounded-2xl border-2 border-slate-400 bg-white shadow-lg";
const headerLink =
  "inline-flex items-center gap-1 text-indigo-700 font-bold underline decoration-2 underline-offset-4 hover:text-indigo-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded";
const uploadBtn =
  "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-slate-400 bg-white hover:bg-slate-50 cursor-pointer font-semibold";

const statusBadge = (s) => {
  const base = "px-2 py-0.5 text-xs font-semibold rounded-full border";
  const k = String(s || "pending").toLowerCase();
  if (k.includes("verified") || k === "approved") return `${base} bg-emerald-100 border-emerald-300 text-emerald-800`;
  if (k.includes("rejected")) return `${base} bg-rose-100 border-rose-300 text-rose-800`;
  if (k.includes("pending")) return `${base} bg-amber-100 border-amber-300 text-amber-800`;
  return `${base} bg-slate-100 border-slate-300 text-slate-800`;
};

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
    <div className={containerCls}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight">KYC Queue</h1>
        <button
          onClick={() => load()}
          className="px-3 py-2 rounded-lg border-2 border-slate-400 bg-white hover:bg-slate-50 font-semibold"
          aria-busy={loading}
        >
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className={`${cardCls} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-[15px] border-collapse">
            <thead className="bg-slate-100 sticky top-0">
              <tr className="text-left">
                <th className="px-3 py-3 font-semibold border-b-2 border-slate-200">Borrower</th>
                <th className="px-3 py-3 font-semibold border-b-2 border-slate-200">Phone</th>
                <th className="px-3 py-3 font-semibold border-b-2 border-slate-200">Status</th>
                <th className="px-3 py-3 font-semibold border-b-2 border-slate-200">Upload</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="p-4 text-slate-700" colSpan={4}>
                    Loading…
                  </td>
                </tr>
              ) : err ? (
                <tr>
                  <td className="p-4 text-rose-700" colSpan={4}>
                    {err}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="p-4 text-slate-700" colSpan={4}>
                    Queue is empty.
                  </td>
                </tr>
              ) : (
                rows.map((b) => (
                  <tr key={b.id} className="odd:bg-white even:bg-slate-50 border-t border-slate-200">
                    <td className="px-3 py-2">
                      <Link to={`/borrowers/${encodeURIComponent(b.id)}`} className={headerLink}>
                        {nameOf(b)}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{b.phone || "—"}</td>
                    <td className="px-3 py-2">
                      <span className={statusBadge(b.kycStatus || b.status)}>{b.kycStatus || b.status || "pending"}</span>
                    </td>
                    <td className="px-3 py-2">
                      <label className={uploadBtn}>
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
