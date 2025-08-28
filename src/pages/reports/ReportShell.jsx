import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api';
import { format } from 'date-fns';
import { Download } from 'lucide-react';

const QuickRanges = [
  { key: 'all', label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'quarter', label: 'This Quarter' },
  { key: 'annual', label: 'This Year' },
  { key: 'custom', label: 'Custom…' },
];

function computeRange(key) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  switch (key) {
    case 'today': return { startDate: new Date(y, m, d), endDate: new Date(y, m, d, 23, 59, 59) };
    case 'week': {
      const day = now.getDay() || 7;
      const start = new Date(y, m, d - day + 1);
      const end = new Date(y, m, d, 23, 59, 59);
      return { startDate: start, endDate: end };
    }
    case 'month': return { startDate: new Date(y, m, 1), endDate: new Date(y, m + 1, 0, 23, 59, 59) };
    case 'quarter': {
      const q = Math.floor(m / 3) * 3;
      return { startDate: new Date(y, q, 1), endDate: new Date(y, q + 3, 0, 23, 59, 59) };
    }
    case 'annual': return { startDate: new Date(y, 0, 1), endDate: new Date(y, 11, 31, 23, 59, 59) };
    default: return { startDate: null, endDate: null };
  }
}

export default function ReportShell({
  title,
  endpoint,          // e.g. '/reports/loans/summary'
  columns = [],      // [{key,label,fmt?}]
  mode = 'range',    // 'range' or 'snapshot'
  exportCsvPath,     // optional export endpoint
}) {
  const [filters, setFilters] = useState({ branches:[], officers:[], borrowers:[], products:[] });
  const [branchId, setBranch] = useState('');
  const [officerId, setOfficer] = useState('');
  const [borrowerId, setBorrower] = useState('');
  const [productId, setProduct] = useState('');
  const [quick, setQuick] = useState('all');
  const [{startDate, endDate}, setDates] = useState(computeRange('all'));
  const [asOf, setAsOf] = useState(format(new Date(),'yyyy-MM-dd'));
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/reports/filters');
        setFilters(res.data || { branches:[], officers:[], borrowers:[], products:[] });
      } catch {
        setFilters({ branches:[], officers:[], borrowers:[], products:[] });
      }
    })();
  }, []);

  const params = useMemo(() => {
    const p = {
      branchId: branchId || undefined,
      officerId: officerId || undefined,
      borrowerId: borrowerId || undefined,
      productId: productId || undefined
    };
    if (mode === 'range') {
      if (startDate) p.startDate = startDate.toISOString();
      if (endDate) p.endDate = endDate.toISOString();
    } else {
      p.asOf = asOf;
    }
    return p;
  }, [branchId, officerId, borrowerId, productId, startDate, endDate, asOf, mode]);

  useEffect(() => {
    (async () => {
      setBusy(true);
      try {
        const res = await api.get(endpoint, { params });
        setData(res.data);
      } catch (e) {
        console.error('report fetch error', e);
        setData(null);
      } finally { setBusy(false); }
    })();
  }, [endpoint, JSON.stringify(params)]); // eslint-disable-line

  function onQuickChange(k) {
    setQuick(k);
    if (k === 'custom') return;
    setDates(computeRange(k));
  }

  function displayScope() {
    const bits = [];
    bits.push(branchId ? `Branch #${branchId}` : 'All branches');
    bits.push(officerId ? `Officer #${officerId}` : 'All officers');
    if (columns.some(c => c.key === 'borrower')) bits.push(borrowerId ? `Borrower #${borrowerId}` : 'All borrowers');
    if (columns.some(c => c.key === 'product'))  bits.push(productId ? `Product #${productId}`   : 'All products');
    return bits.join(' · ');
  }

  const periodLabel = mode === 'snapshot'
    ? (asOf ? asOf : '')
    : (startDate || endDate
        ? `${startDate ? format(startDate,'yyyy-MM-dd') : '…'} → ${endDate ? format(endDate,'yyyy-MM-dd') : '…'}`
        : 'All time');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">{title}</h1>
        {exportCsvPath && (
          <button
            onClick={() => window.open(`${import.meta.env.VITE_API_BASE_URL}${exportCsvPath}?` + new URLSearchParams(params).toString(), '_blank')}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 text-sm"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border rounded-xl p-3 flex flex-wrap gap-2">
        <select className="border rounded px-3 py-2" value={branchId} onChange={e=>setBranch(e.target.value)}>
          <option value="">All Branches</option>
          {filters.branches.map(b => <option key={b.id} value={b.id}>{b.name || `#${b.id}`}</option>)}
        </select>
        <select className="border rounded px-3 py-2" value={officerId} onChange={e=>setOfficer(e.target.value)}>
          <option value="">All Officers</option>
          {filters.officers.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
        </select>

        {columns.some(c => c.key === 'borrower') && (
          <select className="border rounded px-3 py-2" value={borrowerId} onChange={e=>setBorrower(e.target.value)}>
            <option value="">All Borrowers</option>
            {filters.borrowers.map(b => <option key={b.id} value={b.id}>{b.name || `#${b.id}`}</option>)}
          </select>
        )}
        {columns.some(c => c.key === 'product') && (
          <select className="border rounded px-3 py-2" value={productId} onChange={e=>setProduct(e.target.value)}>
            <option value="">All Products</option>
            {filters.products.map(p => <option key={p.id} value={p.id}>{p.name || `#${p.id}`}</option>)}
          </select>
        )}

        {mode === 'range' ? (
          <>
            <select className="border rounded px-3 py-2" value={quick} onChange={e=>onQuickChange(e.target.value)}>
              {QuickRanges.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
            {quick === 'custom' && (
              <>
                <input type="date" className="border rounded px-3 py-2"
                       value={startDate ? format(startDate,'yyyy-MM-dd') : ''}
                       onChange={e=>setDates(s => ({...s, startDate: e.target.value ? new Date(e.target.value) : null}))}/>
                <input type="date" className="border rounded px-3 py-2"
                       value={endDate ? format(endDate,'yyyy-MM-dd') : ''}
                       onChange={e=>setDates(s => ({...s, endDate: e.target.value ? new Date(e.target.value) : null}))}/>
              </>
            )}
          </>
        ) : (
          <input type="date" className="border rounded px-3 py-2" value={asOf} onChange={e=>setAsOf(e.target.value)} />
        )}
      </div>

      {/* Content */}
      {busy ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : !data ? (
        <div className="text-sm text-rose-600">Failed to load.</div>
      ) : (
        <>
          {data.cards && data.cards.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {data.cards.map((c, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border p-3">
                  <div className="text-xs text-slate-500">{c.title}</div>
                  <div className="text-lg font-semibold">
                    {c.percent ? `${(c.value*100).toFixed(2)}%` : `TZS ${Number(c.value||0).toLocaleString()}`}
                  </div>
                </div>
              ))}
            </div>
          )}

          {data.table && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Loan Summary Report</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr><th className="text-left px-3 py-2">Metric</th><th className="text-left px-3 py-2">Value</th></tr>
                </thead>
                <tbody>
                  {data.table.rows.map((r, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-3 py-2">{r.metric}</td>
                      <td className="px-3 py-2">{r.currency ? `TZS ${Number(r.value||0).toLocaleString()}` : r.value}</td>
                    </tr>
                  ))}
                  <tr className="border-t">
                    <td className="px-3 py-2">Period</td>
                    <td className="px-3 py-2">{data.table.period || periodLabel}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2">Scope</td>
                    <td className="px-3 py-2">{data.table.scope || displayScope()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {Array.isArray(data.rows) && columns.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border p-3">
              <div className="text-sm mb-2 text-slate-500">
                {mode === 'snapshot' ? `As of: ${periodLabel}` : `Period: ${periodLabel}`} • {displayScope()}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>{columns.map(c => <th key={c.key} className="text-left px-3 py-2">{c.label}</th>)}</tr>
                  </thead>
                  <tbody>
                    {data.rows.map((r, i) => (
                      <tr key={i} className="border-t hover:bg-gray-50">
                        {columns.map(c => (
                          <td key={c.key} className="px-3 py-2">
                            {c.fmt ? c.fmt(r[c.key], r) : String(r[c.key] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {data.rows.length === 0 && (
                      <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={columns.length}>No rows.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
