import React, { useState } from "react";
import repaymentsApi from "../../api/repayments";

export default function UploadRepaymentsCSV() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const onFile = (e) => {
    setFile(e.target.files?.[0] || null);
    setResult(null);
    setError("");
  };

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!file) return alert("Select a CSV file first.");
    setUploading(true);
    setError("");
    setResult(null);
    try {
      const { data } = await repaymentsApi.uploadCsv(file);
      setResult(data || { ok: true });
    } catch (err) {
      setError(err?.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const sample = `loanReference,amount,date,method,reference,notes
LN-10001,150000,2025-08-01,mobile,MPESA-ABC123,August part-payment
LN-10002,80000,2025-08-02,bank,DRN-89231,Branch cash deposit
`;

  const downloadSample = () => {
    const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "repayments_sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg border shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Upload Repayments (CSV)</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Columns supported: <code>loanReference</code>, <code>amount</code>, <code>date</code> (YYYY-MM-DD),
              <code>method</code>, <code>reference</code>, <code>notes</code>.
            </p>
          </div>
          <button
            onClick={downloadSample}
            className="px-3 py-2 rounded border hover:bg-gray-50 text-sm"
          >
            Download Sample CSV
          </button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="flex items-center gap-3">
            <input type="file" accept=".csv,text/csv" onChange={onFile} />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!file || uploading}
              className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {uploading ? "Uploading…" : "Upload"}
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded border hover:bg-gray-50"
              onClick={() => {
                setFile(null);
                setResult(null);
                setError("");
              }}
            >
              Reset
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 p-3 rounded bg-red-50 text-red-700 text-sm border border-red-200">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-6">
            <h3 className="font-semibold">Result</h3>
            <pre className="mt-2 p-3 text-sm bg-gray-50 dark:bg-gray-900 rounded border overflow-auto">
{JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
