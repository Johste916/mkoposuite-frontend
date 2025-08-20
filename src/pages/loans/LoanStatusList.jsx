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
  const { status } = useParams(); // could be a core status or a derived scope (e.g., "due")
  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const title = TITLE_MAP[status] || "Loans";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = { page: 1, pageSize: 500 };
        if (CORE_STATUSES.includes(String(status))) {
          params.status = status;
        } else if (status) {
          // Many backends expose a scope-style filter for report views.
          // If your API uses a different param name, adjust here.
          params.scope = status;
        }

        const res = await api.get("/loans", { params });
        // Accept common shapes: {items,total}, array, or unknown -> []
        const data = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.items)
          ? res.data.items
          : [];
        const total = res.data?.total ?? data.length;

        if (!cancelled) {
          setRows(data);
          setTotalCount(total);
        }
      } catch (e) {
        if (!cancelled) {
          setRows([]);
          setTotalCount(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  // Derived totals for a quick footer summary (optional)
  const totals = useMemo(() => {
    let p = 0,
      i = 0,
      f = 0,
      pen = 0,
      t = 0;
    rows.forEach((r) => {
      const op = Number(r.outstandingPrincipal || 0);
      const oi = Number(r.outstandingInterest || 0);
      const of = Number(r.outstandingFees || 0);
      const ope = Number(r.outstandingPenalty || 0);
      const tot = r.outstanding != null ? Number(r.outstanding) : op + oi + of + ope;

      p += op;
      i += oi;
      f += of;
      pen += ope;
      t += tot;
    });
    return { p, i, f, pen, t };
  }, [rows]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="text-sm text-gray-600">
          <span className="mr-3">Total: {fmtNum(totalCount)}</span>
          <Link to="/loans" className="text-indigo-600 underline">
            All Loans
          </Link>
        </div>
      </div>

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
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={15} className="text-center p-6 text-gray-500">
                  No loans found.
                </td>
              </tr>
            ) : (
              rows.map((l) => {
                const borrower = l.Borrower || l.borrower || {};
                const product = l.Product || l.product || {};
                const officer = l.officer || {};
                const currency = l.currency || "TZS";

                const date =
                  l.releaseDate || l.startDate || l.createdAt || l.disbursementDate || null;

                // Outstandings
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

                // Interest rate (annual) – fall back to monthly field if that's all we have
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

          {!loading && rows.length > 0 && (
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
