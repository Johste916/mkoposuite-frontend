import React from "react";
import usePaginatedFetch from "../../hooks/usePaginatedFetch";
import ListShell from "../../components/ListShell";

export default function ESignatures() {
  const { rows, total, page, setPage, limit, setLimit, q, setQ, loading, error } =
    usePaginatedFetch({ url: "/esignatures" });

  const columns = [
    { key: "name", title: "Document" },
    { key: "type", title: "Type" },
    { key: "status", title: "Status" },
    { key: "originalFile", title: "Original" },
    { key: "signedFile", title: "Signed" },
    { key: "createdAt", title: "Uploaded", render: v => v ? new Date(v).toLocaleString() : "—" },
  ];

  return (
    <ListShell title="E-Signatures" q={q} setQ={setQ} columns={columns}
      rows={rows} loading={loading} error={error}
      page={page} setPage={setPage} limit={limit} setLimit={setLimit} total={total} />
  );
}
