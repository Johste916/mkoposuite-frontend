import React from "react";
import usePaginatedFetch from "../../hooks/usePaginatedFetch";
import ListShell from "../../components/ListShell";

export default function SavingsTransactions() {
  const { rows, total, page, setPage, limit, setLimit, q, setQ, loading, error } =
    usePaginatedFetch({ url: "/savings-transactions" });

  const columns = [
    { key: "type", title: "Type" },
    { key: "amount", title: "Amount" },
    { key: "reference", title: "Reference" },
    { key: "borrowerName", title: "Borrower" },
    { key: "staffName", title: "Staff" },
    { key: "createdAt", title: "Created", render: v => v ? new Date(v).toLocaleString() : "—" },
  ];

  return (
    <ListShell title="Savings Transactions" q={q} setQ={setQ} columns={columns}
      rows={rows} loading={loading} error={error}
      page={page} setPage={setPage} limit={limit} setLimit={setLimit} total={total} />
  );
}
