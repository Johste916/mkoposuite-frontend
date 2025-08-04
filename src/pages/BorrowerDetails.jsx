// src/pages/BorrowerDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { getUserRole } from '../utils/auth';
import LoanScheduleModal from '../components/LoanScheduleModal';

const BorrowerDetails = () => {
  const { id } = useParams();
  const API = import.meta.env.VITE_API_BASE_URL;
  const userRole = getUserRole();

  const [borrower, setBorrower] = useState(null);
  const [loans, setLoans] = useState([]);
  const [repayments, setRepayments] = useState([]);
  const [comments, setComments] = useState([]);
  const [tab, setTab] = useState('overview');
  const [newComment, setNewComment] = useState('');
  const [form, setForm] = useState({});
  const [showRepaymentModal, setShowRepaymentModal] = useState(false);
  const [repaymentForm, setRepaymentForm] = useState({
    loanId: '',
    amount: '',
    method: 'manual',
    date: new Date().toISOString().split('T')[0],
  });

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);

  const [savings, setSavings] = useState([]);
  const [filteredSavings, setFilteredSavings] = useState([]);
  const [savingsBalance, setSavingsBalance] = useState(0);
  const [savingsForm, setSavingsForm] = useState({
    type: 'deposit',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const borrowerRes = await axios.get(`${API}/borrowers/${id}`);
        setBorrower(borrowerRes.data);
        setForm(borrowerRes.data);

        const loanRes = await axios.get(`${API}/loans/borrower/${id}`);
        setLoans(loanRes.data);

        const repayRes = await axios.get(`${API}/repayments/borrower/${id}`);
        setRepayments(repayRes.data);

        const commentRes = await axios.get(`${API}/comments/borrower/${id}`);
        setComments(commentRes.data);

        const savingsRes = await axios.get(`${API}/savings/borrower/${id}`);
        setSavings(savingsRes.data.transactions);
        setSavingsBalance(savingsRes.data.balance);
        setFilteredSavings(savingsRes.data.transactions);
      } catch (err) {
        console.error(err);
      }
    };

    fetchData();
  }, [id]);

  useEffect(() => {
    if (filterType === 'all') {
      setFilteredSavings(savings);
    } else {
      setFilteredSavings(savings.filter(tx => tx.type === filterType));
    }
  }, [filterType, savings]);

  const handleAddComment = async () => {
    if (!newComment) return;
    try {
      await axios.post(`${API}/comments`, {
        borrowerId: id,
        content: newComment,
      });
      setComments([...comments, { content: newComment, createdAt: new Date().toISOString() }]);
      setNewComment('');
    } catch (err) {
      console.error('Error adding comment', err);
    }
  };

  const handleUpdate = async () => {
    try {
      await axios.put(`${API}/borrowers/${id}`, form);
      setBorrower(form);
    } catch (err) {
      console.error('Error updating borrower', err);
    }
  };

  const submitRepayment = async () => {
    try {
      await axios.post(`${API}/repayments`, {
        ...repaymentForm,
        borrowerId: id,
      });
      setShowRepaymentModal(false);
      setRepaymentForm({
        loanId: '',
        amount: '',
        method: 'manual',
        date: new Date().toISOString().split('T')[0],
      });
      const repayRes = await axios.get(`${API}/repayments/borrower/${id}`);
      setRepayments(repayRes.data);
    } catch (err) {
      alert('Error saving repayment. Only Admins are allowed.');
    }
  };

  const handleViewSchedule = async (loanId) => {
    try {
      const res = await axios.get(`${API}/loans/${loanId}/schedule`);
      setSelectedSchedule(res.data);
      const loan = loans.find((l) => l.id === loanId);
      setSelectedLoan(loan);
      setShowScheduleModal(true);
    } catch (err) {
      console.error('Error fetching loan schedule:', err);
    }
  };

  const summarizeSavings = (type) => {
    return savings
      .filter(tx => tx.type === type)
      .reduce((total, tx) => total + tx.amount, 0);
  };

  const deposits = summarizeSavings('deposit');
  const withdrawals = summarizeSavings('withdrawal');
  const charges = summarizeSavings('charge');
  const interest = summarizeSavings('interest');

  if (!borrower) return <div className="p-4">Loading...</div>;

  return (
    <div className="p-4 space-y-4">
      {/* ... existing UI omitted for brevity ... */}

      {tab === 'savings' && (
        <div className="bg-white p-4 rounded shadow space-y-4">
          <h3 className="text-xl font-bold">Savings Account</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <p><strong>Current Balance:</strong> TZS {savingsBalance.toLocaleString()}</p>
            <div className="text-sm text-gray-700">
              <p>Total Deposits: <strong className="text-green-600">TZS {deposits.toLocaleString()}</strong></p>
              <p>Total Withdrawals: <strong className="text-red-600">TZS {withdrawals.toLocaleString()}</strong></p>
              <p>Total Charges: <strong className="text-yellow-600">TZS {charges.toLocaleString()}</strong></p>
              <p>Total Interest: <strong className="text-blue-600">TZS {interest.toLocaleString()}</strong></p>
            </div>
          </div>

          {userRole === 'Admin' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded border">
              <select
                value={savingsForm.type}
                onChange={(e) => setSavingsForm({ ...savingsForm, type: e.target.value })}
                className="border p-2 rounded"
              >
                <option value="deposit">Deposit</option>
                <option value="withdrawal">Withdrawal</option>
              </select>
              <input
                type="number"
                placeholder="Amount"
                className="border p-2 rounded"
                value={savingsForm.amount}
                onChange={(e) => setSavingsForm({ ...savingsForm, amount: e.target.value })}
              />
              <input
                type="date"
                className="border p-2 rounded"
                value={savingsForm.date}
                onChange={(e) => setSavingsForm({ ...savingsForm, date: e.target.value })}
              />
              <input
                type="text"
                placeholder="Notes"
                className="border p-2 rounded"
                value={savingsForm.notes}
                onChange={(e) => setSavingsForm({ ...savingsForm, notes: e.target.value })}
              />
              <button
                onClick={async () => {
                  try {
                    await axios.post(`${API}/savings`, {
                      ...savingsForm,
                      borrowerId: id,
                    });
                    const res = await axios.get(`${API}/savings/borrower/${id}`);
                    setSavings(res.data.transactions);
                    setSavingsBalance(res.data.balance);
                    setSavingsForm({
                      type: 'deposit',
                      amount: '',
                      date: new Date().toISOString().split('T')[0],
                      notes: '',
                    });
                  } catch (err) {
                    alert('Error saving savings transaction (Admins only)');
                    console.error(err);
                  }
                }}
                className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 col-span-full"
              >
                Save Transaction
              </button>
            </div>
          )}

          <div className="flex justify-end mt-4">
            <label className="mr-2">Filter by Type:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border px-2 py-1 rounded"
            >
              <option value="all">All</option>
              <option value="deposit">Deposits</option>
              <option value="withdrawal">Withdrawals</option>
              <option value="charge">Charges</option>
              <option value="interest">Interest</option>
            </select>
          </div>

          <h4 className="font-bold mt-6">Transaction History</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border mt-2">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-2 py-1">Date</th>
                  <th className="border px-2 py-1">Type</th>
                  <th className="border px-2 py-1">Amount</th>
                  <th className="border px-2 py-1">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredSavings.map((tx, i) => (
                  <tr key={i}>
                    <td className="border px-2 py-1">{tx.date}</td>
                    <td className="border px-2 py-1 capitalize">{tx.type}</td>
                    <td className="border px-2 py-1">TZS {tx.amount.toLocaleString()}</td>
                    <td className="border px-2 py-1">{tx.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ... existing tabs and modals ... */}
    </div>
  );
};

export default BorrowerDetails;
