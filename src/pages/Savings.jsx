// src/pages/Savings.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { CSVLink } from 'react-csv';

const Savings = () => {
  const API = import.meta.env.VITE_API_BASE_URL;
  const [transactions, setTransactions] = useState([]);
  const [totals, setTotals] = useState({});
  const [balance, setBalance] = useState(0);
  const [filter, setFilter] = useState({ borrowerId: '', type: '', startDate: '', endDate: '' });
  const [showModal, setShowModal] = useState(false);
  const [newTx, setNewTx] = useState({ borrowerId: '', type: 'deposit', amount: '', date: '', notes: '' });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user?.role?.toLowerCase() === 'admin';

  const fetchData = async () => {
    try {
      let query = `?`;
      if (filter.borrowerId) query += `borrowerId=${filter.borrowerId}&`;
      if (filter.type) query += `type=${filter.type}&`;
      const res = await axios.get(`${API}/savings/borrower/${filter.borrowerId || 1}${query}`);
      setTransactions(res.data.transactions || []);
      setBalance(res.data.balance || 0);
      setTotals(res.data.totals || {});
    } catch (err) {
      console.error('Error loading savings:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filter]);

  const handleAddTransaction = async () => {
    try {
      await axios.post(`${API}/savings`, newTx);
      setShowModal(false);
      setNewTx({ borrowerId: '', type: 'deposit', amount: '', date: '', notes: '' });
      fetchData();
    } catch (err) {
      alert('Failed to save');
    }
  };

  const handleReverse = async (id) => {
    if (!window.confirm('Reverse this transaction?')) return;
    try {
      await axios.patch(`${API}/savings/${id}/reverse`);
      fetchData();
    } catch (err) {
      alert('Failed to reverse');
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text('Savings Transactions', 14, 16);
    doc.autoTable({
      startY: 20,
      head: [['Date', 'Type', 'Amount', 'Notes', 'Reversed']],
      body: transactions.map(tx => [
        tx.date, tx.type, tx.amount, tx.notes || '-', tx.reversed ? 'Yes' : 'No'
      ]),
    });
    doc.save('savings.pdf');
  };

  const csvData = [
    ['Date', 'Type', 'Amount', 'Notes', 'Reversed'],
    ...transactions.map(tx => [
      tx.date, tx.type, tx.amount, tx.notes || '', tx.reversed ? 'Yes' : 'No'
    ]),
  ];

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Savings</h2>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded">+ Add Transaction</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="number"
          placeholder="Borrower ID"
          value={filter.borrowerId}
          onChange={e => setFilter({ ...filter, borrowerId: e.target.value })}
          className="border px-2 py-1 rounded"
        />
        <select
          value={filter.type}
          onChange={e => setFilter({ ...filter, type: e.target.value })}
          className="border px-2 py-1 rounded"
        >
          <option value="">All Types</option>
          <option value="deposit">Deposit</option>
          <option value="withdrawal">Withdrawal</option>
          <option value="charge">Charge</option>
          <option value="interest">Interest</option>
        </select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div className="p-4 bg-white shadow rounded">Balance: <strong>{balance}</strong></div>
        <div className="p-4 bg-white shadow rounded">Deposits: <strong>{totals.deposits}</strong></div>
        <div className="p-4 bg-white shadow rounded">Withdrawals: <strong>{totals.withdrawals}</strong></div>
        <div className="p-4 bg-white shadow rounded">Charges: <strong>{totals.charges}</strong></div>
      </div>

      {/* Export */}
      <div className="flex gap-3 mb-3">
        <CSVLink
          data={csvData}
          filename="savings.csv"
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Export CSV
        </CSVLink>
        <button onClick={exportPDF} className="bg-red-600 text-white px-4 py-2 rounded">
          Export PDF
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border rounded shadow">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Date</th>
              <th className="p-2 border">Type</th>
              <th className="p-2 border">Amount</th>
              <th className="p-2 border">Notes</th>
              <th className="p-2 border">Reversed</th>
              {isAdmin && <th className="p-2 border">Action</th>}
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => (
              <tr key={tx.id}>
                <td className="border p-2">{tx.date}</td>
                <td className="border p-2">{tx.type}</td>
                <td className="border p-2">{tx.amount}</td>
                <td className="border p-2">{tx.notes}</td>
                <td className="border p-2">{tx.reversed ? 'Yes' : 'No'}</td>
                {isAdmin && (
                  <td className="border p-2">
                    {!tx.reversed && (
                      <button onClick={() => handleReverse(tx.id)} className="text-red-500 text-sm">
                        Reverse
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-md w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Add Transaction</h3>
            <div className="space-y-3">
              <input
                type="number"
                placeholder="Borrower ID"
                value={newTx.borrowerId}
                onChange={e => setNewTx({ ...newTx, borrowerId: e.target.value })}
                className="border px-3 py-2 w-full rounded"
              />
              <select
                value={newTx.type}
                onChange={e => setNewTx({ ...newTx, type: e.target.value })}
                className="border px-3 py-2 w-full rounded"
              >
                <option value="deposit">Deposit</option>
                <option value="withdrawal">Withdrawal</option>
                <option value="charge">Charge</option>
                <option value="interest">Interest</option>
              </select>
              <input
                type="number"
                placeholder="Amount"
                value={newTx.amount}
                onChange={e => setNewTx({ ...newTx, amount: e.target.value })}
                className="border px-3 py-2 w-full rounded"
              />
              <input
                type="date"
                value={newTx.date}
                onChange={e => setNewTx({ ...newTx, date: e.target.value })}
                className="border px-3 py-2 w-full rounded"
              />
              <input
                type="text"
                placeholder="Notes"
                value={newTx.notes}
                onChange={e => setNewTx({ ...newTx, notes: e.target.value })}
                className="border px-3 py-2 w-full rounded"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
                <button onClick={handleAddTransaction} className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Savings;
