import React, { useState } from 'react';

const BorrowerImports = () => {
  const [file, setFile] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return;
    // TODO: POST /borrowers/import
    alert(`TODO: Import ${file.name}`);
  };

  const downloadSample = () => {
    // TODO: provide sample CSV/XLSX
    alert('TODO: Download sample file');
  };

  return (
    <div className="max-w-2xl p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Borrower Imports</h1>
      <form onSubmit={submit} className="bg-white rounded shadow p-4 space-y-3">
        <input type="file" accept=".csv,.xlsx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <div className="text-xs text-gray-500">Accepted: CSV/XLSX.</div>
        <div className="flex gap-2">
          <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded">Upload</button>
          <button type="button" onClick={downloadSample} className="px-3 py-2 border rounded">Download Sample</button>
        </div>
      </form>
    </div>
  );
};

export default BorrowerImports;
