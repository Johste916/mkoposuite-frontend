import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';

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
            {repayments.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-2 border">
                  {r.Loan?.Borrower?.name || 'N/A'}
                </td>
                <td className="px-2 border">
                  TZS {Number(r.Loan?.amount).toLocaleString()}
                </td>
                <td className="px-2 border">{r.installmentNumber}</td>
                <td className="px-2 border">
                  {r.dueDate ? format(new Date(r.dueDate), 'yyyy-MM-dd') : '-'}
                </td>
                <td className="px-2 border">TZS {Number(r.total).toLocaleString()}</td>
                <td className="px-2 border">TZS {Number(r.balance).toLocaleString()}</td>
                <td className="px-2 border capitalize">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Repayments;
