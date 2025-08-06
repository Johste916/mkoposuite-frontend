// ✅ Updated LoanDetails.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import LoanScheduleModal from '../components/LoanScheduleModal';

const LoanDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const API = import.meta.env.VITE_API_BASE_URL;

  const [loan, setLoan] = useState(null);
  const [repayments, setRepayments] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [schedule, setSchedule] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  useEffect(() => {
    const fetchLoan = async () => {
      try {
        const res = await axios.get(`${API}/loans/${id}`);
        setLoan(res.data);
      } catch (err) {
        console.error('Failed to fetch loan:', err);
      }
    };

    const fetchRepayments = async () => {
      try {
        const res = await axios.get(`${API}/repayments/loan/${id}`);
        setRepayments(res.data);
      } catch (err) {
        console.error('Failed to fetch repayments:', err);
      }
    };

    const fetchComments = async () => {
      try {
        const res = await axios.get(`${API}/comments/loan/${id}`);
        setComments(res.data);
      } catch (err) {
        console.error('Failed to fetch comments:', err);
      }
    };

    fetchLoan();
    fetchRepayments();
    fetchComments();
  }, [id]);

  const handleGenerateSchedule = async () => {
    try {
      const res = await axios.get(`${API}/loans/${id}/schedule`);
      setSchedule(res.data);
      setShowScheduleModal(true);
    } catch (err) {
      console.error('Failed to load schedule:', err);
    }
  };

  const handleMarkAsClosed = async () => {
    if (!confirm('Mark this loan as closed?')) return;
    try {
      await axios.patch(`${API}/loans/${id}/status`, { status: 'closed' });
      const res = await axios.get(`${API}/loans/${id}`);
      setLoan(res.data);
      alert('Loan marked as closed.');
    } catch (err) {
      console.error('Failed to mark as closed:', err);
    }
  };

  const handleAddComment = async () => {
    if (!newComment) return;
    try {
      await axios.post(`${API}/comments`, {
        loanId: id,
        content: newComment,
      });
      setComments([...comments, { content: newComment, createdAt: new Date().toISOString() }]);
      setNewComment('');
    } catch (err) {
      console.error('Error adding comment', err);
    }
  };

  if (!loan) return <div className="p-4">Loading...</div>;

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Loan Details</h2>
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline">
          &larr; Back
        </button>
      </div>

      <div className="bg-white p-4 rounded shadow space-y-2">
        <h3 className="text-xl font-semibold text-gray-800">Loan Summary</h3>
        <p><strong>Borrower:</strong> <Link className="text-blue-600 hover:underline" to={`/borrowers/${loan.borrowerId}`}>{loan.Borrower?.name}</Link></p>
        <p><strong>Amount:</strong> TZS {loan.amount.toLocaleString()}</p>
        <p><strong>Interest Rate:</strong> {loan.interestRate}%</p>
        <p><strong>Term:</strong> {loan.termMonths} months</p>
        <p><strong>Start Date:</strong> {loan.startDate}</p>
        <p><strong>Status:</strong> <span className="capitalize font-semibold">{loan.status}</span></p>
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleGenerateSchedule}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          View Loan Schedule
        </button>
        {loan.status !== 'closed' && (
          <button
            onClick={handleMarkAsClosed}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Mark as Closed
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h3 className="text-lg font-semibold mb-2">Repayments</h3>
        {repayments.length === 0 ? (
          <p>No repayments found.</p>
        ) : (
          <table className="min-w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1">Date</th>
                <th className="border px-2 py-1">Amount</th>
                <th className="border px-2 py-1">Method</th>
              </tr>
            </thead>
            <tbody>
              {repayments.map((r, i) => (
                <tr key={i}>
                  <td className="border px-2 py-1">{r.date}</td>
                  <td className="border px-2 py-1">TZS {r.amount.toLocaleString()}</td>
                  <td className="border px-2 py-1">{r.method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h3 className="text-lg font-semibold mb-2">Comments</h3>
        <div className="space-y-2 mb-4">
          {comments.map((c, i) => (
            <div key={i} className="text-sm border-b pb-1">
              <p>{c.content}</p>
              <span className="text-gray-400 text-xs">{new Date(c.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="border rounded px-2 py-1 w-full"
            placeholder="Add a comment"
          />
          <button onClick={handleAddComment} className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700">
            Post
          </button>
        </div>
      </div>

      <LoanScheduleModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        schedule={schedule}
        loan={loan}
      />
    </div>
  );
};

export default LoanDetails;
