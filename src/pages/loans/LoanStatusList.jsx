import React, { useEffect, useState } from 'react';
import api from '../../api';
import { useParams, Link } from 'react-router-dom';

export default function LoanStatusList() {
  const { status } = useParams(); // pending | approved | rejected | disbursed | active | closed
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const title = {
    pending: 'Pending Approval',
    approved: 'Approved Loans',
    rejected: 'Rejected Loans',
    disbursed: 'Disbursed Loans',
    active: 'Active Loans',
    closed: 'Closed Loans',
  }[status] || 'Loans';

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // Backend may ignore ?status; we filter client-side as fallback
        const res = await api.get('/loans', { params: { status } });
        const all = Array.isArray(res.data) ? res.data : [];
        setItems(all.filter(l => !status || l.status === status));
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [status]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>
        <Link to="/loans" className="text-blue-600 underline">All Loans</Link>
      </div>

      {loading ? <p>Loading…</p> : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded shadow border">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-2 border">Amount</th>
                <th className="p-2 border">Rate</th>
                <th className="p-2 border">Term</th>
                <th className="p-2 border">Borrower</th>
                <th className="p-2 border">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map(l => (
                <tr key={l.id}>
                  <td className="border px-2">{l.amount}</td>
                  <td className="border px-2">{l.interestRate}</td>
                  <td className="border px-2">{l.termMonths}</td>
                  <td className="border px-2">{l.Borrower?.name || '—'}</td>
                  <td className="border px-2">{l.status}</td>
                </tr>
              ))}
              {!items.length && (
                <tr><td colSpan="5" className="text-center p-4">No loans found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
