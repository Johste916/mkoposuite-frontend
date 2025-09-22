// src/pages/Dashboard.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, CreditCard, DollarSign, AlertTriangle, ClipboardList,
  ThumbsDown, BarChart2, MessageSquare, UserPlus, Download, PlusCircle,
  Calendar
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import api from '../api';

// =================== CONFIGURE THESE ROUTES IF NEEDED ===================
const ROUTE_PATHS = {
  borrowers: '/borrowers',
  loans: '/loans',
  repayments: '/repayments',         // total paid / total repaid
  expectedRepayments: '/repayments', // add ?tab=expected
  deposits: '/deposits',
  withdrawals: '/withdrawals',
  savings: '/savings',
  defaultedLoans: '/loans',          // add ?tab=defaulted
  defaultedInterest: '/loans',       // add ?tab=defaulted-interest
  outstandingLoan: '/loans',         // add ?tab=outstanding
  outstandingInterest: '/loans',     // add ?tab=outstanding-interest
  writtenOff: '/loans',              // add ?tab=written-off
  par: '/loans',                     // add ?tab=par
};
// ========================================================================

// Local storage keys
const LS_KEY = 'ms_dash_filters_v1';
const LS_AUTO = 'ms_dash_auto_refresh_v1';

/** Observe the <html> class list so charts can re-theme instantly */
const useIsDarkMode = () => {
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const el = document.documentElement;
    const obs = new MutationObserver(() => {
      setIsDark(el.classList.contains('dark'));
    });
    obs.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return isDark;
};

const TZS = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

/* ---------- Unified field components to guarantee dark-mode contrast ---------- */
const baseInput =
  'h-10 w-full rounded-lg border text-sm outline-none transition ' +
  'bg-white text-slate-900 border-slate-300 ' +
  'focus:ring-2 focus:ring-indigo-500/50 ' +
  'dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700';

/**
 * Plain-text <select> with NO arrows (native or custom).
 * Keeps the same look; just removes carets across browsers.
 */
const SelectField = ({ className = '', children, ...props }) => (
  <select
    {...props}
    className={`${baseInput} ${className} appearance-none pr-3 !bg-none`}
    style={{
      WebkitAppearance: 'none',
      MozAppearance: 'none',
      appearance: 'none',
      backgroundImage: 'none'
    }}
  >
    {children}
  </select>
);

const DateField = ({ className = '', ...props }) => (
  <div className={`relative ${className}`}>
    <input type="date" {...props} className={`${baseInput} pr-9`} />
    <Calendar
      className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 dark:text-slate-300"
      aria-hidden="true"
    />
  </div>
);

const TextField = ({ className = '', ...props }) => (
  <input {...props} className={`${baseInput} ${className}`} />
);

