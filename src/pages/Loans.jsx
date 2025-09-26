// src/pages/Loan.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { CSVLink } from "react-csv";

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

/* ---------------- page ---------------- */
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

  // fetchers (tolerant to many backend shapes)
  const fetchLoans = async () => {
    setLoading(true);
    try {
      const res = await api.get("/loans", { params: { page: 1, pageSize: 500 } });
      setLoans(toArray(res.data));
    } catch {
      alert("Failed to load loans");
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

  // actions
  const handleStatusUpdate = async (id, action) => {
    try {
      await api.patch(`/loans/${id}/${action}`);
      fetchLoans();
    } catch {
      alert(`Failed to ${action} loan`);
    }
  };

  // exports
  const exportRows = useMemo(
    () =>
      filteredLoans.map((l) => ({
        id: l.id,
        borrower:
          l.Borrower?.name || l.borrowerName || l.borrower_name || l.borrower?.name || "",
        product: productsById[String(l.productId)]?.name || "",
        amount: l.amount ?? l.principal ?? "",
        rate: l.interestRate ?? l.rate ?? "",
        termMonths: l.termMonths ?? l.durationMonths ?? l.term_months ?? "",
        branch: l.branch?.name || "",
        status: l.status || l.loanStatus || "",
        startDate:
          l.startDate ||
          l.disbursementDate ||
          l.releaseDate ||
          l.createdAt ||
          l.created_at ||
          "",
      })),
    [filteredLoans, productsById]
  );

  const exportHeaders = [
    { label: "Loan ID", key: "id" },
    { label: "Borrower", key: "borrower" },
    { label: "Product", key: "product" },
    { label: "Amount", key: "amount" },
    { label: "Rate (%)", key: "rate" },
    { label: "Term (months)", key: "termMonths" },
    { label: "Branch", key: "branch" },
    { label: "Status", key: "status" },
    { label: "Start Date", key: "startDate" },
  ];

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Loans Report", 14, 16);
    doc.autoTable({
      startY: 20,
      head: [["ID", "Borrower", "Product", "Amount", "Rate (%)", "Term", "Branch", "Status"]],
      body: exportRows.map((r) => [
        r.id,
        r.borrower,
        r.product,
        r.amount,
        r.rate,
        r.termMonths,
        r.branch,
        r.status,
      ]),
    });
    doc.save("loans.pdf");
  };

  // UI helpers
  const statusBadge = (statusRaw) => {
    const status = (statusRaw || "").toLowerCase();
    const base = "px-2 py-1 rounded text-xs font-semibold";
    switch (status) {
      case "pending":
        return `${base} bg-yellow-100 text-yellow-800`;
      case "approved":
        return `${base} bg-emerald-100 text-emerald-800`;
      case "rejected":
        return `${base} bg-rose-100 text-rose-800`;
      case "disbursed":
      case "active":
        return `${base} bg-blue-100 text-blue-800`;
      case "closed":
        return `${base} bg-gray-100 text-gray-900`;
      default:
        return `${base} bg-gray-200 text-gray-900`;
    }
  };

  /* ---------------- render ---------------- */
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 text-black dark:text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">All Loans</h2>
        <Link className="text-black font-semibold underline" to="/loans/applications">
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
          <div
            key={i}
            className="card p-4 ring-2 ring-black/10 border-2 border-black/20 text-black dark:text-white"
          >
            <p className="text-xs"> {k.label} </p>
            <p className="text-lg font-bold">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters & Export */}
      <div className="card p-4 grid grid-cols-1 md:grid-cols-6 gap-3 ring-2 ring-black/10 border-2 border-black/20 text-black dark:text-white">
        <input
          type="text"
          placeholder="Search borrower or loan ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input md:col-span-2 text-black"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input text-black"
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
          className="input text-black"
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
          className="input text-black"
        >
          <option value="">All Products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input text-black" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input text-black" />
        <div className="md:col-span-6 flex justify-end gap-2">
          <CSVLink
            data={exportRows}
            headers={exportHeaders}
            filename="loans.csv"
            className="px-4 py-2 rounded bg-black text-white hover:opacity-90"
          >
            Export CSV
          </CSVLink>
          <button onClick={exportPDF} className="px-4 py-2 rounded bg-black text-white hover:opacity-90">
            Export PDF
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto ring-2 ring-black/10 border-2 border-black/20">
        {loading ? (
          <p className="p-4">Loading loans…</p>
        ) : filteredLoans.length === 0 ? (
          <p className="p-4">No loans found.</p>
        ) : (
          <table className="min-w-full text-sm border-2 border-black/30">
            <thead className="bg-white text-black">
              <tr>
                {[
                  "ID",
                  "Borrower",
                  "Product",
                  "Amount",
                  "Rate (%)",
                  "Term",
                  "Branch",
                  "Start Date",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th key={h} className="p-2 border-2 border-black/30 text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLoans.map((l) => {
                const status = l.status || l.loanStatus;
                const borrowerName =
                  l.Borrower?.name || l.borrowerName || l.borrower_name || l.borrower?.name || "N/A";
                const productName = productsById[String(l.productId)]?.name || "—";
                const amount = currency(l.amount ?? l.principal);
                const rate = pct2(l.interestRate ?? l.rate);
                const term = l.termMonths ?? l.durationMonths ?? l.term_months ?? "—";
                const branchName = l.branch?.name || "—";
                const start = fmtDate(
                  l.startDate || l.disbursementDate || l.releaseDate || l.createdAt || l.created_at
                );

                return (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-2 py-2 border-2 border-black/20">{l.id}</td>
                    <td className="px-2 py-2 border-2 border-black/20">{borrowerName}</td>
                    <td className="px-2 py-2 border-2 border-black/20">{productName}</td>
                    <td className="px-2 py-2 border-2 border-black/20">{amount}</td>
                    <td className="px-2 py-2 border-2 border-black/20">{rate}</td>
                    <td className="px-2 py-2 border-2 border-black/20">{term}</td>
                    <td className="px-2 py-2 border-2 border-black/20">{branchName}</td>
                    <td className="px-2 py-2 border-2 border-black/20">{start}</td>
                    <td className="px-2 py-2 border-2 border-black/20">
                      <span className={statusBadge(status)}>{status}</span>
                    </td>
                    <td className="px-2 py-2 border-2 border-black/20">
                      <div className="space-x-3">
                        <button onClick={() => navigate(`/loans/${l.id}`)} className="text-black underline">
                          View
                        </button>
                        {(status || "").toLowerCase() === "pending" && (
                          <>
                            <button onClick={() => handleStatusUpdate(l.id, "approve")} className="text-black underline">
                              Approve
                            </button>
                            <button onClick={() => handleStatusUpdate(l.id, "reject")} className="text-black underline">
                              Reject
                            </button>
                          </>
                        )}
                        {(status || "").toLowerCase() === "approved" && (
                          <button onClick={() => handleStatusUpdate(l.id, "disburse")} className="text-black underline">
                            Disburse
                          </button>
                        )}
                      </div>
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
