import React, { useEffect, useState, useCallback } from 'react';
import {
  Users, CreditCard, DollarSign, AlertTriangle, ClipboardList,
  ThumbsDown, Info, BarChart2, MessageSquare, UserPlus, Download, PlusCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import api from '../api';

const LS_KEY = 'ms_dash_filters_v1';
const LS_AUTO = 'ms_dash_auto_refresh_v1';

const Dashboard = () => {
  const [summary, setSummary] = useState(null);

  // Global filters (restore from LS if present)
  const [branches, setBranches] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [officerId, setOfficerId] = useState('');
  const [timeRange, setTimeRange] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(0); // minutes

  // General communications (ticker)
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

  // NEW placeholders (no API yet)
  const [topBorrowers, setTopBorrowers] = useState([]); // []
  const [upcomingRepayments, setUpcomingRepayments] = useState([]); // []
  const [branchPerformance, setBranchPerformance] = useState([]); // []
  const [officerPerformance, setOfficerPerformance] = useState([]); // []

  // Loading
  const [loading, setLoading] = useState(true);

  // Toasts
  const [toasts, setToasts] = useState([]);
  const pushToast = (msg, type = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };

  // ---------- helpers ----------
  const n = (v) => {
    const num = Number(v);
    return Number.isFinite(num) ? num : 0;
  };
  const money = (v) => `TZS ${n(v).toLocaleString()}`;

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
    const [branchesRes, officersRes] = await Promise.all([
      api.get('/branches', { signal }),
      api.get('/users', { params: { role: 'loan_officer' }, signal })
    ]);
    setBranches(Array.isArray(branchesRes.data) ? branchesRes.data : []);
    setOfficers(Array.isArray(officersRes.data) ? officersRes.data : []);
  }, []);

  const fetchSummary = useCallback(async (signal) => {
    const res = await api.get('/dashboard/summary', { params: { branchId, officerId, timeRange }, signal });
    setSummary(res.data || {});
  }, [branchId, officerId, timeRange]);

  const fetchCommunications = useCallback(async (signal) => {
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
  }, [summary]);

  const fetchActivity = useCallback(async (opts = {}, signal) => {
    const res = await api.get('/dashboard/activity', {
      params: {
        page: opts.page ?? activityPage,
        pageSize: activityPageSize,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      },
      signal
    });
    setActivity(res.data?.items || []);
    setActivityTotal(res.data?.total || 0);
  }, [activityPage, dateFrom, dateTo]);

  const fetchTrends = useCallback(async (signal) => {
    const res = await api.get('/dashboard/monthly-trends', { signal });
    setTrends(res.data || {});
  }, []);

  // ---------- Effects ----------
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        await fetchFilters(ac.signal);
      } catch (err) {
        if (err?.name !== 'CanceledError') {
          console.error('Filter fetch error:', err?.message || err);
          pushToast('Failed to load filters', 'error');
        }
      }
    })();
    return () => ac.abort();
  }, [fetchFilters]);

  const loadAll = useCallback(async (signal) => {
    await Promise.all([fetchSummary(signal), fetchActivity({}, signal), fetchTrends(signal)]);
  }, [fetchSummary, fetchActivity, fetchTrends]);

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
    fetchCommunications(ac.signal).catch(err => {
      if (err?.name !== 'CanceledError') {
        console.error('Comms fetch error:', err?.message || err);
        pushToast('Failed to load communications', 'error');
      }
    });
    return () => ac.abort();
  }, [summary, fetchCommunications]);

  // NEW: Auto-refresh (minutes)
  useEffect(() => {
    if (!autoRefresh || autoRefresh <= 0) return;
    const id = setInterval(() => {
      const ac = new AbortController();
      Promise.all([loadAll(ac.signal), fetchCommunications(ac.signal)])
        .catch(() => {})
        .finally(() => ac.abort());
    }, autoRefresh * 60000);
    return () => clearInterval(id);
  }, [autoRefresh, loadAll, fetchCommunications]);

  // ---------- Activity actions ----------
  const submitComment = async (activityId) => {
    const key = `c-${activityId}`;
    setSubmitting(s => ({ ...s, [key]: true }));
    try {
      const text = (commentDraft[activityId] || '').trim();
      if (!text) return;
      await api.post(`/dashboard/activity/${activityId}/comment`, { comment: text });
      setCommentDraft(d => ({ ...d, [activityId]: '' }));
      await fetchActivity();
      pushToast('Reply posted', 'success');
    } catch (err) {
      console.error('Add comment error:', err?.message || err);
      pushToast('Failed to post reply', 'error');
    } finally {
      setSubmitting(s => ({ ...s, [key]: false }));
    }
  };

  const submitAssignment = async (activityId) => {
    const key = `a-${activityId}`;
    setSubmitting(s => ({ ...s, [key]: true }));
    try {
      const draft = assignDraft[activityId] || {};
      if (!draft.assigneeId) return;
      await api.post(`/dashboard/activity/${activityId}/assign`, {
        assigneeId: draft.assigneeId,
        dueDate: draft.dueDate || null,
        note: draft.note || ''
      });
      setAssignDraft(d => ({ ...d, [activityId]: { assigneeId: '', dueDate: '', note: '' } }));
      await fetchActivity();
      pushToast('Task assigned', 'success');
    } catch (err) {
      console.error('Assign task error:', err?.message || err);
      pushToast('Failed to assign task', 'error');
    } finally {
      setSubmitting(s => ({ ...s, [key]: false }));
    }
  };

  // ---------- Mini bar ----------
  const MiniBar = ({ label, value, max }) => {
    const v = n(value);
    const m = n(max);
    const pct = m > 0 ? Math.round((v / m) * 100) : 0;
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>{label}</span>
          <span>{v.toLocaleString()}</span>
        </div>
        <div className="h-2 w-full bg-gray-100 rounded">
          <div className="h-2 rounded" style={{ width: `${pct}%`, backgroundColor: 'currentColor' }} />
        </div>
      </div>
    );
  };

  const Skeleton = ({ className }) => <div className={`animate-pulse bg-gray-100 rounded ${className}`} />;

  // Download all attachments from ticker
  const downloadAllAttachments = () => {
    const files = comms.flatMap(c => (c.attachments || []).map(a => a.fileUrl)).filter(Boolean);
    if (files.length === 0) return;
    files.forEach((url, i) => {
      setTimeout(() => window.open(url, '_blank', 'noopener,noreferrer'), i * 150);
    });
    pushToast(`Opening ${files.length} attachment${files.length > 1 ? 's' : ''}…`, 'info');
  };

  const branchNameById = (id) =>
    branches.find(b => String(b.id) === String(id))?.name || (id ? `Branch #${id}` : 'All branches');

  // NEW: dashboard message (single, curated)
  const dashMsg = summary?.dashboardMessage;

  return (
    <div className="p-6">
      {/* Inline keyframes for the marquee */}
      <style>{`
        @keyframes ms-marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
      `}</style>

      {/* Toasts */}
      <div className="fixed right-4 top-4 z-50 space-y-2">
        {toasts.map(t => (
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

      <h1 className="text-3xl font-bold text-gray-800 mb-4">📊 Dashboard</h1>

      {/* Important Notice */}
      {summary?.importantNotice && (
        <div className="mb-3 p-4 rounded-md bg-yellow-50 border border-yellow-200 text-yellow-800">
          <div className="flex gap-2 items-start">
            <Info className="w-5 h-5 mt-0.5" />
            <div>
              <p className="font-semibold">Important Notice</p>
              <p className="text-sm">{summary.importantNotice}</p>
            </div>
          </div>
        </div>
      )}

      {/* Company Message */}
      {summary?.companyMessage ? (
        <div className="mb-2 p-4 border-l-4 border-blue-500 bg-blue-50 text-blue-700">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            <p className="text-sm font-medium">{summary.companyMessage}</p>
          </div>
        </div>
      ) : loading ? (
        <Skeleton className="h-12 mb-2" />
      ) : null}

      {/* NEW: Dashboard Message (curated from Communication.showOnDashboard) */}
      {dashMsg && (
        <div className="mb-4 bg-white border rounded-md shadow-sm p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              {dashMsg.title && <h3 className="text-sm font-semibold text-gray-800">{dashMsg.title}</h3>}
              {dashMsg.text && <p className="text-sm text-gray-700 mt-1">{dashMsg.text}</p>}
              {Array.isArray(dashMsg.attachments) && dashMsg.attachments.length > 0 && (
                <div className="mt-2">
                  <p className="text-[11px] text-gray-500 mb-1">Attachments</p>
                  <div className="flex flex-wrap gap-3">
                    {dashMsg.attachments.map(a => (
                      <a
                        key={`${a.id}-${a.fileUrl}`}
                        href={a.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 underline"
                        title={a.fileName}
                      >
                        {a.fileName || 'Attachment'}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {Array.isArray(dashMsg.attachments) && dashMsg.attachments.length > 0 && (
              <button
                onClick={() => {
                  dashMsg.attachments.forEach((a, i) => {
                    if (a.fileUrl) setTimeout(() => window.open(a.fileUrl, '_blank', 'noopener,noreferrer'), i * 150);
                  });
                }}
                className="text-xs flex items-center gap-1 border rounded px-2 py-1 h-8"
                title="Open all attachments"
              >
                <Download className="w-3 h-3" /> Open all
              </button>
            )}
          </div>
        </div>
      )}

      {/* General Communications Ticker */}
      {(comms?.length ?? 0) > 0 && (
        <div className="mb-6 bg-white border rounded-md overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
            <div className="text-xs font-medium text-gray-600">General Communications</div>
            {comms.some(c => Array.isArray(c.attachments) && c.attachments.length > 0) && (
              <button
                onClick={downloadAllAttachments}
                className="text-xs flex items-center gap-1 border rounded px-2 py-1"
                title="Open all attachments"
              >
                <Download className="w-3 h-3" /> Download all
              </button>
            )}
          </div>

          <div className="relative h-10">
            <div
              className="absolute whitespace-nowrap will-change-transform text-sm text-gray-700 flex items-center gap-8 px-3"
              style={{ animation: 'ms-marquee 18s linear infinite' }}
            >
              {comms.map((c) => (
                <span key={c.id || c.text} className="inline-flex items-center gap-2">
                  {c.type && (<span className="text-[11px] px-1.5 py-0.5 border rounded bg-gray-50">{c.type}</span>)}
                  {c.priority && (<span className="text-[11px] px-1.5 py-0.5 border rounded bg-gray-50">{c.priority}</span>)}
                  {c.audienceRole && (<span className="text-[11px] px-1.5 py-0.5 border rounded bg-gray-50">role: {c.audienceRole}</span>)}
                  {typeof c.audienceBranchId !== 'undefined' && c.audienceBranchId !== null && (
                    <span className="text-[11px] px-1.5 py-0.5 border rounded bg-gray-50">
                      {branchNameById(c.audienceBranchId)}
                    </span>
                  )}
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
                  {c.text}
                </span>
              ))}
            </div>
          </div>

          {comms.some(c => Array.isArray(c.attachments) && c.attachments.length > 0) && (
            <div className="px-3 py-2 bg-gray-50 border-t">
              <p className="text-[11px] text-gray-500 mb-1">Attachments</p>
              <div className="flex flex-wrap gap-3">
                {comms.flatMap(c => (c.attachments || []).map(a => (
                  <a
                    key={`${c.id}-${a.id}-${a.fileUrl}`}
                    href={a.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 underline"
                    title={a.fileName}
                  >
                    {a.fileName}
                  </a>
                )))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select value={branchId} onChange={e => setBranchId(e.target.value)} className="border rounded px-3 py-2">
          <option value="">All Branches</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>

        <select value={officerId} onChange={e => setOfficerId(e.target.value)} className="border rounded px-3 py-2">
          <option value="">All Loan Officers</option>
          {officers.map(o => <option key={o.id} value={o.id}>{o.name || o.email}</option>)}
        </select>

        <select value={timeRange} onChange={e => setTimeRange(e.target.value)} className="border rounded px-3 py-2">
          <option value="">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="quarter">This Quarter</option>
          <option value="semiAnnual">Semi-Annual</option>
          <option value="annual">Annual</option>
        </select>

        {/* NEW: Auto-refresh */}
        <select value={autoRefresh} onChange={e => setAutoRefresh(Number(e.target.value))} className="border rounded px-3 py-2">
          <option value={0}>No Auto-Refresh</option>
          <option value={1}>Every 1 min</option>
          <option value={5}>Every 5 mins</option>
          <option value={15}>Every 15 mins</option>
        </select>

        <button
          className="ml-auto px-3 py-2 border rounded"
          onClick={() => {
            const ac = new AbortController();
            Promise.all([fetchSummary(ac.signal), fetchActivity({}, ac.signal), fetchTrends(ac.signal), fetchCommunications(ac.signal)])
              .then(() => pushToast('Dashboard refreshed', 'success'))
              .catch(() => pushToast('Refresh failed', 'error'))
              .finally(() => ac.abort());
          }}
        >
          Refresh
        </button>
      </div>

      {/* NEW: Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Link to="/loans/new" className="flex items-center gap-2 px-3 py-2 border rounded bg-white hover:bg-gray-50">
          <PlusCircle className="w-4 h-4" /> Add Loan
        </Link>
        <Link to="/borrowers/new" className="flex items-center gap-2 px-3 py-2 border rounded bg-white hover:bg-gray-50">
          <PlusCircle className="w-4 h-4" /> Add Borrower
        </Link>
        <Link to="/repayments/new" className="flex items-center gap-2 px-3 py-2 border rounded bg-white hover:bg-gray-50">
          <PlusCircle className="w-4 h-4" /> Record Repayment
        </Link>
      </div>

      {/* Two-column layout: MAIN + RIGHT SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Main content */}
        <main className="space-y-6">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <SummaryCard title="Total Borrowers" value={n(summary?.totalBorrowers)} icon={<Users className="w-6 h-6" />} />
                <SummaryCard title="Total Loans" value={n(summary?.totalLoans)} icon={<CreditCard className="w-6 h-6" />} />
                <SummaryCard title="Total Disbursed" value={money(summary?.totalDisbursed)} icon={<CreditCard className="w-6 h-6" />} />

                <SummaryCard title="Total Paid" value={money(summary?.totalPaid)} icon={<DollarSign className="w-6 h-6" />} />
                <SummaryCard title="Total Repaid" value={money(summary?.totalRepaid)} icon={<DollarSign className="w-6 h-6" />} />
                <SummaryCard title="Expected Repayments" value={money(summary?.totalExpectedRepayments)} icon={<ClipboardList className="w-6 h-6" />} />

                <SummaryCard title="Total Deposits" value={money(summary?.totalDeposits)} icon={<DollarSign className="w-6 h-6" />} />
                <SummaryCard title="Total Withdrawals" value={money(summary?.totalWithdrawals)} icon={<DollarSign className="w-6 h-6" />} />
                <SummaryCard title="Net Savings" value={money(summary?.netSavings)} icon={<DollarSign className="w-6 h-6" />} />

                <SummaryCard title="Defaulted Loan" value={money(summary?.defaultedLoan)} icon={<AlertTriangle className="w-6 h-6" />} />
                <SummaryCard title="Defaulted Interest" value={money(summary?.defaultedInterest)} icon={<AlertTriangle className="w-6 h-6" />} />

                <SummaryCard title="Outstanding Loan" value={money(summary?.outstandingLoan)} icon={<CreditCard className="w-6 h-6" />} />
                <SummaryCard title="Outstanding Interest" value={money(summary?.outstandingInterest)} icon={<DollarSign className="w-6 h-6" />} />

                <SummaryCard title="Written Off" value={money(summary?.writtenOff)} icon={<ThumbsDown className="w-6 h-6" />} />
                <SummaryCard title="PAR (Portfolio at Risk)" value={`${n(summary?.parPercent)}%`} icon={<BarChart2 className="w-6 h-6" />} />
              </div>

              {/* Monthly Trends (interactive chart + your MiniBars) */}
              {trends && (
                <div className="bg-white rounded-lg shadow-md p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart2 className="w-5 h-5" />
                    <h3 className="font-semibold text-gray-800">
                      Monthly Trends — {trends.month} {trends.year}
                    </h3>
                  </div>

                  {/* NEW Interactive chart */}
                  <div className="mb-4">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart
                        data={[
                          { name: 'Loans', value: trends.monthlyLoans || 0 },
                          { name: 'Deposits', value: trends.monthlyDeposits || 0 },
                          { name: 'Repayments', value: trends.monthlyRepayments || 0 },
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Keep your MiniBar view */}
                  {(() => {
                    const vals = [trends.monthlyLoans || 0, trends.monthlyDeposits || 0, trends.monthlyRepayments || 0];
                    const max = Math.max(...vals);
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-indigo-600"><MiniBar label="Loans (count)" value={trends.monthlyLoans || 0} max={max} /></div>
                        <div className="text-emerald-600"><MiniBar label="Deposits (TZS)" value={trends.monthlyDeposits || 0} max={max} /></div>
                        <div className="text-blue-600"><MiniBar label="Repayments (TZS)" value={trends.monthlyRepayments || 0} max={max} /></div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* NEW: Top Borrowers / Upcoming Repayments */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-md p-4 overflow-x-auto">
                  <h3 className="font-semibold mb-2">Top Borrowers</h3>
                  {topBorrowers.length === 0 ? (
                    <p className="text-gray-500 text-sm">No data available.</p>
                  ) : (
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-600">
                          <th className="py-1 pr-4">Name</th>
                          <th className="py-1 pr-4">Outstanding</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topBorrowers.map(b => (
                          <tr key={b.id} className="border-t">
                            <td className="py-1 pr-4">{b.name}</td>
                            <td className="py-1 pr-4">{money(b.outstanding)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="bg-white rounded-lg shadow-md p-4 overflow-x-auto">
                  <h3 className="font-semibold mb-2">Upcoming Repayments</h3>
                  {upcomingRepayments.length === 0 ? (
                    <p className="text-gray-500 text-sm">No data available.</p>
                  ) : (
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-600">
                          <th className="py-1 pr-4">Borrower</th>
                          <th className="py-1 pr-4">Due Date</th>
                          <th className="py-1 pr-4">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {upcomingRepayments.map(r => (
                          <tr key={r.id} className="border-t">
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

              {/* NEW: Performance charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-md p-4">
                  <h3 className="font-semibold mb-2">Branch Performance</h3>
                  {branchPerformance.length === 0 ? (
                    <p className="text-gray-500 text-sm">No data available.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={branchPerformance}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="branch" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="disbursed" />
                        <Bar dataKey="repayments" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="bg-white rounded-lg shadow-md p-4">
                  <h3 className="font-semibold mb-2">Officer Performance</h3>
                  {officerPerformance.length === 0 ? (
                    <p className="text-gray-500 text-sm">No data available.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={officerPerformance}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="officer" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="loans" />
                        <Bar dataKey="collections" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </>
          )}
        </main>

        {/* RIGHT Sidebar: Recent Activity with date search + fade */}
        <aside className="lg:sticky lg:top-4 self-start">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList className="w-5 h-5 text-indigo-600" />
              <h2 className="font-semibold text-gray-800">Recent Activity</h2>
            </div>

            {/* Date search */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <input type="date" className="border rounded px-2 py-1 text-sm" value={dateFrom}
                     onChange={(e) => setDateFrom(e.target.value)} />
              <input type="date" className="border rounded px-2 py-1 text-sm" value={dateTo}
                     onChange={(e) => setDateTo(e.target.value)} />
              <button
                className="col-span-2 border rounded px-2 py-1 text-sm"
                onClick={() => { setActivityPage(1); fetchActivity({ page: 1 }); }}
              >
                Search by date
              </button>
            </div>

            {/* Scroll list with fade */}
            <div className="relative">
              <div className="absolute inset-x-0 top-0 h-6 pointer-events-none bg-gradient-to-b from-white to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-6 pointer-events-none bg-gradient-to-t from-white to-transparent" />
              <div className="max-h-[520px] overflow-y-auto pr-1 space-y-3">
                {activity.length === 0 ? (
                  <p className="text-gray-500 text-sm">No activity.</p>
                ) : (
                  activity.map(a => (
                    <div key={a.id} className="border rounded p-3">
                      <p className="text-sm font-medium text-gray-800">{a.type} • {a.entityType} #{a.entityId}</p>
                      <p className="text-xs text-gray-600">{a.message}</p>
                      <p className="text-[11px] text-gray-400 mt-1">
                        by {a.createdBy?.name || a.createdBy?.email} • {new Date(a.createdAt).toLocaleString()}
                      </p>

                      {/* latest comments preview */}
                      {Array.isArray(a.comments) && a.comments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {a.comments.map(c => (
                            <div key={c.id} className="bg-gray-50 border rounded p-2">
                              <p className="text-xs text-gray-800">{c.comment}</p>
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                — {c.createdBy?.name || c.createdBy?.email} • {new Date(c.createdAt).toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* reply + assign */}
                      <div className="mt-2 flex gap-2">
                        <input
                          value={commentDraft[a.id] || ''}
                          onChange={e => setCommentDraft(d => ({ ...d, [a.id]: e.target.value }))}
                          placeholder="Reply…"
                          className="flex-1 border rounded px-2 py-1 text-xs"
                        />
                        <button
                          onClick={() => submitComment(a.id)}
                          disabled={submitting[`c-${a.id}`]}
                          className="px-2 py-1 text-xs border rounded bg-white hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3" /> Reply
                        </button>
                      </div>

                      <div className="mt-2 grid grid-cols-4 gap-2">
                        <select
                          value={(assignDraft[a.id]?.assigneeId) || ''}
                          onChange={e => setAssignDraft(d => ({ ...d, [a.id]: { ...(d[a.id] || {}), assigneeId: e.target.value } }))}
                          className="col-span-2 border rounded px-2 py-1 text-xs"
                        >
                          <option value="">Assign to…</option>
                          {officers.map(o => <option key={o.id} value={o.id}>{o.name || o.email}</option>)}
                        </select>
                        <input
                          type="date"
                          value={(assignDraft[a.id]?.dueDate) || ''}
                          onChange={e => setAssignDraft(d => ({ ...d, [a.id]: { ...(d[a.id] || {}), dueDate: e.target.value } }))}
                          className="border rounded px-2 py-1 text-xs"
                        />
                        <button
                          onClick={() => submitAssignment(a.id)}
                          disabled={submitting[`a-${a.id}`]}
                          className="px-2 py-1 text-xs border rounded bg-white hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1 justify-center"
                        >
                          <UserPlus className="w-3 h-3" /> Assign
                        </button>
                        <input
                          value={(assignDraft[a.id]?.note) || ''}
                          onChange={e => setAssignDraft(d => ({ ...d, [a.id]: { ...(d[a.id] || {}), note: e.target.value } }))}
                          placeholder="Note…"
                          className="col-span-4 border rounded px-2 py-1 text-xs"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* pagination */}
            {activityTotal > activityPageSize && (
              <div className="flex justify-between items-center mt-3 text-xs">
                <span>{Math.min(activityPage * activityPageSize, activityTotal)} of {activityTotal}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => { const p = Math.max(activityPage - 1, 1); setActivityPage(p); fetchActivity({ page: p }); }}
                    disabled={activityPage === 1}
                    className="px-2 py-1 border rounded disabled:opacity-50"
                  >Prev</button>
                  <button
                    onClick={() => {
                      const next = activityPage * activityPageSize < activityTotal ? activityPage + 1 : activityPage;
                      if (next !== activityPage) { setActivityPage(next); fetchActivity({ page: next }); }
                    }}
                    disabled={activityPage * activityPageSize >= activityTotal}
                    className="px-2 py-1 border rounded disabled:opacity-50"
                  >Next</button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

const SummaryCard = ({ title, value, icon }) => (
  <div className="bg-white rounded-lg shadow-md p-4 flex items-center gap-4">
    <div className="p-2 bg-gray-100 rounded-full">{icon}</div>
    <div>
      <h3 className="text-sm text-gray-500">{title}</h3>
      <p className="text-xl font-semibold text-gray-800">{value ?? '—'}</p>
    </div>
  </div>
);

export default Dashboard;
