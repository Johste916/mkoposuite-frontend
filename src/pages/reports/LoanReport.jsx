// LoanReport.jsx
import ReportShell from './ReportShell';
export default function LoanReport() {
  return (
    <ReportShell
      title="Loan Report"
      endpoint="/reports/loans/summary"
      exportCsvPath="/reports/loans/export/csv"
      columns={[
        { key:'id', label:'Loan ID' },
        { key:'borrowerId', label:'Borrower' },
        { key:'productId', label:'Product' },
        { key:'amount', label:'Amount', fmt:(v)=>`TZS ${Number(v||0).toLocaleString()}` },
        { key:'status', label:'Status' },
        { key:'createdAt', label:'Disbursed', fmt:(v)=> (v? String(v).slice(0,10):'') },
      ]}
    />
  );
}
