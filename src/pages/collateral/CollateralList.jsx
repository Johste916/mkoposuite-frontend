import React from "react";
import usePaginatedFetch from "../../hooks/usePaginatedFetch";
import ListShell from "../../components/ListShell";

export default function CollateralList() {
  const { rows, total, page, setPage, limit, setLimit, q, setQ, loading, error } =
    usePaginatedFetch({ url: "/collateral" });

  const columns = [
    { key: "item", title: "Item" },
    { key: "model", title: "Model" },
    { key: "serialNumber", title: "Serial" },
    { key: "status", title: "Status" },
    { key: "borrowerName", title: "Borrower" },
    { key: "createdAt", title: "Added", render: v => v ? new Date(v).toLocaleString() : "—" },
  ];

  return (
    <ListShell
      title="Collateral"
      q={q} setQ={setQ}
      columns={columns}
      rows={rows}
      loading={loading}
      error={error}
      page={page} setPage={setPage}
      limit={limit} setLimit={setLimit}
      total={total}
    />
  );
}
