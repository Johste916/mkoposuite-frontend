// src/pages/BorrowerDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { CSVLink } from 'react-csv';
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
    return savings.filter(tx => tx.type === type).reduce((total, tx) => total + tx.amount, 0);
  };

  const buildTimeline = () => {
    const items = [];
    loans.forEach(l => items.push({ type: 'loan', date: l.createdAt, text: `Loan ${l.id} - ${l.status.toUpperCase()}` }));
    repayments.forEach(r => items.push({ type: 'repayment', date: r.date, text: `Repayment of TZS ${r.amount.toLocaleString()}` }));
    savings.forEach(s => items.push({ type: 'savings', date: s.date, text: `${s.type} of TZS ${s.amount.toLocaleString()}` }));
    comments.forEach(c => items.push({ type: 'comment', date: c.createdAt, text: `Note: ${c.content}` }));
    return items.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const getStatusBadge = (status) => {
    const base = "px-2 py-1 text-xs font-semibold rounded";
    switch (status) {
      case 'pending': return `${base} bg-yellow-100 text-yellow-700`;
      case 'approved': return `${base} bg-green-100 text-green-700`;
      case 'rejected': return `${base} bg-red-100 text-red-700`;
      case 'active': return `${base} bg-blue-100 text-blue-700`;
      case 'closed': return `${base} bg-gray-200 text-gray-700`;
      default: return `${base} bg-gray-100 text-gray-600`;
    }
  };

  const deposits = summarizeSavings('deposit');
  const withdrawals = summarizeSavings('withdrawal');
  const charges = summarizeSavings('charge');
  const interest = summarizeSavings('interest');

  if (!borrower) return <div className="p-4">Loading...</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Borrower Details</h2>
        <div className="flex gap-2">
          <CSVLink
            data={[borrower]}
            filename={`borrower-${borrower.id}.csv`}
            className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700 text-sm"
          >
            Export CSV
          </CSVLink>
          <button
            onClick={() => {
              const doc = new jsPDF();
              doc.text(`Borrower Profile: ${borrower.name}`, 14, 16);
              doc.autoTable({
                startY: 20,
                head: [['Field', 'Value']],
                body: Object.entries(borrower).map(([k, v]) => [k, String(v)]),
              });
              doc.save(`borrower-${borrower.id}.pdf`);
            }}
            className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 text-sm"
          >
            Export PDF
          </button>
        </div>
      </div>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
        <h4 className="font-semibold text-yellow-700 mb-1">⚠️ Risk Summary</h4>
        <p><strong>Overdue Amount:</strong> TZS {borrower.overdueAmount?.toLocaleString() || '0'}</p>
        <p><strong>PAR:</strong> {borrower.parPercent ? borrower.parPercent + '%' : '0%'}</p>
      </div>

      <div>
        <h4 className="font-semibold mb-2">📜 Activity Timeline</h4>
        <ul className="space-y-2 text-sm">
          {buildTimeline().map((item, i) => (
            <li key={i} className="border-l-4 pl-2 border-gray-300">
              <span className="text-gray-500">{new Date(item.date).toLocaleDateString()}</span> – {item.text}
            </li>
          ))}
        </ul>
      </div>

      {/* ... existing savings tab and UI continues here ... */}
    </div>
  );
};

export default BorrowerDetails;
