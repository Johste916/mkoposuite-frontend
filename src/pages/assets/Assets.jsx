import React from "react";
import usePaginatedFetch from "../../hooks/usePaginatedFetch";
import ListShell from "../../components/ListShell";

export default function Assets() {
  const { rows, total, page, setPage, limit, setLimit, q, setQ, loading, error } =
    usePaginatedFetch({ url: "/assets" });

  const columns = [
    { key: "name", title: "Name" },
    { key: "category", title: "Category" },
    { key: "status", title: "Status" },
    { key: "serialNumber", title: "Serial" },
    { key: "createdAt", title: "Added", render: v => v ? new Date(v).toLocaleDateString() : "—" },
  ];

  return (
    <ListShell title="Assets" q={q} setQ={setQ} columns={columns}
      rows={rows} loading={loading} error={error}
      page={page} setPage={setPage} limit={limit} setLimit={setLimit} total={total} />
  );
}
