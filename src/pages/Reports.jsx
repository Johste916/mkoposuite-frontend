import React, { useEffect, useMemo, useState } from 'react';
import api from '../api';
import { format } from 'date-fns';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Legend,
  Tooltip,
} from 'chart.js';
import { Download, FileText } from 'lucide-react';

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Legend, Tooltip);

const currency = (n) => `TZS ${Number(n || 0).toLocaleString()}`;

const Reports = () => {
  // high-level summary cards
  const [summary, setSummary] = useState({ loanCount: 0, totalRepayments: 0, defaulterCount: 0 });

  // trends chart
  const [trends, setTrends] = useState([]);
  const [year] = useState(new Date().getFullYear());

  // filters
  const [branches, setBranches] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [borrowers, setBorrowers] = useState([]);

  const [branchId, setBranchId] = useState('');
  const [officerId, setOfficerId] = useState('');
  const [borrowerId, setBorrowerId] = useState('');

  const [timeRange, setTimeRange] = useState(''); // '', today, week, month, quarter, semiAnnual, annual, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // loan summary (scoped)
  const [loanSummary, setLoanSummary] = useState(null);
  const [loadingLoanSummary, setLoadingLoanSummary] = useState(true);

  // ---------- load base data ----------
  useEffect(() => {
    fetchFilters();
    fetchSummary();
    fetchTrends();
  }, []);

  // re-fetch loan summary when scope changes
  useEffect(() => {
    fetchLoanSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, officerId, borrowerId, timeRange, startDate, endDate]);

  const fetchFilters = async () => {
    try {
      const res = await api.get('/reports/filters');
      setBranches(res.data?.branches || []);
      setOfficers(res.data?.officers || []);
      setBorrowers(res.data?.borrowers || []);
    } catch (err) {
      console.error('Error loading filters:', err);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await api.get('/reports/summary');
      setSummary(res.data || {});
    } catch (err) {
      console.error('Error loading summary:', err);
    }
  };

  const fetchLoanSummary = async () => {
    setLoadingLoanSummary(true);
    try {
      const params = { branchId, officerId, borrowerId, timeRange };
      if (timeRange === 'custom') {
        params.startDate = startDate || '';
        params.endDate = endDate || '';
      }
      const res = await api.get('/reports/loan-summary', { params });
      setLoanSummary(res.data);
    } catch (err) {
      console.error('Error loading loan summary:', err);
      setLoanSummary(null);
    } finally {
      setLoadingLoanSummary(false);
    }
  };

  const fetchTrends = async () => {
    try {
      const res = await api.get(`/reports/trends?year=${year}`);
      setTrends(res.data || []);
    } catch (err) {
      console.error('Error loading trends:', err);
    }
  };

  const exportCSV = () => {
    // canonical path; server also exposes back-compat /reports/export-csv
    window.open(`${import.meta.env.VITE_API_BASE_URL}/reports/export/csv`, '_blank');
  };

  const exportPDF = () => {
    window.open(`${import.meta.env.VITE_API_BASE_URL}/reports/export/pdf`, '_blank');
  };

  const chartData = useMemo(() => ({
    labels: trends.map((d) => format(new Date(year, (d.month || 1) - 1, 1), 'MMM')),
    datasets: [
      {
        label: 'Loan Disbursed',
        data: trends.map((d) => d.loans),
        borderColor: 'rgba(75,192,192,1)',
        fill: false,
      },
      {
        label: 'Repayments Received',
        data: trends.map((d) => d.repayments),
        borderColor: 'rgba(153,102,255,1)',
        fill: false,
      },
    ],
  }), [trends, year]);

  const showCustomDates = timeRange === 'custom';

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <FileText className="w-6 h-6 text-blue-600" />
        Borrowers Report
      </h1>

      {/* Top Summary Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-gray-500 text-sm">Total Loans Issued</h2>
          <p className="text-xl font-bold">{summary.loanCount || 0}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-gray-500 text-sm">Total Repayments</h2>
          <p className="text-xl font-bold">{currency(summary.totalRepayments)}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-gray-500 text-sm">Defaulters</h2>
          <p className="text-xl font-bold text-red-600">{summary.defaulterCount || 0}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 pt-4 items-end">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Branch</label>
          <select value={branchId} onChange={e => setBranchId(e.target.value)} className="border rounded px-3 py-2 min-w-[180px]">
            <option value="">All Branches</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1">Loan Officer</label>
          <select value={officerId} onChange={e => setOfficerId(e.target.value)} className="border rounded px-3 py-2 min-w-[200px]">
            <option value="">All Loan Officers</option>
            {officers.map(o => <option key={o.id} value={o.id}>{o.name || o.email}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1">Borrower</label>
          <select value={borrowerId} onChange={e => setBorrowerId(e.target.value)} className="border rounded px-3 py-2 min-w-[220px]">
            <option value="">All Borrowers</option>
            {borrowers.map(br => <option key={br.id} value={br.id}>{br.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1">Period</label>
          <select value={timeRange} onChange={e => setTimeRange(e.target.value)} className="border rounded px-3 py-2">
            <option value="">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="semiAnnual">Semi-Annual</option>
            <option value="annual">Annual</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {showCustomDates && (
          <>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border rounded px-3 py-2" />
            </div>
          </>
        )}
      </div>

      {/* Loan Summary Report */}
      <div className="bg-white rounded shadow p-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold">Loan Summary Report</h2>
          {loanSummary && (
            <button
              onClick={() => {
                const csvRows = [
                  ['Metric', 'Value'],
                  ['Total Loans Count', loanSummary.totalLoansCount || 0],
                  ['Total Disbursed', loanSummary.totalDisbursed || 0],
                  ['Total Repayments', loanSummary.totalRepayments || 0],
                  ['Outstanding Balance', loanSummary.outstandingBalance || 0],
                  ['Arrears Count', loanSummary.arrearsCount || 0],
                  ['Arrears Amount', loanSummary.arrearsAmount || 0],
                  ['Period', loanSummary.period || 'all'],
                  ['Scope', loanSummary.scope || ''],
                ];
                const csvContent = csvRows.map(row => row.join(',')).join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'loan_summary_report.csv';
                link.click();
              }}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          )}
        </div>

        {loadingLoanSummary ? (
          <p className="text-gray-500">🔄 Loading...</p>
        ) : loanSummary ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-gray-700 text-left">
                <tr>
                  <th className="px-4 py-2">Metric</th>
                  <th className="px-4 py-2">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">Total Loans Count</td>
                  <td className="px-4 py-2 font-medium">{loanSummary.totalLoansCount || 0}</td>
                </tr>
                <tr className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">Total Disbursed</td>
                  <td className="px-4 py-2 font-medium text-gray-800">{currency(loanSummary.totalDisbursed)}</td>
                </tr>
                <tr className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">Total Repayments</td>
                  <td className="px-4 py-2 font-medium text-gray-800">{currency(loanSummary.totalRepayments)}</td>
                </tr>
                <tr className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">Outstanding Balance</td>
                  <td className="px-4 py-2 font-medium text-gray-800">{currency(loanSummary.outstandingBalance)}</td>
                </tr>
                <tr className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">Arrears Count</td>
                  <td className="px-4 py-2 font-medium">{loanSummary.arrearsCount || 0}</td>
                </tr>
                <tr className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">Arrears Amount</td>
                  <td className="px-4 py-2 font-medium text-gray-800">{currency(loanSummary.arrearsAmount)}</td>
                </tr>
                <tr className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">Period</td>
                  <td className="px-4 py-2 font-medium">{loanSummary.period || 'all'}</td>
                </tr>
                <tr className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">Scope</td>
                  {/* FIX: show pretty scope text, not a JSON blob */}
                  <td className="px-4 py-2 font-medium">{loanSummary.scope || ''}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-red-600">⚠️ No data found.</p>
        )}
      </div>

      {/* Chart */}
      <div className="bg-white rounded shadow p-4">
        <h2 className="text-lg font-semibold mb-2">Monthly Trend - {year}</h2>
        <Line data={chartData} />
      </div>

      {/* Export Buttons */}
      <div className="flex gap-4">
        <button onClick={exportCSV} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Export Full CSV
        </button>
        <button onClick={exportPDF} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
          Export Full PDF
        </button>
      </div>
    </div>
  );
};

export default Reports;
