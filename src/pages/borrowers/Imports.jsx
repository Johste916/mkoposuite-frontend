import React, { useState } from 'react';

const ui = {
  container: "w-full px-4 md:px-6 lg:px-8 py-6 bg-[var(--bg)] text-[var(--fg)]",
  h1: "text-3xl font-extrabold tracking-tight",
  card: "rounded-2xl border-2 border-[var(--border-strong)] bg-[var(--card)] shadow p-4 max-w-2xl",
  input:
    "block w-full h-10 rounded-lg border-2 px-3 " +
    "bg-[var(--input-bg)] text-[var(--input-fg)] border-[var(--input-border)] " +
    "focus:outline-none focus:ring-2 focus:ring-[var(--ring)]",
  primary:
    "inline-flex items-center rounded-lg bg-blue-600 text-white px-3 py-2 font-semibold hover:bg-blue-700 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
  btn:
    "inline-flex items-center rounded-lg border-2 border-[var(--border-strong)] px-3 py-2 hover:bg-[var(--kpi-bg)] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
  note: "text-xs text-[var(--muted)]",
};

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
    <div className={ui.container}>
      <h1 className={ui.h1}>Borrower Imports</h1>
      <form onSubmit={submit} className={`${ui.card} mt-4 space-y-3`}>
        <input type="file" accept=".csv,.xlsx" onChange={(e) => setFile(e.target.files?.[0] || null)} className={ui.input} />
        <div className={ui.note}>Accepted: CSV/XLSX.</div>
        <div className="flex gap-2">
          <button type="submit" className={ui.primary}>Upload</button>
          <button type="button" onClick={downloadSample} className={ui.btn}>Download Sample</button>
        </div>
      </form>
    </div>
  );
};

export default BorrowerImports;
