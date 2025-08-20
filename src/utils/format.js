// src/utils/format.js
export const fmtTZS = (v, currency = "TZS") =>
  v == null || v === "" ? "—" : `\u200e${currency} ${Number(v || 0).toLocaleString()}`;

export const fmtNum = (v) =>
  v == null || v === "" ? "—" : Number(v).toLocaleString();

export const fmtPct = (v) =>
  v == null || v === "" ? "—" : `${Number(v)}%`;

export const fmtDate = (d) => {
  if (!d) return "—";
  const dt = typeof d === "string" || typeof d === "number" ? new Date(d) : d;
  const ok = !isNaN(dt?.getTime?.());
  return ok ? dt.toLocaleDateString() : "—";
};

// (Optional) a tiny HTML escaper used by exporters
export const escapeHtml = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Convenience: get ordered headers from first row if none provided
export const inferHeaders = (rows = []) => (rows[0] ? Object.keys(rows[0]) : []);
