import React from "react";
import usePaginatedFetch from "../../hooks/usePaginatedFetch";
import ListShell from "../../components/ListShell";

export default function Payroll() {
  const { rows, total, page, setPage, limit, setLimit, q, setQ, loading, error } =
    usePaginatedFetch({ url: "/payroll" });

  const columns = [
    { key: "period", title: "Period" },
    { key: "status", title: "Status" },
    { key: "preparedBy", title: "Prepared By" },
    { key: "createdAt", title: "Created", render: v => v ? new Date(v).toLocaleString() : "—" },
  ];

  return (
    <ListShell title="Payroll" q={q} setQ={setQ} columns={columns}
      rows={rows} loading={loading} error={error}
      page={page} setPage={setPage} limit={limit} setLimit={setLimit} total={total} />
  );
}
