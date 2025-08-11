// src/pages/borrowers/groups/GroupReports.jsx
import React, { useEffect, useState } from 'react';
import api from '../../../api';

const GroupReports = () => {
  const [summary, setSummary] = useState({
    totalGroups: 0,
    activeGroups: 0,
    totalLoans: 0,
    par: '0%',
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchGroupSummary();
  }, []);

  const fetchGroupSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/borrowers/groups/reports/summary'); // <-- fixed path
      setSummary(res.data || {});
    } catch (err) {
      console.error('Error loading group summary:', err);
      setError('Failed to load group report data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Group Reports</h1>

      {loading ? (
        <p className="text-gray-500">Loading group analytics...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded shadow p-4">
              <div className="text-xs text-gray-500">Total Groups</div>
              <div className="text-xl font-semibold">{summary.totalGroups || 0}</div>
            </div>
            <div className="bg-white rounded shadow p-4">
              <div className="text-xs text-gray-500">Active Groups</div>
              <div className="text-xl font-semibold">{summary.activeGroups || 0}</div>
            </div>
            <div className="bg-white rounded shadow p-4">
              <div className="text-xs text-gray-500">Total Group Loans</div>
              <div className="text-xl font-semibold">
                {Number(summary.totalLoans || 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-white rounded shadow p-4">
              <div className="text-xs text-gray-500">PAR</div>
              <div className="text-xl font-semibold text-red-600">
                {summary.par || '0%'}
              </div>
            </div>
          </div>

          <div className="bg-white rounded shadow p-4">
            <p className="text-sm text-gray-600">
              Charts and trends (by branch, officer, performance tiers) will appear here once backend analytics endpoints are available.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default GroupReports;
