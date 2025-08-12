import React from "react";
import usePaginatedFetch from "../../hooks/usePaginatedFetch";
import ListShell from "../../components/ListShell";

export default function Expenses() {
  const { rows, total, page, setPage, limit, setLimit, q, setQ, loading, error } =
    usePaginatedFetch({ url: "/expenses" });

  const columns = [
    { key: "date", title: "Date" },
    { key: "type", title: "Type" },
    { key: "vendor", title: "Vendor" },
    { key: "reference", title: "Reference" },
    { key: "amount", title: "Amount" },
    { key: "note", title: "Note" },
  ];

  return (
    <ListShell title="Expenses" q={q} setQ={setQ} columns={columns}
      rows={rows} loading={loading} error={error}
      page={page} setPage={setPage} limit={limit} setLimit={setLimit} total={total} />
  );
}
