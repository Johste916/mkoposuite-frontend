// src/pages/loans/LoanStatusList.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api";
import { fmtCurrency as fmtC, fmtTZS, fmtNum, fmtPct, fmtDate } from "../../utils/format";
import { exportCSVFromRows, exportExcelHTMLFromRows, exportPDFPrintFromRows } from "../../utils/exporters";
import Pagination from "../../components/table/Pagination";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useToast } from "../../components/common/ToastProvider";
import { Search, ChevronDown, Filter } from "lucide-react";

/* ---------- constants ---------- */
const CORE_STATUSES = ["pending", "approved", "rejected", "disbursed", "active", "closed"];
// Only these should ever be sent as ?status= to backend (DB enum-backed)
const BACKEND_ENUM_STATUSES = ["pending", "approved", "rejected", "disbursed", "closed"];

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

/* ---------- high-contrast UI tokens ---------- */
const ui = {
  page: "w-full px-4 md:px-6 lg:px-10 py-6 text-slate-900",
  h1: "text-3xl font-extrabold tracking-tight",
  sub: "text-sm text-slate-700",
  card: "rounded-2xl border-2 border-slate-300 bg-white shadow",
  th: "bg-slate-100 text-left text-[12px] uppercase tracking-wide text-slate-700 font-semibold px-3 py-2 border-2 border-slate-200 select-none",
  td: "px-3 py-2 border-2 border-slate-200 text-sm align-top",
  btn: "inline-flex items-center rounded-lg border-2 border-slate-300 px-3 py-2 hover:bg-slate-50 font-semibold",
  btnGhost: "inline-flex items-center rounded-lg border-2 border-slate-300 px-3 py-2 hover:bg-slate-50",
  btnPrimary: "inline-flex items-center rounded-lg bg-indigo-600 text-white px-3 py-2 font-semibold hover:bg-indigo-700",
  fieldBase:
    "h-11 w-full rounded-lg border-2 border-slate-300 bg-white text-sm outline-none " +
    "focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-600 transition",
  fieldIcon: "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500",
};

/* ---------- clean, parallel fields ---------- */
const TextField = ({ className = "", leadingIcon = null, ...props }) => (
  <div className={`relative ${className}`}>
    {leadingIcon}
    <input {...props} className={`${ui.fieldBase} ${leadingIcon ? "pl-10" : ""}`} />
  </div>
);

const SelectField = ({ className = "", children, ...props }) => (
  <div className={`relative ${className}`}>
    <select {...props} className={`${ui.fieldBase} pr-9 appearance-none bg-none ms-select`} style={{ backgroundImage: "none" }}>
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
  </div>
);

