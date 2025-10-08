import React from "react";

/**
 * Responsive filter bar that wraps neatly on small screens.
 * Adds a top toolbar area so "Filters" + "Clear all" (or any right actions)
 * snap to the right place and never float outside the card.
 */
export default function FilterBar({
  children,
  right,
  title = "Filters",
  onClear,
  className = "",
}) {
  return (
    <div className={`rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 ${className}`}>
      {/* Toolbar row */}
      <div className="filters-toolbar flex items-center justify-between gap-2">
        <div className="text-[11px] uppercase tracking-wide opacity-70">{title}</div>

        {/* Prefer explicit `right` content; otherwise show Clear All if provided */}
        {right ? (
          <div className="flex items-center gap-2">{right}</div>
        ) : onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="px-2 py-1 text-xs rounded border border-[var(--border)] hover:bg-[var(--nav-item-hover-bg)]"
          >
            Clear all
          </button>
        ) : null}
      </div>

      {/* Fields */}
      <div className="mt-2 flex flex-wrap gap-2">
        {children}
      </div>
    </div>
  );
}
