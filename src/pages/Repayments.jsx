import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { CSVLink } from 'react-csv';

const Repayments = () => {
  const [repayments, setRepayments] = useState([]);
  const [loanFilter, setLoanFilter] = useState('all');
  const [loans, setLoans] = useState([]);
  const API = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    fetchRepayments();
    fetchLoans();
  }, []);

  const fetchRepayments = async () => {
    try {
      const res = await axios.get(`${API}/repayments`);
      setRepayments(res.data);
    } catch (err) {
      console.error('Error fetching repayments:', err);
    }
  };

  const fetchLoans = async () => {
    try {
      const res = await axios.get(`${API}/loans`);
      setLoans(res.data);
    } catch (err) {
      console.error('Error fetching loans:', err);
    }
  };

  const filtered = repayments.filter((r) =>
    loanFilter === 'all' ? true : r.loanId === parseInt(loanFilter)
  );

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text('Repayment Report', 14, 16);
    doc.autoTable({
      startY: 20,
      head: [['Borrower', 'Loan Amount', 'Installment', 'Due Date', 'Total', 'Balance', 'Status']],
      body: filtered.map((r) => [
        r.Loan?.Borrower?.name || 'N/A',
        r.Loan?.amount,
        r.installmentNumber,
        r.dueDate ? format(new Date(r.dueDate), 'yyyy-MM-dd') : '-',
        r.total,
        r.balance,
        r.status
      ])
    });
    doc.save('repayments.pdf');
  };

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-2xl font-bold">Loan Repayments</h2>

      {/* Filters and Export */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <select value={loanFilter} onChange={(e) => setLoanFilter(e.target.value)} className="border px-4 py-2 rounded">
          <option value="all">All Loans</option>
          {loans.map((l) => (
            <option key={l.id} value={l.id}>
              {l.Borrower?.name || 'Loan ' + l.id}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <CSVLink data={filtered} filename={'repayments.csv'} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            Export CSV
          </CSVLink>
          <button onClick={handleExportPDF} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
            Export PDF
          </button>
        </div>
      </div>

      {/* Repayments Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded shadow border">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2 border">Borrower</th>
              <th className="p-2 border">Loan Amount</th>
              <th className="p-2 border">Installment</th>
              <th className="p-2 border">Due Date</th>
              <th className="p-2 border">Total</th>
              <th className="p-2 border">Balance</th>
              <th className="p-2 border">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-2 border">{r.Loan?.Borrower?.name || 'N/A'}</td>
                <td className="px-2 border">TZS {Number(r.Loan?.amount).toLocaleString()}</td>
                <td className="px-2 border">{r.installmentNumber}</td>
                <td className="px-2 border">{r.dueDate ? format(new Date(r.dueDate), 'yyyy-MM-dd') : '-'}</td>
                <td className="px-2 border">TZS {Number(r.total).toLocaleString()}</td>
                <td className="px-2 border">TZS {Number(r.balance).toLocaleString()}</td>
                <td className="px-2 border capitalize">{r.status}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center p-4">No repayments found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Repayments;
