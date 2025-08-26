import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { CSVLink } from 'react-csv';
import api from '../api';
import BorrowerAutoComplete from '../components/inputs/BorrowerAutoComplete';

const Savings = () => {
  const [transactions, setTransactions] = useState([]);
  const [totals, setTotals] = useState({});
  const [balance, setBalance] = useState(0);
  const [filter, setFilter] = useState({ borrowerId: '', type: '' });
  const [showModal, setShowModal] = useState(false);
  const [newTx, setNewTx] = useState({ borrowerId: '', type: 'deposit', amount: '', date: '', notes: '' });
  const [error, setError] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = (user?.role || '').toLowerCase() === 'admin';

  const fetchData = async () => {
    setError('');
    try {
      if (!filter.borrowerId) {
        setTransactions([]); setBalance(0); setTotals({}); return;
      }
      const p = new URLSearchParams();
      if (filter.type) p.set('type', filter.type);
      const res = await api._get(`/savings/borrower/${filter.borrowerId}?${p.toString()}`);
      setTransactions(res.data.transactions || []);
      setBalance(res.data.balance || 0);
      setTotals(res.data.totals || {});
    } catch (err) {
      setError(err?.response?.data?.error || err?.normalizedMessage || 'Failed to fetch savings');
    }
  };

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [filter.borrowerId, filter.type]);

  const handleAddTransaction = async () => {
    setError('');
    try {
      const payload = { ...newTx };
      if (!payload.borrowerId || !payload.type || !payload.amount || !payload.date) {
        setError('Borrower, type, amount and date are required.'); return;
      }
      await api._post('/savings', payload);
      setShowModal(false);
      setNewTx({ borrowerId: '', type: 'deposit', amount: '', date: '', notes: '' });
      fetchData();
    } catch (err) {
      setError(err?.response?.data?.error || err?.normalizedMessage || 'Failed to save.');
    }
  };

  const handleReverse = async (id) => {
    if (!window.confirm('Reverse this transaction?')) return;
    try {
      await api._patch(`/savings/transactions/${id}/reverse`);
      fetchData();
    } catch (err) {
      setError(err?.response?.data?.error || err?.normalizedMessage || 'Failed to reverse.');
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

  const card = "bg-white dark:bg-slate-800 rounded-xl shadow p-4";

  return (
    <div className="p-0">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Savings</h2>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded">+ Add Transaction</button>
      </div>

      {/* Filters */}
      <div className={`${card} mb-4`}>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium mb-1">Borrower</label>
            <BorrowerAutoComplete
              value={filter.borrowerId || null}
              onChange={(id) => setFilter((f) => ({ ...f, borrowerId: id }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Type</label>
            <select
              value={filter.type}
              onChange={e => setFilter({ ...filter, type: e.target.value })}
              className="border px-3 py-2 rounded w-48 dark:bg-slate-700 dark:border-slate-600"
            >
              <option value="">All Types</option>
              <option value="deposit">Deposit</option>
              <option value="withdrawal">Withdrawal</option>
              <option value="charge">Charge</option>
              <option value="interest">Interest</option>
            </select>
          </div>
        </div>
        {error && <div className="text-sm text-rose-600 mt-3">Error: {error}</div>}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div className={card}>Balance: <strong>{balance}</strong></div>
        <div className={card}>Deposits: <strong>{totals.deposits || 0}</strong></div>
        <div className={card}>Withdrawals: <strong>{totals.withdrawals || 0}</strong></div>
        <div className={card}>Charges: <strong>{totals.charges || 0}</strong></div>
      </div>

      {/* Export */}
      <div className="flex gap-3 mb-3">
        <CSVLink data={csvData} filename="savings.csv" className="bg-green-600 text-white px-4 py-2 rounded">Export CSV</CSVLink>
        <button onClick={exportPDF} className="bg-red-600 text-white px-4 py-2 rounded">Export PDF</button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white dark:bg-slate-800 border rounded shadow">
        <table className="min-w-full">
          <thead className="bg-gray-100 dark:bg-slate-700">
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
                <td className="border p-2 capitalize">{tx.type}</td>
                <td className="border p-2">{tx.amount}</td>
                <td className="border p-2">{tx.notes || '-'}</td>
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
            {!transactions.length && (
              <tr>
                <td className="p-4 text-sm text-slate-500" colSpan={isAdmin ? 6 : 5}>
                  {filter.borrowerId ? 'No transactions found.' : 'Search and select a borrower to view transactions.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 p-6 rounded shadow-md w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Add Transaction</h3>
            <div className="space-y-3">
              <BorrowerAutoComplete
                value={newTx.borrowerId || null}
                onChange={(id) => setNewTx((t) => ({ ...t, borrowerId: id }))}
                placeholder="Pick borrower…"
              />
              <select
                value={newTx.type}
                onChange={e => setNewTx({ ...newTx, type: e.target.value })}
                className="border px-3 py-2 w-full rounded dark:bg-slate-800 dark:border-slate-700"
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
                className="border px-3 py-2 w-full rounded dark:bg-slate-800 dark:border-slate-700"
              />
              <input
                type="date"
                value={newTx.date}
                onChange={e => setNewTx({ ...newTx, date: e.target.value })}
                className="border px-3 py-2 w-full rounded dark:bg-slate-800 dark:border-slate-700"
              />
              <input
                type="text"
                placeholder="Notes"
                value={newTx.notes}
                onChange={e => setNewTx({ ...newTx, notes: e.target.value })}
                className="border px-3 py-2 w-full rounded dark:bg-slate-800 dark:border-slate-700"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
                <button onClick={handleAddTransaction} className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
              </div>
              {error && <div className="text-sm text-rose-600">Error: {error}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Savings;
