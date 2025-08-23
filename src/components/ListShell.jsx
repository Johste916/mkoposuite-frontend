// frontend/src/components/ListShell.jsx
import React, { useMemo } from "react";
import Pagination from "./Pagination";

export default function ListShell({
  title,
  q,
  setQ,
  columns = [],
  rows = [],
  loading,
  error,
  page,
  setPage,
  limit,
  setLimit,
  total,
  toolbar,                // NEW: custom toolbar (filters/buttons)
  renderActions,          // legacy actions(row)
  renderRowActions,       // NEW: actions(row) — alias
}) {
  const hasActions = Boolean(renderActions || renderRowActions);

  const safeRows = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];
    return list.filter(Boolean);
  }, [rows]);

  const safeColumns = Array.isArray(columns) ? columns.filter(Boolean) : [];

  const renderCell = (col, row, rowIndex, colIndex) => {
    const value = row?.[col.key];

    if (typeof col.render === "function") {
      // Be tolerant to different render signatures:
      // 1) render({ row, value, column }) — robust new style
      // 2) render(value, row) — your current style
      // 3) render(row) — some older tables
      try {
        const resA = col.render({ row, value, column: col, rowIndex, colIndex });
        if (typeof resA !== "undefined") return resA;
      } catch (_) {}
      try {
        return col.render(value, row);
      } catch (_) {}
      try {
        return col.render(row);
      } catch (_) {}
    }

    // Default fallback
    if (value === null || typeof value === "undefined" || value === "") return "—";
    return String(value);
  };

  const renderRowAct = (row) => {
    if (typeof renderRowActions === "function") return renderRowActions(row);
    if (typeof renderActions === "function") return renderActions(row);
    return null;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
        <h3 className="text-lg font-semibold">{title}</h3>

        {/* Search (only if q+setQ are provided) */}
        {(typeof q !== "undefined" && typeof setQ === "function") && (
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="px-3 py-2 border rounded w-full sm:w-60 dark:bg-gray-700"
          />
        )}
      </div>

      {/* Optional toolbar row (filters, buttons, etc.) */}
      {toolbar ? (
        <div className="mb-3">{toolbar}</div>
      ) : null}

      {error && (
        <div className="text-red-500 text-sm mb-3">Error: {String(error)}</div>
      )}

      {loading ? (
        <div className="py-10 text-center text-sm opacity-70">Loading…</div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b dark:border-gray-700">
                {safeColumns.map((c) => (
                  <th key={c.key || c.title} className="px-3 py-2">
                    {c.title ?? c.key ?? ""}
                  </th>
                ))}
                {hasActions && <th className="px-3 py-2">Actions</th>}
              </tr>
            </thead>

            <tbody>
              {safeRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={safeColumns.length + (hasActions ? 1 : 0)}
                    className="px-3 py-10 text-center opacity-70"
                  >
                    No data
                  </td>
                </tr>
              ) : (
                safeRows.map((row, rIdx) => (
                  <tr
                    key={row?.id ?? rIdx}
                    className="border-b last:border-0 dark:border-gray-700"
                  >
                    {safeColumns.map((col, cIdx) => (
                      <td key={col.key || cIdx} className="px-3 py-2">
                        {renderCell(col, row, rIdx, cIdx)}
                      </td>
                    ))}
                    {hasActions && (
                      <td className="px-3 py-2">
                        {renderRowAct(row)}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={page}
        setPage={setPage}
        limit={limit}
        setLimit={setLimit}
        total={total}
      />
    </div>
  );
}
