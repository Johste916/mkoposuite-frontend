import React, { useState } from 'react';
import api from '../../api';

export default function LoanSchedulePage() {
  const [loanId, setLoanId] = useState('');
  const [schedule, setSchedule] = useState([]);
  const [method, setMethod] = useState('');

  const load = async (e) => {
    e.preventDefault();
    if (!loanId) return;
    try {
      const res = await api.get(`/loans/${loanId}/schedule`);
      setSchedule(res.data?.schedule || []);
      setMethod(res.data?.interestMethod || '');
    } catch {
      setSchedule([]);
      setMethod('');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold">Loan Schedule</h2>
      <form onSubmit={load} className="flex gap-2">
        <input
          className="border px-3 py-2 rounded"
          placeholder="Enter Loan ID"
          value={loanId}
          onChange={(e) => setLoanId(e.target.value)}
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded">Load</button>
      </form>

      {method && <p className="text-sm">Interest Method: <b>{method}</b></p>}

      {!!schedule.length && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded shadow border">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-2 border">#</th>
                <th className="p-2 border">Due Date</th>
                <th className="p-2 border">Principal</th>
                <th className="p-2 border">Interest</th>
                <th className="p-2 border">Total</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((r, i) => (
                <tr key={i}>
                  <td className="border px-2">{r.installment || r.period || i+1}</td>
                  <td className="border px-2">{r.dueDate}</td>
                  <td className="border px-2">{r.principal}</td>
                  <td className="border px-2">{r.interest}</td>
                  <td className="border px-2">{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
