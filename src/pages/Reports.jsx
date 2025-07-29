import React, { useEffect, useState } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { CSVLink } from 'react-csv';

const Reports = () => {
  const [summary, setSummary] = useState({});
  const API = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await axios.get(`${API}/dashboard/summary`);
        setSummary(res.data);
      } catch (err) {
        console.error('Error fetching summary:', err);
      }
    };
    fetchSummary();
  }, []);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text('MkopoSuite Summary Report', 14, 16);
    doc.autoTable({
      startY: 20,
      head: [['Metric', 'Value']],
      body: [
        ['Total Borrowers', summary.totalBorrowers || 0],
        ['Total Loans', summary.totalLoans || 0],
        ['Total Paid', `TZS ${summary.totalPaid?.toLocaleString() || 0}`],
        ['Total Outstanding', `TZS ${summary.totalRepaid?.toLocaleString() || 0}`],
      ],
    });
    doc.save('summary-report.pdf');
  };

  const csvData = [
    ['Metric', 'Value'],
    ['Total Borrowers', summary.totalBorrowers || 0],
    ['Total Loans', summary.totalLoans || 0],
    ['Total Paid', summary.totalPaid || 0],
    ['Total Outstanding', summary.totalRepaid || 0],
  ];

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Reports</h2>

      <table className="min-w-full bg-white rounded shadow table-auto border mb-4">
        <thead className="bg-gray-200">
          <tr>
            <th className="p-2 border">Metric</th>
            <th className="p-2 border">Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border px-2">Total Borrowers</td>
            <td className="border px-2">{summary.totalBorrowers || 0}</td>
          </tr>
          <tr>
            <td className="border px-2">Total Loans</td>
            <td className="border px-2">{summary.totalLoans || 0}</td>
          </tr>
          <tr>
            <td className="border px-2">Total Paid</td>
            <td className="border px-2">TZS {summary.totalPaid?.toLocaleString() || 0}</td>
          </tr>
          <tr>
            <td className="border px-2">Total Outstanding</td>
            <td className="border px-2">TZS {summary.totalRepaid?.toLocaleString() || 0}</td>
          </tr>
        </tbody>
      </table>

      <div className="space-x-2">
        <CSVLink
          data={csvData}
          filename={'report.csv'}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Export CSV
        </CSVLink>
        <button onClick={handleExportPDF} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
          Export PDF
        </button>
      </div>
    </div>
  );
};

export default Reports;
