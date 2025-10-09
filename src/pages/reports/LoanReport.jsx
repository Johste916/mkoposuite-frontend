// LoanReport.jsx
import ReportShell from "./ReportShell";

const money = (v, c = "TZS") =>
  `${c} ${Number(v || 0).toLocaleString()}`;

const date10 = (v) =>
  (v ? String(v).slice(0, 10) : "") || "—";

export default function LoanReport() {
  return (
    <ReportShell
      title="Loan Report"
      endpoint="/reports/loans/summary"
      exportCsvPath="/reports/loans/export/csv"
      columns={[
        { key: "id", label: "Loan ID" },
        {
          key: "borrowerName",
          label: "Borrower",
          fmt: (v, r) =>
            v ||
            r?.Borrower?.name ||
            r?.borrower?.name ||
            r?.borrowerId ||
            "—",
        },
        {
          key: "productName",
          label: "Product",
          fmt: (v, r) => v || r?.Product?.name || r?.product?.name || "—",
        },
        {
          key: "amount",
          label: "Amount",
          fmt: (v, r) => money(v ?? r?.principal ?? r?.amount, r?.currency || "TZS"),
        },
        {
          key: "status",
          label: "Status",
          fmt: (v, r) => (r?.stage || v || "—").toString().replaceAll("_", " "),
        },
        {
          key: "disbursementDate",
          label: "Disbursed",
          fmt: (v, r) =>
            date10(v || r?.date || r?.createdAt),
        },
      ]}
    />
  );
}
