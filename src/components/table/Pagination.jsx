// src/components/table/Pagination.jsx
import React from "react";

export default function Pagination({
  page = 1,
  pageSize = 25,
  total = 0,
  onPageChange,
  onPageSizeChange,
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-2 py-3">
      <div className="text-sm text-gray-600">
        Page <span className="font-medium">{page}</span> of{" "}
        <span className="font-medium">{totalPages}</span> •{" "}
        <span className="font-medium">{total}</span> rows
      </div>

      <div className="flex items-center gap-2">
        <select
          className="border rounded px-2 py-1 text-sm"
          value={pageSize}
          onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
          aria-label="Rows per page"
        >
          {[10, 25, 50, 100].map((s) => (
            <option key={s} value={s}>
              {s} / page
            </option>
          ))}
        </select>

        <div className="inline-flex rounded border overflow-hidden">
          <button
            className="px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
            onClick={() => onPageChange?.(Math.max(1, page - 1))}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            ‹ Prev
          </button>
          <button
            className="px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50 border-l"
            onClick={() => onPageChange?.(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            Next ›
          </button>
        </div>
      </div>
    </div>
  );
}
