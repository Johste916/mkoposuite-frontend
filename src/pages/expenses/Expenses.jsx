import React, { useMemo } from "react";
import usePaginatedFetch from "../../hooks/usePaginatedFetch";
import ListShell from "../../components/ListShell";

export default function Expenses() {
  // Always call API on the /api path; hook will avoid double /api if baseURL already ends with /api
  const { rows, total, page, setPage, limit, setLimit, q, setQ, loading, error } =
    usePaginatedFetch({ url: "/api/expenses" });

  const columns = useMemo(() => ([
    { key: "date", title: "Date" },
    { key: "type", title: "Type" },
    { key: "vendor", title: "Vendor" },
    { key: "reference", title: "Reference" },
    {
      key: "amount",
      title: "Amount",
      render: (row) => {
        const v = row?.amount;
        const n = Number(v);
        return Number.isFinite(n) ? n.toLocaleString() : (v ?? "—");
      }
    },
    { key: "note", title: "Note" },
  ]), []);

  return (
    <ListShell
      title="Expenses"
      q={q}
      setQ={setQ}
      columns={columns}
      rows={Array.isArray(rows) ? rows : []}
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
