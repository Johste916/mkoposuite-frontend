import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import usePaginatedFetch from "../../hooks/usePaginatedFetch";
import ListShell from "../../components/ListShell";
import api from "../../api";

const canWriteRoles = new Set(["admin", "director", "branch_manager"]);
function useRole() {
  try {
    const raw = localStorage.getItem("auth") || localStorage.getItem("user") || "";
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed?.role || parsed?.user?.role || "user";
  } catch { return "user"; }
}

export default function CollateralList() {
  const role = useRole();
  const canWrite = canWriteRoles.has(role);

  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");

  const baseUrl = useMemo(() => {
    const p = new URLSearchParams();
    if (status) p.set("status", status);
    if (category) p.set("category", category);
    const qs = p.toString();
    return qs ? `/api/collateral?${qs}` : "/api/collateral";
  }, [status, category]);

  const { rows, total, page, setPage, limit, setLimit, q, setQ, loading, error } =
    usePaginatedFetch({ url: baseUrl });

  const columns = [
    { key: "itemName", title: "Item" },
    { key: "category", title: "Category" },
    { key: "model", title: "Model" },
    { key: "serialNumber", title: "Serial" },
    { key: "estValue", title: "Est. Value" },
    { key: "status", title: "Status" },
    { key: "location", title: "Location" },
  ];

  const exportHref = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (status) p.set("status", status);
    if (category) p.set("category", category);
    p.set("export", "csv");
    return `/api/collateral?${p.toString()}`;
  }, [q, status, category]);

  return (
    <ListShell
      title="Collateral"
      q={q}
      setQ={setQ}
      columns={[
        ...columns,
        canWrite && {
          key: "__actions__",
          title: "Actions",
          render: (row) => (
            <div className="flex items-center gap-2">
              <button
                className="text-emerald-600 text-sm"
                onClick={async () => {
                  await api.post(`/api/collateral/${row.id}/release`);
                  window.location.reload();
                }}
                disabled={row.status === "RELEASED"}
                title="Mark as released"
              >
                Release
              </button>
              <Link to={`/collateral/${row.id}/edit`} className="text-blue-600 text-sm">
                Edit
              </Link>
            </div>
          ),
        },
      ].filter(Boolean)}
      rows={rows}
      loading={loading}
      error={error}
      page={page}
      setPage={setPage}
      limit={limit}
      setLimit={setLimit}
      total={total}
      toolbar={
        <div className="flex flex-wrap items-center gap-2 w-full">
          {canWrite && (
            <Link
              to="/collateral/add"
              className="mr-3 border rounded px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700"
            >
              + Add Collateral
            </Link>
          )}
          <label className="text-sm">Status</label>
          <select className="border rounded px-2 py-1" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="RELEASED">RELEASED</option>
            <option value="DISPOSED">DISPOSED</option>
          </select>

          <label className="text-sm ml-3">Category</label>
          <input
            className="border rounded px-2 py-1"
            placeholder="e.g. Vehicle"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />

          <a
            href={exportHref}
            className="ml-auto inline-flex items-center border rounded px-3 py-1 text-sm hover:bg-gray-50"
          >
            Export CSV
          </a>
        </div>
      }
    />
  );
}
