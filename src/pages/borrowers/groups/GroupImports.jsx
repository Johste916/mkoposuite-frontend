// src/pages/borrowers/groups/GroupImports.jsx
import React, { useState } from "react";
import api from "../../../api";

/** Handle both /x and /api/x without double-prefix issues */
function apiVariants(p) {
  const clean = p.startsWith("/") ? p : `/${p}`;
  const noApi = clean.replace(/^\/api\//, "/");
  const withApi = noApi.startsWith("/api/") ? noApi : `/api${noApi}`;
  return Array.from(new Set([noApi, withApi]));
}

async function tryPOST(paths = [], body, opts = {}) {
  let lastErr;
  for (const p of paths) {
    try { const res = await api.post(p, body, opts); return res?.data; }
    catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("No endpoint succeeded");
}

const GroupImports = () => {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [msg, setMsg] = useState("");

  const handleImport = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!file) return;

    const fd = new FormData();
    fd.append("file", file);

    try {
      setImporting(true);
      await tryPOST(
        [
          ...apiVariants("borrowers/groups/import"),
          ...apiVariants("groups/import"),
          ...apiVariants("borrower-groups/import"),
        ],
        fd,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setMsg("✅ Import uploaded. Processing…");
      setFile(null);
    } catch (err) {
      const text = err?.response?.data?.error || err?.message || "Import failed.";
      setMsg(`❌ ${text}`);
    } finally {
      setImporting(false);
    }
  };

  const downloadSample = () => {
    // Minimal CSV template that your backend can accept/ignore extra columns safely.
    const csv =
      "name,branchId,officerId,meetingDay,notes,members\n" +
      "Group A,1,,monday,Example notes,\"254700000001;254700000002\"\n" +
      "Group B,1,,friday,,\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "group_import_sample.csv";
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  };

  return (
    <div className="max-w-2xl p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Group Imports</h1>
      <div className="bg-white rounded shadow p-4 space-y-4">
        <form onSubmit={handleImport} className="space-y-3">
          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full"
          />
          <div className="text-xs text-gray-500">
            Accepted: CSV/XLSX. Columns: <b>name, branchId, officerId, meetingDay, notes, members</b>{' '}
            (meetingDay must be lowercase to match DB enum: monday…sunday; members can be a semicolon-separated list of borrower identifiers or phone numbers).
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!file || importing}
              className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
            >
              {importing ? "Uploading…" : "Upload"}
            </button>
            <button
              type="button"
              onClick={downloadSample}
              className="px-3 py-2 border rounded"
            >
              Download Sample
            </button>
          </div>
          {msg && <div className="text-sm">{msg}</div>}
        </form>
      </div>
    </div>
  );
};

export default GroupImports;
