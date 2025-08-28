// src/pages/Reports.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
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

const TITLE_BY_PATH = {
  '/reports': 'Reports',
  '/reports/borrowers': 'Borrowers Report',
  '/reports/loans': 'Loan Report',
  '/reports/arrears-aging': 'Loan Arrears Aging',
  '/reports/collections': 'Collections Report',
  '/reports/collector': 'Collector Report',
  '/reports/deferred-income': 'Deferred Income',
  '/reports/deferred-income-monthly': 'Deferred Income (Monthly)',
  '/reports/pro-rata': 'Pro-Rata Collections',
  '/reports/disbursement': 'Disbursement Report',
  '/reports/fees': 'Fees Report',
  '/reports/loan-officer': 'Loan Officer Report',
  '/reports/loan-products': 'Loan Products Report',
  '/reports/mfrs': 'MFRS Ratios',
  '/reports/daily': 'Daily Report',
  '/reports/monthly': 'Monthly Report',
  '/reports/outstanding': 'Outstanding Report',
  '/reports/par': 'Portfolio At Risk (PAR)',
  '/reports/at-a-glance': 'At a Glance',
  '/reports/all': 'All Entries',
};

const Reports = () => {
  const location = useLocation();
  const pageTitle = TITLE_BY_PATH[location.pathname] || 'Reports';

  const [summary, setSummary] = useState({});
  const [loanSummary, setLoanSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [year] = useState(new Date().getFullYear());
  const [branches, setBranches] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [officerId, setOfficerId] = useState('');
  const [timeRange, setTimeRange] = useState('');
  const [loadingLoanSummary, setLoadingLoanSummary] = useState(true);

  useEffect(() => {
    fetchFilters();
    fetchSummary();
    fetchTrends();
  }, []);

  useEffect(() => {
    fetchLoanSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, officerId, timeRange]);

  const fetchFilters = async () => {
    try {
      const [branchesRes, officersRes] = await Promise.all([
        api.get('/branches'),
        api.get('/users', { params: { role: 'loan_officer' } }),
      ]);
      setBranches(Array.isArray(branchesRes.data) ? branchesRes.data : (branchesRes.data?.data || []));
      setOfficers(Array.isArray(officersRes.data) ? officersRes.data : (officersRes.data?.data || []));
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
      const res = await api.get('/reports/loan-summary', {
        params: { branchId: branchId || undefined, officerId: officerId || undefined, timeRange: timeRange || undefined },
      });
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
      const res = await api.get(`/reports/trends`, { params: { year } });
      setTrends(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error loading trends:', err);
    }
  };

  // Build export URLs using the same filters
  const exportParams = useMemo(() => {
    const params = new URLSearchParams();
    if (branchId) params.set('branchId', branchId);
    if (officerId) params.set('officerId', officerId);
    if (timeRange) params.set('timeRange', timeRange);
    return params.toString();
  }, [branchId, officerId, timeRange]);

  const exportCSV = () => {
    const base = import.meta.env.VITE_API_BASE_URL || api.defaults.baseURL || '';
    const qs = exportParams ? `?${exportParams}` : '';
    window.open(`${base}/reports/export/csv${qs}`, '_blank');
  };

  const exportPDF = () => {
    const base = import.meta.env.VITE_API_BASE_URL || api.defaults.baseURL || '';
    const qs = exportParams ? `?${exportParams}` : '';
    window.open(`${base}/reports/export/pdf${qs}`, '_blank');
  };

  const chartData = {
    labels: trends.map((d) => format(new Date(year, d.month - 1, 1), 'MMM')),
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
  };

  const handleExportLoanSummaryCSV = () => {
    if (!loanSummary) return;

    const csvRows = [
      ['Metric', 'Value'],
      ...Object.entries(loanSummary).map(([key, val]) => [key, typeof val === 'number' ? val : JSON.stringify(val)]),
    ];

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'loan_summary_report.csv';
    link.click();
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <FileText className="w-6 h-6 text-blue-600" />
        {pageTitle}
      </h1>

      {/* Top Summary Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-gray-500 text-sm">Total Loans Issued</h2>
          <p className="text-xl font-bold">{summary.loanCount || 0}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-gray-500 text-sm">Total Repayments</h2>
          <p className="text-xl font-bold">TZS {Number(summary.totalRepayments || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-gray-500 text-sm">Defaulters</h2>
          <p className="text-xl font-bold text-red-600">{summary.defaulterCount || 0}</p>
        </div>
      </div>

      {/* Filters for Loan Summary */}
      <div className="flex flex-wrap gap-4 pt-4">
        <select value={branchId} onChange={e => setBranchId(e.target.value)} className="border rounded px-3 py-2">
          <option value="">All Branches</option>
          {branches.map(branch => (
            <option key={branch.id} value={branch.id}>{branch.name}</option>
          ))}
        </select>

        <select value={officerId} onChange={e => setOfficerId(e.target.value)} className="border rounded px-3 py-2">
          <option value="">All Loan Officers</option>
          {officers.map(officer => (
            <option key={officer.id} value={officer.id}>{officer.name || officer.email}</option>
          ))}
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
      </div>

      {/* Loan Summary Report Table */}
      <div className="bg-white rounded shadow p-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold">Loan Summary Report</h2>
          {loanSummary && (
            <button
              onClick={handleExportLoanSummaryCSV}
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
                {Object.entries(loanSummary).map(([key, value]) => (
                  <tr key={key} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 capitalize">{key.replace(/([A-Z])/g, ' $1')}</td>
                    <td className="px-4 py-2 font-medium text-gray-800">
                      {typeof value === 'number' ? `TZS ${value.toLocaleString()}` : typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </td>
                  </tr>
                ))}
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
        <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, elements: { point: { radius: 2 } } }} height={260} />
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