const Dashboard = () => {
  const isDark = useIsDarkMode();

  // ======= STATE =======
  const [summary, setSummary] = useState(null);

  // Global filters (restore from LS if present)
  const [branches, setBranches] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [officerId, setOfficerId] = useState('');
  const [timeRange, setTimeRange] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(0); // minutes

  // For UX: last update + next auto refresh countdown
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [nextRefreshAt, setNextRefreshAt] = useState(null);
  const [now, setNow] = useState(Date.now());

  // General communications (single ribbon)
  const [comms, setComms] = useState([]);
  const [loadingComms, setLoadingComms] = useState(false);

  // Activity (RIGHT sidebar)
  const [activity, setActivity] = useState([]);
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityPage, setActivityPage] = useState(1);
  const activityPageSize = 10;
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [commentDraft, setCommentDraft] = useState({});
  const [assignDraft, setAssignDraft] = useState({});
  const [submitting, setSubmitting] = useState({});

  // Monthly trends (mini charts)
  const [trends, setTrends] = useState(null);

  // Optional tables/charts (hydrate automatically if API provides arrays)
  const [topBorrowers, setTopBorrowers] = useState([]);
  const [upcomingRepayments, setUpcomingRepayments] = useState([]);
  const [branchPerformance, setBranchPerformance] = useState([]);
  const [officerPerformance, setOfficerPerformance] = useState([]);

  // Loading
  const [loading, setLoading] = useState(true);

  // Toasts
  const [toasts, setToasts] = useState([]);
  const pushToast = (msg, type = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  };

  // ---------- helpers ----------
  const n = (v) => {
    const num = Number(v);
    return Number.isFinite(num) ? num : 0;
  };
  const money = (v) => {
    const num = n(v);
    return Number.isNaN(num) ? 'TZS —' : `TZS ${TZS.format(num)}`;
  };

  // Build "to" with current filters appended as query params
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

  const branchNameById = (id) =>
    branches.find((b) => String(b.id) === String(id))?.name || (id ? `Branch #${id}` : 'All branches');

  // Persist + restore filters
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

  // ---------- Data fetchers ----------
  const fetchFilters = useCallback(async (signal) => {
    try {
      const [branchesRes, officersRes] = await Promise.all([
        api.get('/branches', { signal }),
        api.get('/users', { params: { role: 'loan_officer' }, signal }),
      ]);
      setBranches(Array.isArray(branchesRes.data) ? branchesRes.data : []);
      setOfficers(Array.isArray(officersRes.data) ? officersRes.data : []);
    } catch (err) {
      if (err?.name !== 'CanceledError') {
        console.error('Filter fetch error:', err?.message || err);
        pushToast('Failed to load filters', 'error');
      }
    }
  }, []);

  const fetchSummary = useCallback(async (signal) => {
    try {
      const res = await api.get('/dashboard/summary', { params: { branchId, officerId, timeRange }, signal });
      setSummary(res.data || {});
    } catch (err) {
      if (err?.name !== 'CanceledError') {
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
          // Fallback to summary-provided comms (if backend merges there)
          setComms(Array.isArray(summary?.generalCommunications) ? summary.generalCommunications : []);
        }
      } finally {
        setLoadingComms(false);
      }
    },
    [summary]
  );

  const fetchActivity = useCallback(
    async (opts = {}, signal) => {
      try {
        const res = await api.get('/dashboard/activity', {
          params: {
            page: opts.page ?? activityPage,
            pageSize: activityPageSize,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
          },
          signal,
        });
        setActivity(res.data?.items || []);
        setActivityTotal(res.data?.total || 0);
      } catch (err) {
        if (err?.name !== 'CanceledError') {
          console.error('Activity fetch error:', err?.message || err);
          pushToast('Failed to load activity', 'error');
        }
      }
    },
    [activityPage, dateFrom, dateTo]
  );

  const fetchTrends = useCallback(async (signal) => {
    try {
      const res = await api.get('/dashboard/monthly-trends', { signal });
      setTrends(res.data || {});
    } catch (err) {
      if (err?.name !== 'CanceledError') {
        console.error('Monthly trends error:', err?.message || err);
        pushToast('Failed to load trends', 'error');
      }
    }
  }, []);

  // ---------- Effects ----------
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        await fetchFilters(ac.signal);
      } catch {}
    })();
    return () => ac.abort();
  }, [fetchFilters]);

  const loadAll = useCallback(
    async (signal) => {
      await Promise.all([fetchSummary(signal), fetchActivity({}, signal), fetchTrends(signal)]);
      setLastUpdatedAt(new Date());
      if (autoRefresh > 0) setNextRefreshAt(Date.now() + autoRefresh * 60000);
    },
    [fetchSummary, fetchActivity, fetchTrends, autoRefresh]
  );

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        await loadAll(ac.signal);
      } catch (err) {
        if (err?.name !== 'CanceledError') {
          console.error('Dashboard fetch error:', err?.message || err);
          pushToast('Failed to load dashboard data', 'error');
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [loadAll]);

  // load communications after summary
  useEffect(() => {
    if (!summary) return;
    const ac = new AbortController();
    fetchCommunications(ac.signal).catch((err) => {
      if (err?.name !== 'CanceledError') {
        console.error('Comms fetch error:', err?.message || err);
        pushToast('Failed to load communications', 'error');
      }
    });
    return () => ac.abort();
  }, [summary, fetchCommunications]);

  // hydrate optional tables/charts if backend starts sending them on summary
  useEffect(() => {
    if (!summary) return;
    if (Array.isArray(summary.topBorrowers)) setTopBorrowers(summary.topBorrowers);
    if (Array.isArray(summary.upcomingRepayments)) setUpcomingRepayments(summary.upcomingRepayments);
    if (Array.isArray(summary.branchPerformance)) setBranchPerformance(summary.branchPerformance);
    if (Array.isArray(summary.officerPerformance)) setOfficerPerformance(summary.officerPerformance);
  }, [summary]);

  // Auto-refresh (minutes) + visible countdown
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

  // 1s heartbeat for countdown text
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // ---------- Activity actions ----------
  const submitComment = async (activityId) => {
    const key = `c-${activityId}`;
    setSubmitting((s) => ({ ...s, [key]: true }));
    try {
      const text = (commentDraft[activityId] || '').trim();
      if (!text) return;
      await api.post(`/dashboard/activity/${activityId}/comment`, { comment: text });
      setCommentDraft((d) => ({ ...d, [activityId]: '' }));
      await fetchActivity();
      pushToast('Reply posted', 'success');
    } catch (err) {
      console.error('Add comment error:', err?.message || err);
      pushToast('Failed to post reply', 'error');
    } finally {
      setSubmitting((s) => ({ ...s, [key]: false }));
    }
  };

  const submitAssignment = async (activityId) => {
    const key = `a-${activityId}`;
    setSubmitting((s) => ({ ...s, [key]: true }));
    try {
      const draft = assignDraft[activityId] || {};
      if (!draft.assigneeId) return;
      await api.post(`/dashboard/activity/${activityId}/assign`, {
        assigneeId: draft.assigneeId,
        dueDate: draft.dueDate || null,
        note: draft.note || '',
      });
      // Reset the correct item (fix)
      setAssignDraft((d) => ({ ...d, [activityId]: { assigneeId: '', dueDate: '', note: '' } }));
      await fetchActivity();
      pushToast('Task assigned', 'success');
    } catch (err) {
      console.error('Assign task error:', err?.message || err);
      pushToast('Failed to assign task', 'error');
    } finally {
      setSubmitting((s) => ({ ...s, [key]: false }));
    }
  };

  // ---------- Mini bar ----------
  const MiniBar = ({ label, value, max }) => {
    const v = n(value);
    const m = n(max);
    const pct = m > 0 ? Math.round((v / m) * 100) : 0;
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-600 dark:text-slate-300">
          <span>{label}</span>
          <span className="tabular-nums">{v.toLocaleString()}</span>
        </div>
        <div className="h-2 w-full bg-gray-100 dark:bg-slate-800 rounded">
          <div
            className="h-2 rounded transition-[width] duration-500"
            style={{ width: `${pct}%`, backgroundColor: 'currentColor' }}
          />
        </div>
      </div>
    );
  };

  const Skeleton = ({ className = '' }) => (
    <div className={`animate-pulse bg-gray-100 dark:bg-slate-800/50 rounded ${className}`} />
  );

  // Download all attachments from ticker
  const downloadAllAttachments = () => {
    const files = comms.flatMap((c) => (c.attachments || []).map((a) => a.fileUrl)).filter(Boolean);
    if (files.length === 0) return;
    files.forEach((url, i) => {
      setTimeout(() => window.open(url, '_blank', 'noopener,noreferrer'), i * 150);
    });
    pushToast(`Opening ${files.length} attachment${files.length > 1 ? 's' : ''}…`, 'info');
  };

  // Chart palette that adapts to theme
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

  // ---------- RENDER ----------
  const secsLeft = nextRefreshAt ? Math.max(0, Math.floor((nextRefreshAt - now) / 1000)) : 0;
  const mm = String(Math.floor(secsLeft / 60)).padStart(2, '0');
  const ss = String(secsLeft % 60).padStart(2, '0');

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="rounded-2xl bg-white/90 dark:bg-slate-900/85 backdrop-blur supports-[backdrop-filter]:backdrop-blur-sm border border-slate-200 dark:border-slate-800 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Dashboard
            </h1>
            <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
              Quick snapshot of borrowers, loans, repayments and savings.
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300/90 mt-1">
              {lastUpdatedAt ? `Last updated ${lastUpdatedAt.toLocaleString()}` : 'Loading…'}
            </p>
          </div>

          {/* Filters (wrap as needed) */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <SelectField
              aria-label="Filter by branch"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="min-w-[11rem]"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
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
                <option key={o.id} value={o.id}>
                  {o.name || o.email}
                </option>
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
              className="ms-btn h-10 px-3.5 sm:px-4 inline-flex items-center justify-center whitespace-nowrap shrink-0
                         bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700
                         hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-lg"
              onClick={() => {
                const ac = new AbortController();
                Promise.all([
                  fetchSummary(ac.signal),
                  fetchActivity({ page: 1 }, ac.signal),
                  fetchTrends(ac.signal),
                  fetchCommunications(ac.signal),
                ])
                  .then(() => {
                    setActivityPage(1);
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
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-200">
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

      {/* === Communications ribbon === */}
      {(comms?.length ?? 0) > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50 dark:bg-slate-800/60 dark:border-slate-700">
            <div className="text-xs font-semibold text-gray-700 dark:text-slate-200">General Communications</div>
            {comms.some((c) => Array.isArray(c.attachments) && c.attachments.length > 0) && (
              <button
                onClick={downloadAllAttachments}
                className="text-xs flex items-center gap-1 border rounded px-2 py-1 dark:border-slate-700 dark:hover:bg-slate-800"
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
              className="absolute whitespace-nowrap will-change-transform text-sm text-gray-800 dark:text-slate-100 flex items-center gap-8 px-3"
              style={{ animation: 'ms-marquee 18s linear infinite' }}
            >
              {comms.map((c, idx) => (
                <span key={c.id || c.text || idx} className="inline-flex items-center gap-2">
                  {c.type && (
                    <span className="text-[11px] px-1.5 py-0.5 border rounded bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
                      {c.type}
                    </span>
                  )}
                  {c.priority && (
                    <span className="text-[11px] px-1.5 py-0.5 border rounded bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
                      {c.priority}
                    </span>
                  )}
                  {c.audienceRole && (
                    <span className="text-[11px] px-1.5 py-0.5 border rounded bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
                      role: {c.audienceRole}
                    </span>
                  )}
                  {typeof c.audienceBranchId !== 'undefined' && c.audienceBranchId !== null && (
                    <span className="text-[11px] px-1.5 py-0.5 border rounded bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
                      {branchNameById(c.audienceBranchId)}
                    </span>
                  )}
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span className="truncate">{c.text}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          to="/loans/add"
          className="ms-btn px-3 py-2 flex items-center gap-2 shadow-sm rounded-lg
                     bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                     border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80"
        >
          <PlusCircle className="w-4 h-4" /> Add Loan
        </Link>
        <Link
          to="/borrowers/add"
          className="ms-btn px-3 py-2 flex items-center gap-2 shadow-sm rounded-lg
                     bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                     border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80"
        >
          <PlusCircle className="w-4 h-4" /> Add Borrower
        </Link>
        <Link
          to="/repayments/new"
          className="ms-btn px-3 py-2 flex items-center gap-2 shadow-sm rounded-lg
                     bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                     border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80"
        >
          <PlusCircle className="w-4 h-4" /> Record Repayment
        </Link>
      </div>

      {/* Main + Right Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Main */}
        <main className="space-y-6">
          {loading ? (
            <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(230px,1fr))]">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : (
            <>
              {/* Summary Cards (auto-fit) */}
              <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(230px,1fr))]">
                <SummaryCard
                  tone="indigo" title="Total Borrowers"
                  value={n(summary?.totalBorrowers).toLocaleString()}
                  icon={<Users className="w-6 h-6" />}
                  to={makeTo(ROUTE_PATHS.borrowers)}
                />
                <SummaryCard
                  tone="sky" title="Total Loans"
                  value={n(summary?.totalLoans).toLocaleString()}
                  icon={<CreditCard className="w-6 h-6" />}
                  to={makeTo(ROUTE_PATHS.loans)}
                />
                <SummaryCard
                  tone="blue" title="Total Disbursed"
                  value={money(summary?.totalDisbursed)}
                  icon={<CreditCard className="w-6 h-6" />}
                  to={makeTo(ROUTE_PATHS.loans, { tab: 'disbursed' })}
                />

                <SummaryCard
                  tone="emerald" title="Total Paid"
                  value={money(summary?.totalPaid)}
                  icon={<DollarSign className="w-6 h-6" />}
                  to={makeTo(ROUTE_PATHS.repayments, { tab: 'paid' })}
                />
                <SummaryCard
                  tone="emerald" title="Total Repaid"
                  value={money(summary?.totalRepaid)}
                  icon={<DollarSign className="w-6 h-6" />}
                  to={makeTo(ROUTE_PATHS.repayments, { tab: 'paid' })}
                />
                <SummaryCard
                  tone="indigo" title="Expected Repayments"
                  value={money(summary?.totalExpectedRepayments)}
                  icon={<ClipboardList className="w-6 h-6" />}
                  to={makeTo(ROUTE_PATHS.expectedRepayments, { tab: 'expected' })}
                />

                <SummaryCard
                  tone="cyan" title="Total Deposits"
                  value={money(summary?.totalDeposits)}
                  icon={<DollarSign className="w-6 h-6" />}
                  to={makeTo(ROUTE_PATHS.deposits)}
                />
                <SummaryCard
                  tone="amber" title="Total Withdrawals"
                  value={money(summary?.totalWithdrawals)}
                  icon={<DollarSign className="w-6 h-6" />}
                  to={makeTo(ROUTE_PATHS.withdrawals)}
                />
                <SummaryCard
                  tone="blue" title="Net Savings"
                  value={money(summary?.netSavings)}
                  icon={<DollarSign className="w-6 h-6" />}
                  to={makeTo(ROUTE_PATHS.savings)}
                />

                <SummaryCard
                  tone="rose" title="Defaulted Loan"
                  value={money(summary?.defaultedLoan)}
                  icon={<AlertTriangle className="w-6 h-6" />}
                  to={makeTo(ROUTE_PATHS.defaultedLoans, { tab: 'defaulted' })}
                />
                <SummaryCard
                  tone="rose" title="Defaulted Interest"
                  value={money(summary?.defaultedInterest)}
                  icon={<AlertTriangle className="w-6 h-6" />}
                  to={makeTo(ROUTE_PATHS.defaultedInterest, { tab: 'defaulted-interest' })}
                />

                <SummaryCard
                  tone="violet" title="Outstanding Loan"
                  value={money(summary?.outstandingLoan)}
                  icon={<CreditCard className="w-6 h-6" />}
                  to={makeTo(ROUTE_PATHS.outstandingLoan, { tab: 'outstanding' })}
                />
                <SummaryCard
                  tone="violet" title="Outstanding Interest"
                  value={money(summary?.outstandingInterest)}
                  icon={<DollarSign className="w-6 h-6" />}
                  to={makeTo(ROUTE_PATHS.outstandingInterest, { tab: 'outstanding-interest' })}
                />

                <SummaryCard
                  tone="slate" title="Written Off"
                  value={money(summary?.writtenOff)}
                  icon={<ThumbsDown className="w-6 h-6" />}
                  to={makeTo(ROUTE_PATHS.writtenOff, { tab: 'written-off' })}
                />
                <SummaryCard
                  tone="indigo" title="PAR (Portfolio at Risk)"
                  value={`${n(summary?.parPercent)}%`}
                  icon={<BarChart2 className="w-6 h-6" />}
                  to={makeTo(ROUTE_PATHS.par, { tab: 'par' })}
                />
              </div>

              {/* Monthly Trends */}
              {trends && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart2 className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
                    <h3 className="font-semibold text-gray-900 dark:text-slate-100">
                      {`Monthly Trends${(trends.month || trends.year) ? ` — ${trends.month || ''} ${trends.year || ''}` : ''}`}
                    </h3>
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
                        <Tooltip
                          contentStyle={{ backgroundColor: chartColors.tooltipBg, borderColor: chartColors.grid, color: chartColors.tooltipText }}
                          wrapperStyle={{ outline: 'none' }}
                        />
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
                        <div className="text-indigo-600 dark:text-indigo-400">
                          <MiniBar label="Loans (count)" value={n(trends.monthlyLoans)} max={max} />
                        </div>
                        <div className="text-emerald-600 dark:text-emerald-400">
                          <MiniBar label="Deposits (TZS)" value={n(trends.monthlyDeposits)} max={max} />
                        </div>
                        <div className="text-blue-600 dark:text-blue-400">
                          <MiniBar label="Repayments (TZS)" value={n(trends.monthlyRepayments)} max={max} />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Top Borrowers / Upcoming Repayments */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 overflow-x-auto">
                  <h3 className="font-semibold mb-2 text-slate-900 dark:text-slate-100">Top Borrowers</h3>
                  {topBorrowers.length === 0 ? (
                    <p className="text-gray-700 dark:text-slate-300 text-sm">No data available.</p>
                  ) : (
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-700 dark:text-slate-300">
                          <th className="py-1 pr-4">Name</th>
                          <th className="py-1 pr-4">Outstanding</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-900 dark:text-slate-100">
                        {topBorrowers.map((b) => (
                          <tr key={b.id} className="border-t border-slate-200 dark:border-slate-700">
                            <td className="py-1 pr-4">{b.name}</td>
                            <td className="py-1 pr-4">{money(b.outstanding)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 overflow-x-auto">
                  <h3 className="font-semibold mb-2 text-slate-900 dark:text-slate-100">Upcoming Repayments</h3>
                  {upcomingRepayments.length === 0 ? (
                    <p className="text-gray-700 dark:text-slate-300 text-sm">No data available.</p>
                  ) : (
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-700 dark:text-slate-300">
                          <th className="py-1 pr-4">Borrower</th>
                          <th className="py-1 pr-4">Due Date</th>
                          <th className="py-1 pr-4">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-900 dark:text-slate-100">
                        {upcomingRepayments.map((r) => (
                          <tr key={r.id} className="border-t border-slate-200 dark:border-slate-700">
                            <td className="py-1 pr-4">{r.borrower}</td>
                            <td className="py-1 pr-4">{r.dueDate}</td>
                            <td className="py-1 pr-4">{money(r.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Performance charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-4">
                  <h3 className="font-semibold mb-2 text-slate-900 dark:text-slate-100">Branch Performance</h3>
                  {branchPerformance.length === 0 ? (
                    <p className="text-gray-700 dark:text-slate-300 text-sm">No data available.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={branchPerformance}>
                        <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" />
                        <XAxis dataKey="branch" tick={{ fill: chartColors.axis }} axisLine={{ stroke: chartColors.axis }} tickLine={{ stroke: chartColors.axis }} />
                        <YAxis tick={{ fill: chartColors.axis }} axisLine={{ stroke: chartColors.axis }} tickLine={{ stroke: chartColors.axis }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: chartColors.tooltipBg, borderColor: chartColors.grid, color: chartColors.tooltipText }}
                          wrapperStyle={{ outline: 'none' }}
                        />
                        <Legend wrapperStyle={{ color: chartColors.legend }} />
                        <Bar dataKey="disbursed" fill={chartColors.bar1} />
                        <Bar dataKey="repayments" fill={chartColors.bar2} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-4">
                  <h3 className="font-semibold mb-2 text-slate-900 dark:text-slate-100">Officer Performance</h3>
                  {officerPerformance.length === 0 ? (
                    <p className="text-gray-700 dark:text-slate-300 text-sm">No data available.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={officerPerformance}>
                        <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" />
                        <XAxis dataKey="officer" tick={{ fill: chartColors.axis }} axisLine={{ stroke: chartColors.axis }} tickLine={{ stroke: chartColors.axis }} />
                        <YAxis tick={{ fill: chartColors.axis }} axisLine={{ stroke: chartColors.axis }} tickLine={{ stroke: chartColors.axis }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: chartColors.tooltipBg, borderColor: chartColors.grid, color: chartColors.tooltipText }}
                          wrapperStyle={{ outline: 'none' }}
                        />
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

        {/* RIGHT Sidebar: Recent Activity */}
        <aside className="lg:sticky lg:top-4 self-start">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">Recent Activity</h2>
            </div>

            {/* Date search */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <DateField value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9" />
              <DateField value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9" />
              <button
                className="ms-btn col-span-2 h-9 text-sm rounded-lg
                           bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                           border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80"
                onClick={() => {
                  setActivityPage(1);
                  fetchActivity({ page: 1 });
                }}
              >
                Search by date
              </button>
            </div>

            {/* Scroll list with fade */}
            <div className="relative">
              <div className="absolute inset-x-0 top-0 h-6 pointer-events-none bg-gradient-to-b from-white to-transparent dark:from-slate-900" />
              <div className="absolute inset-x-0 bottom-0 h-6 pointer-events-none bg-gradient-to-t from-white to-transparent dark:from-slate-900" />
              <div className="max-h-[520px] overflow-y-auto pr-1 space-y-3">
                {activity.length === 0 ? (
                  <p className="text-gray-700 dark:text-slate-300 text-sm">No activity.</p>
                ) : (
                  activity.map((a) => (
                    <div key={a.id} className="border rounded p-3 border-slate-200 dark:border-slate-700">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {a.type} • {a.entityType} #{a.entityId}
                      </p>
                      <p className="text-xs text-slate-800 dark:text-slate-200 break-words">{a.message}</p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                        by {a.createdBy?.name || a.createdBy?.email} • {new Date(a.createdAt).toLocaleString()}
                      </p>

                      {/* latest comments preview */}
                      {Array.isArray(a.comments) && a.comments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {a.comments.map((c) => (
                            <div key={c.id} className="bg-gray-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-2">
                              <p className="text-xs text-gray-900 dark:text-slate-100 break-words">{c.comment}</p>
                              <p className="text-[11px] text-gray-600 dark:text-slate-400 mt-0.5">
                                — {c.createdBy?.name || c.createdBy?.email} • {new Date(c.createdAt).toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* reply + assign */}
                      <div className="mt-2 flex gap-2">
                        <TextField
                          value={commentDraft[a.id] || ''}
                          onChange={(e) => setCommentDraft((d) => ({ ...d, [a.id]: e.target.value }))}
                          placeholder="Reply…"
                          className="flex-1 h-9 text-xs"
                        />
                        <button
                          onClick={() => submitComment(a.id)}
                          disabled={submitting[`c-${a.id}`]}
                          className="ms-btn h-9 px-2 text-xs disabled:opacity-50 flex items-center gap-1 rounded-lg
                                     bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                                     border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80"
                        >
                          <MessageSquare className="w-3 h-3" /> Reply
                        </button>
                      </div>

                      <div className="mt-2 grid grid-cols-4 gap-2">
                        <SelectField
                          value={assignDraft[a.id]?.assigneeId || ''}
                          onChange={(e) =>
                            setAssignDraft((d) => ({ ...d, [a.id]: { ...(d[a.id] || {}), assigneeId: e.target.value } }))
                          }
                          className="col-span-2 h-9 text-xs"
                        >
                          <option value="">Assign to…</option>
                          {officers.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name || o.email}
                            </option>
                          ))}
                        </SelectField>
                        <DateField
                          value={assignDraft[a.id]?.dueDate || ''}
                          onChange={(e) =>
                            setAssignDraft((d) => ({ ...d, [a.id]: { ...(d[a.id] || {}), dueDate: e.target.value } }))
                          }
                          className="h-9 text-xs"
                        />
                        <button
                          onClick={() => submitAssignment(a.id)}
                          disabled={submitting[`a-${a.id}`]}
                          className="ms-btn h-9 px-2 text-xs disabled:opacity-50 flex items-center justify-center gap-1 rounded-lg
                                     bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                                     border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80"
                        >
                          <UserPlus className="w-3 h-3" /> Assign
                        </button>
                        <TextField
                          value={assignDraft[a.id]?.note || ''}
                          onChange={(e) =>
                            setAssignDraft((d) => ({ ...d, [a.id]: { ...(d[a.id] || {}), note: e.target.value } }))
                          }
                          placeholder="Note…"
                          className="col-span-4 h-9 text-xs"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* pagination */}
            {activityTotal > activityPageSize && (
              <div className="flex justify-between items-center mt-3 text-xs text-slate-800 dark:text-slate-200">
                <span>{Math.min(activityPage * activityPageSize, activityTotal)} of {activityTotal}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const p = Math.max(activityPage - 1, 1);
                      setActivityPage(p);
                      fetchActivity({ page: p });
                    }}
                    disabled={activityPage === 1}
                    className="ms-btn px-2 py-1 disabled:opacity-50 rounded-lg
                               bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                               border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => {
                      const next = activityPage * activityPageSize < activityTotal ? activityPage + 1 : activityPage;
                      if (next !== activityPage) {
                        setActivityPage(next);
                        fetchActivity({ page: next });
                      }
                    }}
                    disabled={activityPage * activityPageSize >= activityTotal}
                    className="ms-btn px-2 py-1 disabled:opacity-50 rounded-lg
                               bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                               border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

/** Fancy KPI card with optional link (`to`) to make the entire card clickable */
const SummaryCard = ({
  title,
  value,
  icon,
  tone = 'indigo',
  to = null,        // <-- NEW: pass a route to make it clickable
  delta = null,
  deltaLabel = '',
  spark = null
}) => {
  const tones = ({
    indigo:  { border: 'from-indigo-300/70 to-indigo-500/40', icon: 'bg-indigo-500/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-300', glow: 'from-indigo-50/90 to-transparent dark:from-indigo-900/35 dark:to-transparent' },
    sky:     { border: 'from-sky-300/70 to-sky-500/40',       icon: 'bg-sky-500/10 dark:bg-sky-400/10 text-sky-600 dark:text-sky-300',       glow: 'from-sky-50/90 to-transparent dark:from-sky-900/35 dark:to-transparent' },
    blue:    { border: 'from-blue-300/70 to-blue-500/40',     icon: 'bg-blue-500/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-300',     glow: 'from-blue-50/90 to-transparent dark:from-blue-900/35 dark:to-transparent' },
    emerald: { border: 'from-emerald-300/70 to-emerald-500/40',icon:'bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-300',glow:'from-emerald-50/90 to-transparent dark:from-emerald-900/35 dark:to-transparent' },
    cyan:    { border: 'from-cyan-300/70 to-cyan-500/40',     icon: 'bg-cyan-500/10 dark:bg-cyan-400/10 text-cyan-600 dark:text-cyan-300',     glow: 'from-cyan-50/90 to-transparent dark:from-cyan-900/35 dark:to-transparent' },
    amber:   { border: 'from-amber-300/70 to-amber-500/40',   icon: 'bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-300',   glow: 'from-amber-50/90 to-transparent dark:from-amber-900/35 dark:to-transparent' },
    violet:  { border: 'from-violet-300/70 to-violet-500/40', icon: 'bg-violet-500/10 dark:bg-violet-400/10 text-violet-600 dark:text-violet-300', glow: 'from-violet-50/90 to-transparent dark:from-violet-900/35 dark:to-transparent' },
    rose:    { border: 'from-rose-300/70 to-rose-500/40',     icon: 'bg-rose-500/10 dark:bg-rose-400/10 text-rose-600 dark:text-rose-300',     glow: 'from-rose-50/90 to-transparent dark:from-rose-900/35 dark:to-transparent' },
    slate:   { border: 'from-slate-300/70 to-slate-500/40',   icon: 'bg-slate-500/10 dark:bg-slate-400/10 text-slate-600 dark:text-slate-300',   glow: 'from-slate-50/90 to-transparent dark:from-slate-900/35 dark:to-transparent' },
  }[tone]) || {
    border: 'from-slate-300/70 to-slate-500/40',
    icon: 'bg-slate-500/10 dark:bg-slate-400/10 text-slate-600 dark:text-slate-300',
    glow: 'from-slate-50/90 to-transparent dark:from-slate-900/35 dark:to-transparent'
  };

  // Tiny sparkline (dependency-free)
  const Spark = () => {
    if (!Array.isArray(spark) || spark.length < 2) return null;
    const w = 96, h = 28, pad = 2;
    const min = Math.min(...spark), max = Math.max(...spark);
    const range = Math.max(max - min, 1e-6);
    const stepX = (w - pad * 2) / (spark.length - 1);
    const pts = spark.map((v, i) => {
      const x = pad + i * stepX;
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return [x, y];
    });
    const d = 'M ' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ');
    return (
      <svg width={w} height={h} className="mt-2 opacity-70">
        <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  };

  const deltaColor =
    delta == null ? '' : delta >= 0 ? 'text-emerald-600 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-900/30'
                                   : 'text-rose-600 dark:text-rose-300 bg-rose-50/80 dark:bg-rose-900/30';

  return (
    <div className="group relative rounded-2xl transition-transform hover:-translate-y-0.5">
      {/* Make whole card clickable when `to` provided */}
      {to && (
        <Link
          to={to}
          className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
          aria-label={`View ${title} details`}
          title={`View ${title} details`}
        />
      )}

      {/* gradient border */}
      <div className={`p-[1px] rounded-2xl bg-gradient-to-br ${tones.border} ${to ? 'cursor-pointer' : ''}`}>
        {/* glass card */}
        <div className="relative rounded-2xl bg-white/95 dark:bg-slate-900/90 backdrop-blur supports-[backdrop-filter]:backdrop-blur-sm
                        border border-white/60 dark:border-slate-800 shadow-sm p-5 min-h-[11rem]">
          {/* colored glow background */}
          <div className={`pointer-events-none absolute inset-0 rounded-2xl opacity-80 bg-gradient-to-br ${tones.glow}`} />

          <div className="relative flex items-start justify-between gap-3">
            <div className={`p-3 rounded-full ${tones.icon}`}>{icon}</div>

            {delta != null && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${deltaColor}`}>
                {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toLocaleString()}%
                {deltaLabel && <span className="opacity-70">&nbsp;{deltaLabel}</span>}
              </span>
            )}
          </div>

          <div className="relative mt-3 min-w-0">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{title}</h3>
            <p className="text-[28px] md:text-[32px] leading-tight font-semibold text-slate-900 dark:text-white
                          font-mono tabular-nums break-words">
              {value ?? '—'}
            </p>
          </div>

          <div className="relative text-slate-400 dark:text-slate-500">
            <Spark />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
