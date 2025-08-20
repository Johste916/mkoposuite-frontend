// src/pages/loans/LoanStatusList.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../api";

/* ---------- helpers ---------- */
const fmtTZS = (v, currency = "TZS") =>
  v == null || v === "" ? "—" : `\u200e${currency} ${Number(v || 0).toLocaleString()}`;
const fmtNum = (v) => (v == null || v === "" ? "—" : Number(v).toLocaleString());
const fmtPct = (v) => (v == null || v === "" ? "—" : `${Number(v)}%`);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");

const CORE_STATUSES = ["pending", "approved", "rejected", "disbursed", "active", "closed"];

const TITLE_MAP = {
  pending: "Pending Approval",
  approved: "Approved Loans",
  rejected: "Rejected Loans",
  disbursed: "Disbursed Loans",
  active: "Active Loans",
  closed: "Closed Loans",
  // Derived/scoped lists
  due: "Due Loans",
  missed: "Missed Repayments",
  arrears: "Loans in Arrears",
  "no-repayments": "No Repayments",
  "past-maturity": "Past Maturity Loans",
  "principal-outstanding": "Principal Outstanding",
  "1-month-late": "1 Month Late",
  "3-months-late": "3 Months Late",
};

export default function LoanStatusList() {
  const { status } = useParams(); // core status or a derived scope
  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // filter refs
  const [products, setProducts] = useState([]);
  const [officers, setOfficers] = useState([]);

  const [q, setQ] = useState("");
  const [productId, setProductId] = useState("");
  const [officerId, setOfficerId] = useState("");
  const [startDate, setStartDate] = useState(""); // yyyy-mm-dd
  const [endDate, setEndDate] = useState("");     // yyyy-mm-dd
  const [minAmt, setMinAmt] = useState("");
  const [maxAmt, setMaxAmt] = useState("");

  const title = TITLE_MAP[status] || "Loans";

  /* ---------- fetch lists for filters (products & loan officers) ---------- */
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/loan-products");
        const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
        setProducts(list);
      } catch {
        setProducts([]);
      }
      try {
        const r2 = await api.get("/users", { params: { role: "loan_officer" } });
        setOfficers(Array.isArray(r2.data) ? r2.data : r2.data?.items || []);
      } catch {
        setOfficers([]);
      }
    })();
  }, []);

  /* ---------- load data with server-side filters when possible ---------- */
  const load = async () => {
    setLoading(true);
    try {
      const params = { page: 1, pageSize: 1000 }; // pull broadly, filter client-side if needed

      if (CORE_STATUSES.includes(String(status))) {
        params.status = status;
      } else if (status) {
        // scope parameter for derived lists (adjust if your backend uses another name)
        params.scope = status;
      }

      // These are common names; backend may ignore some/all — we’ll fallback to client filtering
      if (q.trim()) params.q = q.trim();
      if (productId) params.productId = productId;
      if (officerId) params.officerId = officerId;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (minAmt) params.minAmount = minAmt;
      if (maxAmt) params.maxAmount = maxAmt;

      const res = await api.get("/loans", { params });
      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.items)
        ? res.data.items
        : [];
      const total = res.data?.total ?? data.length;

      setRows(data);
      setTotalCount(total);
    } catch {
      setRows([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  /* ---------- client-side filtering fallback ---------- */
  const filtered = useMemo(() => {
    const sd = startDate ? new Date(startDate) : null;
    const ed = endDate ? new Date(endDate) : null;

    return rows.filter((l) => {
      // date range (releaseDate/startDate/disbursementDate/createdAt)
      if (sd || ed) {
        const when =
          l.releaseDate || l.startDate || l.disbursementDate || l.createdAt || null;
        const d = when ? new Date(when) : null;
        if (sd && (!d || d < sd)) return false;
        if (ed && (!d || d > ed)) return false;
      }
      // product
      if (productId && String(l.productId) !== String(productId)) return false;
      // officer
      if (officerId && String(l.officerId) !== String(officerId)) return false;
      // amount
      const amt = Number(l.amount ?? l.principal ?? 0);
      if (minAmt && !(amt >= Number(minAmt))) return false;
      if (maxAmt && !(amt <= Number(maxAmt))) return false;
      // q against borrower/product/phone/loan #
      const needle = q.trim().toLowerCase();
      if (needle) {
        const borrower = l.Borrower || l.borrower || {};
        const product = l.Product || l.product || {};
        const hay =
          [
            borrower.name,
            borrower.phone,
            l.borrowerName,
            l.borrowerPhone,
            product.name,
            l.productName,
            l.loanNumber,
            l.id,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [rows, q, productId, officerId, startDate, endDate, minAmt, maxAmt]);

  /* ---------- totals ---------- */
  const totals = useMemo(() => {
    let p = 0,
      i = 0,
      f = 0,
      pen = 0,
      t = 0;
    filtered.forEach((l) => {
      const op = Number(l.outstandingPrincipal || 0);
      const oi = Number(l.outstandingInterest || 0);
      const of = Number(l.outstandingFees || 0);
      const ope = Number(l.outstandingPenalty || 0);
      const tot =
        l.outstanding != null ? Number(l.outstanding) : op + oi + of + ope;
      p += op;
      i += oi;
      f += of;
      pen += ope;
      t += tot;
    });
    return { p, i, f, pen, t };
  }, [filtered]);

  /* ---------- export helpers ---------- */
  const buildExportRows = () =>
    filtered.map((l) => {
      const borrower = l.Borrower || l.borrower || {};
      const product = l.Product || l.product || {};
      const officer = l.officer || {};
      const currency = l.currency || "TZS";
      const date =
        l.releaseDate || l.startDate || l.disbursementDate || l.createdAt || null;

      const op = l.outstandingPrincipal ?? null;
      const oi = l.outstandingInterest ?? null;
      const of = l.outstandingFees ?? null;
      const ope = l.outstandingPenalty ?? null;
      const totalOutstanding =
        l.outstanding != null
          ? l.outstanding
          : [op, oi, of, ope].every((x) => x == null)
          ? null
          : Number(op || 0) + Number(oi || 0) + Number(of || 0) + Number(ope || 0);

      const annualRate =
        l.interestRateAnnual != null
          ? l.interestRateAnnual
          : l.interestRate != null
          ? l.interestRate
          : null;
      const termMonths = l.termMonths ?? l.durationMonths ?? null;

      return {
        Date: fmtDate(date),
        "Borrower Name": borrower.name || l.borrowerName || "",
        "Phone Number": borrower.phone || l.borrowerPhone || "",
        "Loan Product": product.name || l.productName || "",
        "Principal Amount": `${currency} ${Number(l.amount ?? l.principal ?? 0)}`,
        "Interest Amount": `${currency} ${Number(l.interestAmount ?? 0)}`,
        "Outstanding Principal": `${currency} ${Number(op ?? 0)}`,
        "Outstanding Interest": `${currency} ${Number(oi ?? 0)}`,
        "Outstanding Fees": `${currency} ${Number(of ?? 0)}`,
        "Outstanding Penalty": `${currency} ${Number(ope ?? 0)}`,
        "Total Outstanding": `${currency} ${Number(totalOutstanding ?? 0)}`,
        "Interest Rate/Year (%)": annualRate ?? "",
        "Loan Duration (Months)": termMonths ?? "",
        "Loan Officer": l.officerName || officer.name || "",
        Status: l.status || "",
      };
    });

  const exportCSV = () => {
    const rows = buildExportRows();
    const headers = Object.keys(rows[0] || {
      Date: "",
      "Borrower Name": "",
      "Phone Number": "",
      "Loan Product": "",
      "Principal Amount": "",
      "Interest Amount": "",
      "Outstanding Principal": "",
      "Outstanding Interest": "",
      "Outstanding Fees": "",
      "Outstanding Penalty": "",
      "Total Outstanding": "",
      "Interest Rate/Year (%)": "",
      "Loan Duration (Months)": "",
      "Loan Officer": "",
      Status: "",
    });
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers
          .map((h) => {
            const val = String(r[h] ?? "").replace(/"/g, '""');
            return `"${val}"`;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(TITLE_MAP[status] || "loans").toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Excel-compatible (HTML table with XLS mimetype, opens in Excel)
  const exportExcel = () => {
    const rows = buildExportRows();
    const headers = Object.keys(rows[0] || {});
    const html =
      `<table border="1"><thead><tr>${headers
        .map((h) => `<th>${h}</th>`)
        .join("")}</tr></thead><tbody>` +
      rows
        .map(
          (r) =>
            `<tr>${headers
              .map((h) => `<td>${String(r[h] ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;")}</td>`)
              .join("")}</tr>`
        )
        .join("") +
      `</tbody></table>`;

    const blob = new Blob([`\ufeff${html}`], {
      type: "application/vnd.ms-excel",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(TITLE_MAP[status] || "loans").toLowerCase().replace(/\s+/g, "-")}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // PDF via print-friendly window (users can Save as PDF)
  const exportPDF = () => {
    const rows = buildExportRows();
    const headers = Object.keys(rows[0] || {});
    const style = `
      <style>
        body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji; padding: 16px; }
        h1 { font-size: 16px; margin: 0 0 12px 0; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
        thead { background: #f3f4f6; }
      </style>
    `;
    const html =
      `<h1>${TITLE_MAP[status] || "Loans"}</h1><table><thead><tr>${headers
        .map((h) => `<th>${h}</th>`)
        .join("")}</tr></thead><tbody>` +
      rows
        .map(
          (r) =>
            `<tr>${headers
              .map((h) => `<td>${String(r[h] ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;")}</td>`)
              .join("")}</tr>`
        )
        .join("") +
      `</tbody></table>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(`<html><head><title>${TITLE_MAP[status] || "Loans"}</title>${style}</head><body>${html}</body></html>`);
      win.document.close();
      win.focus();
      win.print(); // user can choose "Save as PDF"
    }
  };

  /* ---------- render ---------- */
  return (
    <div className="p-4 space-y-4">
      {/* header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <div className="text-sm text-gray-600">
            Total: {fmtNum(totalCount)}{" "}
            <span className="mx-2 text-gray-400">•</span>
            <Link to="/loans" className="text-indigo-600 underline">
              All Loans
            </Link>
          </div>
        </div>

        {/* export buttons */}
        <div className="flex flex-wrap gap-2">
          <button onClick={exportCSV} className="px-3 py-2 rounded border hover:bg-gray-50">
            Export CSV
          </button>
          <button onClick={exportExcel} className="px-3 py-2 rounded border hover:bg-gray-50">
            Export Excel
          </button>
          <button onClick={exportPDF} className="px-3 py-2 rounded border hover:bg-gray-50">
            Export PDF
          </button>
        </div>
      </div>

      {/* filters */}
      <div className="bg-white rounded shadow border p-3">
        <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs text-gray-600">Search (borrower / phone / product / loan #)</label>
            <input
              className="w-full border rounded px-3 py-2"
              placeholder="e.g. Jane, 0712…, Business Loan"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-gray-600">Product</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="">All</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.code ? ` (${p.code})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-600">Loan Officer</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={officerId}
              onChange={(e) => setOfficerId(e.target.value)}
            >
              <option value="">All</option>
              {officers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name || o.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-600">From Date</label>
            <input
              type="date"
              className="w-full border rounded px-3 py-2"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-gray-600">To Date</label>
            <input
              type="date"
              className="w-full border rounded px-3 py-2"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-gray-600">Min Amount</label>
            <input
              type="number"
              className="w-full border rounded px-3 py-2"
              value={minAmt}
              onChange={(e) => setMinAmt(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-gray-600">Max Amount</label>
            <input
              type="number"
              className="w-full border rounded px-3 py-2"
              value={maxAmt}
              onChange={(e) => setMaxAmt(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button onClick={load} className="px-3 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700">
            Apply Filters
          </button>
          <button
            onClick={() => {
              setQ("");
              setProductId("");
              setOfficerId("");
              setStartDate("");
              setEndDate("");
              setMinAmt("");
              setMaxAmt("");
              // reload base
              setTimeout(load, 0);
            }}
            className="px-3 py-2 rounded border hover:bg-gray-50"
          >
            Reset
          </button>
        </div>
      </div>

      {/* table */}
      <div className="bg-white rounded shadow border overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr className="[&>th]:px-2 [&>th]:py-2 [&>th]:border">
              <th>Date</th>
              <th>Borrower Name</th>
              <th>Phone Number</th>
              <th>Loan Product</th>
              <th>Principal Amount</th>
              <th>Interest Amount</th>
              <th>Outstanding Principal</th>
              <th>Outstanding Interest</th>
              <th>Outstanding Fees</th>
              <th>Outstanding Penalty</th>
              <th>Total Outstanding</th>
              <th>Interest Rate/Year (%)</th>
              <th>Loan Duration (Months)</th>
              <th>Loan Officer</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={15} className="text-center p-6 text-gray-500">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={15} className="text-center p-6 text-gray-500">
                  No loans found.
                </td>
              </tr>
            ) : (
              filtered.map((l) => {
                const borrower = l.Borrower || l.borrower || {};
                const product = l.Product || l.product || {};
                const officer = l.officer || {};
                const currency = l.currency || "TZS";

                const date =
                  l.releaseDate || l.startDate || l.createdAt || l.disbursementDate || null;

                const op = l.outstandingPrincipal ?? null;
                const oi = l.outstandingInterest ?? null;
                const of = l.outstandingFees ?? null;
                const ope = l.outstandingPenalty ?? null;
                const totalOutstanding =
                  l.outstanding != null
                    ? l.outstanding
                    : [op, oi, of, ope].every((x) => x == null)
                    ? null
                    : Number(op || 0) + Number(oi || 0) + Number(of || 0) + Number(ope || 0);

                const annualRate =
                  l.interestRateAnnual != null
                    ? l.interestRateAnnual
                    : l.interestRate != null
                    ? l.interestRate
                    : null;

                const termMonths = l.termMonths ?? l.durationMonths ?? null;

                return (
                  <tr key={l.id} className="[&>td]:px-2 [&>td]:py-2 [&>td]:border">
                    <td>{fmtDate(date)}</td>
                    <td>
                      {borrower.id ? (
                        <Link
                          to={`/borrowers/${borrower.id}`}
                          className="text-indigo-700 hover:underline"
                        >
                          {borrower.name || l.borrowerName || "—"}
                        </Link>
                      ) : (
                        borrower.name || l.borrowerName || "—"
                      )}
                    </td>
                    <td>{borrower.phone || l.borrowerPhone || "—"}</td>
                    <td>{product.name || l.productName || "—"}</td>
                    <td>{fmtTZS(l.amount ?? l.principal, currency)}</td>
                    <td>{fmtTZS(l.interestAmount, currency)}</td>
                    <td>{fmtTZS(op, currency)}</td>
                    <td>{fmtTZS(oi, currency)}</td>
                    <td>{fmtTZS(of, currency)}</td>
                    <td>{fmtTZS(ope, currency)}</td>
                    <td>{fmtTZS(totalOutstanding, currency)}</td>
                    <td>{fmtPct(annualRate)}</td>
                    <td>{fmtNum(termMonths)}</td>
                    <td>{l.officerName || officer.name || "—"}</td>
                    <td>{l.status || "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>

          {!loading && filtered.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 font-semibold [&>td]:px-2 [&>td]:py-2 [&>td]:border">
                <td colSpan={6} className="text-right">
                  Totals:
                </td>
                <td>{fmtTZS(totals.p)}</td>
                <td>{fmtTZS(totals.i)}</td>
                <td>{fmtTZS(totals.f)}</td>
                <td>{fmtTZS(totals.pen)}</td>
                <td>{fmtTZS(totals.t)}</td>
                <td colSpan={4}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
