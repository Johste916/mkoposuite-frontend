// src/utils/loanCommon.js
/* ---------- small utils ---------- */
export const lc = (v) => String(v || "").toLowerCase();
export const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

export const parseDateStrict = (v) => {
  if (!v) return null;
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split("-").map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }
  const t = new Date(v);
  return Number.isFinite(t.getTime()) ? t : null;
};

export const addMonthsSafe = (date, months) => {
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

export const joinName = (a, b) => {
  const s = [a, b].filter(Boolean).join(" ").trim();
  return s || null;
};

export const looksLikePlaceholderOfficer = (name) => {
  if (!name) return true;
  const token = String(name).trim().toLowerCase();
  const roleWords = ["admin","administrator","manager","director","user","loan officer","officer"];
  if (roleWords.includes(token)) return true;
  if (/^officer\s*#\s*/i.test(name)) return true;
  if (/^[0-9a-f-]{8,}$/i.test(token)) return true;
  return false;
};

/* ---------- schedule-aware “next due” ---------- */
export const pickNextDueDate = (l) => {
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

  const schedulePick = fromSchedule(l?.repaymentSchedule) || fromSchedule(l?.schedule);
  if (schedulePick) return schedulePick.toISOString().slice(0, 10);

  const candidates = [
    l?.nextInstallmentDueDate,
    l?.nextDueDate,
    l?.upcomingDueDate,
    l?.firstDueDate,
    l?.dueDate,
    l?.firstRepaymentDate,
    l?.firstInstallmentDate,
    l?.repaymentStartDate,
    l?.expectedFirstRepaymentDate,
    l?.nextDue?.date,
  ]
    .filter(Boolean)
    .map(parseDateStrict)
    .filter(Boolean);

  if (!candidates.length) return null;
  candidates.sort((a, b) => a - b);
  const today = new Date(); today.setHours(0,0,0,0);
  const future = candidates.find((d) => d >= today);
  return (future || candidates[0]).toISOString().slice(0, 10);
};

/* ---------- tenure & maturity ---------- */
export const calcMaturityDate = (loan) => {
  const months =
    loan?.loanDurationMonths ??
    loan?.termMonths ??
    loan?.durationMonths ??
    loan?.tenureMonths ??
    loan?.periodMonths ??
    null;
  if (!Number.isFinite(Number(months)) || Number(months) <= 0) return null;
  const base =
    parseDateStrict(loan?.disbursementDate || loan?.disbursement_date || loan?.releaseDate) ||
    parseDateStrict(loan?.startDate) ||
    parseDateStrict(loan?.createdAt);
  if (!base) return null;
  const mat = addMonthsSafe(base, Number(months));
  return mat ? mat.toISOString().slice(0, 10) : null;
};

/* ---------- monthly rate inference (decimal 0..1) ---------- */
export const inferMonthlyRate01 = (l) => {
  const toNumber = (v) => {
    if (v == null) return null;
    if (typeof v === "string") {
      const cleaned = v.replace(/\s*%$/, "").trim();
      return Number.isFinite(Number(cleaned)) ? Number(cleaned) : null;
    }
    return Number.isFinite(Number(v)) ? Number(v) : null;
  };
  const months =
    l?.loanDurationMonths ?? l?.termMonths ?? l?.durationMonths ?? l?.tenureMonths ?? l?.periodMonths ?? null;

  const rInterest = toNumber(l?.interestRate ?? l?.rate);
  const rMonthlyExplicit = [l?.monthlyInterestRate, l?.interestRateMonth, l?.ratePerMonth, l?.rate_month]
    .map(toNumber).find((x) => x != null);
  const rAnnualExplicit = [l?.annualInterestRate, l?.interestRateYear, l?.interestRateAnnual, l?.ratePerYear, l?.rateAnnual]
    .map(toNumber).find((x) => x != null);

  const cycle = (l?.repaymentCycle || l?.repaymentFrequency || l?.frequency || l?.installmentFrequency || "")
    .toString().toLowerCase();
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

/* ---------- interest fallback (schedule, direct, estimate) ---------- */
export const deriveInterestTotal = (l) => {
  const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

  const direct =
    l?.interestAmount ?? l?.totalInterest ?? l?.expectedInterest ?? l?.interest ?? l?.interest_total ?? null;
  if (Number.isFinite(Number(direct)) && Number(direct) > 0) return Number(direct);

  const sch = Array.isArray(l?.repaymentSchedule) ? l?.repaymentSchedule : Array.isArray(l?.schedule) ? l?.schedule : null;
  if (sch?.length) {
    const sum = sch.reduce((acc, it) => {
      const part =
        it?.interestDue ?? it?.interest_due ?? it?.interestAmount ?? it?.interest_amount ??
        it?.interestComponent ?? it?.interest_component ?? it?.interest ?? 0;
      return acc + n(part);
    }, 0);
    if (sum > 0) return sum;
  }

  const principal = n(l?.principalAmount ?? l?.amount ?? l?.principal ?? l?.expectedPrincipal);
  const months =
    l?.loanDurationMonths ?? l?.termMonths ?? l?.durationMonths ?? l?.tenureMonths ?? l?.periodMonths ?? null;
  const m01 = inferMonthlyRate01(l);
  if (principal > 0 && Number.isFinite(Number(months)) && months > 0 && m01 != null) {
    return principal * m01 * Number(months);
  }
  return 0;
};

/* ---------- officer/branch resolution for display ---------- */
export const resolveOfficerName = (l, ctx = {}) => {
  const idAny =
    l?.officerId || l?.loanOfficerId || l?.assignedOfficerId || l?.userId || l?.user_id ||
    l?.disbursedBy || l?.disbursed_by || l?.createdById ||
    l?.officer?.id || l?.loanOfficer?.id || l?.LoanOfficer?.id ||
    l?.assignee?.id || l?.createdBy?.id || l?.User?.id || null;

  const nameCandidates = [
    l?.officerName, l?.loanOfficerName, l?.createdByName,
    l?.officer?.name, l?.loanOfficer?.name, l?.LoanOfficer?.name,
    l?.assignee?.name, l?.createdBy?.name, l?.User?.name,
    l?.officer?.fullName, l?.loanOfficer?.fullName, l?.LoanOfficer?.fullName,
    l?.createdBy?.fullName, l?.User?.fullName,
    joinName(l?.officer?.firstName, l?.officer?.lastName),
    joinName(l?.loanOfficer?.firstName, l?.loanOfficer?.lastName),
    joinName(l?.LoanOfficer?.firstName, l?.LoanOfficer?.lastName),
    joinName(l?.createdBy?.firstName, l?.createdBy?.lastName),
    joinName(l?.User?.firstName, l?.User?.lastName),
    idAny && ctx?.officersById ? ctx.officersById[String(idAny)] : null,
  ].filter(Boolean);

  const picked = nameCandidates.find((n) => !looksLikePlaceholderOfficer(n));
  return picked || "—";
};

export const resolveBranchName = (l, ctx = {}) => {
  const branchIdAny = l?.branchId || l?.branch_id || l?.Branch?.id || l?.branch?.id || null;
  const fromCtx = branchIdAny && ctx?.branchesById ? ctx.branchesById[String(branchIdAny)] : null;
  return l?.branchName || l?.Branch?.name || l?.branch?.name || fromCtx || l?.branchCode || "—";
};

/* ---------- status helpers (chip tones etc.) ---------- */
export const statusToneKey = (s = "") => {
  const k = String(s).toLowerCase();
  if (["approved","disbursed","active"].includes(k)) return "good";
  if (["pending","submitted"].includes(k)) return "warn";
  if (["rejected"].includes(k)) return "bad";
  if (["closed"].includes(k)) return "muted";
  return "default";
};
