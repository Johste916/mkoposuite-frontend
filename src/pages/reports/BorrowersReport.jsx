// BorrowersReport.jsx
import ReportShell from './ReportShell';
export default function BorrowersReport() {
  return <ReportShell title="Borrowers Report" endpoint="/reports/borrowers/loan-summary" columns={[{ key:'borrower' }]} />;
}
