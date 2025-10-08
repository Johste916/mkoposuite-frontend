// src/pages/Loan.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { CSVLink } from "react-csv";

/* ---------- token UI ---------- */
const ui = {
  page: "p-4 md:p-6 lg:p-8 space-y-6 bg-[var(--bg)] text-[var(--fg)]",
  h1: "text-2xl md:text-3xl font-extrabold tracking-tight",
  card:
    "card rounded-2xl border-2 border-[var(--border-strong)] bg-[var(--card)] shadow",
  kpi: "p-4 rounded-xl border-2 border-[var(--border-strong)] bg-[var(--card)]",
  input: "input",
  btn:
    "inline-flex items-center gap-2 px-3 py-2 rounded-lg font-semibold " +
    "border-2 border-[var(--border-strong)] bg-[var(--card)] text-[var(--fg)] hover:bg-[var(--chip-soft)] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
  primary:
    "inline-flex items-center gap-2 px-3 py-2 rounded-lg font-semibold " +
    "bg-[var(--primary)] text-[var(--primary-contrast)] hover:opacity-90 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
  tableWrap:
    "overflow-x-auto rounded-2xl border-2 border-[var(--border-strong)] bg-[var(--card)]",
  th:
    "bg-[var(--table-head-bg)] text-left text-[12px] uppercase tracking-wide font-semibold " +
    "px-3 py-2 border border-[var(--border)] text-[var(--fg)]/90",
  td: "px-3 py-2 border border-[var(--border)] text-sm",
  actionLink:
    "inline-flex items-center gap-1 font-extrabold text-[var(--primary)] underline underline-offset-4 decoration-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
};

/* ---------------- helpers ---------------- */
const toArray = (data) =>
  Array.isArray(data)
    ? data
    : Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.rows)
    ? data.rows
    : Array.isArray(data?.data)
    ? data.data
    : [];

const currency = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return n ?? "—";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(num);
};

const pct2 = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return n ?? "—";
  return num.toFixed(2);
};

const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(+dt)) return String(d).slice(0, 10);
  return dt.toLocaleDateString();
};

// same logic as backend helper
function addMonthsDateOnly(dateStr, months) {
  if (!dateStr) return "";
  const [y, m, d] = String(dateStr).split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const dt = new Date(Date.UTC(y, m - 1, d));
  const targetMonthIndex = dt.getUTCMonth() + Number(months || 0);
  const target = new Date(Date.UTC(dt.getUTCFullYear(), targetMonthIndex, dt.getUTCDate()));
  if (target.getUTCMonth() !== ((m - 1 + Number(months || 0)) % 12 + 12) % 12) {
    target.setUTCDate(0);
  }
  return target.toISOString().slice(0, 10);
}

