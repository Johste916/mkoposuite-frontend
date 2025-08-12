import React from "react";
import usePaginatedFetch from "../../hooks/usePaginatedFetch";
import ListShell from "../../components/ListShell";

export default function CollectionSheets() {
  const { rows, total, page, setPage, limit, setLimit, q, setQ, loading, error } =
    usePaginatedFetch({ url: "/collections" });

  const columns = [
    { key: "date", title: "Date" },
    { key: "type", title: "Type" },
    { key: "collector", title: "Collector" },
    { key: "loanOfficer", title: "Loan Officer" },
    { key: "status", title: "Status" },
  ];

  return (
    <ListShell title="Collection Sheets" q={q} setQ={setQ} columns={columns}
      rows={rows} loading={loading} error={error}
      page={page} setPage={setPage} limit={limit} setLimit={setLimit} total={total} />
  );
}
