// src/utils/exporters.js
import { escapeHtml } from "./format";

/**
 * Flexible arg support:
 * - exportCSV(rows, filename?)
 * - exportCSV({ rows, headers, filename, title })
 */
export function exportCSV(arg1, filenameMaybe) {
  const { rows, headers, filename } =
    Array.isArray(arg1)
      ? { rows: arg1, headers: _inferHeaders(arg1), filename: filenameMaybe || "export.csv" }
      : {
          rows: arg1?.rows || [],
          headers: arg1?.headers || _inferHeaders(arg1?.rows || []),
          filename: arg1?.filename || "export.csv",
        };

  const safe = (v) => String(v ?? "").replace(/"/g, '""');
  const head = headers.join(",");
  const body = rows
    .map((r) => headers.map((h) => `"${safe(r[h])}"`).join(","))
    .join("\n");
  const csv = `${head}\n${body}`;
  _downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
}

/**
 * - exportExcel(rows, filename?)
 * - exportExcel({ rows, headers, filename, title })
 * Note: uses HTML table with XLS mime so Excel opens it.
 */
export function exportExcel(arg1, filenameMaybe) {
  const { rows, headers, filename, title } =
    Array.isArray(arg1)
      ? { rows: arg1, headers: _inferHeaders(arg1), filename: filenameMaybe || "export.xls" }
      : {
          rows: arg1?.rows || [],
          headers: arg1?.headers || _inferHeaders(arg1?.rows || []),
          filename: arg1?.filename || "export.xls",
          title: arg1?.title || "Export",
        };

  const table =
    `<h1>${escapeHtml(title || "")}</h1>` +
    `<table border="1"><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>` +
    rows
      .map(
        (r) =>
          `<tr>${headers
            .map((h) => `<td>${escapeHtml(String(r[h] ?? ""))}</td>`)
            .join("")}</tr>`
      )
      .join("") +
    `</tbody></table>`;

  const blob = new Blob([`\ufeff${table}`], { type: "application/vnd.ms-excel" });
  _downloadBlob(blob, filename);
}

/**
 * - exportPDF(rows, filename?) -> opens print dialog (user can save as PDF)
 * - exportPDF({ rows, headers, title })
 */
export function exportPDF(arg1, filenameMaybe) {
  const { rows, headers, title } =
    Array.isArray(arg1)
      ? { rows: arg1, headers: _inferHeaders(arg1), title: "Export" }
      : {
          rows: arg1?.rows || [],
          headers: arg1?.headers || _inferHeaders(arg1?.rows || []),
          title: arg1?.title || "Export",
        };

  const style = `
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji; padding: 16px; }
      h1 { font-size: 16px; margin: 0 0 12px 0; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #ccc; padding: 6px; text-align: left; white-space: nowrap; }
      thead { background: #f3f4f6; }
    </style>
  `;

  const html =
    `<h1>${escapeHtml(title)}</h1><table><thead><tr>${headers
      .map((h) => `<th>${escapeHtml(h)}</th>`)
      .join("")}</tr></thead><tbody>` +
    rows
      .map(
        (r) =>
          `<tr>${headers
            .map((h) => `<td>${escapeHtml(String(r[h] ?? ""))}</td>`)
            .join("")}</tr>`
      )
      .join("") +
    `</tbody></table>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(`<html><head><title>${escapeHtml(title)}</title>${style}</head><body>${html}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }
}

/* ---------- internal helpers ---------- */
function _inferHeaders(rows = []) {
  return rows[0] ? Object.keys(rows[0]) : [];
}

function _downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "export";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
