import React, { useState } from 'react';

const GroupImports = () => {
  const [file, setFile] = useState(null);

  const handleImport = async (e) => {
    e.preventDefault();
    if (!file) return;
    // TODO: POST /borrowers/groups/import (FormData)
    alert(`TODO: Import groups from ${file.name}`);
  };

  return (
    <div className="max-w-2xl p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Group Imports</h1>
      <div className="bg-white rounded shadow p-4 space-y-4">
        <form onSubmit={handleImport} className="space-y-3">
          <input type="file" accept=".csv,.xlsx" onChange={(e) => setFile(e.target.files?.[0] || null)} className="block w-full" />
          <div className="text-xs text-gray-500">Accepted: CSV/XLSX. Columns: name, branchId, officerId, meetingDay, members…</div>
          <div className="flex gap-2">
            <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded">Upload</button>
            <button type="button" className="px-3 py-2 border rounded">Download Sample</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GroupImports;
