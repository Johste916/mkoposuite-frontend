// src/pages/Reports.jsx
import React, { useEffect, useState } from 'react';
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

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Legend, Tooltip);

const Reports = () => {
  const [summary, setSummary] = useState({});
  const [trends, setTrends] = useState([]);
  const [year] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchSummary();
    fetchTrends();
  }, []);

  const fetchSummary = async () => {
    try {
      const res = await api.get('/reports/summary');
      setSummary(res.data);
    } catch (err) {
      console.error('Error loading summary:', err);
    }
  };

  const fetchTrends = async () => {
    try {
      const res = await api.get(`/reports/trends?year=${year}`);
      setTrends(res.data);
    } catch (err) {
      console.error('Error loading trends:', err);
    }
  };

  const exportCSV = () => {
    window.open(`${import.meta.env.VITE_API_BASE_URL}/reports/export-csv`, '_blank');
  };

  const exportPDF = () => {
    window.open(`${import.meta.env.VITE_API_BASE_URL}/reports/export-pdf`, '_blank');
  };

  const chartData = {
    labels: trends.map((d) => format(new Date(2023, d.month - 1, 1), 'MMM')),
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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Reports</h1>

      {/* Summary Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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

      {/* Chart */}
      <div className="bg-white rounded shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-2">Monthly Trend - {year}</h2>
        <Line data={chartData} />
      </div>

      {/* Export Buttons */}
      <div className="flex space-x-4">
        <button
          onClick={exportCSV}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Export CSV
        </button>
        <button
          onClick={exportPDF}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Export PDF
        </button>
      </div>
    </div>
  );
};

export default Reports;
