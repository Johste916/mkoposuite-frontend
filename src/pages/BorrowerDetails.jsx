import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const BorrowerDetails = () => {
  const { id } = useParams();
  const [borrower, setBorrower] = useState(null);
  const [loans, setLoans] = useState([]);

  const API = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const borrowerRes = await axios.get(`${API}/borrowers/${id}`);
        setBorrower(borrowerRes.data);

        const loansRes = await axios.get(`${API}/loans/borrower/${id}`);
        setLoans(loansRes.data);
      } catch (err) {
        console.error('Error fetching borrower details:', err);
      }
    };

    fetchData();
  }, [id]);

  if (!borrower) return <p className="p-4">Loading borrower details...</p>;

  return (
    <div className="p-4">
      <Link to="/borrowers" className="text-blue-600 underline mb-4 block">← Back to Borrowers</Link>
      <h2 className="text-2xl font-bold mb-2">{borrower.name}</h2>
      <p><strong>Phone:</strong> {borrower.phone}</p>
      <p><strong>Email:</strong> {borrower.email}</p>
      <p><strong>National ID:</strong> {borrower.nationalId}</p>
      <p><strong>Address:</strong> {borrower.address}</p>

      <h3 className="text-xl font-semibold mt-6 mb-2">Loans</h3>
      {loans.length === 0 ? (
        <p>No loans found for this borrower.</p>
      ) : (
        <table className="min-w-full bg-white rounded shadow table-auto border">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2 border">Amount</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Start Date</th>
              <th className="p-2 border">End Date</th>
            </tr>
          </thead>
          <tbody>
            {loans.map((loan) => (
              <tr key={loan.id}>
                <td className="border px-2">TZS {loan.amount.toLocaleString()}</td>
                <td className="border px-2">{loan.status}</td>
                <td className="border px-2">{loan.startDate}</td>
                <td className="border px-2">{loan.endDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default BorrowerDetails;
