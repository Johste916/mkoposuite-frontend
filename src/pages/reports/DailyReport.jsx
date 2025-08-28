// DailyReport.jsx
import ReportShell from './ReportShell';
export default function DailyReport() {
  return <ReportShell title="Daily Report" endpoint="/reports/daily" mode="snapshot" columns={[]} />;
}
