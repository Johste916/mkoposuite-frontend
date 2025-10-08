// src/components/BrandMark.jsx
import React from "react";

/**
 * Stylish brand word-mark used on login + header
 * Props:
 *  - size: controls the icon tile size (and scales word size)
 *  - showWord: toggle the "MkopoSuite" text
 *  - stacked: set true to stack icon above word (e.g., in tight spaces)
 */
export default function BrandMark({
  size = 36,
  showWord = true,
  stacked = false,
  className = "",
}) {
  const box = Math.max(28, size);
  const wordPx = Math.max(20, Math.round(box * 0.9)); // scale word slightly with icon

  // Gradient text style for "Suite"
  const suiteGradient = {
    backgroundImage:
      "linear-gradient(90deg, var(--primary), #6366f1 60%, #8b5cf6 100%)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
  };

  // Soft gradient tile behind the logo glyph
  const tileGradient = {
    background:
      "linear-gradient(135deg, rgba(59,130,246,.12), rgba(99,102,241,.18))",
    borderColor: "var(--border)",
    color: "var(--primary)",
  };

  return (
    <div
      className={`${stacked ? "flex-col" : "flex-row"} inline-flex items-center gap-3 ${className}`}
      style={{ lineHeight: 1 }}
      aria-label="MkopoSuite"
    >
      <div
        className="grid place-items-center rounded-2xl ring-1 shadow-[0_8px_24px_-10px_rgba(15,23,42,.35)]"
        style={{ width: box, height: box, ...tileGradient }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
          <path d="M12 2c-.3 0-.6.1-.8.3L3.7 8.6c-.2.2-.3.5-.3.8v9c0 .9.7 1.6 1.6 1.6h5c.3 0 .6-.1.8-.3l7.5-6.3c.2-.2.3-.5.3-.8V3.6C18.6 2.7 17.9 2 17 2h-5zM6.5 18.2V11l5.2-4.4H17v6.8l-5.3 4.4H6.5z" />
        </svg>
      </div>

      {showWord && (
        <div
          className="font-black tracking-tight"
          style={{ fontSize: `${wordPx}px` }}
        >
          <span style={{ color: "var(--fg)" }}>Mkopo</span>
          <span style={suiteGradient}>Suite</span>
        </div>
      )}
    </div>
  );
}
