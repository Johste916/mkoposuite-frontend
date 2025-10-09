// src/pages/repayments/RepaymentReceipts.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// --- auto-sync events ---
const REPAYMENT_EVENTS = {
  posted: "repayment:posted",
  approved: "repayment:approved",
  rejected: "repayment:rejected",
  bulk: "repayment:bulk-posted",
};

const money = (v) => Number(v || 0).toLocaleString();
const toISO = (d) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const startDefault = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return toISO(d);
};

// Build a robust export URL using axios instance if available
const buildApiUrl = (url, params = {}) => {
  try {
    if (typeof api.getUri === "function") return api.getUri({ url, params });
  } catch {}
  const base = api?.defaults?.baseURL || "";
  const qs = new URLSearchParams(params).toString();
  return `${base}${url}${qs ? `?${qs}` : ""}`;
};

export default function RepaymentReceipts() {
  // filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("approved"); // approved|pending|rejected|all
  const [dateFrom, setDateFrom] = useState(startDefault());
  const [dateTo, setDateTo] = useState(toISO(new Date()));

  // data
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);

  // selection
  const [open, setOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const receiptRef = useRef(null);

  const pages = useMemo(
    () => Math.max(1, Math.ceil(Number(total || 0) / Number(pageSize || 1))),
    [total, pageSize]
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { page, pageSize };
      if (q.trim()) params.q = q.trim();
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (status && status !== "all") params.status = status;

      const { data } = await api.get("/repayments", { params });
      let items = Array.isArray(data) ? data : data?.items || [];

      // Safe client-side status filter
      if (status && status !== "all") {
        items = items.filter(
          (r) => String(r.status || "").toLowerCase() === status
        );
      }

      setRows(items);
      setTotal(Number(data?.total || items.length || 0));
    } catch (e) {
      console.error(e);
      setRows([]);
      setTotal(0);
      alert("Failed to load receipts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, dateFrom, dateTo, status]);

  // 🔔 auto-refresh when repayments happen anywhere
  useEffect(() => {
    const refresh = () => fetchData();
    window.addEventListener(REPAYMENT_EVENTS.posted, refresh);
    window.addEventListener(REPAYMENT_EVENTS.approved, refresh);
    window.addEventListener(REPAYMENT_EVENTS.rejected, refresh);
    window.addEventListener(REPAYMENT_EVENTS.bulk, refresh);
    return () => {
      window.removeEventListener(REPAYMENT_EVENTS.posted, refresh);
      window.removeEventListener(REPAYMENT_EVENTS.approved, refresh);
      window.removeEventListener(REPAYMENT_EVENTS.rejected, refresh);
      window.removeEventListener(REPAYMENT_EVENTS.bulk, refresh);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onSearch = (e) => {
    e?.preventDefault?.();
    setPage(1);
    fetchData();
  };

  const openReceipt = async (row) => {
    try {
      const { data } = await api.get(`/repayments/${row.id}`);
      setReceipt(data || null);
      setOpen(true);
    } catch (e) {
      console.error(e);
      alert("Failed to load receipt");
    }
  };

  const exportHref = useMemo(
    () =>
      buildApiUrl("/repayments/export", {
        q: q || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        status: status !== "all" ? status : undefined,
      }),
    [q, dateFrom, dateTo, status]
  );

  // --- PDF download of the open receipt ---
  const downloadPDF = async () => {
    if (!receiptRef.current) return;
    const node = receiptRef.current;

    const originalBg = node.style.backgroundColor;
    node.style.backgroundColor = "#ffffff";

    const canvas = await html2canvas(node, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      windowWidth: node.scrollWidth,
      windowHeight: node.scrollHeight,
    });

    node.style.backgroundColor = originalBg || "";

    const imgData = canvas.toDataURL("image/png");

    // Fit to A4
    const pdf = new jsPDF("p", "mm", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;

    if (imgH <= pageH) {
      pdf.addImage(imgData, "PNG", 0, 0, imgW, imgH);
    } else {
      // multi-page
      const canvasPageHeight = (canvas.width * pageH) / pageW;

      const pageCanvas = document.createElement("canvas");
      const pageCtx = pageCanvas.getContext("2d");
      pageCanvas.width = canvas.width;
      pageCanvas.height = canvasPageHeight;

      let sY = 0;
      let first = true;
      while (sY < canvas.height) {
        pageCtx.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
        pageCtx.drawImage(
          canvas,
          0,
          sY,
          canvas.width,
          canvasPageHeight,
          0,
          0,
          pageCanvas.width,
          pageCanvas.height
        );
        const pageImgData = pageCanvas.toDataURL("image/png");
        if (first) {
          pdf.addImage(pageImgData, "PNG", 0, 0, imgW, pageH);
          first = false;
        } else {
          pdf.addPage();
          pdf.addImage(pageImgData, "PNG", 0, 0, imgW, pageH);
        }
        sY += canvasPageHeight;
      }
    }

    const filename = `receipt_${receipt?.receiptNo || receipt?.id}.pdf`;
    pdf.save(filename);
  };

  const copyLink = async () => {
    if (!receipt?.id) return;
    const url = `${window.location.origin}/repayments/receipts?id=${receipt.id}`;
    try {
      await navigator.clipboard.writeText(url);
      alert("Receipt link copied");
    } catch {
      alert(url);
    }
  };

  const displayDate = (r) =>
    (r.date || r.paymentDate || r.paidAt || r.createdAt || "").slice(0, 10);
  const displayAmount = (r) => Number(r.amount ?? r.amountPaid ?? 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="rounded-lg p-5 flex items-center justify-between"
        style={{
          background: "var(--card)",
          border: "2px solid var(--border-strong)",
          boxShadow: "0 10px 20px rgba(0,0,0,.08)",
        }}
      >
        <div>
          <h2 className="text-xl font-semibold">Repayment Receipts</h2>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            View, print or export receipts. Export respects your current filters.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-3 py-2 rounded"
            style={{
              background: "var(--card)",
              color: "var(--fg)",
              border: "2px solid var(--border-strong)",
            }}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <a
            href={exportHref}
            target="_blank"
            rel="noreferrer"
            className="btn-primary px-3 py-2 rounded inline-flex items-center justify-center"
            title="Export filtered receipts as CSV"
          >
            Export CSV
          </a>
        </div>
      </div>

      {/* Filters */}
      <div
        className="rounded-lg p-5"
        style={{
          background: "var(--card)",
          border: "2px solid var(--border-strong)",
          boxShadow: "0 10px 20px rgba(0,0,0,.08)",
        }}
      >
        <form onSubmit={onSearch} className="grid md:grid-cols-7 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm mb-1" style={{ color: "var(--muted)" }}>
              Search
            </label>
            <input
              className="w-full rounded px-3 py-2 focus:outline-none focus:ring-2"
              style={{
                background: "var(--input-bg)",
                color: "var(--input-fg)",
                border: "2px solid var(--input-border)",
                "--tw-ring-color": "var(--ring)",
              }}
              placeholder="Borrower / Phone / Loan Ref / Method / Receipt"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1" style={{ color: "var(--muted)" }}>
              Status
            </label>
            <select
              className="w-full rounded px-3 py-2 focus:outline-none focus:ring-2"
              style={{
                background: "var(--input-bg)",
                color: "var(--input-fg)",
                border: "2px solid var(--input-border)",
                "--tw-ring-color": "var(--ring)",
              }}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="all">All</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1" style={{ color: "var(--muted)" }}>
              From
            </label>
            <input
              type="date"
              className="w-full rounded px-3 py-2 focus:outline-none focus:ring-2"
              style={{
                background: "var(--input-bg)",
                color: "var(--input-fg)",
                border: "2px solid var(--input-border)",
                "--tw-ring-color": "var(--ring)",
              }}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1" style={{ color: "var(--muted)" }}>
              To
            </label>
            <input
              type="date"
              className="w-full rounded px-3 py-2 focus:outline-none focus:ring-2"
              style={{
                background: "var(--input-bg)",
                color: "var(--input-fg)",
                border: "2px solid var(--input-border)",
                "--tw-ring-color": "var(--ring)",
              }}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1" style={{ color: "var(--muted)" }}>
              Page size
            </label>
            <select
              className="w-full rounded px-3 py-2 focus:outline-none focus:ring-2"
              style={{
                background: "var(--input-bg)",
                color: "var(--input-fg)",
                border: "2px solid var(--input-border)",
                "--tw-ring-color": "var(--ring)",
              }}
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {[20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 flex items-end gap-2">
            <button
              type="button"
              className="px-3 py-2 rounded"
              style={{
                background: "var(--card)",
                color: "var(--fg)",
                border: "2px solid var(--border-strong)",
              }}
              onClick={() => {
                setQ("");
                setStatus("approved");
                setDateFrom(startDefault());
                setDateTo(toISO(new Date()));
                setPage(1);
                fetchData();
              }}
            >
              Reset
            </button>
            <button
              type="submit"
              className="btn-primary px-3 py-2 rounded inline-flex items-center justify-center"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div
        className="rounded-lg overflow-hidden"
        style={{
          background: "var(--card)",
          border: "2px solid var(--border-strong)",
          boxShadow: "0 10px 20px rgba(0,0,0,.08)",
        }}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr
                style={{
                  background: "var(--table-head-bg)",
                  color: "var(--fg)",
                }}
              >
                {[
                  "Receipt No",
                  "Date",
                  "Loan Ref",
                  "Borrower",
                  "Method",
                  "Amount",
                  "Status",
                  "Action",
                ].map((h, i) => (
                  <th
                    key={h}
                    className={`p-3 text-left ${i === 7 ? "text-right" : ""}`}
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 && (
                <tr>
                  <td className="p-4" style={{ color: "var(--muted)" }} colSpan={8}>
                    No data.
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const loan = r.Loan || r.loan || {};
                const borrower = loan.Borrower || {};
                const currencyCode = r.currency || loan.currency || "TZS";
                const amount = displayAmount(r);

                return (
                  <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td className="p-3">{r.receiptNo || `RCPT-${r.id}`}</td>
                    <td className="p-3">{displayDate(r)}</td>
                    <td className="p-3">
                      {loan.reference || `L-${loan.id || r.loanId || ""}`}
                    </td>
                    <td className="p-3">{borrower.name || borrower.fullName || "—"}</td>
                    <td className="p-3 capitalize">{r.method || "cash"}</td>
                    <td className="p-3">
                      {currencyCode} {money(amount)}
                    </td>
                    <td className="p-3">{(r.status || "").toUpperCase() || "—"}</td>
                    <td className="p-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          className="px-3 py-1.5 rounded"
                          style={{
                            background: "var(--card)",
                            color: "var(--fg)",
                            border: "2px solid var(--border-strong)",
                          }}
                          onClick={() => openReceipt(r)}
                        >
                          View
                        </button>
                        <a
                          className="px-3 py-1.5 rounded"
                          style={{
                            background: "var(--card)",
                            color: "var(--fg)",
                            border: "2px solid var(--border-strong)",
                          }}
                          href={`/repayments/receipts?id=${r.id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open Page
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {loading && (
                <tr>
                  <td className="p-4" colSpan={8}>
                    Loading…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          className="flex items-center justify-between p-3"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Page {page} of {pages} • {total} total
          </p>
          <div className="flex gap-2">
            <button
              className="px-3 py-1.5 rounded disabled:opacity-50"
              style={{
                background: "var(--card)",
                color: "var(--fg)",
                border: "2px solid var(--border-strong)",
              }}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <button
              className="px-3 py-1.5 rounded disabled:opacity-50"
              style={{
                background: "var(--card)",
                color: "var(--fg)",
                border: "2px solid var(--border-strong)",
              }}
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Receipt modal */}
      {open && receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div
            ref={receiptRef}
            className="relative w-full max-w-2xl rounded-lg p-6 print:bg-white"
            style={{
              background: "var(--card)",
              color: "var(--fg)",
              border: "2px solid var(--border-strong)",
              boxShadow: "0 10px 28px rgba(0,0,0,.12)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Receipt #{receipt.receiptNo || receipt.id}
              </h3>
              <div className="flex gap-2">
                <button
                  className="px-3 py-1.5 rounded"
                  style={{
                    background: "var(--card)",
                    color: "var(--fg)",
                    border: "2px solid var(--border-strong)",
                  }}
                  onClick={() => window.print()}
                >
                  Print
                </button>
                <button
                  className="px-3 py-1.5 rounded"
                  style={{
                    background: "var(--card)",
                    color: "var(--fg)",
                    border: "2px solid var(--border-strong)",
                  }}
                  onClick={downloadPDF}
                >
                  Download PDF
                </button>
                <button
                  className="px-3 py-1.5 rounded"
                  style={{
                    background: "var(--card)",
                    color: "var(--fg)",
                    border: "2px solid var(--border-strong)",
                  }}
                  onClick={copyLink}
                >
                  Copy Link
                </button>
                <button
                  className="btn-primary px-3 py-1.5 rounded"
                  onClick={() => setOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p>
                  <span style={{ color: "var(--muted)" }}>Date:</span>{" "}
                  {(receipt.date || "").slice(0, 10)}
                </p>
                <p>
                  <span style={{ color: "var(--muted)" }}>Method:</span>{" "}
                  {receipt.method || "cash"}
                </p>
                {receipt.reference && (
                  <p>
                    <span style={{ color: "var(--muted)" }}>Reference:</span>{" "}
                    {receipt.reference}
                  </p>
                )}
                {receipt.notes && (
                  <p>
                    <span style={{ color: "var(--muted)" }}>Notes:</span>{" "}
                    {receipt.notes}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p style={{ color: "var(--muted)" }}>Amount</p>
                <p className="text-xl font-semibold">
                  {receipt.currency || "TZS"} {money(receipt.amount)}
                </p>
              </div>
            </div>

            <div
              className="my-4 pt-4 text-sm"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <p>
                <span style={{ color: "var(--muted)" }}>Loan:</span>{" "}
                {receipt.loan?.reference}
              </p>
              <p>
                <span style={{ color: "var(--muted)" }}>Borrower:</span>{" "}
                {receipt.loan?.borrowerName}
              </p>
            </div>

            {!!receipt?.allocation?.length && (
              <div className="mt-3">
                <p className="font-medium mb-2">Allocation</p>
                <div
                  className="overflow-x-auto rounded"
                  style={{ border: "1px solid var(--border)" }}
                >
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr
                        style={{
                          background: "var(--table-head-bg)",
                          color: "var(--fg)",
                        }}
                      >
                        {["Period", "Principal", "Interest", "Fees", "Penalties"].map(
                          (h) => (
                            <th
                              key={h}
                              className="p-2 text-left"
                              style={{ borderBottom: "1px solid var(--border)" }}
                            >
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {receipt.allocation.map((a, idx) => (
                        <tr key={idx} style={{ borderTop: "1px solid var(--border)" }}>
                          <td className="p-2">{a.period}</td>
                          <td className="p-2">
                            {receipt.currency || "TZS"} {money(a.principal)}
                          </td>
                          <td className="p-2">
                            {receipt.currency || "TZS"} {money(a.interest)}
                          </td>
                          <td className="p-2">
                            {receipt.currency || "TZS"} {money(a.fees)}
                          </td>
                          <td className="p-2">
                            {receipt.currency || "TZS"} {money(a.penalties)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {receipt.totals && (
                      <tfoot>
                        <tr
                          className="font-medium"
                          style={{ borderTop: "1px solid var(--border)" }}
                        >
                          <td className="p-2">Totals</td>
                          <td className="p-2">
                            {receipt.currency || "TZS"} {money(receipt.totals.principal)}
                          </td>
                          <td className="p-2">
                            {receipt.currency || "TZS"} {money(receipt.totals.interest)}
                          </td>
                          <td className="p-2">
                            {receipt.currency || "TZS"} {money(receipt.totals.fees)}
                          </td>
                          <td className="p-2">
                            {receipt.currency || "TZS"} {money(receipt.totals.penalties)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 text-xs" style={{ color: "var(--muted)" }}>
              <p>
                Posted by: {receipt.postedBy?.name || "—"}{" "}
                {receipt.postedBy?.email ? `(${receipt.postedBy.email})` : ""}
              </p>
              <p className="mt-2">This is a system generated receipt.</p>
            </div>
          </div>
        </div>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white; }
          @page { margin: 12mm; }
        }
      `}</style>
    </div>
  );
}
