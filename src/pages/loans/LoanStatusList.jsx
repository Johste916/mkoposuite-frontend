import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";

import api from "../../api";
import { fmtCurrency as fmtC, fmtNum, fmtDate } from "../../utils/format";
import {
  exportCSVFromRows,
  exportExcelHTMLFromRows,
  exportPDFPrintFromRows,
} from "../../utils/exporters";
import Pagination from "../../components/table/Pagination";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useToast } from "../../components/common/ToastProvider";
import { Search, ChevronDown, Filter } from "lucide-react";

/* ---------- UI tokens ---------- */
const ui = {
  page: "w-full px-4 md:px-6 lg:px-10 py-6 text-slate-900",
  h1: "text-3xl font-extrabold tracking-tight",
  sub: "text-sm text-slate-700",
  card: "rounded-2xl border border-slate-200 bg-white shadow-sm",
  th: "bg-slate-50 text-left text-[12px] uppercase tracking-wide text-slate-700 font-semibold px-3 py-2 border-b border-slate-200 select-none",
  td: "px-3 py-2 border-b border-slate-100 text-sm align-top",
  btn: "inline-flex items-center rounded-lg border px-3 py-2 hover:bg-slate-50 font-semibold border-slate-300",
  btnGhost:
    "inline-flex items-center rounded-lg border px-3 py-2 hover:bg-slate-50 border-slate-300",
  btnPrimary:
    "inline-flex items-center rounded-lg bg-indigo-600 text-white px-3 py-2 font-semibold hover:bg-indigo-700",
  fieldBase:
    "h-11 w-full rounded-lg border border-slate-300 bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-600 transition",
  fieldIcon:
    "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500",
};

const TextField = ({ className = "", leadingIcon = null, ...props }) => (
  <div className={`relative ${className}`}>
    {leadingIcon}
    <input {...props} className={`${ui.fieldBase} ${leadingIcon ? "pl-10" : ""}`} />
  </div>
);

const SelectField = ({ className = "", children, ...props }) => (
  <div className={`relative ${className}`}>
    <select
      {...props}
      className={`${ui.fieldBase} pr-9 appearance-none bg-none ms-select`}
      style={{ backgroundImage: "none" }}
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
  </div>
);

/* ---------- Safe helpers ---------- */
const isSameDay = (a, b) =>
  a &&
  b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();
const isBefore = (a, b) => (a && b ? a.getTime() < b.getTime() : false);
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const lc = (v) => String(v || "").toLowerCase();

/* ---------- Nice formatting helpers ---------- */
const titleCase = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/\b([a-z])/g, (_, c) => c.toUpperCase());