export default function LoanStatusList() {
  const { status } = useParams(); // core status or a derived scope
  const navigate = useNavigate();
  const { success, error } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // filter refs
  const [products, setProducts] = useState([]);
  const [officers, setOfficers] = useState([]);

  const [q, setQ] = useState(searchParams.get("q") || "");
  const [productId, setProductId] = useState(searchParams.get("productId") || "");
  const [officerId, setOfficerId] = useState(searchParams.get("officerId") || "");
  const [startDate, setStartDate] = useState(searchParams.get("startDate") || ""); // yyyy-mm-dd
  const [endDate, setEndDate] = useState(searchParams.get("endDate") || ""); // yyyy-mm-dd
  const [minAmt, setMinAmt] = useState(searchParams.get("minAmt") || "");
  const [maxAmt, setMaxAmt] = useState(searchParams.get("maxAmt") || "");

  // pagination
  const initialPage = Number(searchParams.get("page") || 1);
  const initialPageSize = Number(searchParams.get("pageSize") || 25);
  const [page, setPage] = useState(Math.max(1, initialPage));
  const [pageSize, setPageSize] = useState([10, 25, 50, 100].includes(initialPageSize) ? initialPageSize : 25);

  // row menu + assign modal state
  const [menuOpenRow, setMenuOpenRow] = useState(null);
  const [assignModal, setAssignModal] = useState({ open: false, loan: null, officerId: "" });

  // confirms
  const [confirm, setConfirm] = useState({
    open: false,
    title: "",
    description: "",
    destructive: false,
    onConfirm: null,
  });

  const title = TITLE_MAP[status] || "Loans";
  const showActions = ["disbursed", "active"].includes(String(status || "").toLowerCase());

  /* ---------- fetch lists for filters ---------- */
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
        const r2 = await api.get("/users", { params: { role: "loan_officer", pageSize: 500 } });
        const data = Array.isArray(r2.data) ? r2.data : r2.data?.items || [];
        setOfficers(data);
      } catch {
        setOfficers([]);
      }
    })();
  }, []);

  /* ---------- load data with server-side filters ---------- */
  const load = async (opts = {}) => {
    setLoading(true);
    try {
      const params = { page, pageSize };

      // Only send DB-backed statuses as ?status=
      if (CORE_STATUSES.includes(String(status))) {
        if (BACKEND_ENUM_STATUSES.includes(String(status))) {
          params.status = String(status);
        } else {
          params.scope = String(status);
        }
      } else if (status) {
        params.scope = status; // derived list hint for backend
      }

      // server-side filters if supported
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
      let total = res.data?.total ?? data.length;

      // Client-side mapping for "active"
      let dataAdj = data;
      if (String(status).toLowerCase() === "active") {
        dataAdj = data.filter(
          (l) => String(l.status || l.state || "").toLowerCase() === "disbursed"
        );
        total = dataAdj.length;
      }

      setRows(dataAdj);
      setTotalCount(total);
    } catch (e) {
      console.error(e);
      setRows([]);
      setTotalCount(0);
      error("Failed to load loans.");
    } finally {
      setLoading(false);
    }

    if (!opts.skipSyncUrl) {
      const next = new URLSearchParams();
      if (q) next.set("q", q);
      if (productId) next.set("productId", productId);
      if (officerId) next.set("officerId", officerId);
      if (startDate) next.set("startDate", startDate);
      if (endDate) next.set("endDate", endDate);
      if (minAmt) next.set("minAmt", minAmt);
      if (maxAmt) next.set("maxAmt", maxAmt);
      next.set("page", String(page));
      next.set("pageSize", String(pageSize));
      setSearchParams(next);
    }
  };

  useEffect(() => {
    load({ skipSyncUrl: true }); // first paint reads existing URL
    setMenuOpenRow(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page, pageSize]);

  /* ---------- client-side filtering fallback ---------- */
  const filtered = useMemo(() => {
    const sd = startDate ? new Date(startDate) : null;
    const ed = endDate ? new Date(endDate) : null;

    return rows.filter((l) => {
      // date range (releaseDate/startDate/disbursementDate/createdAt)
      if (sd || ed) {
        const when = l.releaseDate || l.startDate || l.disbursementDate || l.createdAt || null;
        const d = when ? new Date(when) : null;
        if (sd && (!d || d < sd)) return false;
        if (ed && (!d || d > ed)) return false;
      }
      // product
      if (productId && String(l.productId) !== String(productId)) return false;
      // officer
      if (officerId && String(l.officerId || l.loanOfficerId) !== String(officerId)) return false;
      // amount
      const amt = Number(l.amount ?? l.principal ?? 0);
      if (minAmt && !(amt >= Number(minAmt))) return false;
      if (maxAmt && !(amt <= Number(maxAmt))) return false;
      // q against borrower/product/phone/loan #
      const needle = q.trim().toLowerCase();
      if (needle) {
        const borrower = l.Borrower || l.borrower || {};
        const product = l.Product || l.product || {};
        const hay = [
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

  // slice for client pagination when server doesn't paginate
  const paged = useMemo(() => {
    if (totalCount > rows.length) return filtered; // server pagination
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize, rows.length, totalCount]);

  /* ---------- totals ---------- */
  const totals = useMemo(() => {
    let p = 0, i = 0, f = 0, pen = 0, t = 0;
    filtered.forEach((l) => {
      const op = Number(l.outstandingPrincipal || 0);
      const oi = Number(l.outstandingInterest || 0);
      const of = Number(l.outstandingFees || 0);
      const ope = Number(l.outstandingPenalty || 0);
      const tot = l.outstanding != null ? Number(l.outstanding) : op + oi + of + ope;
      p += op; i += oi; f += of; pen += ope; t += tot;
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
      const date = l.releaseDate || l.startDate || l.disbursementDate || l.createdAt || null;

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

  const exportCSV = () =>
    exportCSVFromRows(buildExportRows(), (TITLE_MAP[status] || "loans").toLowerCase().replace(/\s+/g, "-"));

  const exportExcel = () =>
    exportExcelHTMLFromRows(buildExportRows(), (TITLE_MAP[status] || "loans").toLowerCase().replace(/\s+/g, "-"));

  const exportPDF = () => exportPDFPrintFromRows(buildExportRows(), TITLE_MAP[status] || "Loans");

  /* ---------- row actions ---------- */
  const viewLoan = (id) => navigate(`/loans/${id}`);
  const editLoan = (id) => navigate(`/loans/${id}?edit=1`);
  const redisburse = (id) =>
    setConfirm({
      open: true,
      destructive: false,
      title: "Re-disburse this loan?",
      description:
        "You will be taken to the disbursement screen to create a new disbursement tied to this loan.",
      onConfirm: () => navigate(`/loans/${id}/disburse`),
    });
  const recordRepayment = (id) => navigate(`/repayments/new?loanId=${id}`);
  const reschedule = (id) =>
    setConfirm({
      open: true,
      destructive: false,
      title: "Reschedule repayments?",
      description: "Open the schedule tool to recompute the repayment plan for this loan.",
      onConfirm: () => navigate(`/loans/schedule?loanId=${id}`),
    });

  const downloadSchedule = async (row) => {
    try {
      const res = await api.get(`/loans/${row.id}/schedule`);
      const data = Array.isArray(res.data) ? res.data : [];
      const columns = [
        { label: "#", value: (_r, i) => i + 1 },
        { label: "Due Date", value: (r) => (r.dueDate ? new Date(r.dueDate).toISOString().slice(0, 10) : "") },
        { label: "Principal", value: (r) => r.principal ?? 0 },
        { label: "Interest", value: (r) => r.interest ?? 0 },
        { label: "Penalty", value: (r) => r.penalty ?? 0 },
        {
          label: "Total",
          value: (r) => r.total ?? (Number(r.principal || 0) + Number(r.interest || 0) + Number(r.penalty || 0)),
        },
        { label: "Balance", value: (r) => r.balance ?? "" },
      ];
      const head = columns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(",");
      const body = data
        .map((row, i) => columns.map((c) => `"${String(c.value(row, i) ?? "").replace(/"/g, '""')}"`).join(","))
        .join("\n");
      const csv = `${head}\n${body}`;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `loan_${row.id}_schedule.csv`;
      a.click();
      success("Schedule downloaded.");
    } catch (e) {
      console.error(e);
      error("Couldn't download schedule.");
    }
  };

  const openAssignOfficer = (loan) =>
    setAssignModal({ open: true, loan, officerId: loan?.loanOfficerId || loan?.officerId || "" });

  const submitAssignOfficer = async () => {
    const { loan, officerId } = assignModal;
    if (!loan || !officerId) return;
    try {
      await api
        .patch(`/loans/${loan.id}/assign-officer`, { userId: officerId })
        .catch(() => api.patch(`/loans/${loan.id}`, { loanOfficerId: officerId }));
      // refresh local row
      setRows((prev) =>
        prev.map((l) =>
          l.id === loan.id
            ? {
                ...l,
                loanOfficerId: officerId,
                officerId: officerId,
                officerName:
                  officers.find((o) => String(o.id) === String(officerId))?.name || l.officerName,
              }
            : l
        )
      );
      setAssignModal({ open: false, loan: null, officerId: "" });
      success("Loan officer assigned.");
    } catch (e) {
      console.error(e);
      error("Failed to assign officer.");
    }
  };

  /* ---------- render ---------- */
  const baseHeadCount = 15; // number of data columns before Action
  const headCount = baseHeadCount + (showActions ? 1 : 0);

  const dropdownRef = useRef(null);
  useEffect(() => {
    const onDoc = (e) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target)) setMenuOpenRow(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const clearFilters = () => {
    setQ("");
    setProductId("");
    setOfficerId("");
    setStartDate("");
    setEndDate("");
    setMinAmt("");
    setMaxAmt("");
    setPage(1);
    setSearchParams(new URLSearchParams());
    setTimeout(() => load({ skipSyncUrl: true }), 0);
  };

  return (
    <div className={ui.page}>
      {/* Hide native select arrows (Windows IE/Edge legacy) */}
      <style>{`
        select.ms-select { -webkit-appearance: none; -moz-appearance: none; appearance: none; background-image: none !important; }
        select.ms-select::-ms-expand { display: none; }
      `}</style>

      {/* Header */}
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className={ui.h1}>{title}</h2>
          <div className={ui.sub}>
            Total: {fmtNum(totalCount)}{" "}
            <span className="mx-2 text-slate-400">•</span>
            <Link to="/loans" className="text-indigo-700 underline font-semibold">
              All Loans
            </Link>
          </div>
        </div>

        {/* export buttons */}
        <div className="flex flex-wrap gap-2">
          <button onClick={exportCSV} className={ui.btnGhost}>Export CSV</button>
          <button onClick={exportExcel} className={ui.btnGhost}>Export Excel</button>
          <button onClick={exportPDF} className={ui.btnGhost}>Export PDF</button>
        </div>
      </div>

      {/* Filters */}
      <div className={`${ui.card} p-4 mb-6`}>
        <div className="flex items-center justify-between mb-3">
          <div className="inline-flex items-center gap-2 text-slate-800 font-semibold">
            <Filter className="w-4 h-4" /> Filters
          </div>
          <button onClick={clearFilters} className="text-sm underline decoration-slate-300 hover:decoration-slate-600">
            Clear all
          </button>
        </div>

        {/* neat, parallel grid; full-width on large screens */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          <TextField
            className="lg:col-span-2"
            leadingIcon={<Search className={ui.fieldIcon} />}
            placeholder="Search borrower / phone / product / loan #"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <SelectField value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Product: All</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}{p.code ? ` (${p.code})` : ""}
              </option>
            ))}
          </SelectField>
          <SelectField value={officerId} onChange={(e) => setOfficerId(e.target.value)}>
            <option value="">Officer: All</option>
            {officers.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name || o.email}
              </option>
            ))}
          </SelectField>
          <TextField type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <TextField type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <TextField type="number" placeholder="Min Amount" value={minAmt} onChange={(e) => setMinAmt(e.target.value)} />
          <TextField type="number" placeholder="Max Amount" value={maxAmt} onChange={(e) => setMaxAmt(e.target.value)} />
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => { setPage(1); load(); }}
            className={ui.btnPrimary}
          >
            Apply Filters
          </button>
          <button onClick={clearFilters} className={ui.btn}>
            Reset
          </button>
        </div>
      </div>

      {/* Table */}
      <div className={`${ui.card} overflow-x-auto`}>
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className={ui.th}>Date</th>
              <th className={ui.th}>Borrower Name</th>
              <th className={ui.th}>Phone Number</th>
              <th className={ui.th}>Loan Product</th>
              <th className={`${ui.th} text-right`}>Principal Amount</th>
              <th className={`${ui.th} text-right`}>Interest Amount</th>
              <th className={`${ui.th} text-right`}>Outstanding Principal</th>
              <th className={`${ui.th} text-right`}>Outstanding Interest</th>
              <th className={`${ui.th} text-right`}>Outstanding Fees</th>
              <th className={`${ui.th} text-right`}>Outstanding Penalty</th>
              <th className={`${ui.th} text-right`}>Total Outstanding</th>
              <th className={`${ui.th} text-right`}>Interest Rate/Year (%)</th>
              <th className={`${ui.th} text-right`}>Loan Duration (Months)</th>
              <th className={ui.th}>Loan Officer</th>
              <th className={ui.th}>Status</th>
              {showActions && <th className={`${ui.th}`}>Action</th>}
            </tr>
          </thead>

          <tbody ref={dropdownRef}>
            {loading ? (
              <tr>
                <td colSpan={headCount} className={`${ui.td} text-center py-10 text-slate-600`}>
                  Loading…
                </td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={headCount} className={`${ui.td} text-center py-10 text-slate-600`}>
                  No loans found.
                </td>
              </tr>
            ) : (
              paged.map((l) => {
                const borrower = l.Borrower || l.borrower || {};
                const product = l.Product || l.product || {};
                const officer = l.officer || {};
                const currency = l.currency || "TZS";
                const date = l.releaseDate || l.startDate || l.createdAt || l.disbursementDate || null;

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
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className={ui.td}>{fmtDate(date)}</td>
                    <td className={ui.td}>
                      {borrower.id ? (
                        <Link to={`/borrowers/${borrower.id}`} className="text-indigo-700 hover:underline font-semibold">
                          {borrower.name || l.borrowerName || "—"}
                        </Link>
                      ) : (
                        borrower.name || l.borrowerName || "—"
                      )}
                    </td>
                    <td className={ui.td}>{borrower.phone || l.borrowerPhone || "—"}</td>
                    <td className={ui.td}>{product.name || l.productName || "—"}</td>
                    <td className={`${ui.td} text-right`}>{fmtC(l.amount ?? l.principal, currency)}</td>
                    <td className={`${ui.td} text-right`}>{fmtC(l.interestAmount, currency)}</td>
                    <td className={`${ui.td} text-right`}>{fmtTZS(op, currency)}</td>
                    <td className={`${ui.td} text-right`}>{fmtTZS(oi, currency)}</td>
                    <td className={`${ui.td} text-right`}>{fmtTZS(of, currency)}</td>
                    <td className={`${ui.td} text-right`}>{fmtTZS(ope, currency)}</td>
                    <td className={`${ui.td} text-right`}>{fmtTZS(totalOutstanding, currency)}</td>
                    <td className={`${ui.td} text-right`}>{fmtPct(annualRate)}</td>
                    <td className={`${ui.td} text-right`}>{fmtNum(termMonths)}</td>
                    <td className={ui.td}>{l.officerName || officer.name || "—"}</td>
                    <td className={ui.td}>{l.status || "—"}</td>

                    {showActions && (
                      <td className={`${ui.td} whitespace-nowrap`}>
                        <div className="relative inline-block">
                          <button
                            className="px-2 py-1 rounded border-2 border-slate-300 hover:bg-slate-50 font-medium"
                            onClick={() => setMenuOpenRow((r) => (r === l.id ? null : l.id))}
                          >
                            Actions ▾
                          </button>
                          {menuOpenRow === l.id && (
                            <div className="absolute right-0 mt-1 w-56 bg-white border-2 border-slate-300 rounded-lg shadow-lg z-10 overflow-hidden">
                              <button
                                className="w-full text-left px-3 py-2 hover:bg-slate-50"
                                onClick={() => { setMenuOpenRow(null); viewLoan(l.id); }}
                              >
                                View (details & repayments)
                              </button>
                              <button
                                className="w-full text-left px-3 py-2 hover:bg-slate-50"
                                onClick={() => { setMenuOpenRow(null); editLoan(l.id); }}
                              >
                                Edit
                              </button>
                              <button
                                className="w-full text-left px-3 py-2 hover:bg-slate-50"
                                onClick={() => { setMenuOpenRow(null); recordRepayment(l.id); }}
                              >
                                Record Repayment
                              </button>
                              <button
                                className="w-full text-left px-3 py-2 hover:bg-slate-50"
                                onClick={async () => { setMenuOpenRow(null); await downloadSchedule(l); }}
                              >
                                Download Schedule (CSV)
                              </button>
                              <button
                                className="w-full text-left px-3 py-2 hover:bg-slate-50"
                                onClick={() => { setMenuOpenRow(null); reschedule(l.id); }}
                              >
                                Reschedule Repayments
                              </button>
                              <button
                                className="w-full text-left px-3 py-2 hover:bg-slate-50"
                                onClick={() => { setMenuOpenRow(null); redisburse(l.id); }}
                              >
                                Re-disburse
                              </button>
                              <button
                                className="w-full text-left px-3 py-2 hover:bg-slate-50"
                                onClick={() => { setMenuOpenRow(null); openAssignOfficer(l); }}
                              >
                                Assign Loan Officer
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>

          {!loading && filtered.length > 0 && (
            <tfoot>
              <tr className="bg-slate-100">
                <td className={`${ui.td} font-semibold text-right`} colSpan={6}>
                  Totals:
                </td>
                <td className={`${ui.td} font-semibold text-right`}>{fmtTZS(totals.p)}</td>
                <td className={`${ui.td} font-semibold text-right`}>{fmtTZS(totals.i)}</td>
                <td className={`${ui.td} font-semibold text-right`}>{fmtTZS(totals.f)}</td>
                <td className={`${ui.td} font-semibold text-right`}>{fmtTZS(totals.pen)}</td>
                <td className={`${ui.td} font-semibold text-right`}>{fmtTZS(totals.t)}</td>
                <td className={ui.td} colSpan={4 + (showActions ? 1 : 0)}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* pagination */}
      <Pagination
        page={page}
        pageSize={pageSize}
        total={totalCount || filtered.length}
        onPageChange={(p) => setPage(p)}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
      />

      {/* Assign officer modal */}
      {assignModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-xl w-full max-w-md p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-bold">Assign Loan Officer</h4>
              <button
                onClick={() => setAssignModal({ open: false, loan: null, officerId: "" })}
                className="px-2 py-1 rounded hover:bg-slate-50"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-sm">
                Loan:{" "}
                <span className="font-semibold">
                  {assignModal.loan?.Borrower?.name ||
                    assignModal.loan?.borrowerName ||
                    `#${assignModal.loan?.id}`}
                </span>
              </div>
              <SelectField
                value={assignModal.officerId}
                onChange={(e) => setAssignModal((s) => ({ ...s, officerId: e.target.value }))}
              >
                <option value="">Select officer…</option>
                {officers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name || o.fullName || o.email || `User ${o.id}`}
                  </option>
                ))}
              </SelectField>
              {!officers.length && (
                <p className="text-xs text-amber-700">
                  No officers found. Ensure users with role “loan_officer” exist.
                </p>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setAssignModal({ open: false, loan: null, officerId: "" })}
                className={ui.btn}
              >
                Cancel
              </button>
              <button
                onClick={submitAssignOfficer}
                disabled={!assignModal.officerId}
                className={ui.btnPrimary + " disabled:opacity-60"}
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* confirmations */}
      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        description={confirm.description}
        destructive={confirm.destructive}
        onConfirm={confirm.onConfirm}
        onClose={() => setConfirm((c) => ({ ...c, open: false }))}
      />
    </div>
  );
}
