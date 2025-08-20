import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const money = (v) => Number(v || 0).toLocaleString();

export default function RepaymentReceipts() {
  // filters
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState(() =>
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10)
  );
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));

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

      const { data } = await api.get("/repayments", { params });
      const items = Array.isArray(data) ? data : data?.items || [];
      setRows(items);
      setTotal(Number(data?.total || items.length || 0));
    } catch (e) {
      console.error(e);
      alert("Failed to load receipts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, dateFrom, dateTo]);

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

  const exportCSV = () => {
    if (!rows.length) return alert("Nothing to export");
    const headers = ["Receipt No", "Date", "Loan Ref", "Borrower", "Method", "Amount", "Reference"];
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        [
          r.receiptNo || `RCPT-${r.id}`,
          r.date || r.createdAt || "",
          r.Loan?.reference || r.loan?.reference || `L-${r.Loan?.id || r.loan?.id || ""}`,
          `"${(r.Loan?.Borrower?.fullName || r.loan?.borrowerName || "").replace(/"/g, '""')}"`,
          r.method || "cash",
          r.amount,
          r.reference || "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `repayment-receipts_${dateFrom}_to_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

    let y = 0;
    if (imgH <= pageH) {
      pdf.addImage(imgData, "PNG", 0, 0, imgW, imgH);
    } else {
      // multi-page
      let remaining = imgH;
      const canvasPageHeight = (canvas.width * pageH) / pageW;

      const pageCanvas = document.createElement("canvas");
      const pageCtx = pageCanvas.getContext("2d");
      pageCanvas.width = canvas.width;
      pageCanvas.height = canvasPageHeight;

      let sY = 0;
      while (remaining > 0) {
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
        if (y === 0) {
          pdf.addImage(pageImgData, "PNG", 0, 0, imgW, pageH);
        } else {
          pdf.addPage();
          pdf.addImage(pageImgData, "PNG", 0, 0, imgW, pageH);
        }
        sY += canvasPageHeight;
        remaining -= pageH;
        y += pageH;
      }
    }

    const filename = `receipt_${receipt?.receiptNo || receipt?.id}.pdf`;
    pdf.save(filename);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Repayment Receipts</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} disabled={loading} className="px-3 py-2 rounded border">
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button onClick={exportCSV} className="px-3 py-2 rounded bg-blue-600 text-white">
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-5">
        <form onSubmit={onSearch} className="grid md:grid-cols-6 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Search</label>
            <input
              className="w-full border rounded px-3 py-2"
              placeholder="Borrower / Loan Ref / Receipt"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">From</label>
            <input
              type="date"
              className="w-full border rounded px-3 py-2"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">To</label>
            <input
              type="date"
              className="w-full border rounded px-3 py-2"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Page size</label>
            <select
              className="w-full border rounded px-3 py-2"
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
              className="px-3 py-2 rounded border"
              onClick={() => {
                setQ("");
                setDateFrom(
                  new Date(new Date().setDate(new Date().getDate() - 30))
                    .toISOString()
                    .slice(0, 10)
                );
                setDateTo(new Date().toISOString().slice(0, 10));
                setPage(1);
                fetchData();
              }}
            >
              Reset
            </button>
            <button type="submit" className="px-3 py-2 rounded bg-blue-600 text-white">
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700 text-left">
                <th className="p-3">Receipt No</th>
                <th className="p-3">Date</th>
                <th className="p-3">Loan Ref</th>
                <th className="p-3">Borrower</th>
                <th className="p-3">Method</th>
                <th className="p-3">Amount</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 && (
                <tr>
                  <td className="p-4 text-gray-500" colSpan={7}>
                    No data.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3">{r.receiptNo || `RCPT-${r.id}`}</td>
                  <td className="p-3">{r.date || r.createdAt || ""}</td>
                  <td className="p-3">{r.Loan?.reference || r.loan?.reference || `L-${r.Loan?.id || r.loan?.id || ""}`}</td>
                  <td className="p-3">{r.Loan?.Borrower?.fullName || r.loan?.borrowerName || "—"}</td>
                  <td className="p-3 capitalize">{r.method || "cash"}</td>
                  <td className="p-3">{r.currency || "TZS"} {money(r.amount)}</td>
                  <td className="p-3 text-right">
                    <button className="px-3 py-1.5 rounded border" onClick={() => openReceipt(r)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {loading && (
                <tr>
                  <td className="p-4" colSpan={7}>
                    Loading…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-3 border-t">
          <p className="text-xs text-gray-500">
            Page {page} of {pages} • {total} total
          </p>
          <div className="flex gap-2">
            <button
              className="px-3 py-1.5 rounded border"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <button
              className="px-3 py-1.5 rounded border"
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
            className="relative bg-white w-full max-w-2xl rounded-lg shadow-lg p-6 print:bg-white"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Receipt #{receipt.receiptNo || receipt.id}
              </h3>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 rounded border" onClick={() => window.print()}>
                  Print
                </button>
                <button className="px-3 py-1.5 rounded border" onClick={downloadPDF}>
                  Download PDF
                </button>
                <button
                  className="px-3 py-1.5 rounded bg-blue-600 text-white"
                  onClick={() => setOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p>
                  <span className="text-gray-500">Date:</span> {receipt.date}
                </p>
                <p>
                  <span className="text-gray-500">Method:</span> {receipt.method || "cash"}
                </p>
                <p>
                  <span className="text-gray-500">Reference:</span>{" "}
                  {receipt.reference || "—"}
                </p>
                <p>
                  <span className="text-gray-500">Notes:</span> {receipt.notes || "—"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-gray-500">Amount</p>
                <p className="text-xl font-semibold">
                  {receipt.currency || "TZS"} {money(receipt.amount)}
                </p>
              </div>
            </div>

            <div className="my-4 border-t pt-4 text-sm">
              <p>
                <span className="text-gray-500">Loan:</span> {receipt.loan?.reference}
              </p>
              <p>
                <span className="text-gray-500">Borrower:</span>{" "}
                {receipt.loan?.borrowerName}
              </p>
            </div>

            {!!receipt?.allocation?.length && (
              <div className="mt-3">
                <p className="font-medium mb-2">Allocation</p>
                <div className="overflow-x-auto border rounded">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100 text-left">
                        <th className="p-2">Period</th>
                        <th className="p-2">Principal</th>
                        <th className="p-2">Interest</th>
                        <th className="p-2">Fees</th>
                        <th className="p-2">Penalties</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receipt.allocation.map((a, idx) => (
                        <tr key={idx} className="border-t">
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
                        <tr className="border-t font-medium">
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
          </div>
        </div>
      )}
    </div>
  );
}
