import React from "react";

export default function Pagination({ page, setPage, limit, setLimit, total }) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / (limit || 20)));

  return (
    <div className="flex items-center justify-between gap-3 mt-4 text-sm">
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2">
          <span>Rows:</span>
          <select
            className="border border-[var(--border)] bg-[var(--input-bg)] text-[var(--input-fg)] rounded px-2 py-1"
            value={limit}
            onChange={(e) => { setPage(1); setLimit(parseInt(e.target.value, 10)); }}
            aria-label="Rows per page"
          >
            {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="px-3 py-1 border border-[var(--border)] bg-[var(--card)] rounded disabled:opacity-50 hover:bg-[var(--chip-soft)]"
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          Prev
        </button>
        <span aria-live="polite">Page {page} / {totalPages}</span>
        <button
          className="px-3 py-1 border border-[var(--border)] bg-[var(--card)] rounded disabled:opacity-50 hover:bg-[var(--chip-soft)]"
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          Next
        </button>
      </div>
    </div>
  );
}
