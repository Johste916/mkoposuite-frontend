// src/components/LoanScheduleModal.jsx
import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const LoanScheduleModal = ({ loan, schedule, onClose }) => {
  if (!loan || !schedule || !Array.isArray(schedule)) return null;

  // 👉 Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text(`Loan Schedule for TZS ${Number(loan.amount || 0).toLocaleString()}`, 14, 14);
    autoTable(doc, {
      startY: 20,
      head: [['#', 'Due Date', 'Principal', 'Interest', 'Total', 'Balance']],
      body: schedule.map((row) => [
        row.installment,
        row.dueDate,
        `TZS ${parseFloat(row.principal).toLocaleString()}`,
        `TZS ${parseFloat(row.interest).toLocaleString()}`,
        `TZS ${parseFloat(row.total).toLocaleString()}`,
        `TZS ${parseFloat(row.balance).toLocaleString()}`,
      ]),
    });
    doc.save(`LoanSchedule_Loan${loan.id}.pdf`);
  };

  // 👉 Export to Excel
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      schedule.map((row) => ({
        Installment: row.installment,
        DueDate: row.dueDate,
        Principal: row.principal,
        Interest: row.interest,
        Total: row.total,
        Balance: row.balance,
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Schedule');
    const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    saveAs(new Blob([excelBuffer], { type: 'application/octet-stream' }), `LoanSchedule_Loan${loan.id}.xlsx`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 p-6 rounded shadow-lg w-full max-w-3xl overflow-y-auto max-h-[85vh] border border-slate-200 dark:border-slate-800">
        <h2 className="text-xl font-bold mb-4 dark:text-slate-100">
          Repayment Schedule for TZS {Number(loan.amount || 0).toLocaleString()}
        </h2>

        {/* Export Buttons */}
        <div className="flex gap-3 mb-4">
          <button
            onClick={exportToPDF}
            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
          >
            Export PDF
          </button>
          <button
            onClick={exportToExcel}
            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
          >
            Export Excel
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border dark:border-slate-800">
            <thead className="bg-gray-100 dark:bg-slate-800">
              <tr>
                <th className="border px-2 py-1">Installment</th>
                <th className="border px-2 py-1">Due Date</th>
                <th className="border px-2 py-1">Principal</th>
                <th className="border px-2 py-1">Interest</th>
                <th className="border px-2 py-1">Total</th>
                <th className="border px-2 py-1">Balance</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((row, i) => (
                <tr key={i}>
                  <td className="border px-2 text-center">{row.installment}</td>
                  <td className="border px-2">{row.dueDate}</td>
                  <td className="border px-2">TZS {parseFloat(row.principal).toLocaleString()}</td>
                  <td className="border px-2">TZS {parseFloat(row.interest).toLocaleString()}</td>
                  <td className="border px-2 font-semibold">TZS {parseFloat(row.total).toLocaleString()}</td>
                  <td className="border px-2">TZS {parseFloat(row.balance).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-right mt-4">
          <button
            onClick={onClose}
            className="bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoanScheduleModal;
