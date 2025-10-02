// src/components/LoanScheduleModal.jsx
import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

import {
  SCHEDULE_COLUMNS,
  rowsForPDF,
  rowsForExcel,
  computeScheduleTotals,
  fmtMoney,
} from '../utils/loanSchedule';
import ScheduleTable from './ScheduleTable';

const LoanScheduleModal = ({ loan, schedule, onClose }) => {
  if (!loan || !Array.isArray(schedule)) return null;
  const currency = loan?.currency || 'TZS';
  const totals = computeScheduleTotals(schedule, []); // we don't have repayments here; page using this already shows/fetches them elsewhere

  /* PDF export (aligned columns everywhere) */
  const exportToPDF = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.text('Loan Repayment Schedule', 40, 40);

    doc.setFontSize(10);
    const meta = [
      `Loan ID: ${loan.id}`,
      `Borrower: ${loan?.Borrower?.name || loan?.borrowerName || ''}`,
      `Amount: ${fmtMoney(loan.amount, currency)}`,
      `Currency: ${currency}`,
      `Generated: ${new Date().toLocaleString()}`,
    ];
    meta.forEach((m, i) => doc.text(m, 40, 60 + i * 14));

    autoTable(doc, {
      head: [SCHEDULE_COLUMNS],
      body: rowsForPDF(schedule, currency),
      startY: 140,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [243, 244, 246], textColor: 20 },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: 40, right: 40 },
      didDrawPage: () => {
        const str = `Page ${doc.internal.getNumberOfPages()}`;
        doc.setFontSize(9);
        doc.text(str, pageWidth - 40, doc.internal.pageSize.getHeight() - 20, { align: 'right' });
      },
    });

    let y = (doc.lastAutoTable?.finalY || 140) + 18;
    doc.setFontSize(11);
    doc.text('Summary', 40, y);
    y += 10; doc.setFontSize(10);

    const lines = [
      ['Principal (Sched.)', fmtMoney(totals.scheduledPrincipal, currency)],
      ['Interest (Sched.)',  fmtMoney(totals.scheduledInterest,  currency)],
      ['Penalty (Sched.)',   fmtMoney(totals.scheduledPenalty,   currency)],
      ['Fees (Sched.)',      fmtMoney(totals.scheduledFees,      currency)],
      ['Total Payable',      fmtMoney(totals.scheduledTotal,     currency)],
      ['Paid Principal',     fmtMoney(totals.paidPrincipal,      currency)],
      ['Paid Interest',      fmtMoney(totals.paidInterest,       currency)],
      ['Total Paid',         fmtMoney(totals.totalPaid,          currency)],
      ['Outstanding',        fmtMoney(totals.outstandingTotal,   currency)],
    ];
    lines.forEach((row, i) => {
      doc.text(row[0], 40, y + 16 + i * 14);
      doc.text(row[1], pageWidth - 40, y + 16 + i * 14, { align: 'right' });
    });

    doc.save(`LoanSchedule_Loan${loan.id}.pdf`);
  };

  /* Excel export (raw numbers + ISO dates) */
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(rowsForExcel(schedule));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Schedule');
    const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    saveAs(new Blob([excelBuffer], { type: 'application/octet-stream' }), `LoanSchedule_Loan${loan.id}.xlsx`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 p-6 rounded shadow-lg w-full max-w-4xl overflow-y-auto max-h-[85vh] border border-slate-200 dark:border-slate-800">
        <h2 className="text-xl font-bold mb-4 dark:text-slate-100">
          Repayment Schedule — {fmtMoney(loan.amount, currency)}
        </h2>

        <div className="flex gap-3 mb-4">
          <button onClick={exportToPDF} className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Export PDF</button>
          <button onClick={exportToExcel} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">Export Excel</button>
        </div>

        <ScheduleTable schedule={schedule} currency={currency} />

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm mt-4">
          <div className="px-3 py-2 rounded border bg-white">Principal (Sched.): <b>{fmtMoney(totals.scheduledPrincipal, currency)}</b></div>
          <div className="px-3 py-2 rounded border bg-white">Interest (Sched.): <b>{fmtMoney(totals.scheduledInterest, currency)}</b></div>
          <div className="px-3 py-2 rounded border bg-white">Penalty (Sched.): <b>{fmtMoney(totals.scheduledPenalty, currency)}</b></div>
          <div className="px-3 py-2 rounded border bg-white">Fees (Sched.): <b>{fmtMoney(totals.scheduledFees, currency)}</b></div>
          <div className="px-3 py-2 rounded border bg-white">Total Payable: <b>{fmtMoney(totals.scheduledTotal, currency)}</b></div>
          <div className="px-3 py-2 rounded border bg-white">Outstanding: <b>{fmtMoney(totals.outstandingTotal, currency)}</b></div>
        </div>

        <div className="text-right mt-4">
          <button onClick={onClose} className="bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700">Close</button>
        </div>
      </div>
    </div>
  );
};

export default LoanScheduleModal;
