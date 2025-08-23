import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import usePaginatedFetch from "../../hooks/usePaginatedFetch";
import ListShell from "../../components/ListShell";

export default function CollateralList() {
  // filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Build URL with filters (hook will avoid /api/api)
  const baseUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (category) params.set("category", category);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const qs = params.toString();
    return qs ? `/api/collateral?${qs}` : "/api/collateral";
  }, [q, status, category, dateFrom, dateTo]);

  const {
    rows,
    total,
    page,
    setPage,
    limit,
    setLimit,
    loading,
    error,
    refresh,
  } = usePaginatedFetch({ url: baseUrl });

  // Normalize rows so renderers never explode
  const safeRows = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];
    return list
      .filter(Boolean)
      .map((r, i) => ({
        id: r?.id ?? `tmp-${i}`,
        itemName: r?.itemName ?? "-",
        category: r?.category ?? "-",
        model: r?.model ?? "-",
        serialNumber: r?.serialNumber ?? "-",
        estValue: r?.estValue ?? null,
        status: r?.status ?? "-",
        location: r?.location ?? "-",
        createdAt: r?.createdAt ?? null,
      }));
  }, [rows]);

  const columns = [
    { key: "itemName", title: "Item" },
    { key: "category", title: "Category" },
    { key: "model", title: "Model" },
    { key: "serialNumber", title: "Serial #" },
    {
      key: "estValue",
      title: "Est. Value",
      render: (rowArg) => {
        // Support both styles: render(row) or render({ row })
        const row = rowArg?.id ? rowArg : rowArg?.row ?? {};
        const v = row?.estValue;
        if (v == null || v === "") return "-";
        // format to TZS-like
        const n = Number(v);
        return Number.isFinite(n) ? n.toLocaleString() : String(v);
      },
    },
    {
      key: "status",
      title: "Status",
      render: (rowArg) => {
        const row = rowArg?.id ? rowArg : rowArg?.row ?? {};
        const s = String(row?.status || "-").toUpperCase();
        const cls =
          s === "ACTIVE"
            ? "bg-green-100 text-green-700"
            : s === "RELEASED"
            ? "bg-blue-100 text-blue-700"
            : s === "DISPOSED"
            ? "bg-red-100 text-red-700"
            : "bg-gray-100 text-gray-700";
        return (
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
            {s}
          </span>
        );
      },
    },
    { key: "location", title: "Location" },
  ];

  const exportHref = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (status) p.set("status", status);
    if (category) p.set("category", category);
    if (dateFrom) p.set("dateFrom", dateFrom);
    if (dateTo) p.set("dateTo", dateTo);
    p.set("export", "csv");
    return `/api/collateral?${p.toString()}`;
  }, [q, status, category, dateFrom, dateTo]);

  return (
    <ListShell
      title="Collateral"
      q={q}
      setQ={setQ}
      columns={columns}
      rows={safeRows}
      loading={loading}
      error={error}
      page={page}
      setPage={setPage}
      limit={limit}
      setLimit={setLimit}
      total={total}
      toolbar={
        <div className="flex flex-wrap items-center gap-2 w-full">
          <Link
            to="/collateral/new"
            className="mr-3 border rounded px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700"
          >
            + Add Collateral
          </Link>

          <label className="text-sm">Status</label>
          <select
            className="border rounded px-2 py-1"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="RELEASED">RELEASED</option>
            <option value="DISPOSED">DISPOSED</option>
          </select>

          <label className="text-sm ml-3">Category</label>
          <input
            className="border rounded px-2 py-1"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Electronics / Vehicle…"
          />

          <label className="text-sm ml-3">From</label>
          <input
            type="date"
            className="border rounded px-2 py-1"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <label className="text-sm">To</label>
          <input
            type="date"
            className="border rounded px-2 py-1"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />

          <button
            onClick={refresh}
            className="ml-2 border rounded px-3 py-1 text-sm hover:bg-gray-50"
          >
            Refresh
          </button>

          <a
            href={exportHref}
            className="ml-auto inline-flex items-center border rounded px-3 py-1 text-sm hover:bg-gray-50"
          >
            Export CSV
          </a>
        </div>
      }
      renderRowActions={(rowArg) => {
        const row = rowArg?.id ? rowArg : rowArg?.row ?? {};
        const id = row?.id;
        return id ? (
          <div className="flex gap-3">
            <Link to={`/collateral/${id}/edit`} className="text-blue-600 hover:underline text-sm">
              Edit
            </Link>
          </div>
        ) : null;
      }}
    />
  );
}
