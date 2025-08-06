// src/pages/LoanDetails.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import LoanScheduleModal from '../components/LoanScheduleModal';

const LoanDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const API = import.meta.env.VITE_API_BASE_URL;

  const [loan, setLoan] = useState(null);
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
    fetchLoan();
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
        <p><strong>Borrower:</strong> {loan.Borrower?.name}</p>
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
