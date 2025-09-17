import React, { useEffect, useState } from "react";
import api from "../../api";

const BorrowerKYC = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = async (signal) => {
    try {
      setLoading(true);
      const res = await api.get("/borrowers/kyc/queue", { signal });
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
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("file", f));
    await api.post(`/borrowers/${borrowerId}/kyc`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    await load();
    alert("KYC uploaded");
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">KYC Queue</h1>
      <div className="bg-white rounded-xl shadow border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left">Borrower</th>
              <th className="px-3 py-2 text-left">Phone</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Upload</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-4 text-gray-500" colSpan={4}>Loading…</td></tr>
            ) : err ? (
              <tr><td className="p-4 text-red-600" colSpan={4}>{err}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="p-4 text-gray-500" colSpan={4}>Queue is empty.</td></tr>
            ) : (
              rows.map((b) => {
                const name = b.name || `${b.firstName || ""} ${b.lastName || ""}`.trim() || b.id;
                return (
                  <tr key={b.id} className="border-t">
                    <td className="px-3 py-2">{name}</td>
                    <td className="px-3 py-2">{b.phone || "—"}</td>
                    <td className="px-3 py-2">{b.kycStatus || b.status || "pending"}</td>
                    <td className="px-3 py-2">
                      <input
                        type="file"
                        multiple
                        onChange={(e) => uploadFor(b.id, e.target.files)}
                      />
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

export default BorrowerKYC;