const StatusPill = ({ value }) => {
  const v = String(value || "").toLowerCase();
  const cls =
    v === "disbursed"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : v.includes("arrear")
      ? "bg-orange-50 text-orange-700 border-orange-200"
      : v.includes("overdue")
      ? "bg-red-50 text-red-700 border-red-200"
      : "bg-slate-50 text-slate-700 border-slate-200";
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border ${cls}`}>
      {titleCase(v || "—")}
    </span>
  );
};

/* ---------- Detect placeholder officer labels ---------- */
const looksLikePlaceholderOfficer = (name) => {
  if (!name) return true;
  const token = String(name).trim().toLowerCase();
  const roleWords = ["admin", "administrator", "manager", "director", "user", "loan officer", "officer"];
  if (roleWords.includes(token)) return true;
  if (/^officer\s*#\s*/i.test(name)) return true;
  if (/^[0-9a-f-]{8,}$/i.test(token)) return true; // GUID-like
  return false;
};

/* ---------- Precise date parsing + helpers ---------- */
const parseDateStrict = (v) => {
  if (!v) return null;
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split("-").map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }
  const t = new Date(v);
  return Number.isFinite(t.getTime()) ? t : null;
};

/** Add N months safely (EOM-aware). */
const addMonthsSafe = (date, months) => {
  if (!date || !Number.isFinite(Number(months))) return null;
  const d = new Date(date.getTime());
  const day = d.getDate();
  d.setMonth(d.getMonth() + Number(months));
  if (d.getDate() < day) {
    d.setDate(1);
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
  }
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Maturity = disbursal/start + tenure months. */
const calcMaturityDate = (loan) => {
  const months =
    loan.loanDurationMonths ??
    loan.termMonths ??
    loan.durationMonths ??
    loan.tenureMonths ??
    loan.periodMonths ??
    null;
  if (!Number.isFinite(Number(months)) || Number(months) <= 0) return null;
  const base =
    parseDateStrict(loan.disbursementDate || loan.disbursement_date || loan.releaseDate) ||
    parseDateStrict(loan.startDate) ||
    parseDateStrict(loan.createdAt);
  if (!base) return null;
  const mat = addMonthsSafe(base, Number(months));
  return mat ? mat.toISOString().slice(0, 10) : null;
};

/** Choose next due using schedule first; otherwise best hint. */
const pickNextDueDate = (l) => {
  const fromSchedule = (sch) => {
    if (!Array.isArray(sch) || !sch.length) return null;
    const rows = sch
      .map((it) => ({
        dt: parseDateStrict(it?.dueDate || it?.date),
        status: String(it?.status || "").toUpperCase(),
      }))
      .filter((x) => x.dt);
    if (!rows.length) return null;
    const byPriority =
      rows.sort((a, b) => a.dt - b.dt).find((x) => x.status === "DUE") ||
      rows.find((x) => x.status === "PENDING" || x.status === "UPCOMING") ||
      rows[0];
    return byPriority?.dt || null;
  };

  const schedulePick = fromSchedule(l.repaymentSchedule) || fromSchedule(l.schedule);
  if (schedulePick) return schedulePick.toISOString().slice(0, 10);

  const candidates = [
    l.nextInstallmentDueDate,
    l.nextDueDate,
    l.upcomingDueDate,
    l.firstDueDate,
    l.dueDate,
    l.firstRepaymentDate,
    l.firstInstallmentDate,
    l.repaymentStartDate,
    l.expectedFirstRepaymentDate,
    l.nextDue?.date,
  ]
    .filter(Boolean)
    .map(parseDateStrict)
    .filter(Boolean);

  if (!candidates.length) return null;
  candidates.sort((a, b) => a - b);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const future = candidates.find((d) => d >= today);
  return (future || candidates[0]).toISOString().slice(0, 10);
};

/* ---------- Build a proper name from first/last parts ---------- */
const joinName = (a, b) => {
  const s = [a, b].filter(Boolean).join(" ").trim();
  return s || null;
};

/* ---------- Infer monthly rate (decimal) from any hints ---------- */
const inferMonthlyRate01 = (l) => {
  const toNumber = (v) => {
    if (v == null) return null;
    if (typeof v === "string") {
      const cleaned = v.replace(/\s*%$/, "").trim();
      return Number.isFinite(Number(cleaned)) ? Number(cleaned) : null;
    }
    return Number.isFinite(Number(v)) ? Number(v) : null;
  };

  const months =
    l.loanDurationMonths ?? l.termMonths ?? l.durationMonths ?? l.tenureMonths ?? l.periodMonths ?? null;

  const rInterest = toNumber(l.interestRate ?? l.rate);
  const rMonthlyExplicit = [l.monthlyInterestRate, l.interestRateMonth, l.ratePerMonth, l.rate_month]
    .map(toNumber)
    .find((x) => x != null);
  const rAnnualExplicit = [l.annualInterestRate, l.interestRateYear, l.interestRateAnnual, l.ratePerYear, l.rateAnnual]
    .map(toNumber)
    .find((x) => x != null);

  const cycle = (l.repaymentCycle || l.repaymentFrequency || l.frequency || l.installmentFrequency || "")
    .toString()
    .toLowerCase();
  const looksMonthly = cycle === "monthly" || (rInterest != null && rInterest <= 12 && Number(months || 0) > 0);

  if (rMonthlyExplicit != null) return rMonthlyExplicit > 1 ? rMonthlyExplicit / 100 : rMonthlyExplicit;
  if (rAnnualExplicit != null) {
    const yr01 = rAnnualExplicit > 1 ? rAnnualExplicit / 100 : rAnnualExplicit;
    return yr01 / 12;
  }
  if (rInterest != null) {
    if (looksMonthly) return rInterest > 1 ? rInterest / 100 : rInterest;
    const yr01 = rInterest > 1 ? rInterest / 100 : rInterest;
    return yr01 / 12;
  }
  return null;
};

/* ---------- Derive total interest (fallbacks) ---------- */
const deriveInterestTotal = (l) => {
  const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

  // 1) direct fields
  const direct =
    l.interestAmount ?? l.totalInterest ?? l.expectedInterest ?? l.interest ?? l.interest_total ?? null;
  if (Number.isFinite(Number(direct)) && Number(direct) > 0) return Number(direct);

  // 2) sum from schedule if we have it
  const sch = Array.isArray(l.repaymentSchedule) ? l.repaymentSchedule : Array.isArray(l.schedule) ? l.schedule : null;
  if (sch && sch.length) {
    const sum = sch.reduce((acc, it) => {
      const part =
        it.interestDue ??
        it.interest_due ??
        it.interestAmount ??
        it.interest_amount ??
        it.interestComponent ??
        it.interest_component ??
        it.interest ??
        0;
      return acc + n(part);
    }, 0);
    if (sum > 0) return sum;
  }

  // 3) estimate from principal * monthlyRate * months (flat approximation)
  const principal = n(l.principalAmount ?? l.amount ?? l.principal ?? l.expectedPrincipal);
  const months =
    l.loanDurationMonths ?? l.termMonths ?? l.durationMonths ?? l.tenureMonths ?? l.periodMonths ?? null;
  const m01 = inferMonthlyRate01(l);
  if (principal > 0 && Number.isFinite(Number(months)) && months > 0 && m01 != null) {
    return principal * m01 * Number(months);
  }

  // 4) no idea
  return 0;
};

/* ---------- Scopes & titles ---------- */
const REPORT_TITLES = {
  due: "Due Loans",
  missed: "Missed Repayments",
  arrears: "Loans in Arrears",
  "no-repayments": "No Repayments Made",
  "past-maturity": "Past Maturity Loans",
  "principal-outstanding": "Principal Outstanding",
  "1-month-late": "1 Month Late",
  "3-months-late": "3+ Months Late",
  disbursed: "Disbursed Loans",
};

/* ---------- Derived scope logic ---------- */
const derivedFilter = {
  active: (l) => {
    const s = lc(l.status || l.state);
    return ["disbursed", "active"].includes(s) || (s === "closed" && num(l.outstanding) > 0);
  },
  // tightened: do NOT treat pending/new as disbursed even if releaseDate exists
  disbursed: (l) => {
    const s = lc(l.status || l.state);
    if (["disbursed", "active"].includes(s)) return true;
    if (["pending", "new", "application", "draft"].includes(s)) return false;
    // fallback: require explicit disbursement date, not just releaseDate
    return !!(l.disbursementDate || l.disbursement_date);
  },
  due: (l, ctx) => {
    if (!derivedFilter.active(l)) return false;
    const dd = parseDateStrict(pickNextDueDate(l));
    const ns = lc(l.nextDueStatus || l.dueStatus);
    return ns === "due" || (dd && isSameDay(dd, ctx.todayStart));
  },
  missed: (l) => derivedFilter.active(l) && num(l.dpd || l.daysPastDue) > 0,
  arrears: (l) =>
    derivedFilter.active(l) &&
    (lc(l.nextDueStatus || l.dueStatus) === "overdue" ||
      num(l.arrears || l.totalArrears || l.outstandingArrears) > 0 ||
      num(l.dpd || l.daysPastDue) > 0),
  "no-repayments": (l) => {
    if (!derivedFilter.active(l)) return false;
    const paid =
      num(l.totalPaid || l.amountPaid || l.repaymentsTotal || l.totalCollections) > 0 ||
      num(l.paidPrincipal) + num(l.paidInterest) + num(l.paidFees) + num(l.paidPenalty) > 0;
    return !paid;
  },
  "past-maturity": (l, ctx) => {
    if (!derivedFilter.active(l)) return false;
    const maturityCalc = parseDateStrict(
      l.maturityDate || l.endDate || l.expectedMaturityDate || calcMaturityDate(l)
    );
    const outstanding =
      l.outstanding != null
        ? num(l.outstanding, 0)
        : num(l.outstandingPrincipal) +
          num(l.outstandingInterest) +
          num(l.outstandingFees) +
          num(l.outstandingPenalty);
    return maturityCalc && isBefore(maturityCalc, ctx.todayStart) && outstanding > 0;
  },
  "principal-outstanding": (l) => derivedFilter.active(l) && num(l.outstandingPrincipal) > 0,
  "1-month-late": (l) =>
    derivedFilter.active(l) && num(l.dpd || l.daysPastDue) >= 30 && num(l.dpd || l.daysPastDue) < 60,
  "3-months-late": (l) => derivedFilter.active(l) && num(l.dpd || l.daysPastDue) >= 90,
};

/* ---------- Shared officer helper ---------- */
const resolveOfficerName = (l, ctx) => {
  const idAny =
    l.officerId ||
    l.loanOfficerId ||
    l.assignedOfficerId ||
    l.userId ||
    l.user_id ||
    l.disbursedBy ||
    l.disbursed_by ||
    l.createdById ||
    l.officer?.id ||
    l.loanOfficer?.id ||
    l.LoanOfficer?.id ||
    l.assignee?.id ||
    l.createdBy?.id ||
    l.User?.id ||
    null;

  const nameCandidates = [
    // direct names
    l.officerName,
    l.loanOfficerName,
    l.createdByName,
    l.officer?.name,
    l.loanOfficer?.name,
    l.LoanOfficer?.name,
    l.assignee?.name,
    l.createdBy?.name,
    l.User?.name,
    // full/first/last compositions
    l.officer?.fullName,
    l.loanOfficer?.fullName,
    l.LoanOfficer?.fullName,
    l.createdBy?.fullName,
    l.User?.fullName,
    joinName(l.officer?.firstName, l.officer?.lastName),
    joinName(l.loanOfficer?.firstName, l.loanOfficer?.lastName),
    joinName(l.LoanOfficer?.firstName, l.LoanOfficer?.lastName),
    joinName(l.createdBy?.firstName, l.createdBy?.lastName),
    joinName(l.User?.firstName, l.User?.lastName),
    // context map
    idAny && ctx?.officersById ? ctx.officersById[String(idAny)] : null,
  ].filter(Boolean);

  const picked = nameCandidates.find((n) => !looksLikePlaceholderOfficer(n));
  return picked ? titleCase(picked) : "—";
};

/* ---------- Column definitions ---------- */
const SCOPE_DEFS = {
/* ---- Disbursed (monthly interest shows real monthly %) ---- */
disbursed: {
  columns: [
    { key: "disbDate", header: "Date of Dsb" },
    { key: "borrower", header: "Borrower name" },
    { key: "phone", header: "Phone number" },
    { key: "product", header: "Loan product" },
    { key: "principal", header: "Principal amount", align: "right" },
    { key: "interest", header: "Interest amount", align: "right" },
    { key: "outPrin", header: "Outstanding principal", align: "right" },
    { key: "outInt", header: "Outstanding Interest", align: "right" },
    { key: "outFee", header: "Outstanding fee", align: "right" },
    { key: "outPen", header: "Outstanding penalty", align: "right" },
    { key: "outstanding", header: "Total outstanding", align: "right" },
    { key: "rateMonth", header: "Interest rate/month %" },
    { key: "duration", header: "Loan Duration" },
    { key: "dueDate", header: "Due date" },
    { key: "officer", header: "Loan officer" },
    { key: "branch", header: "Branch" },
    { key: "status", header: "Status" },
  ],
  totalKeys: ["principal", "interest", "outPrin", "outInt", "outFee", "outPen", "outstanding"],
  rowMap: (l, ctx = {}) => {
    const currency = l.currency || "TZS";
    const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
    const pos = (x) => Math.max(0, n(x));

    const principal = n(l.principalAmount ?? l.amount ?? l.principal ?? l.expectedPrincipal);

    const months =
      l.loanDurationMonths ?? l.termMonths ?? l.durationMonths ?? l.tenureMonths ?? l.periodMonths ?? null;
    const days = l.termDays ?? l.durationDays ?? null;
    const instCount = l.installmentCount ?? l.numberOfInstallments ?? l.numberOfRepayments ?? null;
    const freqRaw = l.repaymentCycle || l.repaymentFrequency || l.frequency || l.installmentFrequency || null;
    const freq = typeof freqRaw === "string" ? freqRaw.replace(/_/g, " ") : freqRaw;

    let duration = "—";
    if (months) duration = `${months} mo`;
    else if (days) duration = `${days} days`;
    else if (instCount && freq) duration = `${instCount} × ${freq}`;
    else if (instCount) duration = `${instCount} installments`;

    const nextDueFromScheduleOrHints = pickNextDueDate(l);
    const maturityFromTenure = calcMaturityDate(l);
    const dueToShow = maturityFromTenure || nextDueFromScheduleOrHints;

    const paidPrin = n(l.paidPrincipal ?? l.totalPrincipalPaid);
    const paidInt  = n(l.paidInterest  ?? l.totalInterestPaid);
    const paidFee  = n(l.paidFees      ?? l.totalFeesPaid);
    const paidPen  = n(l.paidPenalty   ?? l.totalPenaltyPaid);

    // <-- updated to derived interest
    let interestTotal = n(deriveInterestTotal(l));

    const outPrin = Number.isFinite(Number(l.outstandingPrincipal))
      ? Number(l.outstandingPrincipal)
      : pos(principal - paidPrin);
    const outInt  = Number.isFinite(Number(l.outstandingInterest))
      ? Number(l.outstandingInterest)
      : pos(interestTotal - paidInt);
    const outFee  = Number.isFinite(Number(l.outstandingFees))
      ? Number(l.outstandingFees)
      : pos(n(l.totalFees) - paidFee);
    const outPen  = Number.isFinite(Number(l.outstandingPenalty))
      ? Number(l.outstandingPenalty)
      : pos(n(l.totalPenalty) - paidPen);

    const outstanding =
      l.totalOutstanding != null
        ? n(l.totalOutstanding)
        : l.outstanding != null
        ? n(l.outstanding)
        : pos(outPrin + outInt + outFee + outPen);

    // ----- Monthly interest inference -----
    const toNumber = (v) => {
      if (v == null) return null;
      if (typeof v === "string") {
        const cleaned = v.replace(/\s*%$/, "").trim();
        return Number.isFinite(Number(cleaned)) ? Number(cleaned) : null;
      }
      return Number.isFinite(Number(v)) ? Number(v) : null;
    };

    const rInterest = toNumber(l.interestRate);
    const rMonthlyExplicit = [
      l.monthlyInterestRate, l.interestRateMonth, l.ratePerMonth, l.rate_month,
    ].map(toNumber).find((x) => x != null);

    const rAnnualExplicit = [
      l.annualInterestRate, l.interestRateYear, l.interestRateAnnual, l.ratePerYear, l.rateAnnual,
    ].map(toNumber).find((x) => x != null);

    const cycle = (l.repaymentCycle || "").toLowerCase();
    const looksMonthly =
      cycle === "monthly" ||
      (rInterest != null && rInterest <= 12 && Number(months || 0) > 0);

    let rateMonthPct = null;

    if (rMonthlyExplicit != null) {
      rateMonthPct = rMonthlyExplicit > 1 ? rMonthlyExplicit : rMonthlyExplicit * 100;
    } else if (rAnnualExplicit != null) {
      const yr01 = rAnnualExplicit > 1 ? rAnnualExplicit / 100 : rAnnualExplicit;
      rateMonthPct = (yr01 / 12) * 100;
    } else if (rInterest != null) {
      if (looksMonthly) {
        rateMonthPct = rInterest > 1 ? rInterest : rInterest * 100;
      } else {
        const yr01 = rInterest > 1 ? rInterest / 100 : rInterest;
        rateMonthPct = (yr01 / 12) * 100;
      }
    } else if (principal && months && interestTotal) {
      const monthly01 = interestTotal / principal / months;
      if (Number.isFinite(monthly01)) rateMonthPct = monthly01 * 100;
    }

    const branchIdAny = l.branchId || l.branch_id || l.Branch?.id || l.branch?.id || null;
    const branchFromCtx = branchIdAny && ctx.branchesById ? ctx.branchesById[String(branchIdAny)] : null;
    const branchResolved =
      l.branchName || l.Branch?.name || l.branch?.name || branchFromCtx || l.branchCode || "—";

    const borrowerName = l.borrowerName ?? l.Borrower?.name ?? l.borrower?.name ?? "—";
    const borrowerId   = l.borrowerId   ?? l.Borrower?.id   ?? l.borrower?.id   ?? undefined;
    const borrowerPhone =
      l.borrowerPhone ?? l.phone ?? l.Borrower?.phone ?? l.borrower?.phone ?? "—";

    const productName = l.productName ?? l.Product?.name ?? l.product?.name ?? "—";

    return {
      id: l.id,
      disbDate: fmtDate(l.disbursementDate || l.disbursement_date || l.releaseDate || l.startDate || l.createdAt),
      borrower: borrowerName,
      borrowerId,
      phone: borrowerPhone,
      product: productName,

      principal,
      principalFmt: principal ? fmtC(principal, currency) : "—",

      interest: interestTotal,
      interestFmt: interestTotal ? fmtC(interestTotal, currency) : "—",

      outPrin,
      outPrinFmt: outPrin ? fmtC(outPrin, currency) : "—",

      outInt,
      outIntFmt: outInt ? fmtC(outInt, currency) : "—",

      outFee,
      outFeeFmt: outFee ? fmtC(outFee, currency) : "—",

      outPen,
      outPenFmt: outPen ? fmtC(outPen, currency) : "—",

      outstanding,
      outstandingFmt: outstanding ? fmtC(outstanding, currency) : "—",

      rateMonth: rateMonthPct == null ? "—" : `${fmtNum(rateMonthPct, 2)}%`,

      duration,
      dueDate: fmtDate(dueToShow),

      officer: resolveOfficerName(l, ctx),
      branch: branchResolved,
      status: <StatusPill value={(l.statusLabel || l.status || l.state || "—").toString()} />,

      currency,
    };
  },
},

/* ---- other scope defs ---- */
due: {
  columns: [
    { key: "date", header: "Due Date" },
    { key: "borrower", header: "Borrower" },
    { key: "loanNumber", header: "Loan #" },
    { key: "product", header: "Product" },
    { key: "installment", header: "Inst. #" },
    { key: "dueAmount", header: "Amount Due", align: "right" },
    { key: "dpd", header: "DPD", align: "right" },
    { key: "officer", header: "Officer" },
  ],
  totalKeys: ["dueAmount"],
  rowMap: (l, ctx) => {
    const borrower = l.Borrower || l.borrower || {};
    const product = l.Product || l.product || {};
    const currency = l.currency || "TZS";
    const dd = pickNextDueDate(l);
    return {
      id: l.id,
      date: fmtDate(dd),
      borrower: borrower.name || l.borrowerName || "—",
      borrowerId: borrower.id || l.borrowerId,
      loanNumber: l.loanNumber || l.id,
      product: product.name || l.productName || "—",
      installment: num(l.nextInstallment || l.upcomingInstallment || null) || "—",
      dueAmount: num(l.nextDueAmount || l.upcomingDueAmount || 0),
      dueAmountFmt:
        l.nextDueAmount || l.upcomingDueAmount ? fmtC(l.nextDueAmount || l.upcomingDueAmount, currency) : "—",
      dpd: num(l.dpd || l.daysPastDue || 0),
      officer: resolveOfficerName(l, ctx),
      currency,
    };
  },
},

missed: {
  columns: [
    { key: "lastDueDate", header: "Last Due" },
    { key: "borrower", header: "Borrower" },
    { key: "loanNumber", header: "Loan #" },
    { key: "product", header: "Product" },
    { key: "dpd", header: "DPD", align: "right" },
    { key: "arrears", header: "Arrears", align: "right" },
    { key: "outstanding", header: "Outstanding", align: "right" },
    { key: "officer", header: "Officer" },
  ],
  totalKeys: ["arrears", "outstanding"],
  rowMap: (l, ctx) => {
    const borrower = l.Borrower || l.borrower || {};
    const product = l.Product || l.product || {};
    const currency = l.currency || "TZS";
    const op = num(l.outstandingPrincipal);
    const oi = num(l.outstandingInterest);
    const of = num(l.outstandingFees);
    const ope = num(l.outstandingPenalty);
    const outstanding = l.outstanding != null ? num(l.outstanding) : op + oi + of + ope;
    return {
      id: l.id,
      lastDueDate: fmtDate(l.lastDueDate || l.nextDueDate),
      borrower: borrower.name || l.borrowerName || "—",
      borrowerId: borrower.id || l.borrowerId,
      loanNumber: l.loanNumber || l.id,
      product: product.name || l.productName || "—",
      dpd: num(l.dpd || l.daysPastDue || 0),
      arrears: num(l.arrears || l.totalArrears || l.outstandingArrears || 0),
      outstanding,
      arrearsFmt: num(l.arrears || l.totalArrears || l.outstandingArrears || 0)
        ? fmtC(num(l.arrears || l.totalArrears || l.outstandingArrears || 0), currency)
        : "—",
      outstandingFmt: outstanding ? fmtC(outstanding, currency) : "—",
      officer: resolveOfficerName(l, ctx),
      currency,
    };
  },
},

arrears: {
  columns: [
    { key: "borrower", header: "Borrower" },
    { key: "loanNumber", header: "Loan #" },
    { key: "product", header: "Product" },
    { key: "dpd", header: "DPD", align: "right" },
    { key: "arrears", header: "Arrears", align: "right" },
    { key: "penalty", header: "Penalty", align: "right" },
    { key: "outstanding", header: "Outstanding", align: "right" },
    { key: "officer", header: "Officer" },
  ],
  totalKeys: ["arrears", "penalty", "outstanding"],
  rowMap: (l, ctx) => {
    const borrower = l.Borrower || l.borrower || {};
    const product = l.Product || l.product || {};
    const currency = l.currency || "TZS";
    const op = num(l.outstandingPrincipal);
    const oi = num(l.outstandingInterest);
    const of = num(l.outstandingFees);
    const ope = num(l.outstandingPenalty);
    const outstanding = l.outstanding != null ? num(l.outstanding) : op + oi + of + ope;
    const arr = num(l.arrears || l.totalArrears || l.outstandingArrears || 0);
    return {
      id: l.id,
      borrower: borrower.name || l.borrowerName || "—",
      borrowerId: borrower.id || l.borrowerId,
      loanNumber: l.loanNumber || l.id,
      product: product.name || l.productName || "—",
      dpd: num(l.dpd || l.daysPastDue || 0),
      arrears: arr,
      penalty: ope,
      outstanding,
      arrearsFmt: arr ? fmtC(arr, currency) : "—",
      penaltyFmt: ope ? fmtC(ope, currency) : "—",
      outstandingFmt: outstanding ? fmtC(outstanding, currency) : "—",
      officer: resolveOfficerName(l, ctx),
      currency,
    };
  },
},

"no-repayments": {
  columns: [
    { key: "disbDate", header: "Disbursed" },
    { key: "borrower", header: "Borrower" },
    { key: "loanNumber", header: "Loan #" },
    { key: "product", header: "Product" },
    { key: "principal", header: "Principal", align: "right" },
    { key: "firstDue", header: "1st Due" },
    { key: "officer", header: "Officer" },
  ],
  totalKeys: ["principal"],
  rowMap: (l, ctx) => {
    const borrower = l.Borrower || l.borrower || {};
    const product = l.Product || l.product || {};
    const currency = l.currency || "TZS";
    const p = num(l.amount ?? l.principal ?? l.principalAmount ?? 0);
    return {
      id: l.id,
      disbDate: fmtDate(l.disbursementDate || l.disbursement_date || l.releaseDate || l.startDate || l.createdAt),
      borrower: borrower.name || l.borrowerName || "—",
      borrowerId: borrower.id || l.borrowerId,
      loanNumber: l.loanNumber || l.id,
      product: product.name || l.productName || "—",
      principal: p,
      principalFmt: p ? fmtC(p, currency) : "—",
      firstDue: fmtDate(pickNextDueDate(l)),
      officer: resolveOfficerName(l, ctx),
      currency,
    };
  },
},

"past-maturity": {
  columns: [
    { key: "maturity", header: "Maturity" },
    { key: "borrower", header: "Borrower" },
    { key: "loanNumber", header: "Loan #" },
    { key: "product", header: "Product" },
    { key: "outstanding", header: "Outstanding", align: "right" },
    { key: "dpd", header: "DPD", align: "right" },
    { key: "officer", header: "Officer" },
  ],
  totalKeys: ["outstanding"],
  rowMap: (l, ctx) => {
    const borrower = l.Borrower || l.borrower || {};
    const product = l.Product || l.product || {};
    const currency = l.currency || "TZS";
    const op = num(l.outstandingPrincipal);
    const oi = num(l.outstandingInterest);
    const of = num(l.outstandingFees);
    const ope = num(l.outstandingPenalty);
    const outstanding = l.outstanding != null ? num(l.outstanding) : op + oi + of + ope;
    return {
      id: l.id,
      maturity: fmtDate(l.maturityDate || l.endDate || l.expectedMaturityDate || calcMaturityDate(l)),
      borrower: borrower.name || l.borrowerName || "—",
      borrowerId: borrower.id || l.borrowerId,
      loanNumber: l.loanNumber || l.id,
      product: product.name || l.productName || "—",
      outstanding,
      outstandingFmt: outstanding ? fmtC(outstanding, currency) : "—",
      dpd: num(l.dpd || l.daysPastDue || 0),
      officer: resolveOfficerName(l, ctx),
      currency,
    };
  },
},

"principal-outstanding": {
  columns: [
    { key: "borrower", header: "Borrower" },
    { key: "loanNumber", header: "Loan #" },
    { key: "product", header: "Product" },
    { key: "outPrin", header: "Outstanding Principal", align: "right" },
    { key: "outstanding", header: "Total Outstanding", align: "right" },
    { key: "officer", header: "Officer" },
  ],
  totalKeys: ["outPrin", "outstanding"],
  rowMap: (l, ctx) => {
    const borrower = l.Borrower || l.borrower || {};
    const product = l.Product || l.product || {};
    const currency = l.currency || "TZS";
    const op = num(l.outstandingPrincipal);
    const oi = num(l.outstandingInterest);
    const of = num(l.outstandingFees);
    const ope = num(l.outstandingPenalty);
    const total = l.outstanding != null ? num(l.outstanding) : op + oi + of + ope;
    return {
      id: l.id,
      borrower: borrower.name || l.borrowerName || "—",
      borrowerId: borrower.id || l.borrowerId,
      loanNumber: l.loanNumber || l.id,
      product: product.name || l.productName || "—",
      outPrin: op,
      outstanding: total,
      outPrinFmt: op ? fmtC(op, currency) : "—",
      outstandingFmt: total ? fmtC(total, currency) : "—",
      officer: resolveOfficerName(l, ctx),
      currency,
    };
  },
},

"1-month-late": {
  columns: [
    { key: "borrower", header: "Borrower" },
    { key: "loanNumber", header: "Loan #" },
    { key: "product", header: "Product" },
    { key: "dpd", header: "DPD", align: "right" },
    { key: "arrears", header: "Arrears", align: "right" },
    { key: "officer", header: "Officer" },
  ],
  totalKeys: ["arrears"],
  rowMap: (l, ctx) => {
    const borrower = l.Borrower || l.borrower || {};
    const product = l.Product || l.product || {};
    const currency = l.currency || "TZS";
    const arr = num(l.arrears || l.totalArrears || l.outstandingArrears || 0);
    return {
      id: l.id,
      borrower: borrower.name || l.borrowerName || "—",
      borrowerId: borrower.id || l.borrowerId,
      loanNumber: l.loanNumber || l.id,
      product: product.name || l.productName || "—",
      dpd: num(l.dpd || l.daysPastDue || 0),
      arrears: arr,
      arrearsFmt: arr ? fmtC(arr, currency) : "—",
      officer: resolveOfficerName(l, ctx),
      currency,
    };
  },
},

"3-months-late": {
  columns: [
    { key: "borrower", header: "Borrower" },
    { key: "loanNumber", header: "Loan #" },
    { key: "product", header: "Product" },
    { key: "dpd", header: "DPD", align: "right" },
    { key: "arrears", header: "Arrears", align: "right" },
    { key: "outstanding", header: "Outstanding", align: "right" },
    { key: "officer", header: "Officer" },
  ],
  totalKeys: ["arrears", "outstanding"],
  rowMap: (l, ctx) => {
    const borrower = l.Borrower || l.borrower || {};
    const product = l.Product || l.product || {};
    const currency = l.currency || "TZS";
    const op = num(l.outstandingPrincipal);
    const oi = num(l.outstandingInterest);
    const of = num(l.outstandingFees);
    const ope = num(l.outstandingPenalty);
    const outstanding = l.outstanding != null ? num(l.outstanding) : op + oi + of + ope;
    const arr = num(l.arrears || l.totalArrears || l.outstandingArrears || 0);
    return {
      id: l.id,
      borrower: borrower.name || l.borrowerName || "—",
      borrowerId: borrower.id || l.borrowerId,
      loanNumber: l.loanNumber || l.id,
      product: product.name || l.productName || "—",
      dpd: num(l.dpd || l.daysPastDue || 0),
      arrears: arr,
      outstanding,
      arrearsFmt: arr ? fmtC(arr, currency) : "—",
      outstandingFmt: outstanding ? fmtC(outstanding, currency) : "—",
      officer: resolveOfficerName(l, ctx),
      currency,
    };
  },
},
};

/* ---------- Component ---------- */
export default function LoanStatusList() {
  const params = useParams();
  const scope = params.scope || params.status;
  const navigate = useNavigate();
  const { error } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // filters
  const [products, setProducts] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [branches, setBranches] = useState([]);

  const [q, setQ] = useState(searchParams.get("q") || "");
  const [productId, setProductId] = useState(searchParams.get("productId") || "");
  const [officerId, setOfficerId] = useState(searchParams.get("officerId") || "");
  const [branchId, setBranchId] = useState(searchParams.get("branchId") || "");
  const [startDate, setStartDate] = useState(searchParams.get("startDate") || "");
  const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");
  const [minAmt, setMinAmt] = useState(searchParams.get("minAmt") || "");
  const [maxAmt, setMaxAmt] = useState(searchParams.get("maxAmt") || "");

  // pagination
  const initialPage = Number(searchParams.get("page") || 1);
  const initialPageSize = Number(searchParams.get("pageSize") || 25);
  const [page, setPage] = useState(Math.max(1, initialPage));
  const [pageSize, setPageSize] = useState([10, 25, 50, 100].includes(initialPageSize) ? initialPageSize : 25);

  const [menuOpenRow, setMenuOpenRow] = useState(null);
  const [confirm, setConfirm] = useState({
    open: false,
    title: "",
    description: "",
    destructive: false,
    onConfirm: null,
  });

  const title = REPORT_TITLES[scope] || "Loan Report";
  const dropdownRef = useRef(null);

  const scopeDef = SCOPE_DEFS[scope];
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Smart default state
  const [me, setMe] = useState(null);
  const [initializedSmartDefaults, setInitializedSmartDefaults] = useState(false);

  /* ---------- fetch filters + me + smart defaults ---------- */
  useEffect(() => {
    (async () => {
      try {
        // who am I?
        try {
          const meRes = await api.get("/me").catch(() => api.get("/auth/me"));
          setMe(meRes?.data || null);
          if (!initializedSmartDefaults) {
            setInitializedSmartDefaults(true);
            if (!searchParams.get("officerId") && meRes?.data?.id) setOfficerId(String(meRes.data.id));
            if (!searchParams.get("branchId") && meRes?.data?.branchId) setBranchId(String(meRes.data.branchId));
          }
        } catch {}

        // report filters (products/officers/branches)
        const r = await api.get("/reports/filters");
        const data = r.data || {};
        setProducts(Array.isArray(data.products) ? data.products : []);

        // filter out placeholders from officers immediately
        const cleanedOfficers = (Array.isArray(data.officers) ? data.officers : []).filter(
          (o) => o?.id != null && !looksLikePlaceholderOfficer(o?.name || o?.email || o?.phone)
        );
        setOfficers(cleanedOfficers);

        setBranches(Array.isArray(data.branches) ? data.branches : []);
        return;
      } catch {
        // fall through to individual endpoints
      }

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
        const cleaned = data.filter(
          (o) => o?.id != null && !looksLikePlaceholderOfficer(o?.name || o?.email || o?.phone)
        );
        setOfficers(cleaned);
      } catch {
        setOfficers([]);
      }
      try {
        const r3 = await api.get("/branches", { params: { pageSize: 500 } });
        const b = Array.isArray(r3.data) ? r3.data : r3.data?.items || [];
        setBranches(b);
      } catch {
        setBranches([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- helper: resolve missing officer names by ID ---------- */
  const resolveMissingOfficerNames = async (ids) => {
    const unique = Array.from(new Set(ids.map(String)));
    if (!unique.length) return;

    try {
      const results = await Promise.allSettled(unique.map((oid) => api.get(`/users/${oid}`)));
      const found = [];
      results.forEach((res) => {
        if (res.status === "fulfilled") {
          const u = res.value?.data || {};
          if (u?.id && (u.name || u.email || u.phone)) {
            found.push({ id: u.id, name: u.name || u.email || u.phone });
          }
        }
      });

      if (found.length) {
        setOfficers((prev) => {
          const map = new Map((prev || []).map((o) => [String(o.id), o]));
          for (const u of found) {
            if (!looksLikePlaceholderOfficer(u.name)) {
              map.set(String(u.id), { id: u.id, name: u.name });
            }
          }
          return Array.from(map.values()).sort((a, b) =>
            String(a.name || "").localeCompare(String(b.name || ""))
          );
        });
      }
    } catch {
      // ignore
    }
  };

  /* ---------- load data ---------- */
  const load = async (opts = {}) => {
    setLoading(true);
    try {
      const paramsOut = { page, pageSize, scope };
      if (scope === "disbursed") paramsOut.status = "disbursed";

      const qTrim = q.trim();
      if (qTrim) paramsOut.q = qTrim;
      if (productId) paramsOut.productId = productId;
      if (officerId) paramsOut.officerId = officerId;
      if (branchId) paramsOut.branchId = branchId;
      if (startDate) paramsOut.startDate = startDate;
      if (endDate) paramsOut.endDate = endDate;

      const minOk = Number.isFinite(Number(minAmt)) && `${minAmt}` !== "";
      const maxOk = Number.isFinite(Number(maxAmt)) && `${maxAmt}` !== "";
      if (minOk) paramsOut.minAmount = Number(minAmt);
      if (maxOk) paramsOut.maxAmount = Number(maxAmt);

      const res = await api.get("/loans", { params: paramsOut });
      const base = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.items)
        ? res.data.items
        : [];

      // ------- normalization aligns across all reports -------
      const normalized = base.map((l) => ({
        ...l,

        // Borrower / Product
        borrowerId: l.borrowerId ?? l.Borrower?.id ?? l.borrower?.id ?? l.clientId ?? null,
        borrowerName: l.borrowerName ?? l.Borrower?.name ?? l.borrower?.name ?? l.clientName ?? null,
        borrowerPhone: l.borrowerPhone ?? l.phone ?? l.Borrower?.phone ?? l.borrower?.phone ?? null,

        productId: l.productId ?? l.product_id ?? l.Product?.id ?? l.product?.id ?? null,
        productName: l.productName ?? l.Product?.name ?? l.product?.name ?? null,

        // Officer (many possible sources + compose)
        officerId:
          l.officerId ??
          l.loanOfficerId ??
          l.assignedOfficerId ??
          l.userId ??
          l.user_id ??
          l.disbursedBy ??
          l.disbursed_by ??
          l.createdById ??
          l.officer?.id ??
          l.loanOfficer?.id ??
          l.LoanOfficer?.id ??
          l.assignee?.id ??
          l.createdBy?.id ??
          l.User?.id ??
          null,
        officerName:
          l.officerName ??
          l.loanOfficerName ??
          l.officer?.name ??
          l.loanOfficer?.name ??
          l.LoanOfficer?.name ??
          l.assignee?.name ??
          l.createdByName ??
          l.createdBy?.name ??
          l.User?.name ??
          l.officer?.fullName ??
          l.loanOfficer?.fullName ??
          l.LoanOfficer?.fullName ??
          l.createdBy?.fullName ??
          l.User?.fullName ??
          joinName(l.officer?.firstName, l.officer?.lastName) ??
          joinName(l.loanOfficer?.firstName, l.loanOfficer?.lastName) ??
          joinName(l.LoanOfficer?.firstName, l.LoanOfficer?.lastName) ??
          joinName(l.createdBy?.firstName, l.createdBy?.lastName) ??
          joinName(l.User?.firstName, l.User?.lastName) ??
          null,

        // Branch
        branchId: l.branchId ?? l.branch_id ?? l.Branch?.id ?? l.branch?.id ?? null,
        branchName: l.branchName ?? l.Branch?.name ?? l.branch?.name ?? null,

        // Dates
        releaseDate: l.releaseDate ?? l.startDate ?? null,
        disbursementDate: l.disbursementDate ?? l.disbursement_date ?? null,

        // Core amounts
        principalAmount: l.principalAmount ?? l.amount ?? l.principal ?? l.expectedPrincipal ?? null,
        interestAmount: l.interestAmount ?? l.totalInterest ?? l.expectedInterest ?? l.interest ?? null,
        totalOutstanding:
          l.totalOutstanding != null
            ? l.totalOutstanding
            : l.outstanding != null
            ? l.outstanding
            : null,

        // Interest / Terms from form
        interestRate: l.interestRate ?? l.rate ?? null,
        interestMethod: l.interestMethod ?? l.interest_type ?? null,
        durationMonths:
          l.durationMonths ??
          l.loanDurationMonths ??
          l.termMonths ??
          l.tenureMonths ??
          l.periodMonths ??
          null,
        repaymentCycle: l.repaymentCycle ?? l.frequency ?? null,
        numberOfRepayments: l.numberOfRepayments ?? l.installmentCount ?? l.numberOfInstallments ?? null,

        // Status labels
        status: l.status ?? null,
        statusLabel: l.statusLabel ?? l.label ?? null,

        // Due hints
        nextDueDate: l.nextDueDate ?? l.firstDueDate ?? l.upcomingDueDate ?? l.dueDate ?? null,
      }));

      // Deduplicate by id
      const byId = new Map();
      for (const l of normalized) {
        const id = l.id ?? l.loanId ?? l.loan_id;
        if (!id) continue;
        if (!byId.has(id)) byId.set(id, l);
      }
      const unique = byId.size ? Array.from(byId.values()) : normalized;

      // Scope filter
      const scoped = unique.filter((l) => {
        const fn = derivedFilter[scope];
        return fn ? fn(l, { todayStart }) : true;
      });

      setRows(scoped);
      setTotalCount(scoped.length);

      // Auto-sync Officers/Branches from rows and resolve missing officer names
      try {
        const offMap = new Map();
        const brMap = new Map();

        for (const l of scoped) {
          const oid =
            l.officerId ??
            l.loanOfficerId ??
            l.assignedOfficerId ??
            l.userId ??
            l.user_id ??
            l.disbursedBy ??
            l.disbursed_by ??
            l.createdById ??
            l.officer?.id ??
            l.loanOfficer?.id ??
            l.LoanOfficer?.id ??
            l.assignee?.id ??
            l.createdBy?.id ??
            l.User?.id ??
            null;

          const oname =
            l.officerName ??
            l.loanOfficerName ??
            l.officer?.name ??
            l.loanOfficer?.name ??
            l.LoanOfficer?.name ??
            l.assignee?.name ??
            l.createdByName ??
            l.createdBy?.name ??
            l.User?.name ??
            null;

          if (oid != null && oname && !looksLikePlaceholderOfficer(oname)) {
            offMap.set(String(oid), { id: oid, name: oname });
          }

          const bid = l.branchId ?? l.branch_id ?? l.Branch?.id ?? l.branch?.id ?? null;
          const bname = l.branchName ?? l.Branch?.name ?? l.branch?.name ?? l.branchCode ?? null;
          if (bid != null && bname) {
            brMap.set(String(bid), { id: bid, name: bname });
          }
        }

        setOfficers((prev) => {
          const merged = new Map((prev || []).map((o) => [String(o.id), o]));
          for (const [k, v] of offMap) merged.set(k, v);
          const cleaned = Array.from(merged.values()).filter(
            (o) => o?.id != null && !looksLikePlaceholderOfficer(o?.name || o?.email || o?.phone)
          );
          return cleaned.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
        });

        setBranches((prev) => {
          const merged = new Map((prev || []).map((b) => [String(b.id), b]));
          for (const [k, v] of brMap) merged.set(k, v);
          return Array.from(merged.values()).sort((a, b) =>
            String(a.name || "").localeCompare(String(b.name || ""))
          );
        });

        // resolve missing officer names by ID
        const unresolvedIds = scoped
          .map(
            (l) =>
              l.officerId ||
              l.loanOfficerId ||
              l.assignedOfficerId ||
              l.userId ||
              l.user_id ||
              l.disbursedBy ||
              l.disbursed_by ||
              l.createdById ||
              l.officer?.id ||
              l.loanOfficer?.id ||
              l.LoanOfficer?.id ||
              l.assignee?.id ||
              l.createdBy?.id ||
              l.User?.id
          )
          .filter(Boolean)
          .map(String)
          .filter((oid) => {
            const current = (officers || []).find((o) => String(o.id) === oid);
            const name = current?.name || current?.email || current?.phone || "";
            return !name || looksLikePlaceholderOfficer(name);
          });

        await resolveMissingOfficerNames(unresolvedIds);
      } catch {}
    } catch (e) {
      console.error(e);
      error("Failed to load report.");
      setRows([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }

    if (!opts.skipSyncUrl) {
      const next = new URLSearchParams();
      if (q) next.set("q", q);
      if (productId) next.set("productId", productId);
      if (officerId) next.set("officerId", officerId);
      if (branchId) next.set("branchId", branchId);
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
    load({ skipSyncUrl: true });
    setMenuOpenRow(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, page, pageSize]);

  /* ---------- filter UI ---------- */
  const filtered = useMemo(() => {
    const sd = startDate ? parseDateStrict(startDate) : null;
    const ed = endDate
      ? (() => {
          const d = parseDateStrict(endDate);
          if (d) d.setHours(23, 59, 59, 999);
          return d;
        })()
      : null;

    const needle = q.trim().toLowerCase();

    return rows.filter((l) => {
      if (sd || ed) {
        let baseDate;
        if (scope === "due") {
          baseDate = parseDateStrict(pickNextDueDate(l));
        } else if (scope === "disbursed" || scope === "no-repayments") {
          baseDate = parseDateStrict(
            l.disbursementDate || l.disbursement_date || l.releaseDate || l.startDate || l.createdAt
          );
        } else if (scope === "past-maturity") {
          baseDate = parseDateStrict(l.maturityDate || l.endDate || l.expectedMaturityDate || calcMaturityDate(l));
        } else {
          baseDate = parseDateStrict(l.createdAt || l.updatedAt || l.disbursementDate);
        }
        if (sd && (!baseDate || baseDate < sd)) return false;
        if (ed && (!baseDate || baseDate > ed)) return false;
      }

      if (
        productId &&
        String(l.productId ?? l.product_id ?? l.Product?.id ?? l.product?.id) !== String(productId)
      )
        return false;

      // use normalized officerId
      if (
        officerId &&
        String(
          l.officerId ||
            l.loanOfficerId ||
            l.assignedOfficerId ||
            l.userId ||
            l.user_id ||
            l.disbursedBy ||
            l.disbursed_by ||
            l.createdById
        ) !== String(officerId)
      )
        return false;

      if (branchId && String(l.branchId || l.Branch?.id || l.branch?.id) !== String(branchId))
        return false;

      const baseAmt = Number(l.principalAmount ?? l.amount ?? l.principal ?? 0);
      const minOk = Number.isFinite(Number(minAmt)) && `${minAmt}` !== "";
      const maxOk = Number.isFinite(Number(maxAmt)) && `${maxAmt}` !== "";
      if (minOk && !(baseAmt >= Number(minAmt))) return false;
      if (maxOk && !(baseAmt <= Number(maxAmt))) return false;

      if (needle) {
        const borrower = l.Borrower || l.borrower || {};
        const product = l.Product || l.product || {};
        const hay = [
          borrower.name,
          borrower.phone,
          l.borrowerName,
          l.borrowerPhone,
          l.phone,
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
  }, [rows, q, productId, officerId, branchId, startDate, endDate, minAmt, maxAmt, scope]);

  /* ---------- lookups ---------- */
  const officersById = useMemo(() => {
    const map = {};
    for (const o of officers || []) {
      const label = o.name || o.email || o.phone || "";
      if (!looksLikePlaceholderOfficer(label)) {
        map[String(o.id)] = label;
      }
    }
    return map;
  }, [officers]);

  const branchesById = useMemo(() => {
    const map = {};
    for (const b of branches || []) map[String(b.id)] = b.name || b.code || `Branch ${b.id}`;
    return map;
  }, [branches]);

  const ctx = useMemo(() => ({ officersById, branchesById }), [officersById, branchesById]);

  /* ---------- pagination ---------- */
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  /* ---------- table rows ---------- */
  const tableRows = useMemo(() => {
    if (!scopeDef) return [];
    return paged.map((l) => scopeDef.rowMap(l, ctx));
  }, [paged, scopeDef, ctx]);

  /* ---------- totals ---------- */
  const totals = useMemo(() => {
    if (!scopeDef) return {};
    const t = {};
    for (const k of (scopeDef.totalKeys || [])) t[k] = 0;
    for (const r of filtered.map((l) => scopeDef.rowMap(l, ctx))) {
      for (const k of (scopeDef.totalKeys || [])) t[k] += num(r[k]);
    }
    return t;
  }, [filtered, scopeDef, ctx]);

  /* ---------- hide all-zero numeric columns ---------- */
  const visibleColumns = useMemo(() => {
    if (!scopeDef) return [];
    const cols = [...(scopeDef.columns || [])];

    const isAllZero = (key) => {
      if (!tableRows.length) return false;
      return tableRows.every((r) => {
        const v = r[key];
        if (v == null || v === "") return true;
        if (typeof v === "number") return v === 0;
        return false;
      });
    };

    const sticky = new Set([
      "disbDate",
      "date",
      "borrower",
      "phone",
      "product",
      "rateMonth",
      "duration",
      "dueDate",
      "officer",
      "branch",
      "status",
      "loanNumber",
      "maturity",
    ]);

    return cols.filter((c) => (sticky.has(c.key) ? true : !isAllZero(c.key)));
  }, [scopeDef, tableRows]);

  /* ---------- exports ---------- */
  const buildExportRows = () => {
    if (!scopeDef) return [];
    return filtered
      .map((l) => scopeDef.rowMap(l, ctx))
      .map((r) => {
        const out = {};
        for (const col of visibleColumns) {
          const v =
            r[`${col.key}Fmt`] != null ? r[`${col.key}Fmt`] : r[col.key] != null ? r[col.key] : "";
          out[col.header] = v === 0 || v === "0" ? "0" : v || "";
        }
        return out;
      });
  };

  const exportId = (REPORT_TITLES[scope] || "loan-report").toLowerCase().replace(/\s+/g, "-");

  const queryFromUI = () => {
    const qsp = new URLSearchParams();
    if (q.trim()) qsp.set("q", q.trim());
    if (productId) qsp.set("productId", String(productId));
    if (officerId) qsp.set("officerId", String(officerId));
    if (branchId) qsp.set("branchId", String(branchId));
    if (startDate) qsp.set("startDate", String(startDate));
    if (endDate) qsp.set("endDate", String(endDate));
    if (minAmt) qsp.set("minAmount", String(minAmt));
    if (maxAmt) qsp.set("maxAmount", String(maxAmt));
    qsp.set("scope", scope);
    return qsp.toString();
  };

  const tryOpen = async (path) => {
    try {
      await (api.head ? api.head(path) : api.get(path, { method: "HEAD" }));
      window.open(path, "_blank", "noopener,noreferrer");
      return true;
    } catch {
      return false;
    }
  };

  const exportCSV = async () => {
    const qs = queryFromUI();
    const serverPath = `/reports/loans/export/csv?${qs}`;
    const ok = await tryOpen(serverPath);
    if (!ok) exportCSVFromRows(buildExportRows(), exportId);
  };
  const exportExcel = () => {
    exportExcelHTMLFromRows(buildExportRows(), exportId);
  };
  const exportPDF = async () => {
    const qs = queryFromUI();
    const serverPath = `/reports/loans/export/pdf?${qs}`;
    const ok = await tryOpen(serverPath);
    if (!ok) exportPDFPrintFromRows(buildExportRows(), REPORT_TITLES[scope] || "Loan Report");
  };

  /* ---------- actions ---------- */
  const viewLoan = (id) => navigate(`/loans/${id}`);
  const recordRepayment = (id) => navigate(`/repayments/new?loanId=${id}`);

  const clearFilters = () => {
    setQ("");
    setProductId("");
    setOfficerId("");
    setBranchId("");
    setStartDate("");
    setEndDate("");
    setMinAmt("");
    setMaxAmt("");
    setPage(1);
    setSearchParams(new URLSearchParams());
    setTimeout(() => load({ skipSyncUrl: true }), 0);
  };

  useEffect(() => {
    const onDoc = (e) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target)) setMenuOpenRow(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (!scopeDef) {
    return (
      <div className={ui.page}>
        <h2 className={ui.h1}>Unknown Report</h2>
        <p className="text-slate-600 mt-2">The report “{scope}” is not configured.</p>
      </div>
    );
  }

  return (
    <div className={ui.page}>
      {/* Hide native select arrows */}
      <style>{`
        select.ms-select { -webkit-appearance: none; -moz-appearance: none; appearance: none; background-image: none !important; }
        select.ms-select::-ms-expand { display: none; }
      `}</style>

      {/* Header */}
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className={ui.h1}>{title}</h2>
          <div className={ui.sub}>
            Showing {fmtNum(tableRows.length)} of {fmtNum(totalCount)}
          </div>
        </div>
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
            <Filter className="w-4 h-4" /> Report Filters
          </div>
          <button
            onClick={clearFilters}
            className="text-sm underline decoration-slate-300 hover:decoration-slate-600"
          >
            Clear all
          </button>
        </div>

        {/* Quick toggles */}
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            type="button"
            onClick={() =>
              setOfficerId((prev) => (prev ? "" : me?.id ? String(me.id) : ""))
            }
            className={`text-xs px-2 py-1 rounded-lg border ${
              officerId ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-slate-300"
            }`}
            title="Toggle: show only loans assigned to me"
          >
            My loans {officerId ? "✓" : ""}
          </button>
          <button
            type="button"
            onClick={() =>
              setBranchId((prev) => (prev ? "" : me?.branchId ? String(me.branchId) : ""))
            }
            className={`text-xs px-2 py-1 rounded-lg border ${
              branchId ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-slate-300"
            }`}
            title="Toggle: show only my branch"
          >
            My branch {branchId ? "✓" : ""}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
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
                {p.name}
                {p.code ? ` (${p.code})` : ""}
              </option>
            ))}
          </SelectField>
          <SelectField value={officerId} onChange={(e) => setOfficerId(e.target.value)}>
            <option value="">Officer: All</option>
            {officers
              .filter((o) => o?.id != null && !looksLikePlaceholderOfficer(o?.name || o?.email || o?.phone))
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name || o.email}
                </option>
              ))}
          </SelectField>
          <SelectField value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="">Branch: All</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name || b.code}
              </option>
            ))}
          </SelectField>
          <TextField type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <TextField type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <TextField
            type="number"
            placeholder="Min Amount"
            value={minAmt}
            onChange={(e) => setMinAmt(e.target.value)}
          />
          <TextField
            type="number"
            placeholder="Max Amount"
            value={maxAmt}
            onChange={(e) => setMaxAmt(e.target.value)}
          />
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => {
              setPage(1);
              load();
            }}
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
      <div className={`${ui.card} overflow-x-auto`} ref={dropdownRef}>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="sticky top-0 bg-white">
              {visibleColumns.map((c) => (
                <th key={c.key} className={`${ui.th} ${c.align === "right" ? "text-right" : ""}`}>
                  {c.header}
                </th>
              ))}
              <th className={ui.th}>Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className={`${ui.td} text-center py-10 text-slate-600`}>
                  Loading…
                </td>
              </tr>
            ) : tableRows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className={`${ui.td} text-center py-10 text-slate-600`}>
                  No records match this report.
                </td>
              </tr>
            ) : (
              tableRows.map((r) => (
                <tr key={r.id} className="odd:bg-white even:bg-slate-50/40 hover:bg-slate-50">
                  {visibleColumns.map((c) => {
                    const raw = r[c.key];
                    const fmt = r[`${c.key}Fmt`];

                    const display =
                      fmt != null
                        ? fmt
                        : raw == null || raw === "" || (typeof raw === "number" && raw === 0)
                        ? "—"
                        : raw;

                    let cell = display;

                    if (c.key === "borrower" && r.borrowerId) {
                      cell = (
                        <Link to={`/borrowers/${r.borrowerId}`} className="text-indigo-700 hover:underline font-semibold">
                          {display}
                        </Link>
                      );
                    }

                    if (c.key === "dueDate" && r.dueDate) {
                      const d = parseDateStrict(r.dueDate);
                      const today0 = new Date();
                      today0.setHours(0, 0, 0, 0);
                      const overdue = d && d < today0;
                      cell = <span className={overdue ? "text-red-600 font-semibold" : ""}>{display}</span>;
                    }

                    return (
                      <td key={c.key} className={`${ui.td} ${c.align === "right" ? "text-right" : ""}`}>
                        {cell}
                      </td>
                    );
                  })}

                  <td className={`${ui.td} whitespace-nowrap`}>
                    <div className="relative inline-block">
                      <button
                        className="px-2 py-1 rounded border border-slate-300 hover:bg-slate-50 font-medium"
                        onClick={() => setMenuOpenRow((x) => (x === r.id ? null : r.id))}
                      >
                        Actions ▾
                      </button>
                      {menuOpenRow === r.id && (
                        <div className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow z-10 overflow-hidden">
                          <button
                            className="w-full text-left px-3 py-2 hover:bg-slate-50"
                            onClick={() => {
                              setMenuOpenRow(null);
                              viewLoan(r.id);
                            }}
                          >
                            View Loan
                          </button>
                          <button
                            className="w-full text-left px-3 py-2 hover:bg-slate-50"
                            onClick={() => {
                              setMenuOpenRow(null);
                              recordRepayment(r.id);
                            }}
                          >
                            Record Repayment
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>

          {!loading && filtered.length > 0 && (scopeDef.totalKeys?.length > 0) && (
            <tfoot>
              <tr className="bg-slate-50">
                {visibleColumns.map((c, idx) => {
                  if (idx === 0) {
                    return (
                      <td key={c.key} className={`${ui.td} font-semibold`}>
                        Totals:
                      </td>
                    );
                  }
                  const isSum = (scopeDef.totalKeys || []).includes(c.key);
                  const v = isSum ? totals[c.key] : "";
                  const fmtCell =
                    v != null && v !== ""
                      ? (tableRows[0]?.currency ? fmtC(v, tableRows[0].currency) : fmtNum(v))
                      : "";
                  return (
                    <td
                      key={c.key}
                      className={`${ui.td} ${c.align === "right" ? "text-right" : ""} font-semibold`}
                    >
                      {isSum ? fmtCell : ""}
                    </td>
                  );
                })}
                <td className={ui.td}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination */}
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

      {/* Confirm dialog */}
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
