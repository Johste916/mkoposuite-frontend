import React, { useEffect, useState } from "react";
import api from "../../api";

const money = (v) => Number(v || 0).toLocaleString();

export default function ApproveRepayments() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchRows = async () => {
    setLoading(true);
    try {
      // Pull pending; if your backend filters by status
      const { data } = await api.get("/repayments", {
        params: {
          status: "pending",
          ...(dateFrom ? { dateFrom } : {}),
          ...(dateTo ? { dateTo } : {}),
          page: 1,
          pageSize: 200,
        },
      });
      const items = Array.isArray(data) ? data : data?.items || [];
      setRows(items);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const approve = async (id) => {
    if (!confirm("Approve this repayment?")) return;
    try {
      await api.post(`/repayments/${id}/approve`);
      setRows((rs) => rs.filter((r) => r.id !== id));
    } catch (e) {
      alert(e?.response?.data?.error || "Approve failed (ensure backend route exists)");
    }
  };
  const reject = async (id) => {
    const reason = prompt("Reason for rejection?");
    if (reason === null) return;
    try {
      await api.post(`/repayments/${id}/reject`, { reason });
      setRows((rs) => rs.filter((r) => r.id !== id));
    } catch (e) {
      alert(e?.response?.data?.error || "Reject failed (ensure backend route exists)");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg border shadow p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Approve Repayments</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Review repayments awaiting approval.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
              placeholder="From"
            />
            <span className="text-sm self-center">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
              placeholder="To"
            />
            <button
              className="px-3 py-2 rounded border hover:bg-gray-50 text-sm"
              onClick={fetchRows}
              disabled={loading}
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border rounded-xl mt-4">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Loan Ref</th>
                <th className="p-3 text-left">Borrower</th>
                <th className="p-3 text-left">Amount</th>
                <th className="p-3 text-left">Method</th>
                <th className="p-3 text-left">Reference</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="p-4 text-gray-500">Nothing pending.</td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={7} className="p-4">Loading…</td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3">{(r.date || r.paymentDate || r.paidAt || "").slice(0,10)}</td>
                  <td className="p-3">{r.Loan?.reference || r.loanReference || `L-${r.loanId}`}</td>
                  <td className="p-3">{r.Loan?.Borrower?.name || r.borrowerName || "—"}</td>
                  <td className="p-3">{r.currency || "TZS"} {money(r.amount ?? r.amountPaid ?? 0)}</td>
                  <td className="p-3">{r.method || "—"}</td>
                  <td className="p-3">{r.reference || r.ref || "—"}</td>
                  <td className="p-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        className="px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700"
                        onClick={() => approve(r.id)}
                      >
                        Approve
                      </button>
                      <button
                        className="px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700"
                        onClick={() => reject(r.id)}
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
