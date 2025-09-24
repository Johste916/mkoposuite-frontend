import React, { useEffect, useState } from 'react';
import api from '../../api';

export default function DisbursementQueue() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
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
      <p className="text-sm muted">Loans awaiting disbursement.</p>

      <div className="overflow-x-auto">
        <table className="min-w-full rounded border border-[var(--border)] bg-transparent text-sm">
          <thead className="text-[var(--fg)]">
            <tr>
              <th className="p-2 border border-[var(--border)]">Ref</th>
              <th className="p-2 border border-[var(--border)]">Borrower</th>
              <th className="p-2 border border-[var(--border)]">Amount</th>
              <th className="p-2 border border-[var(--border)]">Approved On</th>
            </tr>
          </thead>
          <tbody>
            {items.map(l => (
              <tr key={l.id} className="border-t border-[var(--border)]">
                <td className="border border-[var(--border)] px-2">{l.reference || `L-${l.id}`}</td>
                <td className="border border-[var(--border)] px-2">{l.Borrower?.name || '—'}</td>
                <td className="border border-[var(--border)] px-2">{l.amount}</td>
                <td className="border border-[var(--border)] px-2">{l.approvalDate?.slice(0,10) || '—'}</td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan="4" className="text-center p-4 muted">Empty</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
