import React, { useEffect, useState } from 'react';
import api from '../api';
import { getUserRole } from '../utils/auth';
import { format } from 'date-fns';
import { CSVLink } from 'react-csv';

const Disbursements = () => {
  const userRole = getUserRole();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const loansPerPage = 10;
  const totalPages = Math.ceil(loans.length / loansPerPage);
  const indexOfLast = currentPage * loansPerPage;
  const indexOfFirst = indexOfLast - loansPerPage;
  const paginatedLoans = loans.slice(indexOfFirst, indexOfLast);

  const canApprove = ['Manager', 'Director', 'Admin'].includes(userRole);
  const canDisburse = ['Accountant', 'Admin'].includes(userRole);

  useEffect(() => {
    fetchLoans();
  }, [filter]);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const res = await api.get('/loans/disbursements');
      let data = res.data;
      if (filter !== 'all') {
        data = data.filter(loan => loan.status === filter);
      }
      if (search) {
        data = data.filter(loan =>
          loan.borrower?.name?.toLowerCase().includes(search.toLowerCase())
        );
      }
      setLoans(data);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to load loans');
    } finally {
      setLoading(false);
    }
  };

  const updateLoanStatus = async (loanId, status) => {
    try {
      setActionLoading(true);
      await api.put(`/loans/${loanId}/status`, { status });
      fetchLoans();
    } catch (err) {
      console.error('Status update error:', err);
      alert('Failed to update loan status');
    } finally {
      setActionLoading(false);
    }
  };

  const headers = [
    { label: 'Borrower', key: 'borrower.name' },
    { label: 'Amount', key: 'amount' },
    { label: 'Currency', key: 'currency' },
    { label: 'Status', key: 'status' },
    { label: 'Start Date', key: 'startDate' },
    { label: 'Term (months)', key: 'termMonths' },
    { label: 'Repayment Method', key: 'interestMethod' },
    { label: 'Branch', key: 'branch.name' },
    { label: 'Initiated By', key: 'initiator.name' },
  ];

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
        <h1 className="text-xl font-bold">Loan Disbursements</h1>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Search borrower..."
            className="border p-2 rounded"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
              fetchLoans();
            }}
          />
          <select
            className="border p-2 rounded"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="disbursed">Disbursed</option>
          </select>
          <CSVLink data={loans} headers={headers} filename="loan-disbursements.csv" className="bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 text-sm">
            Export CSV
          </CSVLink>
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white shadow rounded">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left px-4 py-2">Borrower</th>
                  <th className="text-left px-4 py-2">Amount</th>
                  <th className="text-left px-4 py-2">Currency</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">Start Date</th>
                  <th className="text-left px-4 py-2">Term</th>
                  <th className="text-left px-4 py-2">Method</th>
                  <th className="text-left px-4 py-2">Branch</th>
                  <th className="text-left px-4 py-2">Initiator</th>
                  <th className="text-left px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLoans.map((loan) => (
                  <tr key={loan.id} className="border-t">
                    <td className="px-4 py-2">{loan.borrower?.name || 'Unknown'}</td>
                    <td className="px-4 py-2">{loan.amount.toLocaleString()}</td>
                    <td className="px-4 py-2">{loan.currency}</td>
                    <td className="px-4 py-2 capitalize">{loan.status}</td>
                    <td className="px-4 py-2">{loan.startDate ? format(new Date(loan.startDate), 'yyyy-MM-dd') : '-'}</td>
                    <td className="px-4 py-2">{loan.termMonths || '-'}</td>
                    <td className="px-4 py-2 capitalize">{loan.interestMethod}</td>
                    <td className="px-4 py-2">{loan.branch?.name || '-'}</td>
                    <td className="px-4 py-2">{loan.initiator?.name || '-'}</td>
                    <td className="px-4 py-2 space-x-2">
                      {loan.status === 'pending' && canApprove && (
                        <button
                          onClick={() => updateLoanStatus(loan.id, 'approved')}
                          className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                          disabled={actionLoading}
                        >
                          Approve
                        </button>
                      )}
                      {loan.status === 'approved' && canDisburse && (
                        <button
                          onClick={() => updateLoanStatus(loan.id, 'disbursed')}
                          className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                          disabled={actionLoading}
                        >
                          Disburse
                        </button>
                      )}
                      {!['pending', 'approved'].includes(loan.status) && (
                        <span className="text-gray-500">Done</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-4">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm">Page {currentPage} of {totalPages}</span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Disbursements;
