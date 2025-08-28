// OutstandingReport.jsx
import ReportShell from './ReportShell';
export default function OutstandingReport() {
  return (
    <ReportShell
      title="Outstanding Report"
      endpoint="/reports/outstanding"
      mode="snapshot"
      columns={[
        { key:'loanId', label:'Loan' },
        { key:'outstanding', label:'Outstanding', fmt:(v)=>`TZS ${Number(v||0).toLocaleString()}` },
      ]}
    />
  );
}
