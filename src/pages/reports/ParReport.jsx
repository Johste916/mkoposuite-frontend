// ParReport.jsx
import ReportShell from './ReportShell';
export default function ParReport() {
  return <ReportShell title="Portfolio At Risk (PAR)" endpoint="/reports/par/summary" mode="snapshot" columns={[]} />;
}
