import React from 'react';

const GroupReports = () => {
  // TODO: charts/tables once endpoints ready (group loan performance, attendance, PAR)
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Group Reports</h1>
      <div className="bg-white rounded shadow p-4">
        <p className="text-gray-600 text-sm">
          Placeholder for group analytics. We’ll wire filters and charts after backend endpoints are available.
        </p>
      </div>
    </div>
  );
};

export default GroupReports;
