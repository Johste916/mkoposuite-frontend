import React, { useEffect, useMemo, useState } from "react";
import api from "../api";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
} from "date-fns";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Legend,
  Tooltip,
} from "chart.js";
import { Download, FileText, Filter, ChevronDown } from "lucide-react";

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Legend, Tooltip);

/* ---------- utils ---------- */
const ymd = (d) => format(d, "yyyy-MM-dd");
const currency = (n) => `TZS ${Number(n || 0).toLocaleString()}`;

/** compute start/end based on the selected quick period */
function computeRange(range) {
  const today = new Date();
  switch (range) {
    case "today":
      return { startDate: ymd(today), endDate: ymd(today) };
    case "week":
      return {
        startDate: ymd(startOfWeek(today, { weekStartsOn: 1 })),
        endDate: ymd(endOfWeek(today, { weekStartsOn: 1 })),
      };
    case "month":
      return { startDate: ymd(startOfMonth(today)), endDate: ymd(endOfMonth(today)) };
    case "quarter":
      return { startDate: ymd(startOfQuarter(today)), endDate: ymd(endOfQuarter(today)) };
    case "semiAnnual": {
      const m = today.getMonth(); // 0..11
      if (m <= 5) return { startDate: `${today.getFullYear()}-01-01`, endDate: `${today.getFullYear()}-06-30` };
      return { startDate: `${today.getFullYear()}-07-01`, endDate: `${today.getFullYear()}-12-31` };
    }
    case "annual":
      return { startDate: ymd(startOfYear(today)), endDate: ymd(endOfYear(today)) };
    default:
      return { startDate: "", endDate: "" };
  }
}

/** normalize the /reports/borrowers/loan-summary payload into flat metrics for the table */
function normalizeLoanSummaryPayload(data) {
  if (!data) return null;

  const top = {
    loanCount: Number(data?.summary?.loanCount || 0),
    totalRepayments: Number(data?.summary?.totalRepayments || 0),
    defaulterCount: Number(data?.summary?.defaulterCount || 0),
  };

  const rows = Array.isArray(data?.table?.rows) ? data.table.rows : [];
  const get = (name) => {
    const r = rows.find((x) => String(x.metric).toLowerCase() === String(name).toLowerCase());
    return r?.value ?? 0;
  };

  const flat = {
    totalLoansCount: Number(get("Total Loans Count")),
    totalDisbursed: Number(get("Total Disbursed")),
    totalRepayments: Number(get("Total Repayments")),
    outstandingBalance: Number(get("Outstanding Balance")),
    arrearsCount: Number(get("Arrears Count") || 0),
    arrearsAmount: Number(get("Arrears Amount") || 0),
    period: data?.table?.period || data?.period || "",
    scope: data?.table?.scope || data?.scope || "",
  };

  return { top, flat };
}

/* ---------- high-contrast UI tokens ---------- */
const ui = {
  page: "w-full px-4 md:px-6 lg:px-10 py-6 text-slate-900",
  h1: "text-3xl font-extrabold tracking-tight",
  card: "rounded-2xl border-2 border-slate-300 bg-white shadow",
  th: "bg-slate-100 text-left text-[12px] uppercase tracking-wide text-slate-700 font-semibold px-3 py-2 border-2 border-slate-200 select-none",
  td: "px-3 py-2 border-2 border-slate-200 text-sm",
  statTitle: "text-[11px] uppercase tracking-wide text-slate-600 font-semibold",
  statNum: "text-2xl md:text-3xl font-extrabold tabular-nums",
  btn: "inline-flex items-center rounded-lg border-2 border-slate-300 px-3 py-2 hover:bg-slate-50 font-semibold",
  btnPrimary: "inline-flex items-center rounded-lg bg-indigo-600 text-white px-3 py-2 font-semibold hover:bg-indigo-700",
  btnDanger: "inline-flex items-center rounded-lg bg-rose-600 text-white px-3 py-2 font-semibold hover:bg-rose-700",
  fieldBase:
    "h-11 w-full rounded-lg border-2 border-slate-300 bg-white text-sm outline-none " +
    "focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-600 transition",
};

/* ---------- clean, parallel fields ---------- */
const SelectField = ({ className = "", children, ...props }) => (
  <div className={`relative ${className}`}>
    <select {...props} className={`${ui.fieldBase} pr-9 appearance-none bg-none ms-select`} style={{ backgroundImage: "none" }}>
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
  </div>
);
const DateField = (props) => <input type="date" {...props} className={ui.fieldBase} />;

