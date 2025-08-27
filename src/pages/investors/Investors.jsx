import React from "react";
import usePaginatedFetch from "../../hooks/usePaginatedFetch";
import ListShell from "../../components/ListShell";

export default function Investors() {
  // Hook should call /api/investors?q=&page=&limit=
  const {
    rows,
    total,
    page,
    setPage,
    limit,
    setLimit,
    q,
    setQ,
    loading,
    error,
  } = usePaginatedFetch({ url: "/investors" });

  const columns = [
    { key: "name", title: "Name" },
    { key: "email", title: "Email" },
    { key: "phone", title: "Phone" },
    { key: "status", title: "Status" },
    { key: "productsCount", title: "Products" },
  ];

  return (
    <ListShell
      title="Investors"
      q={q}
      setQ={setQ}
      columns={columns}
      rows={rows}
      loading={loading}
      error={error}
      page={page}
      setPage={setPage}
      limit={limit}
      setLimit={setLimit}
      total={total}
    />
  );
}
