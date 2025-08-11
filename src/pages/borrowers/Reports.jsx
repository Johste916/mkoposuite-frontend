import React, { useEffect, useState } from 'react';
import api from '../../api';

const BorrowerReports = () => {
  const [kpis, setKpis] = useState([
    { label: 'Active Borrowers', value: 0 },
    { label: 'Total Outstanding', value: 'TZS 0' },
    { label: 'PAR', value: '0%' },
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get('/borrowers/reports/summary');
        const { activeBorrowers, totalOutstanding, par } = res.data || {};

        setKpis([
          { label: 'Active Borrowers', value: activeBorrowers ?? 0 },
          { label: 'Total Outstanding', value: `TZS ${(totalOutstanding ?? 0).toLocaleString()}` },
          { label: 'PAR', value: `${par ?? 0}%` },
        ]);
      } catch (err) {
        console.error('Error loading borrower reports summary:', err);
        setError('Failed to load borrower report data.');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Borrower Reports</h1>

      {loading ? (
        <p className="text-gray-500">Loading borrower reports...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {kpis.map((k) => (
              <div key={k.label} className="bg-white rounded shadow p-4">
                <div className="text-xs text-gray-500">{k.label}</div>
                <div className="text-xl font-semibold">{k.value}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded shadow p-4">
            <div className="text-sm text-gray-600">
              Charts will go here (by branch, officer, risk tiers).
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BorrowerReports;