const Loan = () => {
  const navigate = useNavigate();

  // data
  const [loans, setLoans] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  // filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // fetchers
  const fetchLoans = async () => {
    setLoading(true);
    try {
      const res = await api.get("/loans", {
        params: { page: 1, pageSize: 500, include: "aggregates" },
      });
      setLoans(toArray(res.data));
    } catch (e) {
      console.error(e);
      alert(`Failed to load loans${e?.response?.data?.error ? `: ${e.response.data.error}` : ""}`);
      setLoans([]);
    } finally {
      setLoading(false);
    }
  };
  const fetchBranches = async () => {
    try {
      const res = await api.get("/branches", { params: { page: 1, pageSize: 500 } });
      setBranches(toArray(res.data));
    } catch {
      setBranches([]);
    }
  };
  const fetchProducts = async () => {
    try {
      const res = await api.get("/loan-products", { params: { page: 1, pageSize: 500 } });
      setProducts(toArray(res.data));
    } catch {
      setProducts([]);
    }
  };

  useEffect(() => {
    fetchLoans();
    fetchBranches();
    fetchProducts();
  }, []);

  // maps/helpers
  const productsById = useMemo(
    () => Object.fromEntries((products || []).map((p) => [String(p.id), p])),
    [products]
  );
  const branchesById = useMemo(
    () => Object.fromEntries((branches || []).map((b) => [String(b.id), b])),
    [branches]
  );

  const withinDate = (l) => {
    const raw =
      l.startDate || l.disbursementDate || l.releaseDate || l.createdAt || l.created_at;
    if (!raw || (!dateFrom && !dateTo)) return true;
    const d = new Date(raw);
    if (dateFrom && d < new Date(dateFrom)) return false;
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      if (d > end) return false;
    }
    return true;
  };

  // filtering
  const filteredLoans = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (loans || []).filter((l) => {
      const status = (l.status || l.loanStatus || "").toLowerCase();
      const matchesStatus = statusFilter === "all" || status === statusFilter;

      const borrowerName =
        l.Borrower?.name || l.borrowerName || l.borrower_name || l.borrower?.name || "";
      const matchesSearch =
        borrowerName.toLowerCase().includes(q) ||
        String(l.id || l.loanId || "").toLowerCase().includes(q);

      const bId = String(l.branchId || l.branch?.id || l.branch_id || "");
      const matchesBranch = !branchFilter || bId === String(branchFilter);

      const matchesProduct = !productFilter || String(l.productId) === String(productFilter);

      return matchesStatus && matchesSearch && matchesBranch && matchesProduct && withinDate(l);
    });
  }, [loans, statusFilter, search, branchFilter, productFilter, dateFrom, dateTo]);

  // KPIs (react to filters)
  const kpis = useMemo(() => {
    const totalPrincipal = filteredLoans.reduce(
      (s, l) => s + Number(l.amount || l.principal || 0),
      0
    );
    const statusOf = (s) =>
      filteredLoans.filter((l) => (l.status || l.loanStatus || "").toLowerCase() === s)
        .length;
    return {
      total: filteredLoans.length,
      totalPrincipal,
      pending: statusOf("pending"),
      approved: statusOf("approved"),
      disbursed: statusOf("disbursed"),
      active: statusOf("active"),
      closed: statusOf("closed"),
      rejected: statusOf("rejected"),
    };
  }, [filteredLoans]);

  // exports
  const exportRows = useMemo(
    () =>
      filteredLoans.map((l) => {
        const amount = Number(l.amount ?? l.principal ?? 0);
        const totalInterest = Number(l.totalInterest ?? 0);
        const outstanding =
          l.outstanding ?? l.outstandingAmount ?? l.remainingAmount ?? undefined;

        let paidAmount = "";
        if (Number.isFinite(outstanding)) {
          const base = Number.isFinite(totalInterest) ? amount + totalInterest : amount;
          paidAmount = Math.max(0, base - Number(outstanding));
        }

        const start =
          l.startDate ||
          l.disbursementDate ||
          l.releaseDate ||
          l.createdAt ||
          l.created_at ||
          "";

        const term = l.termMonths ?? l.durationMonths ?? l.term_months ?? null;
        const endDate =
          l.endDate || (start && term ? addMonthsDateOnly(String(start).slice(0, 10), term) : "");

        return {
          id: l.id,
          borrower:
            l.Borrower?.name ||
            l.borrowerName ||
            l.borrower_name ||
            l.borrower?.name ||
            "",
          branch: l.branch?.name || branchesById[String(l.branchId || "")]?.name || "",
          product: productsById[String(l.productId)]?.name || "",
          amount,
          rate: l.interestRate ?? l.rate ?? "",
          termMonths: term ?? "",
          startDate: start,
          endDate,
          paidAmount,
          outstanding: Number.isFinite(outstanding) ? Number(outstanding) : "",
          status: l.status || l.loanStatus || "",
        };
      }),
    [filteredLoans, productsById, branchesById]
  );

  const exportHeaders = [
    { label: "Loan ID", key: "id" },
    { label: "Borrower", key: "borrower" },
    { label: "Branch", key: "branch" },
    { label: "Product", key: "product" },
    { label: "Principal", key: "amount" },
    { label: "Rate (%)", key: "rate" },
    { label: "Term (months)", key: "termMonths" },
    { label: "Start Date", key: "startDate" },
    { label: "End Date", key: "endDate" },
    { label: "Paid Amount", key: "paidAmount" },
    { label: "Outstanding Amount", key: "outstanding" },
    { label: "Status", key: "status" },
  ];

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Loans Report", 14, 16);
    doc.autoTable({
      startY: 20,
      head: [
        [
          "ID",
          "Borrower",
          "Branch",
          "Product",
          "Principal",
          "Rate (%)",
          "Term",
          "Start Date",
          "End Date",
          "Paid",
          "Outstanding",
          "Status",
        ],
      ],
      body: exportRows.map((r) => [
        r.id,
        r.borrower,
        r.branch,
        r.product,
        currency(r.amount),
        pct2(r.rate),
        r.termMonths,
        fmtDate(r.startDate),
        fmtDate(r.endDate),
        currency(r.paidAmount),
        currency(r.outstanding),
        r.status,
      ]),
    });
    doc.save("loans.pdf");
  };

  // neutral, tokenized status chip
  const statusBadge = (statusRaw) =>
    "px-2 py-1 rounded text-xs font-semibold bg-[var(--badge-bg)] text-[var(--badge-fg)] ring-1 ring-[var(--border)]";

  /* ---------------- render ---------------- */
  return (
    <div className={ui.page}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className={ui.h1}>All Loans</h2>
        <Link className={ui.actionLink} to="/loans/applications">
          New Application
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: "Total", value: kpis.total },
          { label: "Principal", value: currency(kpis.totalPrincipal) },
          { label: "Pending", value: kpis.pending },
          { label: "Approved", value: kpis.approved },
          { label: "Disbursed", value: kpis.disbursed },
          { label: "Active", value: kpis.active },
        ].map((k, i) => (
          <div key={i} className={ui.kpi}>
            <p className="text-xs text-[var(--muted)]">{k.label}</p>
            <p className="text-lg font-bold">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters & Export */}
      <div className={`${ui.card} p-4 grid grid-cols-1 md:grid-cols-6 gap-3`}>
        <input
          type="text"
          placeholder="Search borrower or loan ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${ui.input} md:col-span-2`}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={ui.input}
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="disbursed">Disbursed</option>
          <option value="active">Active</option>
          <option value="rejected">Rejected</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          className={ui.input}
        >
          <option value="">All Branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className={ui.input}
        >
          <option value="">All Products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className={ui.input}
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className={ui.input}
        />
        <div className="md:col-span-6 flex justify-end gap-2">
          <CSVLink
            data={exportRows}
            headers={exportHeaders}
            filename="loans.csv"
            className={ui.primary}
          >
            Export CSV
          </CSVLink>
          <button onClick={exportPDF} className={ui.primary}>
            Export PDF
          </button>
        </div>
      </div>

      {/* Table */}
      <div className={ui.tableWrap}>
        {loading ? (
          <p className="p-4">Loading loans…</p>
        ) : filteredLoans.length === 0 ? (
          <p className="p-4 text-[var(--muted)]">No loans found.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                {[
                  "ID",
                  "Borrower",
                  "Branch",
                  "Product",
                  "Principal",
                  "Interest Rate (%)",
                  "Loan term",
                  "Start Date",
                  "End Date",
                  "Paid Amount",
                  "Outstanding Amount",
                  "Status",
                  "Action",
                ].map((h) => (
                  <th key={h} className={ui.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLoans.map((l, i) => {
                const status = (l.status || l.loanStatus || "").toLowerCase();
                const borrowerName =
                  l.Borrower?.name || l.borrowerName || l.borrower_name || l.borrower?.name || "N/A";
                const productName = productsById[String(l.productId)]?.name || "—";
                const branchName = l.branch?.name || branchesById[String(l.branchId || "")]?.name || "—";

                const amountNum = Number(l.amount ?? l.principal ?? 0);
                const amount = currency(amountNum);
                const rate = pct2(l.interestRate ?? l.rate);
                const term = l.termMonths ?? l.durationMonths ?? l.term_months ?? "—";

                const startRaw =
                  l.startDate || l.disbursementDate || l.releaseDate || l.createdAt || l.created_at;
                const start = fmtDate(startRaw);
                const endRaw =
                  l.endDate ||
                  (startRaw && term ? addMonthsDateOnly(String(startRaw).slice(0, 10), term) : "");
                const end = fmtDate(endRaw);

                const outstandingRaw =
                  l.outstanding ?? l.outstandingAmount ?? l.remainingAmount ?? null;
                const outstanding = outstandingRaw == null ? "—" : currency(outstandingRaw);

                const totalInterest = Number(l.totalInterest ?? NaN);
                let paidGuess = "—";
                if (Number.isFinite(Number(outstandingRaw))) {
                  const base = Number.isFinite(totalInterest) ? amountNum + totalInterest : amountNum;
                  paidGuess = currency(Math.max(0, base - Number(outstandingRaw)));
                }

                return (
                  <tr
                    key={l.id}
                    className={`${
                      i % 2 === 0 ? "bg-[var(--table-row-even)]" : "bg-[var(--table-row-odd)]"
                    } hover:bg-[var(--chip-soft)] transition-colors`}
                  >
                    <td className={ui.td}>{l.id}</td>
                    <td className={ui.td}>{borrowerName}</td>
                    <td className={ui.td}>{branchName}</td>
                    <td className={ui.td}>{productName}</td>
                    <td className={ui.td}>{amount}</td>
                    <td className={ui.td}>{rate}</td>
                    <td className={ui.td}>{term}</td>
                    <td className={ui.td}>{start}</td>
                    <td className={ui.td}>{end}</td>
                    <td className={ui.td}>{paidGuess}</td>
                    <td className={ui.td}>{outstanding}</td>
                    <td className={ui.td}>
                      <span className={statusBadge(status)}>{status}</span>
                    </td>
                    <td className={ui.td}>
                      <button onClick={() => navigate(`/loans/${l.id}`)} className={ui.actionLink}>
                        View loan
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Loan;
