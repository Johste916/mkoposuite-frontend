import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import usePaginatedFetch from "../../hooks/usePaginatedFetch";
import ListShell from "../../components/ListShell";

/**
 * CollectionSheets list page (final)
 * - Filters: status, type, dateFrom/dateTo, collector, loanOfficer
 * - CSV export reuses current filters & q
 * - Adds "New Collection Sheet" button + row actions (Edit)
 */
export default function CollectionSheets() {
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [dateFrom, setDateFrom] = useState("");  // yyyy-mm-dd
  const [dateTo, setDateTo] = useState("");      // yyyy-mm-dd
  const [collector, setCollector] = useState("");
  const [loanOfficer, setLoanOfficer] = useState("");

  const baseUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (collector) params.set("collector", collector);
    if (loanOfficer) params.set("loanOfficer", loanOfficer);
    const qs = params.toString();
    return qs ? `/collections?${qs}` : "/collections";
  }, [status, type, dateFrom, dateTo, collector, loanOfficer]);

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
  } = usePaginatedFetch({ url: baseUrl });

  const columns = [
    { key: "date", title: "Date" },
    { key: "type", title: "Type" },
    { key: "collector", title: "Collector" },
    { key: "loanOfficer", title: "Loan Officer" },
    { key: "status", title: "Status" },
    // If your ListShell supports a render cell/slot, add actions there.
  ];

  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (collector) params.set("collector", collector);
    if (loanOfficer) params.set("loanOfficer", loanOfficer);
    params.set("export", "csv");
    return `/collections?${params.toString()}`;
  }, [q, status, type, dateFrom, dateTo, collector, loanOfficer]);

  return (
    <ListShell
      title="Collection Sheets"
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
      toolbar={
        <div className="flex flex-wrap items-center gap-2 w-full">
          <Link
            to="/collections/new"
            className="mr-3 border rounded px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700"
          >
            + New Collection Sheet
          </Link>

          <label className="text-sm">Status</label>
          <select className="border rounded px-2 py-1" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="PENDING">PENDING</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>

          <label className="text-sm ml-3">Type</label>
          <select className="border rounded px-2 py-1" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All</option>
            <option value="FIELD">FIELD</option>
            <option value="OFFICE">OFFICE</option>
            <option value="AGENCY">AGENCY</option>
          </select>

          <label className="text-sm ml-3">From</label>
          <input type="date" className="border rounded px-2 py-1" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <label className="text-sm">To</label>
          <input type="date" className="border rounded px-2 py-1" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />

          <input
            placeholder="Collector"
            className="border rounded px-2 py-1 ml-3"
            value={collector}
            onChange={(e) => setCollector(e.target.value)}
          />
          <input
            placeholder="Loan Officer"
            className="border rounded px-2 py-1"
            value={loanOfficer}
            onChange={(e) => setLoanOfficer(e.target.value)}
          />

          <a href={exportHref} className="ml-auto inline-flex items-center border rounded px-3 py-1 text-sm hover:bg-gray-50">
            Export CSV
          </a>
        </div>
      }
      // If ListShell supports row actions, you can pass a render prop like this:
      renderRowActions={(row) => (
        <Link
          to={`/collections/${row.id}/edit`}
          className="text-blue-600 hover:underline text-sm"
        >
          Edit
        </Link>
      )}
    />
  );
}
