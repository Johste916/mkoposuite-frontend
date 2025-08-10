import React from 'react';

const BorrowerReports = () => {
  // TODO: fetch KPIs and charts after backend is ready
  const kpis = [
    { label: 'Active Borrowers', value: 0 },
    { label: 'Total Outstanding', value: 'TZS 0' },
    { label: 'PAR', value: '0%' },
  ];

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Borrower Reports</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded shadow p-4">
            <div className="text-xs text-gray-500">{k.label}</div>
            <div className="text-xl font-semibold">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded shadow p-4">
        <div className="text-sm text-gray-600">Charts will go here (by branch, officer, risk tiers).</div>
      </div>
    </div>
  );
};

export default BorrowerReports;
