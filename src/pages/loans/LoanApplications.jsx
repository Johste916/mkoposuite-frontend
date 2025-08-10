import React from 'react';
import { Link } from 'react-router-dom';

export default function LoanApplications() {
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold">Loan Applications</h2>
      <p className="text-sm text-gray-600">Coming soon: application intake, screening, and assignment.</p>
      <Link to="/loans" className="text-blue-600 underline">Back to Loans</Link>
    </div>
  );
}
