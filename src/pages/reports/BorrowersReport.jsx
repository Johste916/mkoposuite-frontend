// src/pages/reports/BorrowersReport.jsx
import React from "react";
import ReportShell from "./ReportShell";

export default function BorrowersReport() {
  return (
    <ReportShell
      title="Borrowers Report"
      endpoint="/reports/borrowers/loan-summary"
      columns={[
        { key: "borrower", label: "Borrower" },
        { key: "loans", label: "Loans" },
        { key: "outstanding", label: "Outstanding" },
      ]}
    />
  );
}
