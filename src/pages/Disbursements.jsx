// src/pages/Disbursements.jsx
import React, { useEffect, useState } from 'react';
import api from '../api';
import { getUserRole } from '../utils/auth';
import { format } from 'date-fns';
import { CSVLink } from 'react-csv';

const cls = {
  container: 'w-full px-4 md:px-6 lg:px-8 py-6 text-slate-900',
  h1: 'text-3xl font-extrabold tracking-tight',
  card: 'rounded-2xl border-2 border-slate-300 bg-white shadow',
  input: 'h-10 rounded-lg border-2 border-slate-300 px-3 outline-none focus:ring-2 focus:ring-indigo-500/40',
  select: 'h-10 rounded-lg border-2 border-slate-300 px-3 outline-none focus:ring-2 focus:ring-indigo-500/40',
  btn: 'inline-flex items-center justify-center rounded-lg border-2 border-slate-300 px-3 py-2 hover:bg-slate-50',
  primary: 'inline-flex items-center rounded-lg bg-blue-600 text-white px-3 py-2 font-semibold hover:bg-blue-700',
  warn: 'inline-flex items-center rounded-lg bg-amber-600 text-white px-3 py-1.5 hover:bg-amber-700',
  good: 'inline-flex items-center rounded-lg bg-emerald-600 text-white px-3 py-1.5 hover:bg-emerald-700',
  muted: 'text-slate-600',
  alert: 'rounded-2xl border-2 border-rose-300 bg-rose-50 px-4 py-3 text-rose-800',
  info: 'rounded-2xl border-2 border-slate-300 bg-white px-4 py-3',
  tableWrap: 'overflow-x-auto rounded-2xl border-2 border-slate-300 bg-white shadow',
  table: 'min-w-full table-auto',
  th: 'bg-slate-100 text-left text-[13px] uppercase tracking-wide text-slate-700 font-semibold px-3 py-2 border-2 border-slate-200',
  td: 'px-3 py-2 border-2 border-slate-200 text-sm',
  paginator: 'mt-4 rounded-2xl border-2 border-slate-300 bg-white shadow px-3 py-2 flex items-center justify-between',
  chipBase: 'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ring-1',
};
const chip = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'approved') return `${cls.chipBase} bg-amber-50 text-amber-700 ring-amber-200`;
  if (s === 'disbursed') return `${cls.chipBase} bg-emerald-50 text-emerald-700 ring-emerald-200`;
  return `${cls.chipBase} bg-slate-100 text-slate-700 ring-slate-200`;
};

