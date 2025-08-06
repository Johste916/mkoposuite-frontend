import React, { useEffect, useState } from 'react';
import {
  Users,
  CreditCard,
  DollarSign,
  AlertTriangle,
  ClipboardList,
  CheckCircle,
  ThumbsDown,
  Clock,
  CheckSquare,
  Info,
  BarChart2
} from 'lucide-react';
import api from '../api';

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [defaulters, setDefaulters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [officerId, setOfficerId] = useState('');
  const [timeRange, setTimeRange] = useState('');

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [branchesRes, officersRes] = await Promise.all([
          api.get('/branches'),
          api.get('/users?role=loan_officer')
        ]);
        setBranches(branchesRes.data);
        setOfficers(officersRes.data);
      } catch (err) {
        console.error('Filter fetch error:', err.message);
      }
    };
    fetchFilters();
  }, []);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await api.get('/dashboard/summary', {
          params: { branchId, officerId, timeRange }
        });
        setSummary(res.data);
      } catch (err) {
        console.error('Summary fetch error:', err.message);
        setSummary(null);
      }
    };

    const fetchDefaulters = async () => {
      try {
        const res = await api.get('/dashboard/defaulters', {
          params: { branchId, officerId, timeRange }
        });
        setDefaulters(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Defaulters fetch error:', err.message);
        setDefaulters([]);
      }
    };

    Promise.all([fetchSummary(), fetchDefaulters()]).finally(() =>
      setLoading(false)
    );
  }, [branchId, officerId, timeRange]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">📊 Dashboard</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mt-2">
        <select
          value={branchId}
          onChange={e => setBranchId(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="">All Branches</option>
          {branches.map(branch => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>

        <select
          value={officerId}
          onChange={e => setOfficerId(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="">All Loan Officers</option>
          {officers.map(officer => (
            <option key={officer.id} value={officer.id}>
              {officer.name || officer.email}
            </option>
          ))}
        </select>

        <select
          value={timeRange}
          onChange={e => setTimeRange(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="quarter">This Quarter</option>
          <option value="semiAnnual">Semi-Annual</option>
          <option value="annual">Annual</option>
        </select>
      </div>

      {loading ? (
        <p className="text-gray-600">🔄 Loading dashboard data...</p>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <SummaryCard title="Total Borrowers" value={summary?.totalBorrowers} icon={<Users className="w-6 h-6 text-blue-600" />} />
            <SummaryCard title="Total Loans" value={summary?.totalLoans} icon={<CreditCard className="w-6 h-6 text-green-600" />} />
            <SummaryCard title="Disbursed Loans" value={`TZS ${summary?.totalDisbursed?.toLocaleString()}`} icon={<CreditCard className="w-6 h-6 text-indigo-600" />} />
            <SummaryCard title="Total Paid" value={`TZS ${summary?.totalPaid?.toLocaleString()}`} icon={<DollarSign className="w-6 h-6 text-purple-600" />} />
            <SummaryCard title="Total Repaid" value={`TZS ${summary?.totalRepaid?.toLocaleString()}`} icon={<DollarSign className="w-6 h-6 text-emerald-600" />} />
            <SummaryCard title="Expected Repayments" value={`TZS ${summary?.totalExpectedRepayments?.toLocaleString()}`} icon={<ClipboardList className="w-6 h-6 text-orange-600" />} />
            <SummaryCard title="Total Deposits" value={`TZS ${summary?.totalDeposits?.toLocaleString()}`} icon={<DollarSign className="w-6 h-6 text-teal-600" />} />
            <SummaryCard title="Total Withdrawals" value={`TZS ${summary?.totalWithdrawals?.toLocaleString()}`} icon={<DollarSign className="w-6 h-6 text-red-600" />} />
            <SummaryCard title="Net Savings" value={`TZS ${summary?.netSavings?.toLocaleString()}`} icon={<DollarSign className="w-6 h-6 text-yellow-600" />} />

            {/* New loan statuses */}
            <SummaryCard title="Pending Loans" value={summary?.pendingLoans} icon={<Clock className="w-6 h-6 text-yellow-600" />} />
            <SummaryCard title="Approved Loans" value={summary?.approvedLoans} icon={<CheckSquare className="w-6 h-6 text-green-600" />} />
            <SummaryCard title="Rejected Loans" value={summary?.rejectedLoans} icon={<ThumbsDown className="w-6 h-6 text-red-600" />} />

            {/* Defaulted/Outstanding/Written-off */}
            <SummaryCard title="Defaulted Loan" value={`TZS ${summary?.defaultedLoan?.toLocaleString()}`} icon={<AlertTriangle className="w-6 h-6 text-rose-600" />} />
            <SummaryCard title="Defaulted Interest" value={`TZS ${summary?.defaultedInterest?.toLocaleString()}`} icon={<AlertTriangle className="w-6 h-6 text-rose-400" />} />
            <SummaryCard title="Outstanding Loan" value={`TZS ${summary?.outstandingLoan?.toLocaleString()}`} icon={<CreditCard className="w-6 h-6 text-blue-400" />} />
            <SummaryCard title="Outstanding Interest" value={`TZS ${summary?.outstandingInterest?.toLocaleString()}`} icon={<DollarSign className="w-6 h-6 text-blue-600" />} />
            <SummaryCard title="Written-off Loans" value={`TZS ${summary?.writtenOff?.toLocaleString()}`} icon={<ThumbsDown className="w-6 h-6 text-gray-500" />} />

            {/* PAR + Message */}
            <SummaryCard title="PAR (Portfolio at Risk)" value={`${summary?.parPercent ?? 0}%`} icon={<BarChart2 className="w-6 h-6 text-fuchsia-600" />} />
          </div>

          {/* Company Message */}
          {summary?.companyMessage && (
            <div className="mt-6 p-4 border-l-4 border-blue-500 bg-blue-50 text-blue-700">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                <p className="text-sm font-medium">{summary.companyMessage}</p>
              </div>
            </div>
          )}

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
      <p className="text-xl font-semibold text-gray-800">{value ?? 'N/A'}</p>
    </div>
  </div>
);

export default Dashboard;
