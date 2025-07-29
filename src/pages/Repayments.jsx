import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Repayments = () => {
  const [repayments, setRepayments] = useState([]);
  const API = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const fetchRepayments = async () => {
      try {
        const res = await axios.get(`${API}/repayments`);
        setRepayments(res.data);
      } catch (err) {
        console.error('Error fetching repayments:', err);
      }
    };
    fetchRepayments();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Loan Repayments</h2>

      <table className="min-w-full bg-white rounded shadow table-auto border">
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
          {repayments.map((r) => (
            <tr key={r.id}>
              <td className="border px-2">{r.Loan?.Borrower?.name || 'N/A'}</td>
              <td className="border px-2">TZS {r.Loan?.amount?.toLocaleString()}</td>
              <td className="border px-2">{r.installmentNumber}</td>
              <td className="border px-2">{r.dueDate}</td>
              <td className="border px-2">TZS {r.total}</td>
              <td className="border px-2">TZS {r.balance}</td>
              <td className="border px-2 capitalize">{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Repayments;