/* ---------- component ---------- */
const Reports = () => {
  // summary cards
  const [summary, setSummary] = useState({ loanCount: 0, totalRepayments: 0, defaulterCount: 0 });

  // trends
  const [trends, setTrends] = useState([]);
  const [year] = useState(new Date().getFullYear());

  // filters
  const [branches, setBranches] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [borrowers, setBorrowers] = useState([]);

  const [branchId, setBranchId] = useState("");
  const [officerId, setOfficerId] = useState("");
  const [borrowerId, setBorrowerId] = useState("");

  const [timeRange, setTimeRange] = useState(""); // '', today, week, month, quarter, semiAnnual, annual, custom
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // loan summary (scoped)
  const [loanSummary, setLoanSummary] = useState(null);
  const [loadingLoanSummary, setLoadingLoanSummary] = useState(true);

  // ---------- load base data ----------
  useEffect(() => {
    fetchFilters();
    fetchSummary();
    fetchTrends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // derived dates for quick ranges
  useEffect(() => {
    if (timeRange && timeRange !== "custom") {
      const { startDate: s, endDate: e } = computeRange(timeRange);
      setStartDate(s);
      setEndDate(e);
    }
  }, [timeRange]);

  // re-fetch loan summary when scope changes
  useEffect(() => {
    fetchLoanSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, officerId, borrowerId, timeRange, startDate, endDate]);

  const fetchFilters = async () => {
    try {
      const res = await api.get("/reports/filters"); // -> {branches, officers, borrowers, products}
      setBranches(res.data?.branches || []);
      setOfficers(res.data?.officers || []);
      setBorrowers(res.data?.borrowers || []);
    } catch (err) {
      console.error("Error loading filters:", err);
    }
  };

  // Summary cards come from the same endpoint as the table
  const fetchSummary = async () => {
    try {
      const res = await api.get("/reports/borrowers/loan-summary");
      const norm = normalizeLoanSummaryPayload(res.data);
      if (norm) setSummary(norm.top);
    } catch (err) {
      console.error("Error loading summary:", err);
    }
  };

  const makeParams = () => {
    const p = {
      branchId: branchId || undefined,
      officerId: officerId || undefined,
      borrowerId: borrowerId || undefined,
    };
    if (timeRange === "custom") {
      if (startDate) p.startDate = startDate;
      if (endDate) p.endDate = endDate;
    } else if (timeRange) {
      const { startDate: s, endDate: e } = computeRange(timeRange);
      if (s) p.startDate = s;
      if (e) p.endDate = e;
    }
    return p;
  };

  const fetchLoanSummary = async () => {
    setLoadingLoanSummary(true);
    try {
      const res = await api.get("/reports/borrowers/loan-summary", { params: makeParams() });
      const norm = normalizeLoanSummaryPayload(res.data);
      setLoanSummary(norm?.flat || null);
      if (norm?.top) setSummary(norm.top); // keep top cards in sync
    } catch (err) {
      console.error("Error loading loan summary:", err);
      setLoanSummary(null);
    } finally {
      setLoadingLoanSummary(false);
    }
  };

  const fetchTrends = async () => {
    try {
      const res = await api.get(`/reports/loans/trends`, { params: { year } });
      setTrends(res.data || []);
    } catch (err) {
      console.error("Error loading trends:", err);
    }
  };

  const exportCSV = () => {
    const base = import.meta.env.VITE_API_BASE_URL || "";
    const qs = new URLSearchParams(makeParams()).toString();
    window.open(`${base}/reports/loans/export/csv${qs ? `?${qs}` : ""}`, "_blank");
  };
  const exportPDF = () => {
    const base = import.meta.env.VITE_API_BASE_URL || "";
    const qs = new URLSearchParams(makeParams()).toString();
    window.open(`${base}/reports/loans/export/pdf${qs ? `?${qs}` : ""}`, "_blank");
  };

  const chartData = useMemo(
    () => ({
      labels: trends.map((d) => format(new Date(year, (d.month || 1) - 1, 1), "MMM")),
      datasets: [
        {
          label: "Loan Disbursed",
          data: trends.map((d) => d.loans),
          borderColor: "rgba(75,192,192,1)",
          fill: false,
        },
        {
          label: "Repayments Received",
          data: trends.map((d) => d.repayments),
          borderColor: "rgba(153,102,255,1)",
          fill: false,
        },
      ],
    }),
    [trends, year]
  );

  const showCustomDates = timeRange === "custom";

  const resetFilters = () => {
    setBranchId("");
    setOfficerId("");
    setBorrowerId("");
    setTimeRange("");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className={ui.page}>
      {/* Hide native select arrows to avoid double icons */}
      <style>{`
        select.ms-select { -webkit-appearance: none; -moz-appearance: none; appearance: none; background-image: none !important; }
        select.ms-select::-ms-expand { display: none; }
      `}</style>

      {/* Heading */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-7 h-7 text-indigo-600" />
          <h1 className={ui.h1}>Borrowers Report</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className={ui.btn}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </button>
          <button onClick={exportPDF} className={ui.btn}>
            <Download className="w-4 h-4 mr-2" /> Export PDF
          </button>
        </div>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`${ui.card} p-4`}>
          <div className={ui.statTitle}>Total Loans Issued</div>
          <div className={ui.statNum}>{summary.loanCount || 0}</div>
        </div>
        <div className={`${ui.card} p-4`}>
          <div className={ui.statTitle}>Total Repayments</div>
          <div className={ui.statNum}>{currency(summary.totalRepayments)}</div>
        </div>
        <div className={`${ui.card} p-4`}>
          <div className={ui.statTitle}>Defaulters</div>
          <div className={`${ui.statNum} text-rose-600`}>{summary.defaulterCount || 0}</div>
        </div>
      </div>

      {/* Filters (clean + parallel) */}
      <div className={`${ui.card} p-4 mb-6`}>
        <div className="flex items-center justify-between mb-3">
          <div className="inline-flex items-center gap-2 text-slate-800 font-semibold">
            <Filter className="w-4 h-4" /> Filters
          </div>
          <div className="flex gap-2">
            <button onClick={resetFilters} className={ui.btn}>
              Reset
            </button>
          </div>
        </div>

        {/* one tidy row on xl, responsive stack on small */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
          <SelectField value={branchId} onChange={(e) => setBranchId(e.target.value)} className="xl:col-span-2">
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name || `#${b.id}`}
              </option>
            ))}
          </SelectField>

          <SelectField value={officerId} onChange={(e) => setOfficerId(e.target.value)} className="xl:col-span-2">
            <option value="">All Loan Officers</option>
            {officers.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name || o.email || `#${o.id}`}
              </option>
            ))}
          </SelectField>

          <SelectField value={borrowerId} onChange={(e) => setBorrowerId(e.target.value)} className="xl:col-span-2">
            <option value="">All Borrowers</option>
            {borrowers.map((br) => (
              <option key={br.id} value={br.id}>
                {br.name || `#${br.id}`}
              </option>
            ))}
          </SelectField>

          <SelectField value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
            <option value="">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="semiAnnual">Semi-Annual</option>
            <option value="annual">Annual</option>
            <option value="custom">Custom</option>
          </SelectField>

          {timeRange === "custom" && (
            <>
              <DateField value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <DateField value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </>
          )}
        </div>
      </div>

      {/* Loan Summary Report (crisp full grid) */}
      <div className={`${ui.card} p-4 mb-6`}>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-bold tracking-tight">Loan Summary Report</h2>
          {loanSummary && (
            <button
              onClick={() => {
                const csvRows = [
                  ["Metric", "Value"],
                  ["Total Loans Count", loanSummary.totalLoansCount || 0],
                  ["Total Disbursed", loanSummary.totalDisbursed || 0],
                  ["Total Repayments", loanSummary.totalRepayments || 0],
                  ["Outstanding Balance", loanSummary.outstandingBalance || 0],
                  ["Arrears Count", loanSummary.arrearsCount || 0],
                  ["Arrears Amount", loanSummary.arrearsAmount || 0],
                  ["Period", loanSummary.period || "all"],
                  ["Scope", loanSummary.scope || ""],
                ];
                const csvContent = csvRows.map((row) => row.join(",")).join("\n");
                const blob = new Blob([csvContent], { type: "text/csv" });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = "loan_summary_report.csv";
                link.click();
              }}
              className={ui.btnPrimary}
            >
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </button>
          )}
        </div>

        {loadingLoanSummary ? (
          <p className="text-slate-600">Loading…</p>
        ) : loanSummary ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className={ui.th}>Metric</th>
                  <th className={ui.th}>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-slate-50">
                  <td className={ui.td}>Total Loans Count</td>
                  <td className={`${ui.td} font-semibold`}>{loanSummary.totalLoansCount || 0}</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className={ui.td}>Total Disbursed</td>
                  <td className={`${ui.td} font-semibold`}>{currency(loanSummary.totalDisbursed)}</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className={ui.td}>Total Repayments</td>
                  <td className={`${ui.td} font-semibold`}>{currency(loanSummary.totalRepayments)}</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className={ui.td}>Outstanding Balance</td>
                  <td className={`${ui.td} font-semibold`}>{currency(loanSummary.outstandingBalance)}</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className={ui.td}>Arrears Count</td>
                  <td className={`${ui.td} font-semibold`}>{loanSummary.arrearsCount || 0}</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className={ui.td}>Arrears Amount</td>
                  <td className={`${ui.td} font-semibold`}>{currency(loanSummary.arrearsAmount)}</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className={ui.td}>Period</td>
                  <td className={`${ui.td} font-semibold`}>{loanSummary.period || "all"}</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className={ui.td}>Scope</td>
                  <td className={`${ui.td} font-semibold`}>{loanSummary.scope || ""}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-rose-600">No data found.</p>
        )}
      </div>

      {/* Trend Chart */}
      <div className={`${ui.card} p-4 mb-6`}>
        <h2 className="text-xl font-bold tracking-tight mb-2">Monthly Trend – {year}</h2>
        <Line data={chartData} />
      </div>

      {/* Exports */}
      <div className="flex flex-wrap gap-3">
        <button onClick={exportCSV} className={ui.btnPrimary}>
          <Download className="w-4 h-4 mr-2" /> Export Full CSV
        </button>
        <button onClick={exportPDF} className={ui.btnDanger}>
          <Download className="w-4 h-4 mr-2" /> Export Full PDF
        </button>
      </div>
    </div>
  );
};

export default Reports;
