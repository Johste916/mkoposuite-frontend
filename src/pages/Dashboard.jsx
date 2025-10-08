// src/pages/Dashboard.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, CreditCard, DollarSign, AlertTriangle, ClipboardList,
  ThumbsDown, BarChart2, Download, PlusCircle, ChevronDown
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import api from '../api';

/* =================== CONFIGURE THESE ROUTES IF NEEDED =================== */
const ROUTE_PATHS = {
  borrowers: '/borrowers',
  loans: '/loans',
  repayments: '/repayments',
  expectedRepayments: '/repayments',
  deposits: '/deposits',
  withdrawals: '/withdrawals',
  savings: '/savings',
  defaultedLoans: '/loans',
  defaultedInterest: '/loans',
  outstandingLoan: '/loans',
  outstandingInterest: '/loans',
  writtenOff: '/loans',
  par: '/loans',
};
/* ======================================================================== */

const LS_KEY = 'ms_dash_filters_v1';
const LS_AUTO = 'ms_dash_auto_refresh_v1';

/** Support both prefixed (/api/...) and unprefixed backends */
function apiVariants(p) {
  const clean = p.startsWith('/') ? p : `/${p}`;
  const noApi = clean.replace(/^\/api\//, '/');
  const withApi = noApi.startsWith('/api/') ? noApi : `/api${noApi}`;
  return Array.from(new Set([noApi, withApi]));
}

/** Canceled request guard */
function isAbort(err) {
  return err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED' || /abort|cancell?ed/i.test(err?.message || '');
}

/** Try multiple GET endpoints until one succeeds */
async function tryGET(paths = [], opts = {}) {
  let lastErr;
  for (const p of paths) {
    try {
      const res = await api.get(p, opts);
      return res?.data;
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('No endpoint succeeded');
}

/** Normalizers */
function toBranches(raw) {
  const arr = Array.isArray(raw) ? raw : raw?.items || raw?.rows || raw?.data || [];
  return arr.map((b) => ({
    id: b.id ?? b._id ?? b.branchId ?? b.code ?? String(b.name || 'branch'),
    name: b.name ?? b.title ?? b.label ?? String(b.code || '—'),
  }));
}
function toUsers(raw) {
  const arr = Array.isArray(raw) ? raw : raw?.items || raw?.rows || raw?.data || [];
  return arr.map((u) => ({
    id: u.id ?? u._id ?? u.userId ?? String(u.email || u.phone || 'user'),
    name:
      u.name ||
      [u.firstName, u.lastName].filter(Boolean).join(' ').trim() ||
      u.username ||
      u.email ||
      u.phone ||
      '—',
    roles: (u.roles || u.Roles || []).map((r) => (r.name || r.code || '').toString().toLowerCase()),
    title: (u.title || u.jobTitle || '').toString().toLowerCase(),
  }));
}
function isLoanOfficer(u) {
  const hay = [...(u.roles || []), u.title || ''].join(' ');
  return /loan.*officer|credit.*officer|field.*officer/i.test(hay);
}
function toSummary(raw) {
  const s = raw?.summary || raw || {};
  const n = (v) => Number(v || 0);
  const pctNum = (v) => {
    if (v == null) return 0;
    const str = String(v).trim().replace('%', '');
    const num = Number(str);
    return Number.isFinite(num) ? num : 0;
  };
  return {
    totalBorrowers: n(s.totalBorrowers ?? s.borrowers ?? s.clients),
    totalLoans: n(s.totalLoans ?? s.loans),
    totalDisbursed: n(s.totalDisbursed ?? s.disbursed),
    totalPaid: n(s.totalPaid ?? s.paid),
    totalRepaid: n(s.totalRepaid ?? s.repaid ?? s.collections),
    totalExpectedRepayments: n(s.totalExpectedRepayments ?? s.expectedRepayments),
    totalDeposits: n(s.totalDeposits ?? s.deposits),
    totalWithdrawals: n(s.totalWithdrawals ?? s.withdrawals),
    netSavings: n(s.netSavings ?? (s.totalDeposits || 0) - (s.totalWithdrawals || 0)),
    defaultedLoan: n(s.defaultedLoan ?? s.defaulted ?? s.nplPrincipal),
    defaultedInterest: n(s.defaultedInterest ?? s.nplInterest),
    outstandingLoan: n(s.outstandingLoan ?? s.outstandingPrincipal ?? s.outstanding),
    outstandingInterest: n(s.outstandingInterest ?? s.accruedInterest),
    writtenOff: n(s.writtenOff ?? s.writeOffs),
    parPercent: pctNum(s.parPercent ?? s.par ?? s.par30 ?? s.portfolioAtRisk),
    topBorrowers: Array.isArray(s.topBorrowers) ? s.topBorrowers : [],
    upcomingRepayments: Array.isArray(s.upcomingRepayments) ? s.upcomingRepayments : [],
    branchPerformance: Array.isArray(s.branchPerformance) ? s.branchPerformance : [],
    officerPerformance: Array.isArray(s.officerPerformance) ? s.officerPerformance : [],
    generalCommunications: Array.isArray(s.generalCommunications) ? s.generalCommunications : [],
  };
}

/** Observe the <html> class list so charts can re-theme instantly */
const useIsDarkMode = () => {
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const el = document.documentElement;
    const obs = new MutationObserver(() => setIsDark(el.classList.contains('dark')));
    obs.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return isDark;
};

const TZS = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

/* ---------- Token-aware UI helpers (no hardcoded slate/white) ---------- */
const ui = {
  container: 'w-full px-4 md:px-6 lg:px-8 py-6',
  h1: 'text-3xl font-extrabold tracking-tight',
  card: 'card',
  btn: 'inline-flex items-center justify-center rounded-lg px-3 py-2 font-semibold transition border-2 ' +
       'border-[var(--border-strong)] bg-[var(--card)] text-[var(--fg)] hover:bg-[var(--chip-soft)]',
  primary: 'inline-flex items-center rounded-lg px-3 py-2 font-semibold ' +
           'bg-[var(--primary)] text-[var(--primary-contrast)] hover:brightness-95',
  tableWrap: 'overflow-x-auto rounded-2xl border-2 shadow ' +
             'bg-[var(--card)] border-[var(--border-strong)]',
  th: 'bg-[var(--table-head-bg)] text-left text-[13px] uppercase tracking-wide font-semibold px-3 py-2 ' +
      'border border-[var(--border)] text-[var(--fg)] opacity-90',
  td: 'px-3 py-2 border border-[var(--border)] text-sm text-[var(--fg)]',
};

/* ---------- Unified select component ---------- */
const baseInput =
  'h-10 w-full rounded-lg text-sm outline-none transition border-2 ' +
  'bg-[var(--input-bg)] text-[var(--input-fg)] border-[var(--input-border)] focus:ring-2 focus:ring-[var(--ring)]';

const SelectField = ({ className = '', children, ...props }) => (
  <div className={`relative ${className}`}>
    <select {...props} className={`${baseInput} pr-9 appearance-none bg-none ms-select`}>
      {children}
    </select>
    <ChevronDown
      className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]"
      aria-hidden="true"
    />
  </div>
);

const Dashboard = () => {
  const isDark = useIsDarkMode();

  /* ======= STATE ======= */
  const [summary, setSummary] = useState(null);

  const [branches, setBranches] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [officerId, setOfficerId] = useState('');
  const [timeRange, setTimeRange] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(0); // minutes

  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [nextRefreshAt, setNextRefreshAt] = useState(null);
  const [now, setNow] = useState(Date.now());

  const [comms, setComms] = useState([]);
  const [loadingComms, setLoadingComms] = useState(false);

  const [trends, setTrends] = useState(null);

  const [topBorrowers, setTopBorrowers] = useState([]);
  const [upcomingRepayments, setUpcomingRepayments] = useState([]);
  const [branchPerformance, setBranchPerformance] = useState([]);
  const [officerPerformance, setOfficerPerformance] = useState([]);

  const [loading, setLoading] = useState(true);

  const [toasts, setToasts] = useState([]);
  const pushToast = (msg, type = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  };

  const n = (v) => {
    const num = Number(v);
    return Number.isFinite(num) ? num : 0;
  };
  const money = (v) => {
    const num = n(v);
    return Number.isNaN(num) ? 'TZS —' : `TZS ${TZS.format(num)}`;
  };

  const makeTo = (base, extra = {}) => {
    try {
      const qs = new URLSearchParams();
      if (branchId) qs.set('branchId', branchId);
      if (officerId) qs.set('officerId', officerId);
      if (timeRange) qs.set('timeRange', timeRange);
      Object.entries(extra).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v) !== '') qs.set(k, v);
      });
      const query = qs.toString();
      return query ? `${base}?${query}` : base;
    } catch {
      return base;
    }
  };

  /* Persist + restore filters */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        setBranchId(saved.branchId || '');
        setOfficerId(saved.officerId || '');
        setTimeRange(saved.timeRange || '');
      }
    } catch {}
    try {
      const rawAuto = localStorage.getItem(LS_AUTO);
      if (rawAuto) setAutoRefresh(Number(rawAuto) || 0);
    } catch {}
  }, []);
  useEffect(() => {
    const payload = { branchId, officerId, timeRange };
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
  }, [branchId, officerId, timeRange]);
  useEffect(() => {
    localStorage.setItem(LS_AUTO, String(autoRefresh || 0));
  }, [autoRefresh]);

  /* ---------- Data fetchers ---------- */
  const fetchFilters = useCallback(async (signal) => {
    try {
      const [branchesRaw, officersRaw] = await Promise.all([
        tryGET([...apiVariants('branches'), ...apiVariants('org/branches')], { signal }),
        tryGET([...apiVariants('users?role=loan_officer'), ...apiVariants('admin/staff?role=loan_officer')], { signal })
          .catch(() => tryGET([...apiVariants('users'), ...apiVariants('admin/staff')], { signal })),
      ]);
      const br = toBranches(branchesRaw);
      const allUsers = toUsers(officersRaw);
      const onlyOfficers = allUsers.filter(isLoanOfficer);
      setBranches(br);
      setOfficers(onlyOfficers.length ? onlyOfficers : allUsers);
    } catch (err) {
      if (!isAbort(err)) {
        console.error('Filter fetch error:', err?.message || err);
        pushToast('Failed to load filters', 'error');
      }
    }
  }, []);

  const fetchSummary = useCallback(async (signal) => {
    try {
      const data = await tryGET([...apiVariants('dashboard/summary')], {
        signal,
        params: { branchId, officerId, timeRange },
      });
      setSummary(toSummary(data));
    } catch (err) {
      if (!isAbort(err)) {
        console.error('Dashboard summary error:', err?.message || err);
        pushToast('Failed to load summary', 'error');
      }
    }
  }, [branchId, officerId, timeRange]);

  const fetchCommunications = useCallback(
    async (signal) => {
      setLoadingComms(true);
      try {
        const res = await api.get('/dashboard/communications', { signal }).catch(() => null);
        if (res?.data && Array.isArray(res.data)) {
          setComms(res.data);
        } else {
          setComms(Array.isArray(summary?.generalCommunications) ? summary.generalCommunications : []);
        }
      } finally {
        setLoadingComms(false);
      }
    },
    [summary]
  );

  const fetchTrends = useCallback(async (signal) => {
    try {
      const res = await api.get('/dashboard/monthly-trends', { signal });
      setTrends(res.data || {});
    } catch (err) {
      if (!isAbort(err)) {
        console.error('Monthly trends error:', err?.message || err);
        pushToast('Failed to load trends', 'error');
      }
    }
  }, []);

  /* ---------- Effects ---------- */
  useEffect(() => {
    const ac = new AbortController();
    (async () => { try { await fetchFilters(ac.signal); } catch {} })();
    return () => ac.abort();
  }, [fetchFilters]);

  const loadAll = useCallback(
    async (signal) => {
      await Promise.all([fetchSummary(signal), fetchTrends(signal)]);
      setLastUpdatedAt(new Date());
      if (autoRefresh > 0) setNextRefreshAt(Date.now() + autoRefresh * 60000);
    },
    [fetchSummary, fetchTrends, autoRefresh]
  );

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        await loadAll(ac.signal);
      } catch (err) {
        if (!isAbort(err)) {
          console.error('Dashboard fetch error:', err?.message || err);
          pushToast('Failed to load dashboard data', 'error');
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [loadAll]);

  useEffect(() => {
    if (!summary) return;
    const ac = new AbortController();
    fetchCommunications(ac.signal).catch((err) => {
      if (!isAbort(err)) {
        console.error('Comms fetch error:', err?.message || err);
        pushToast('Failed to load communications', 'error');
      }
    });
    return () => ac.abort();
  }, [summary, fetchCommunications]);

  useEffect(() => {
    if (!summary) return;
    if (Array.isArray(summary.topBorrowers)) setTopBorrowers(summary.topBorrowers);
    if (Array.isArray(summary.upcomingRepayments)) setUpcomingRepayments(summary.upcomingRepayments);
    if (Array.isArray(summary.branchPerformance)) setBranchPerformance(summary.branchPerformance);
    if (Array.isArray(summary.officerPerformance)) setOfficerPerformance(summary.officerPerformance);
  }, [summary]);

  useEffect(() => {
    if (!autoRefresh || autoRefresh <= 0) {
      setNextRefreshAt(null);
      return;
    }
    const tick = () => {
      const ac = new AbortController();
      Promise.all([loadAll(ac.signal), fetchCommunications(ac.signal)])
        .catch(() => {})
        .finally(() => ac.abort());
    };
    const id = setInterval(tick, autoRefresh * 60000);
    setNextRefreshAt(Date.now() + autoRefresh * 60000);
    return () => clearInterval(id);
  }, [autoRefresh, loadAll, fetchCommunications]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  /* ---------- Mini bar ---------- */
  const MiniBar = ({ label, value, max }) => {
    const v = n(value);
    const m = n(max);
    const pct = m > 0 ? Math.round((v / m) * 100) : 0;
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-[var(--muted)]">
          <span>{label}</span>
          <span className="tabular-nums text-[var(--fg)]/80">{v.toLocaleString()}</span>
        </div>
        <div className="h-2 w-full rounded bg-[var(--table-head-bg)]">
          <div
            className="h-2 rounded transition-[width] duration-500"
            style={{ width: `${pct}%`, backgroundColor: 'currentColor' }}
          />
        </div>
      </div>
    );
  };

  const Skeleton = ({ className = '' }) => (
    <div className={`animate-pulse rounded bg-[var(--table-head-bg)] ${className}`} />
  );

  const downloadAllAttachments = () => {
    const files = comms.flatMap((c) => (c.attachments || []).map((a) => a.fileUrl)).filter(Boolean);
    if (files.length === 0) return;
    files.forEach((url, i) => {
      setTimeout(() => window.open(url, '_blank', 'noopener,noreferrer'), i * 150);
    });
    pushToast(`Opening ${files.length} attachment${files.length > 1 ? 's' : ''}…`, 'info');
  };

  const chartColors = isDark
    ? {
        grid: '#334155',
        axis: '#cbd5e1',
        legend: '#e2e8f0',
        tooltipBg: '#0b1220',
        tooltipText: '#e2e8f0',
        bar1: '#60a5fa',
        bar2: '#34d399',
      }
    : {
        grid: '#e2e8f0',
        axis: '#334155',
        legend: '#334155',
        tooltipBg: '#ffffff',
        tooltipText: '#0f172a',
        bar1: '#2563eb',
        bar2: '#10b981',
      };

  const secsLeft = nextRefreshAt ? Math.max(0, Math.floor((nextRefreshAt - now) / 1000)) : 0;
  const mm = String(Math.floor(secsLeft / 60)).padStart(2, '0');
  const ss = String(secsLeft % 60).padStart(2, '0');

  return (
    <div className={ui.container}>
      <div className="space-y-6" style={{ color: 'var(--fg)' }}>
        {/* Remove native dropdown icons */}
        <style>{`
          select.ms-select{ -webkit-appearance:none; -moz-appearance:none; appearance:none; background-image:none!important; }
          select.ms-select::-ms-expand{ display:none; }
        `}</style>

        {/* Top bar */}
        <div className={`${ui.card} p-4 md:p-6`}>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className={ui.h1}>Dashboard</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                Quick snapshot of borrowers, loans, repayments and savings.
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                {lastUpdatedAt ? `Last updated ${lastUpdatedAt.toLocaleString()}` : 'Loading…'}
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <SelectField
                aria-label="Filter by branch"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="min-w-[11rem]"
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </SelectField>

              <SelectField
                aria-label="Filter by loan officer"
                value={officerId}
                onChange={(e) => setOfficerId(e.target.value)}
                className="min-w-[12rem]"
              >
                <option value="">All Loan Officers</option>
                {officers.map((o) => (
                  <option key={o.id} value={o.id}>{o.name || o.email}</option>
                ))}
              </SelectField>

              <SelectField
                aria-label="Filter by time range"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="min-w-[10rem]"
              >
                <option value="">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="semiAnnual">Semi-Annual</option>
                <option value="annual">Annual</option>
              </SelectField>

              <SelectField
                aria-label="Auto refresh interval"
                value={autoRefresh}
                onChange={(e) => setAutoRefresh(Number(e.target.value))}
                className="min-w-[12rem]"
              >
                <option value={0}>No Auto-Refresh</option>
                <option value={1}>Every 1 min</option>
                <option value={5}>Every 5 mins</option>
                <option value={15}>Every 15 mins</option>
              </SelectField>

              <button
                className={ui.btn}
                onClick={() => {
                  const ac = new AbortController();
                  Promise.all([
                    fetchSummary(ac.signal),
                    fetchTrends(ac.signal),
                    fetchCommunications(ac.signal),
                  ])
                    .then(() => {
                      setLastUpdatedAt(new Date());
                      if (autoRefresh > 0) setNextRefreshAt(Date.now() + autoRefresh * 60000);
                      pushToast('Dashboard refreshed', 'success');
                    })
                    .catch(() => pushToast('Refresh failed', 'error'))
                    .finally(() => ac.abort());
                }}
                aria-label="Refresh dashboard"
              >
                Refresh
              </button>
            </div>
          </div>

          {autoRefresh > 0 && nextRefreshAt && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs"
                 style={{ border: '2px solid var(--border-strong)', color: 'var(--fg)' }}>
              Auto-refresh in {mm}:{ss}
            </div>
          )}
        </div>

        {/* Toasts */}
        <div className="fixed right-4 top-4 z-50 space-y-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`px-3 py-2 rounded shadow text-sm text-white ${
                t.type === 'error' ? 'bg-red-600' : t.type === 'success' ? 'bg-emerald-600' : 'bg-slate-800'
              }`}
            >
              {t.msg}
            </div>
          ))}
        </div>

        {/* Communications ribbon */}
        {(comms?.length ?? 0) > 0 && (
          <div className={`${ui.card} overflow-hidden`}>
            <div className="flex items-center justify-between px-3 py-2 border-b"
                 style={{ borderColor: 'var(--border)', background: 'var(--table-head-bg)' }}>
              <div className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
                General Communications
              </div>
              {comms.some((c) => Array.isArray(c.attachments) && c.attachments.length > 0) && (
                <button
                  onClick={downloadAllAttachments}
                  className={`${ui.btn} h-7 px-2 text-xs`}
                  title="Open all attachments"
                  disabled={loadingComms}
                >
                  <Download className="w-3 h-3" /> Download all
                </button>
              )}
            </div>
            <div className="relative h-10">
              <style>{`@keyframes ms-marquee{0%{transform:translateX(100%)}100%{transform:translateX(-100%)}}`}</style>
              <div
                className="absolute whitespace-nowrap will-change-transform text-sm flex items-center gap-8 px-3"
                style={{ animation: 'ms-marquee 18s linear infinite', color: 'var(--fg)' }}
              >
                {comms.map((c, idx) => (
                  <span key={c.id || c.text || idx} className="inline-flex items-center gap-2">
                    {c.type && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded border"
                            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                        {c.type}
                      </span>
                    )}
                    {c.priority && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded border"
                            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                        {c.priority}
                      </span>
                    )}
                    {typeof c.audienceBranchId !== 'undefined' && c.audienceBranchId !== null && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded border"
                            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                        {branches.find(b => String(b.id) === String(c.audienceBranchId))?.name || `Branch #${c.audienceBranchId}`}
                      </span>
                    )}
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-600" />
                    <span className="truncate">{c.text}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <Link to="/loans/add" className={ui.btn}><PlusCircle className="w-4 h-4" /> Add Loan</Link>
          <Link to="/borrowers/add" className={ui.btn}><PlusCircle className="w-4 h-4" /> Add Borrower</Link>
          <Link to="/repayments/new" className={ui.btn}><PlusCircle className="w-4 h-4" /> Record Repayment</Link>
        </div>

        {/* Main content (full width) */}
        <main className="space-y-6">
          {loading ? (
            <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(230px,1fr))]">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(230px,1fr))]">
                <SummaryCard tone="indigo"  title="Total Borrowers"        value={n(summary?.totalBorrowers).toLocaleString()} icon={<Users className="w-6 h-6" />}           to={makeTo(ROUTE_PATHS.borrowers)} />
                <SummaryCard tone="sky"     title="Total Loans"            value={n(summary?.totalLoans).toLocaleString()}     icon={<CreditCard className="w-6 h-6" />}       to={makeTo(ROUTE_PATHS.loans)} />
                <SummaryCard tone="blue"    title="Total Disbursed"        value={money(summary?.totalDisbursed)}              icon={<CreditCard className="w-6 h-6" />}       to={makeTo(ROUTE_PATHS.loans, { tab: 'disbursed' })} />
                <SummaryCard tone="emerald" title="Total Paid"             value={money(summary?.totalPaid)}                   icon={<DollarSign className="w-6 h-6" />}       to={makeTo(ROUTE_PATHS.repayments, { tab: 'paid' })} />
                <SummaryCard tone="emerald" title="Total Repaid"           value={money(summary?.totalRepaid)}                 icon={<DollarSign className="w-6 h-6" />}       to={makeTo(ROUTE_PATHS.repayments, { tab: 'paid' })} />
                <SummaryCard tone="indigo"  title="Expected Repayments"    value={money(summary?.totalExpectedRepayments)}     icon={<ClipboardList className="w-6 h-6" />}    to={makeTo(ROUTE_PATHS.expectedRepayments, { tab: 'expected' })} />
                <SummaryCard tone="cyan"    title="Total Deposits"         value={money(summary?.totalDeposits)}               icon={<DollarSign className="w-6 h-6" />}       to={makeTo(ROUTE_PATHS.deposits)} />
                <SummaryCard tone="amber"   title="Total Withdrawals"      value={money(summary?.totalWithdrawals)}            icon={<DollarSign className="w-6 h-6" />}       to={makeTo(ROUTE_PATHS.withdrawals)} />
                <SummaryCard tone="blue"    title="Net Savings"            value={money(summary?.netSavings)}                  icon={<DollarSign className="w-6 h-6" />}       to={makeTo(ROUTE_PATHS.savings)} />
                <SummaryCard tone="rose"    title="Defaulted Loan"         value={money(summary?.defaultedLoan)}               icon={<AlertTriangle className="w-6 h-6" />}    to={makeTo(ROUTE_PATHS.defaultedLoans, { tab: 'defaulted' })} />
                <SummaryCard tone="rose"    title="Defaulted Interest"     value={money(summary?.defaultedInterest)}           icon={<AlertTriangle className="w-6 h-6" />}    to={makeTo(ROUTE_PATHS.defaultedInterest, { tab: 'defaulted-interest' })} />
                <SummaryCard tone="violet"  title="Outstanding Loan"       value={money(summary?.outstandingLoan)}             icon={<CreditCard className="w-6 h-6" />}       to={makeTo(ROUTE_PATHS.outstandingLoan, { tab: 'outstanding' })} />
                <SummaryCard tone="violet"  title="Outstanding Interest"   value={money(summary?.outstandingInterest)}         icon={<DollarSign className="w-6 h-6" />}       to={makeTo(ROUTE_PATHS.outstandingInterest, { tab: 'outstanding-interest' })} />
                <SummaryCard tone="slate"   title="Written Off"            value={money(summary?.writtenOff)}                  icon={<ThumbsDown className="w-6 h-6" />}       to={makeTo(ROUTE_PATHS.writtenOff, { tab: 'written-off' })} />
                <SummaryCard tone="indigo"  title="PAR (Portfolio at Risk)"value={`${n(summary?.parPercent)}%`}                 icon={<BarChart2 className="w-6 h-6" />}        to={makeTo(ROUTE_PATHS.par, { tab: 'par' })} />
              </div>

              {/* Monthly Trends */}
              {trends && (
                <div className={`${ui.card} p-4`}>
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart2 className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-semibold">{
                      `Monthly Trends${(trends.month || trends.year) ? ` — ${trends.month || ''} ${trends.year || ''}` : ''}`
                    }</h3>
                  </div>

                  <div className="mb-4">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart
                        data={[
                          { name: 'Loans', value: n(trends.monthlyLoans) },
                          { name: 'Deposits', value: n(trends.monthlyDeposits) },
                          { name: 'Repayments', value: n(trends.monthlyRepayments) },
                        ]}
                      >
                        <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fill: chartColors.axis }} axisLine={{ stroke: chartColors.axis }} tickLine={{ stroke: chartColors.axis }} />
                        <YAxis tick={{ fill: chartColors.axis }} axisLine={{ stroke: chartColors.axis }} tickLine={{ stroke: chartColors.axis }} />
                        <Tooltip contentStyle={{ backgroundColor: chartColors.tooltipBg, borderColor: chartColors.grid, color: chartColors.tooltipText }} wrapperStyle={{ outline: 'none' }} />
                        <Legend wrapperStyle={{ color: chartColors.legend }} />
                        <Bar dataKey="value" fill={chartColors.bar1} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {(() => {
                    const vals = [n(trends.monthlyLoans), n(trends.monthlyDeposits), n(trends.monthlyRepayments)];
                    const max = Math.max(...vals);
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-indigo-600"><MiniBar label="Loans (count)" value={n(trends.monthlyLoans)} max={max} /></div>
                        <div className="text-emerald-600"><MiniBar label="Deposits (TZS)" value={n(trends.monthlyDeposits)} max={max} /></div>
                        <div className="text-blue-600"><MiniBar label="Repayments (TZS)" value={n(trends.monthlyRepayments)} max={max} /></div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Top Borrowers / Upcoming Repayments */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={ui.tableWrap}>
                  <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
                    <h3 className="text-lg font-semibold">Top Borrowers</h3>
                  </div>
                  {topBorrowers.length === 0 ? (
                    <div className="p-4 text-sm" style={{ color: 'var(--muted)' }}>No data available.</div>
                  ) : (
                    <table className="min-w-full">
                      <thead>
                        <tr>
                          <th className={ui.th}>Name</th>
                          <th className={ui.th}>Outstanding</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topBorrowers.map((b) => (
                          <tr key={b.id}>
                            <td className={ui.td}>{b.name}</td>
                            <td className={ui.td}>{money(b.outstanding)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className={ui.tableWrap}>
                  <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
                    <h3 className="text-lg font-semibold">Upcoming Repayments</h3>
                  </div>
                  {upcomingRepayments.length === 0 ? (
                    <div className="p-4 text-sm" style={{ color: 'var(--muted)' }}>No data available.</div>
                  ) : (
                    <table className="min-w-full">
                      <thead>
                        <tr>
                          <th className={ui.th}>Borrower</th>
                          <th className={ui.th}>Due Date</th>
                          <th className={ui.th}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {upcomingRepayments.map((r) => (
                          <tr key={r.id}>
                            <td className={ui.td}>{r.borrower}</td>
                            <td className={ui.td}>{r.dueDate}</td>
                            <td className={ui.td}>{money(r.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Performance charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={`${ui.card} p-4`}>
                  <h3 className="text-lg font-semibold mb-2">Branch Performance</h3>
                  {branchPerformance.length === 0 ? (
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>No data available.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={branchPerformance}>
                        <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" />
                        <XAxis dataKey="branch" tick={{ fill: chartColors.axis }} axisLine={{ stroke: chartColors.axis }} tickLine={{ stroke: chartColors.axis }} />
                        <YAxis tick={{ fill: chartColors.axis }} axisLine={{ stroke: chartColors.axis }} tickLine={{ stroke: chartColors.axis }} />
                        <Tooltip contentStyle={{ backgroundColor: chartColors.tooltipBg, borderColor: chartColors.grid, color: chartColors.tooltipText }} wrapperStyle={{ outline: 'none' }} />
                        <Legend wrapperStyle={{ color: chartColors.legend }} />
                        <Bar dataKey="disbursed" fill={chartColors.bar1} />
                        <Bar dataKey="repayments" fill={chartColors.bar2} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className={`${ui.card} p-4`}>
                  <h3 className="text-lg font-semibold mb-2">Officer Performance</h3>
                  {officerPerformance.length === 0 ? (
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>No data available.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={officerPerformance}>
                        <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" />
                        <XAxis dataKey="officer" tick={{ fill: chartColors.axis }} axisLine={{ stroke: chartColors.axis }} tickLine={{ stroke: chartColors.axis }} />
                        <YAxis tick={{ fill: chartColors.axis }} axisLine={{ stroke: chartColors.axis }} tickLine={{ stroke: chartColors.axis }} />
                        <Tooltip contentStyle={{ backgroundColor: chartColors.tooltipBg, borderColor: chartColors.grid, color: chartColors.tooltipText }} wrapperStyle={{ outline: 'none' }} />
                        <Legend wrapperStyle={{ color: chartColors.legend }} />
                        <Bar dataKey="loans" fill={chartColors.bar1} />
                        <Bar dataKey="collections" fill={chartColors.bar2} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

/** Bold KPI card with tokenized surfaces/borders */
const SummaryCard = ({
  title,
  value,
  icon,
  tone = 'indigo',
  to = null,
  delta = null,
  deltaLabel = '',
  spark = null
}) => {
  const palette =
    ({
      indigo: 'text-indigo-600',
      sky: 'text-sky-600',
      blue: 'text-blue-600',
      emerald: 'text-emerald-600',
      cyan: 'text-cyan-600',
      amber: 'text-amber-600',
      violet: 'text-violet-600',
      rose: 'text-rose-600',
      slate: 'text-slate-500',
    }[tone]) || 'text-slate-500';

  const Spark = () => {
    if (!Array.isArray(spark) || spark.length < 2) return null;
    const w = 96, h = 28, pad = 2;
    const min = Math.min(...spark), max = Math.max(...spark);
    const r = Math.max(max - min, 1e-6);
    const stepX = (w - pad * 2) / (spark.length - 1);
    const d =
      'M ' +
      spark
        .map((v, i) => {
          const x = (pad + i * stepX).toFixed(1);
          const y = (h - pad - ((v - min) / r) * (h - pad * 2)).toFixed(1);
          return `${x} ${y}`;
        })
        .join(' L ');
    return (
      <svg width={w} height={h} className="mt-2 opacity-70">
        <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  };

  const deltaColor =
    delta == null
      ? ''
      : delta >= 0
      ? 'text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200'
      : 'text-rose-700 bg-rose-50 ring-1 ring-rose-200';

  return (
    <div className="group relative">
      {to && (
        <Link
          to={to}
          className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          aria-label={`View ${title} details`}
          title={`View ${title} details`}
        />
      )}

      <div
        className="relative rounded-2xl p-5 min-h-[10.5rem] shadow transition-all group-hover:shadow-md group-hover:-translate-y-0.5 border-2"
        style={{ background: 'var(--card)', borderColor: 'var(--border-strong)', color: 'var(--fg)' }}
      >
        <div className="relative flex items-start justify-between gap-3">
          <div className={`p-3 rounded-full ring-2 ${palette}`} style={{ background: 'var(--card)', boxShadow: '0 1px 0 rgba(0,0,0,.04)' }}>
            {icon}
          </div>

          {delta != null && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${deltaColor}`}>
              {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toLocaleString()}%
              {deltaLabel && <span className="opacity-70">&nbsp;{deltaLabel}</span>}
            </span>
          )}
        </div>

        <div className="relative mt-3 min-w-0">
          <h3 className={`text-sm font-semibold truncate ${palette}`}>{title}</h3>
          <p className="text-[28px] md:text-[32px] leading-tight font-semibold font-mono tabular-nums break-words">
            {value ?? '—'}
          </p>
        </div>

        <div className={`relative ${palette}`}>
          <Spark />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
