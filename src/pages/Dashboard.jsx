// src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import api from '../api';

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [defaulters, setDefaulters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await api.get('/dashboard/summary');
        setSummary(res.data);
      } catch (err) {
        console.error('Dashboard summary error:', err.message);
        setSummary(null);
      }
    };

    const fetchDefaulters = async () => {
      try {
        const res = await api.get('/dashboard/defaulters');
        if (Array.isArray(res.data)) {
          setDefaulters(res.data);
        } else {
          console.error('Defaulters API did not return an array:', res.data);
          setDefaulters([]);
        }
      } catch (err) {
        console.error('Defaulters fetch error:', err.message);
        setDefaulters([]);
      }
    };

    Promise.all([fetchSummary(), fetchDefaulters()]).finally(() =>
      setLoading(false)
    );
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      {loading ? (
        <p>Loading dashboard data...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white shadow-md p-4 rounded-md">
              <h2 className="text-gray-500">Total Borrowers</h2>
              <p className="text-xl font-semibold">
                {summary?.totalBorrowers ?? 'N/A'}
              </p>
            </div>
            <div className="bg-white shadow-md p-4 rounded-md">
              <h2 className="text-gray-500">Total Loans</h2>
              <p className="text-xl font-semibold">
                {summary?.totalLoans ?? 'N/A'}
              </p>
            </div>
            <div className="bg-white shadow-md p-4 rounded-md">
              <h2 className="text-gray-500">Total Paid</h2>
              <p className="text-xl font-semibold">
                TZS {summary?.totalPaid?.toLocaleString() ?? '0'}
              </p>
            </div>
            <div className="bg-white shadow-md p-4 rounded-md">
              <h2 className="text-gray-500">Total Repaid</h2>
              <p className="text-xl font-semibold">
                TZS {summary?.totalRepaid?.toLocaleString() ?? '0'}
              </p>
            </div>
          </div>

          <h2 className="text-xl font-semibold mb-2">Loan Defaulters</h2>
          {defaulters.length === 0 ? (
            <p className="text-gray-500">No defaulters found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border rounded-md">
                <thead className="bg-gray-100 text-left">
                  <tr>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Phone</th>
                    <th className="px-4 py-2">Email</th>
                    <th className="px-4 py-2">Overdue Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {defaulters.map((d, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-4 py-2">{d.name}</td>
                      <td className="px-4 py-2">{d.phone}</td>
                      <td className="px-4 py-2">{d.email}</td>
                      <td className="px-4 py-2 text-red-600 font-semibold">
                        TZS {d.overdueAmount?.toLocaleString() ?? '0'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
