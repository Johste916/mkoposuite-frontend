import React, { useEffect, useState } from 'react';
import axios from 'axios';

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

  useEffect(() => {
    fetchLoans();
    fetchBorrowers();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Loan Management</h2>

      <form onSubmit={handleSubmit} className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded shadow">
        <input
          type="number"
          placeholder="Amount"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          required
          className="border px-4 py-2 rounded"
        />
        <input
          type="number"
          placeholder="Interest Rate (%)"
          value={form.interestRate}
          onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
          required
          className="border px-4 py-2 rounded"
        />
        <input
          type="number"
          placeholder="Term (Months)"
          value={form.termMonths}
          onChange={(e) => setForm({ ...form, termMonths: e.target.value })}
          required
          className="border px-4 py-2 rounded"
        />
        <select
          value={form.borrowerId}
          onChange={(e) => setForm({ ...form, borrowerId: e.target.value })}
          required
          className="border px-4 py-2 rounded"
        >
          <option value="">Select Borrower</option>
          {borrowers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={form.startDate}
          onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          required
          className="border px-4 py-2 rounded"
        />
        <button type="submit" className="col-span-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
          {editingId ? 'Update Loan' : 'Create Loan'}
        </button>
      </form>

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
          {loans.map((loan) => (
            <tr key={loan.id}>
              <td className="border px-2">{loan.amount}</td>
              <td className="border px-2">{loan.interestRate}</td>
              <td className="border px-2">{loan.termMonths}</td>
              <td className="border px-2">{loan.startDate}</td>
              <td className="border px-2">{loan.Borrower?.name || 'N/A'}</td>
              <td className="border px-2 capitalize">{loan.status}</td>
              <td className="border px-2 text-center space-x-2">
                <button onClick={() => handleEdit(loan)} className="text-blue-600 hover:underline">Edit</button>
                <button onClick={() => handleDelete(loan.id)} className="text-red-600 hover:underline">Delete</button>
              </td>
            </tr>
          ))}
          {loans.length === 0 && (
            <tr>
              <td colSpan="7" className="text-center p-4">No loans found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Loans;
