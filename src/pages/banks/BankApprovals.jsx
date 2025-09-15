// src/pages/banks/BankApprovals.jsx
import React, { useEffect, useState } from "react";
import {
  listBankingApprovals,
  approveBankingItem,
  rejectBankingItem,
} from "../../services/banking"; // <-- fixed path

const card = "bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-5 md:p-7";

export default function BankApprovals() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await listBankingApprovals();
      // normalize: accept {items:[]} or []
      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
        ? data.items
        : [];
      setRows(items);
    } catch (e) {
      setErr(e?.normalizedMessage || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (id, action) => {
    try {
      if (action === "approve") await approveBankingItem(id);
      else await rejectBankingItem(id, { reason: "Rejected in UI" });
      await load();
    } catch (e) {
      setErr(e?.normalizedMessage || String(e));
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Banking Approvals</h1>
        <button
          className="px-3 py-2 rounded border hover:bg-gray-50"
          onClick={load}
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {err && <div className="text-sm text-red-600 mb-3">{err}</div>}

      <section className={card}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-gray-600">
              <tr>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Kind</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4 text-right">Amount</th>
                <th className="py-2 pr-4">Ref</th>
                <th className="py-2 pr-4">Requested By</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => {
                const kind =
                  x.kind || x.group || x.accountType || x.source || "bank";
                const occurred = x.occurredAt || x.createdAt || x.submittedAt;
                const amt = x.amount ?? x.txAmount ?? x.value;
                return (
                  <tr key={x.id} className="border-t">
                    <td className="py-2 pr-4">
                      {occurred ? new Date(occurred).toLocaleString() : "—"}
                    </td>
                    <td className="py-2 pr-4 capitalize">{String(kind)}</td>
                    <td className="py-2 pr-4">{x.type || x.txType || "—"}</td>
                    <td className="py-2 pr-4 text-right">
                      {amt != null ? Number(amt).toLocaleString() : "—"}{" "}
                      {x.currency || x.ccy || ""}
                    </td>
                    <td className="py-2 pr-4">{x.reference || x.ref || "—"}</td>
                    <td className="py-2 pr-4">{x.requestedBy || x.actor || "—"}</td>
                    <td className="py-2 pr-4">
                      <div className="flex gap-2">
                        <button
                          className="px-2 py-1 bg-green-600 text-white rounded"
                          onClick={() => act(x.id, "approve")}
                        >
                          Approve
                        </button>
                        <button
                          className="px-2 py-1 bg-red-600 text-white rounded"
                          onClick={() => act(x.id, "reject")}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!rows.length && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-gray-500">
                    No pending items
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
