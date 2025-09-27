import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../api';

/* ---------------- helpers ---------------- */
const fmtMoney = (n, currency = 'TZS') =>
  `\u200e${currency} ${Number(n || 0).toLocaleString()}`;
const asDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');

export default function LoanSchedulePage() {
  const [loanId, setLoanId] = useState('');
  const [loan, setLoan] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [method, setMethod] = useState('');
  const [currency, setCurrency] = useState('TZS');

  const [repayments, setRepayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [auto, setAuto] = useState(true);
  const pollRef = useRef(null);

  /* ---------- core fetch ---------- */
  const fetchAll = async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      // schedule
      const sch = await api.get(`/loans/${id}/schedule`);
      const item = sch.data || {};
      setSchedule(item.schedule || item || []); // tolerate either shape
      setMethod(item.interestMethod || item.method || '');
      if (item.currency) setCurrency(item.currency);

      // loan
      const lr = await api.get(`/loans/${id}`);
      setLoan(lr.data || null);
      if (lr.data?.currency) setCurrency(lr.data.currency);

      // repayments (used for totals + status update)
      const rp = await api
        .get(`/repayments/loan/${id}`)
        .then((r) => r.data || [])
        .catch(() => []);
      setRepayments(rp);

      // if there is at least one repayment and loan not active, make it active
      const hasPaid = (rp?.length || 0) > 0;
      const status = (lr.data?.status || '').toLowerCase();
      if (
        hasPaid &&
        status &&
        !['active', 'closed'].includes(status)
      ) {
        try {
          await api.patch(`/loans/${id}/status`, { status: 'active' });
          // refetch minimal loan to reflect new status
          const lr2 = await api.get(`/loans/${id}`);
          setLoan(lr2.data || lr.data || null);
        } catch {
          // ignore if backend doesn’t allow; UI will still work
        }
      }
    } catch (e) {
      setSchedule([]);
      setRepayments([]);
      setLoan(null);
      setMethod('');
    } finally {
      setLoading(false);
    }
  };

  /* ----------- manual load ----------- */
  const onLoad = async (e) => {
    e.preventDefault();
    await fetchAll(loanId.trim());
  };

  /* ----------- auto refresh ----------- */
  useEffect(() => {
    if (!loanId || !auto) return;
    // poll every 10s
    pollRef.current && clearInterval(pollRef.current);
    pollRef.current = setInterval(() => fetchAll(loanId.trim()), 10000);
    return () => pollRef.current && clearInterval(pollRef.current);
  }, [loanId, auto]);

  /* ----------- computed totals ----------- */
  const totals = useMemo(() => {
    const sum = (arr, k) =>
      arr.reduce((a, b) => a + Number(b?.[k] || 0), 0);
    const principal = sum(schedule, 'principal');
    const interest = sum(schedule, 'interest');
    const penalty = sum(schedule, 'penalty');
    const total = sum(schedule, 'total') || principal + interest + penalty;

    const paid = repayments.reduce((a, b) => a + Number(b.amount || 0), 0);
    const outstanding = Math.max(total - paid, 0);
    return { principal, interest, penalty, total, paid, outstanding };
  }, [schedule, repayments]);

  /* ----------- export CSV ----------- */
  const downloadCSV = () => {
    if (!schedule.length) return;
    const headers = [
      'Installment',
      'Due Date',
      'Principal',
      'Interest',
      'Penalty',
      'Total',
      'Balance',
    ];
    const rows = schedule.map((r, i) => [
      r.installment ?? r.period ?? i + 1,
      r.dueDate ?? r.date ?? '',
      r.principal ?? 0,
      r.interest ?? 0,
      r.penalty ?? 0,
      r.total ?? (Number(r.principal || 0) + Number(r.interest || 0) + Number(r.penalty || 0)),
      r.balance ?? '',
    ]);
    const csv =
      headers.join(',') +
      '\n' +
      rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loan_${loanId}_schedule.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 space-y-4">
      {/* header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Loan Schedule</h2>
          {loan && (
            <p className="text-sm text-gray-600">
              Loan&nbsp;<b>#{loan.id}</b> — Status:&nbsp;
              <span className="inline-block rounded-full px-2 py-0.5 text-xs bg-slate-100 border">
                {loan.status}
              </span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loanId && fetchAll(loanId.trim())}
            className="px-3 py-2 rounded border hover:bg-gray-50"
          >
            Refresh
          </button>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={auto}
              onChange={(e) => setAuto(e.target.checked)}
            />
            Auto-refresh
          </label>
          <button
            onClick={downloadCSV}
            disabled={!schedule.length}
            className="bg-indigo-600 text-white px-3 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            Download CSV
          </button>
        </div>
      </div>

      {/* load form */}
      <form onSubmit={onLoad} className="flex gap-2 flex-wrap">
        <input
          className="border px-3 py-2 rounded w-64"
          placeholder="Enter Loan ID"
          value={loanId}
          onChange={(e) => setLoanId(e.target.value)}
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded">
          {loading ? 'Loading…' : 'Load'}
        </button>
        {method && (
          <div className="self-center text-sm text-gray-700">
            Interest Method:&nbsp;<b>{method}</b>
          </div>
        )}
      </form>

      {/* summary */}
      {!!schedule.length && (
        <div className="bg-white rounded border shadow p-3">
          <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
            <div>
              <div className="text-gray-500 text-xs">Principal</div>
              <div className="font-semibold">{fmtMoney(totals.principal, currency)}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Interest</div>
              <div className="font-semibold">{fmtMoney(totals.interest, currency)}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Penalty</div>
              <div className="font-semibold">{fmtMoney(totals.penalty, currency)}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Total Payable</div>
              <div className="font-semibold">{fmtMoney(totals.total, currency)}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Total Paid</div>
              <div className="font-semibold">{fmtMoney(totals.paid, currency)}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Outstanding</div>
              <div className="font-semibold">{fmtMoney(totals.outstanding, currency)}</div>
            </div>
          </div>
        </div>
      )}

      {/* schedule table */}
      {!!schedule.length && (
        <div className="overflow-auto rounded border shadow">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr className="text-left text-sm">
                <th className="p-2 border">#</th>
                <th className="p-2 border">Due Date</th>
                <th className="p-2 border">Principal</th>
                <th className="p-2 border">Interest</th>
                <th className="p-2 border">Penalty</th>
                <th className="p-2 border">Total</th>
                <th className="p-2 border">Balance</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {schedule.map((r, i) => {
                const idx = r.installment ?? r.period ?? i + 1;
                return (
                  <tr key={i} className={i % 2 ? 'bg-gray-50' : ''}>
                    <td className="border px-2 py-1">{idx}</td>
                    <td className="border px-2 py-1">{asDate(r.dueDate || r.date)}</td>
                    <td className="border px-2 py-1">{fmtMoney(r.principal, currency)}</td>
                    <td className="border px-2 py-1">{fmtMoney(r.interest, currency)}</td>
                    <td className="border px-2 py-1">{fmtMoney(r.penalty || 0, currency)}</td>
                    <td className="border px-2 py-1">
                      {fmtMoney(
                        r.total ??
                          (Number(r.principal || 0) +
                            Number(r.interest || 0) +
                            Number(r.penalty || 0)),
                        currency
                      )}
                    </td>
                    <td className="border px-2 py-1">
                      {r.balance != null ? fmtMoney(r.balance, currency) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && loanId && !schedule.length && (
        <p className="text-sm text-gray-600">No schedule found for this loan.</p>
      )}
    </div>
  );
}
