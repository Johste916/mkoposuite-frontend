// src/pages/Loan.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { CSVLink } from "react-csv";

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
      const res = await api.get("/loans");
      setLoans(res.data || []);
    } catch {
      alert("Failed to load loans");
    } finally {
      setLoading(false);
    }
  };
  const fetchBranches = async () => {
    try {
      const res = await api.get("/branches");
      setBranches(Array.isArray(res.data) ? res.data : []);
    } catch {}
  };
  const fetchProducts = async () => {
    try {
      const res = await api.get("/loan-products");
      setProducts(Array.isArray(res.data) ? res.data : res.data.items || []);
    } catch {}
  };

  useEffect(() => {
    fetchLoans();
    fetchBranches();
    fetchProducts();
  }, []);

  // maps/helpers
  const productsById = useMemo(
    () =>
      Object.fromEntries((products || []).map((p) => [String(p.id), p])),
    [products]
  );

  const withinDate = (l) => {
    // prefer startDate; fallback to createdAt
    const raw = l.startDate || l.createdAt;
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
    return (loans || []).filter((l) => {
      const matchesStatus = statusFilter === "all" || l.status === statusFilter;
      const matchesSearch =
        (l.Borrower?.name || "").toLowerCase().includes(search.toLowerCase()) ||
        String(l.id || "").includes(search.trim());
      const matchesBranch =
        !branchFilter || String(l.branchId || l.branch?.id) === String(branchFilter);
      const matchesProduct =
        !productFilter || String(l.productId) === String(productFilter);
      return (
        matchesStatus &&
        matchesSearch &&
        matchesBranch &&
        matchesProduct &&
        withinDate(l)
      );
    });
  }, [loans, statusFilter, search, branchFilter, productFilter, dateFrom, dateTo]);

  // KPIs (based on filtered list so they react to filters)
  const kpis = useMemo(() => {
    const totalPrincipal = filteredLoans.reduce(
      (s, l) => s + Number(l.amount || 0),
      0
    );
    const countBy = (s) => filteredLoans.filter((l) => l.status === s).length;
    return {
      total: filteredLoans.length,
      totalPrincipal,
      pending: countBy("pending"),
      approved: countBy("approved"),
      disbursed: countBy("disbursed"),
      active: countBy("active"),
      closed: countBy("closed"),
      rejected: countBy("rejected"),
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
        borrower: l.Borrower?.name || "",
        product: productsById[String(l.productId)]?.name || "",
        amount: l.amount,
        rate: l.interestRate,
        termMonths: l.termMonths,
        branch: l.branch?.name || "",
        status: l.status,
        startDate: l.startDate,
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
      head: [
        ["ID", "Borrower", "Product", "Amount", "Rate", "Term", "Branch", "Status"],
      ],
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

  // UI helpers (dark-mode aware using soft backgrounds)
  const statusBadge = (status) => {
    const base = "px-2 py-1 rounded text-xs font-semibold";
    switch (status) {
      case "pending":
        return `${base} bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300`;
      case "approved":
        return `${base} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`;
      case "rejected":
        return `${base} bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300`;
      case "disbursed":
      case "active":
        return `${base} bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300`;
      case "closed":
        return `${base} bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-300`;
      default:
        return `${base} bg-gray-200 text-gray-600 dark:bg-gray-800/60 dark:text-gray-300`;
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">All Loans</h2>
        <Link className="text-indigo-600 hover:underline text-sm" to="/loans/applications">
          New Application
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="card p-3">
          <p className="text-xs muted">Total</p>
          <p className="text-lg font-semibold">{kpis.total}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs muted">Principal</p>
          <p className="text-lg font-semibold">{kpis.totalPrincipal}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs muted">Pending</p>
          <p className="text-lg font-semibold">{kpis.pending}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs muted">Approved</p>
          <p className="text-lg font-semibold">{kpis.approved}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs muted">Disbursed</p>
          <p className="text-lg font-semibold">{kpis.disbursed}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs muted">Active</p>
          <p className="text-lg font-semibold">{kpis.active}</p>
        </div>
      </div>

      {/* Filters & Export */}
      <div className="card p-4 grid grid-cols-1 md:grid-cols-6 gap-3">
        <input
          type="text"
          placeholder="Search borrower or loan ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input md:col-span-2"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input"
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
          className="input"
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
          className="input"
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
          className="input"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="input"
        />
        <div className="md:col-span-6 flex justify-end gap-2">
          <CSVLink
            data={exportRows}
            headers={exportHeaders}
            filename="loans.csv"
            className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Export CSV
          </CSVLink>
          <button
            onClick={exportPDF}
            className="px-4 py-2 rounded bg-rose-600 text-white hover:bg-rose-700"
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        {loading ? (
          <p className="p-4 muted">Loading loans…</p>
        ) : filteredLoans.length === 0 ? (
          <p className="p-4 muted">No loans found.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="text-[var(--fg)]">
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
                  <th
                    key={h}
                    className="p-2 border-b border-[var(--border)] text-left"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLoans.map((l) => (
                <tr
                  key={l.id}
                  className="border-b border-[var(--border)] hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  <td className="px-2 py-2">{l.id}</td>
                  <td className="px-2 py-2">{l.Borrower?.name || "N/A"}</td>
                  <td className="px-2 py-2">
                    {productsById[String(l.productId)]?.name || "—"}
                  </td>
                  <td className="px-2 py-2">{l.amount}</td>
                  <td className="px-2 py-2">{l.interestRate}</td>
                  <td className="px-2 py-2">{l.termMonths}</td>
                  <td className="px-2 py-2">{l.branch?.name || "—"}</td>
                  <td className="px-2 py-2">{l.startDate || "—"}</td>
                  <td className="px-2 py-2">
                    <span className={statusBadge(l.status)}>{l.status}</span>
                  </td>
                  <td className="px-2 py-2 space-x-2">
                    <button
                      onClick={() => navigate(`/loans/${l.id}`)}
                      className="text-indigo-600 hover:underline"
                    >
                      View
                    </button>
                    {l.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(l.id, "approve")}
                          className="text-emerald-600 hover:underline"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(l.id, "reject")}
                          className="text-rose-600 hover:underline"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {l.status === "approved" && (
                      <button
                        onClick={() => handleStatusUpdate(l.id, "disburse")}
                        className="text-indigo-600 hover:underline"
                      >
                        Disburse
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Loan;
