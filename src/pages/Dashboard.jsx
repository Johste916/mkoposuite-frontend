import React, { useEffect, useState } from 'react';
import { Users, CreditCard, DollarSign, AlertTriangle } from 'lucide-react';
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
        console.error('Summary fetch error:', err.message);
        setSummary(null);
      }
    };

    const fetchDefaulters = async () => {
      try {
        const res = await api.get('/dashboard/defaulters');
        setDefaulters(Array.isArray(res.data) ? res.data : []);
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
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">📊 Dashboard</h1>

      {loading ? (
        <p className="text-gray-600">🔄 Loading dashboard data...</p>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <SummaryCard
              title="Total Borrowers"
              value={summary?.totalBorrowers}
              icon={<Users className="w-6 h-6 text-blue-600" />}
            />
            <SummaryCard
              title="Total Loans"
              value={summary?.totalLoans}
              icon={<CreditCard className="w-6 h-6 text-green-600" />}
            />
            <SummaryCard
              title="Total Paid"
              value={`TZS ${summary?.totalPaid?.toLocaleString()}`}
              icon={<DollarSign className="w-6 h-6 text-purple-600" />}
            />
            <SummaryCard
              title="Total Repaid"
              value={`TZS ${summary?.totalRepaid?.toLocaleString()}`}
              icon={<DollarSign className="w-6 h-6 text-emerald-600" />}
            />
          </div>

          {/* Defaulters Table */}
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="text-red-600" />
              <h2 className="text-xl font-semibold text-gray-800">Loan Defaulters</h2>
            </div>
            {defaulters.length === 0 ? (
              <p className="text-gray-500">✅ No defaulters found.</p>
            ) : (
              <div className="overflow-x-auto border rounded-md shadow-sm">
                <table className="min-w-full text-sm bg-white">
                  <thead className="bg-gray-100 text-gray-600 text-left">
                    <tr>
                      <th className="px-4 py-2">Name</th>
                      <th className="px-4 py-2">Phone</th>
                      <th className="px-4 py-2">Email</th>
                      <th className="px-4 py-2">Overdue Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {defaulters.map((d, index) => (
                      <tr key={index} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2">{d.name}</td>
                        <td className="px-4 py-2">{d.phone}</td>
                        <td className="px-4 py-2">{d.email}</td>
                        <td className="px-4 py-2 text-red-600 font-semibold">
                          TZS {d.overdueAmount?.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const SummaryCard = ({ title, value, icon }) => (
  <div className="bg-white rounded-lg shadow-md p-4 flex items-center gap-4">
    <div className="p-2 bg-gray-100 rounded-full">{icon}</div>
    <div>
      <h3 className="text-sm text-gray-500">{title}</h3>
      <p className="text-xl font-semibold text-gray-800">
        {value ?? 'N/A'}
      </p>
    </div>
  </div>
);

export default Dashboard;
