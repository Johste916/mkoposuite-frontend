import React, { useEffect, useState } from "react";
import api from "../../api";

export default function Billing() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get("/billing/summary");
        if (!mounted) return;
        setSummary(res.data || null);
      } catch (e) {
        // If endpoint isn’t ready, show read-only “not configured”
        if (!mounted) return;
        setSummary(null);
        setError("Billing is not configured yet.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="text-sm text-slate-500">Loading billing…</div>;

  if (!summary) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Billing</h1>
        <div className="p-4 rounded-lg border bg-amber-50 text-amber-800 text-sm">
          {error || "No billing summary available."}
        </div>
        <p className="text-xs text-slate-500">
          When your billing API is ready, this page auto-populates from <code>/billing/summary</code>.
        </p>
      </div>
    );
  }

  const {
    plan = "Unknown",
    status = "Unknown",
    seats = 1,
    nextInvoice = null,
    invoices = [],
  } = summary;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Billing</h1>
        <p className="text-sm text-slate-500">Manage plan, seats and invoices.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="border rounded-lg p-4">
          <div className="text-xs uppercase text-slate-500 mb-1">Plan</div>
          <div className="text-lg font-semibold">{plan}</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-xs uppercase text-slate-500 mb-1">Status</div>
          <div className="text-lg font-semibold">{status}</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-xs uppercase text-slate-500 mb-1">Seats</div>
          <div className="text-lg font-semibold">{seats}</div>
        </div>
      </section>

      <section className="border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Next Invoice</div>
            <div className="text-xs text-slate-500">Upcoming billing cycle</div>
          </div>
          <button
            onClick={async () => {
              try {
                await api.post("/billing/portal");
                // If you return a URL, you can replace with window.location = url
              } catch {
                alert("Billing portal not configured yet.");
              }
            }}
            className="h-9 px-3 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm"
          >
            Open Billing Portal
          </button>
        </div>
        <div className="mt-3 text-sm">
          {nextInvoice ? (
            <div>
              Amount: <span className="font-medium">{nextInvoice.amount}</span> ·
              Date: <span className="font-medium">{nextInvoice.date}</span>
            </div>
          ) : (
            <div className="text-slate-500">No upcoming invoice found.</div>
          )}
        </div>
      </section>

      <section className="border rounded-lg p-4">
        <div className="text-sm font-medium mb-3">Invoices</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length ? invoices.map((inv) => (
                <tr key={inv.id} className="border-t">
                  <td className="py-2 pr-4">{inv.date}</td>
                  <td className="py-2 pr-4">{inv.amount}</td>
                  <td className="py-2 pr-4">{inv.status}</td>
                  <td className="py-2 pr-4">
                    <button
                      className="text-blue-600 hover:underline"
                      onClick={() => inv.url ? (window.location = inv.url) : alert("No URL")}
                    >
                      View
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td className="py-2 text-slate-500" colSpan={4}>No invoices.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
