import React from "react";

export default function Pagination({ page, setPage, limit, setLimit, total }) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / (limit || 20)));
  return (
    <div className="flex items-center justify-between gap-3 mt-4 text-sm">
      <div className="flex items-center gap-2">
        <span>Rows:</span>
        <select
          className="border rounded px-2 py-1"
          value={limit}
          onChange={(e) => { setPage(1); setLimit(parseInt(e.target.value, 10)); }}
        >
          {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="px-3 py-1 border rounded disabled:opacity-50"
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          Prev
        </button>
        <span>Page {page} / {totalPages}</span>
        <button
          className="px-3 py-1 border rounded disabled:opacity-50"
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
