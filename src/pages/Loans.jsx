import React, { useEffect, useState } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { CSVLink } from 'react-csv';
import { Link } from 'react-router-dom';

const Loans = () => {
  const [loans, setLoans] = useState([]);
  const [form, setForm] = useState({
    amount: '',
    interestRate: '',
    termMonths: '',
    borrowerId: '',
    startDate: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [borrowers, setBorrowers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');

  const API = import.meta.env.VITE_API_BASE_URL;

  const fetchLoans = async () => {
    try {
      const res = await axios.get(`${API}/loans`);
      setLoans(res.data);
    } catch (err) {
      console.error('Error fetching loans:', err);
    }
  };

  const fetchBorrowers = async () => {
    try {
      const res = await axios.get(`${API}/borrowers`);
      setBorrowers(res.data);
    } catch (err) {
      console.error('Error fetching borrowers:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${API}/loans/${editingId}`, form);
      } else {
        await axios.post(`${API}/loans`, form);
      }
      setForm({
        amount: '',
        interestRate: '',
        termMonths: '',
        borrowerId: '',
        startDate: '',
      });
      setEditingId(null);
      fetchLoans();
    } catch (err) {
      console.error('Error saving loan:', err);
    }
  };

  const handleEdit = (loan) => {
    setForm({
      amount: loan.amount,
      interestRate: loan.interestRate,
      termMonths: loan.termMonths,
      borrowerId: loan.borrowerId,
      startDate: loan.startDate ? loan.startDate.slice(0, 10) : '',
    });
    setEditingId(loan.id);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this loan?')) return;
    try {
      await axios.delete(`${API}/loans/${id}`);
      fetchLoans();
    } catch (err) {
      console.error('Error deleting loan:', err);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await axios.patch(`${API}/loans/${id}/status`, { status: newStatus });
      fetchLoans();
    } catch (err) {
      console.error(`Error updating loan status to ${newStatus}:`, err);
    }
  };

  const getStatusBadge = (status) => {
    const base = 'px-2 py-1 rounded text-xs font-semibold';
    switch (status) {
      case 'pending': return `${base} bg-yellow-100 text-yellow-700`;
      case 'approved': return `${base} bg-green-100 text-green-700`;
      case 'rejected': return `${base} bg-red-100 text-red-700`;
      case 'active': return `${base} bg-blue-100 text-blue-700`;
      case 'closed': return `${base} bg-gray-100 text-gray-700`;
      default: return `${base} bg-gray-200 text-gray-600`;
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text('Loan Report', 14, 16);
    doc.autoTable({
      startY: 20,
      head: [['Amount', 'Interest', 'Term', 'Start Date', 'Borrower', 'Status']],
      body: filteredLoans.map((l) => [
        l.amount,
        l.interestRate,
        l.termMonths,
        l.startDate,
        l.Borrower?.name || 'N/A',
        l.status
      ]),
    });
    doc.save('loans.pdf');
  };

  const filteredLoans = loans.filter((l) => statusFilter === 'all' || l.status === statusFilter);

  useEffect(() => {
    fetchLoans();
    fetchBorrowers();
  }, []);

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-2xl font-bold">Loan Management</h2>

      {/* Form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded shadow">
        <input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required className="border px-4 py-2 rounded" />
        <input type="number" placeholder="Interest Rate (%)" value={form.interestRate} onChange={(e) => setForm({ ...form, interestRate: e.target.value })} required className="border px-4 py-2 rounded" />
        <input type="number" placeholder="Term (Months)" value={form.termMonths} onChange={(e) => setForm({ ...form, termMonths: e.target.value })} required className="border px-4 py-2 rounded" />
        <select value={form.borrowerId} onChange={(e) => setForm({ ...form, borrowerId: e.target.value })} required className="border px-4 py-2 rounded">
          <option value="">Select Borrower</option>
          {borrowers.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required className="border px-4 py-2 rounded" />
        <button type="submit" className="col-span-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
          {editingId ? 'Update Loan' : 'Create Loan'}
        </button>
      </form>

      {/* Filters & Export */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border px-4 py-2 rounded">
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="active">Active</option>
          <option value="rejected">Rejected</option>
          <option value="closed">Closed</option>
        </select>
        <div className="flex gap-2">
          <CSVLink data={filteredLoans} filename={'loans.csv'} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            Export CSV
          </CSVLink>
          <button onClick={handleExportPDF} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
            Export PDF
          </button>
        </div>
      </div>

      {/* Loans Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded shadow table-auto border">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2 border">Amount</th>
              <th className="p-2 border">Interest Rate (%)</th>
              <th className="p-2 border">Term (Months)</th>
              <th className="p-2 border">Start Date</th>
              <th className="p-2 border">Borrower</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLoans.map((loan) => (
              <tr key={loan.id}>
                <td className="border px-2">{loan.amount}</td>
                <td className="border px-2">{loan.interestRate}</td>
                <td className="border px-2">{loan.termMonths}</td>
                <td className="border px-2">{loan.startDate}</td>
                <td className="border px-2">{loan.Borrower?.name || 'N/A'}</td>
                <td className="border px-2">
                  <span className={getStatusBadge(loan.status)}>{loan.status}</span>
                </td>
                <td className="border px-2 text-center space-x-2">
                  <Link to={`/loans/${loan.id}`} className="text-indigo-600 hover:underline">View</Link>
                  <button onClick={() => handleEdit(loan)} className="text-blue-600 hover:underline">Edit</button>
                  <button onClick={() => handleDelete(loan.id)} className="text-red-600 hover:underline">Delete</button>
                  {loan.status === 'pending' && (
                    <>
                      <button onClick={() => handleStatusUpdate(loan.id, 'approved')} className="text-green-600 hover:underline">Approve</button>
                      <button onClick={() => handleStatusUpdate(loan.id, 'rejected')} className="text-yellow-600 hover:underline">Reject</button>
                    </>
                  )}
                  {loan.status === 'approved' && (
                    <button onClick={() => handleStatusUpdate(loan.id, 'active')} className="text-indigo-600 hover:underline">Disburse</button>
                  )}
                </td>
              </tr>
            ))}
            {filteredLoans.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center p-4">No loans found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Loans;
