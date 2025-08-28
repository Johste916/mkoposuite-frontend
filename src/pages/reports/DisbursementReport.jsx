// DisbursementReport.jsx
import ReportShell from './ReportShell';
export default function DisbursementReport() {
  return <ReportShell title="Disbursement Report" endpoint="/reports/disbursements/summary" columns={[]} />;
}
