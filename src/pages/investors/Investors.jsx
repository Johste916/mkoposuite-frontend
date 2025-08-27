import React from "react";
import { Link } from "react-router-dom";
import usePaginatedFetch from "../../hooks/usePaginatedFetch";
import ListShell from "../../components/ListShell";

export default function Investors() {
  const {
    rows, total, page, setPage, limit, setLimit, q, setQ, loading, error
  } = usePaginatedFetch({ url: "/investors" });

  const columns = [
    {
      key: "identity",
      title: "Investor",
      render: (r) => (
        <div className="flex items-center gap-3">
          <img
            src={r.photoUrl || "https://placehold.co/48x48?text=INV"}
            alt={r.name}
            className="w-10 h-10 rounded-full object-cover border"
          />
          <div>
            <div className="font-medium">{r.name}</div>
            <div className="text-xs text-slate-500">
              {r.email || "—"} · {r.phone || "—"}
            </div>
          </div>
        </div>
      ),
    },
    { key: "shares", title: "Shares" },
    {
      key: "contributions",
      title: "Contributions",
      render: (r) => new Intl.NumberFormat().format(Number(r.contributions || 0)),
    },
    {
      key: "actions",
      title: "",
      render: (r) => (
        <Link
          to={`/investors/${r.id}`}
          className="text-blue-600 hover:underline text-sm"
        >
          View Investor
        </Link>
      ),
    },
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
