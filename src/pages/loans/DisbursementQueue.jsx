import React, { useEffect, useState } from 'react';
import api from '../../api';

export default function DisbursementQueue() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        // You also have /loans/reports/disbursements/list for already disbursed
        const res = await api.get('/loans', { params: { status: 'approved' } });
        const all = Array.isArray(res.data) ? res.data : [];
        setItems(all.filter(l => l.status === 'approved'));
      } catch { setItems([]); }
    };
    load();
  }, []);

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold">Disbursement Queue</h2>
      <p className="text-sm text-gray-600">Loans awaiting disbursement.</p>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded shadow border">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2 border">Ref</th>
              <th className="p-2 border">Borrower</th>
              <th className="p-2 border">Amount</th>
              <th className="p-2 border">Approved On</th>
            </tr>
          </thead>
          <tbody>
            {items.map(l => (
              <tr key={l.id}>
                <td className="border px-2">{l.reference || `L-${l.id}`}</td>
                <td className="border px-2">{l.Borrower?.name || '—'}</td>
                <td className="border px-2">{l.amount}</td>
                <td className="border px-2">{l.approvalDate?.slice(0,10) || '—'}</td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan="4" className="text-center p-4">Empty</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