const Disbursements = () => {
  const userRole = getUserRole();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const loansPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(loans.length / loansPerPage));
  const indexOfLast = currentPage * loansPerPage;
  const indexOfFirst = indexOfLast - loansPerPage;
  const paginatedLoans = loans.slice(indexOfFirst, indexOfLast);

  const canApprove = ['Manager', 'Director', 'Admin'].includes(userRole);
  const canDisburse = ['Accountant', 'Admin'].includes(userRole);

  useEffect(() => {
    fetchLoans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/loans/disbursements');
      let data = Array.isArray(res.data) ? res.data : res.data?.items || res.data?.data || [];
      if (filter !== 'all') {
        data = data.filter((loan) => String(loan.status || '').toLowerCase() === filter);
      }
      if (search) {
        const q = search.toLowerCase();
        data = data.filter((loan) => (loan.borrower?.name || '').toLowerCase().includes(q));
      }
      setLoans(data);
      setCurrentPage(1);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to load loans');
      setLoans([]);
    } finally {
      setLoading(false);
    }
  };

  const updateLoanStatus = async (loanId, status) => {
    try {
      setActionLoading(true);
      await api.put(`/loans/${loanId}/status`, { status });
      await fetchLoans();
    } catch (err) {
      console.error('Status update error:', err);
      alert('Failed to update loan status');
    } finally {
      setActionLoading(false);
    }
  };

  const headers = [
    { label: 'Borrower', key: 'borrower.name' },
    { label: 'Amount', key: 'amount' },
    { label: 'Currency', key: 'currency' },
    { label: 'Status', key: 'status' },
    { label: 'Start Date', key: 'startDate' },
    { label: 'Term (months)', key: 'termMonths' },
    { label: 'Repayment Method', key: 'interestMethod' },
    { label: 'Branch', key: 'branch.name' },
    { label: 'Initiated By', key: 'initiator.name' },
  ];

  return (
    <div className={cls.container}>
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <h1 className={cls.h1}>Loan Disbursements</h1>

        <div className={`${cls.card} p-3`}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              placeholder="Search borrower…"
              className={cls.input}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchLoans()}
            />
            <select
              className={cls.select}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="disbursed">Disbursed</option>
            </select>
            <button className={cls.btn} onClick={fetchLoans}>Apply</button>
            <CSVLink
              data={loans}
              headers={headers}
              filename="loan-disbursements.csv"
              className={cls.primary}
            >
              Export CSV
            </CSVLink>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {loading && <div className={cls.info}>Loading…</div>}
      {error && <div className={cls.alert}>{error}</div>}

      {/* Table */}
      {!loading && !error && (
        <>
          <div className={cls.tableWrap}>
            <table className={cls.table}>
              <thead>
                <tr>
                  <th className={cls.th}>Borrower</th>
                  <th className={cls.th}>Amount</th>
                  <th className={cls.th}>Currency</th>
                  <th className={cls.th}>Status</th>
                  <th className={cls.th}>Start Date</th>
                  <th className={cls.th}>Term</th>
                  <th className={cls.th}>Method</th>
                  <th className={cls.th}>Branch</th>
                  <th className={cls.th}>Initiator</th>
                  <th className={cls.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLoans.length === 0 ? (
                  <tr>
                    <td className={cls.td} colSpan={10}>
                      <span className={cls.muted}>No results.</span>
                    </td>
                  </tr>
                ) : (
                  paginatedLoans.map((loan) => (
                    <tr key={loan.id}>
                      <td className={cls.td}>{loan.borrower?.name || 'Unknown'}</td>
                      <td className={cls.td}>{Number(loan.amount || 0).toLocaleString()}</td>
                      <td className={cls.td}>{loan.currency}</td>
                      <td className={cls.td}>
                        <span className={chip(loan.status)}>{String(loan.status || '').toUpperCase()}</span>
                      </td>
                      <td className={cls.td}>
                        {loan.startDate ? format(new Date(loan.startDate), 'yyyy-MM-dd') : '-'}
                      </td>
                      <td className={cls.td}>{loan.termMonths || '-'}</td>
                      <td className={cls.td} style={{ textTransform: 'capitalize' }}>
                        {loan.interestMethod || '-'}
                      </td>
                      <td className={cls.td}>{loan.branch?.name || '-'}</td>
                      <td className={cls.td}>{loan.initiator?.name || '-'}</td>
                      <td className={cls.td}>
                        <div className="flex flex-wrap gap-2">
                          {loan.status === 'pending' && canApprove && (
                            <button
                              onClick={() => updateLoanStatus(loan.id, 'approved')}
                              className={cls.warn}
                              disabled={actionLoading}
                            >
                              Approve
                            </button>
                          )}
                          {loan.status === 'approved' && canDisburse && (
                            <button
                              onClick={() => updateLoanStatus(loan.id, 'disbursed')}
                              className={cls.good}
                              disabled={actionLoading}
                            >
                              Disburse
                            </button>
                          )}
                          {!['pending', 'approved'].includes(String(loan.status || '')) && (
                            <span className="text-slate-500">Done</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className={cls.paginator}>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className={`${cls.btn} disabled:opacity-50`}
            >
              Previous
            </button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className={`${cls.btn} disabled:opacity-50`}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Disbursements;
