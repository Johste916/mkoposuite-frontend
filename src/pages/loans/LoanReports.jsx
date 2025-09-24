import React, { useEffect, useState } from 'react';
import api from '../../api';

export default function LoanReports() {
  const [disbursed, setDisbursed] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/loans/reports/disbursements/list');
        setDisbursed(Array.isArray(res.data) ? res.data : []);
      } catch { setDisbursed([]); }
    };
    load();
  }, []);

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold">Loan Reports</h2>
      <h3 className="font-semibold">Recently Disbursed</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full rounded border border-[var(--border)] bg-transparent text-sm">
          <thead className="text-[var(--fg)]">
            <tr>
              <th className="p-2 border border-[var(--border)]">Ref</th>
              <th className="p-2 border border-[var(--border)]">Borrower</th>
              <th className="p-2 border border-[var(--border)]">Amount</th>
              <th className="p-2 border border-[var(--border)]">Date</th>
            </tr>
          </thead>
          <tbody>
            {disbursed.map(l => (
              <tr key={l.id} className="border-t border-[var(--border)]">
                <td className="border border-[var(--border)] px-2">{l.reference || `L-${l.id}`}</td>
                <td className="border border-[var(--border)] px-2">{l.Borrower?.name || '—'}</td>
                <td className="border border-[var(--border)] px-2">{l.amount}</td>
                <td className="border border-[var(--border)] px-2">{l.disbursementDate?.slice(0,10) || '—'}</td>
              </tr>
            ))}
            {!disbursed.length && (
              <tr>
                <td colSpan="4" className="text-center p-4 muted">No data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
