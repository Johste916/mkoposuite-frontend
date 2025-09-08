import React, { useState } from "react";
import api from "../api";

export default function BillingByPhone() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [err, setErr] = useState("");

  const [charge, setCharge] = useState({ amount: "", currency: "TZS", memo: "" });
  const [charging, setCharging] = useState(false);

  async function lookup() {
    if (!phone.trim()) return;
    setLoading(true);
    setErr("");
    try {
      const res = await api.getFirst([
        `/billing/by-phone/${encodeURIComponent(phone.trim())}`,
        `/admin/billing/by-phone/${encodeURIComponent(phone.trim())}`,
        `/billing/phone/${encodeURIComponent(phone.trim())}`,
        `/billing/invoices?phone=${encodeURIComponent(phone.trim())}`,
      ]);
      const items = Array.isArray(res) ? res : res.items || res.invoices || [];
      setInvoices(items);
    } catch (e) {
      setErr(e.normalizedMessage || "Lookup failed.");
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }

  async function submitCharge() {
    if (!phone.trim() || !charge.amount) return;
    setCharging(true);
    setErr("");
    try {
      await api.postFirst(
        ["/billing/charge-by-phone", "/admin/billing/charge-by-phone"],
        {
          phone: phone.trim(),
          amount: Number(charge.amount),
          currency: charge.currency || "TZS",
          memo: charge.memo || undefined,
        }
      );
      await lookup();
      setCharge({ amount: "", currency: charge.currency, memo: "" });
    } catch (e) {
      setErr(e.normalizedMessage || "Charge failed.");
    } finally {
      setCharging(false);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Billing by Phone</h1>

      <div className="card" style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Lookup invoices</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            placeholder="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button onClick={lookup} disabled={loading}>
            {loading ? "Looking up…" : "Search"}
          </button>
        </div>
      </div>

      <div className="card" style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Charge phone</h3>
        <div style={{ display: "grid", gap: 8, maxWidth: 420 }}>
          <label>
            Amount
            <input
              type="number"
              value={charge.amount}
              onChange={(e) => setCharge({ ...charge, amount: e.target.value })}
            />
          </label>
          <label>
            Currency
            <input
              value={charge.currency}
              onChange={(e) => setCharge({ ...charge, currency: e.target.value })}
              placeholder="TZS"
            />
          </label>
          <label>
            Memo (optional)
            <input
              value={charge.memo}
              onChange={(e) => setCharge({ ...charge, memo: e.target.value })}
            />
          </label>
          <div>
            <button onClick={submitCharge} disabled={charging}>
              {charging ? "Charging…" : "Charge"}
            </button>
          </div>
        </div>
      </div>

      {err ? <p style={{ color: "crimson" }}>{err}</p> : null}

      <h3>Invoices</h3>
      {invoices.length === 0 ? (
        <p style={{ opacity: 0.7 }}>No invoices.</p>
      ) : (
        <table width="100%" cellPadding={8}>
          <thead>
            <tr>
              <th align="left">Number</th>
              <th align="left">Date</th>
              <th align="left">Status</th>
              <th align="right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id || inv.number}>
                <td>{inv.number || inv.id}</td>
                <td>{inv.date || inv.issuedAt || inv.createdAt}</td>
                <td>{inv.status || "—"}</td>
                <td align="right">
                  {inv.totalFormatted || inv.total || inv.amount || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
