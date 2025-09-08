import React, { useEffect, useState } from "react";
import api from "../api";

export default function SMSConsole() {
  const [phone, setPhone] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [balance, setBalance] = useState(null);
  const [err, setErr] = useState("");
  const [history, setHistory] = useState([]);

  async function loadBalance() {
    setErr("");
    try {
      const d = await api.getFirst([
        "/sms/balance",
        "/billing/sms/balance",
        "/notifications/sms/balance",
      ]);
      setBalance(d);
    } catch {
      setBalance(null); // optional feature
    }
  }

  async function loadHistory() {
    try {
      const r = await api.getFirst([
        "/sms/messages",
        "/notifications/sms/messages",
        "/communications/sms",
      ]);
      const items = Array.isArray(r) ? r : r.items || r.messages || [];
      setHistory(items.slice(0, 50));
    } catch {
      setHistory([]);
    }
  }

  useEffect(() => {
    loadBalance();
    loadHistory();
  }, []);

  async function sendSms() {
    if (!phone.trim() || !text.trim()) return;
    setSending(true);
    setErr("");
    try {
      const payload = { to: phone.trim(), text: text.trim() };
      const r = await api.postFirst(
        ["/sms/send", "/communications/sms/send", "/notifications/sms"],
        payload
      );
      // optimistic refresh
      setText("");
      await loadHistory();
      return r;
    } catch (e) {
      setErr(e.normalizedMessage || "Failed to send SMS.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>SMS Console</h1>
      {balance && (
        <div className="card" style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8, marginBottom: 12 }}>
          <b>Balance:</b>{" "}
          <code>{JSON.stringify(balance)}</code>
        </div>
      )}

      <div className="card" style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Send SMS</h3>
        <div style={{ display: "grid", gap: 8, maxWidth: 520 }}>
          <input
            placeholder="Phone number (E.164 preferred, e.g. +2557...)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <textarea
            placeholder="Message text"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div>
            <button onClick={sendSms} disabled={sending}>
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
          {err ? <p style={{ color: "crimson" }}>{err}</p> : null}
        </div>
      </div>

      <h3>Recent Messages</h3>
      {history.length === 0 ? (
        <p style={{ opacity: 0.7 }}>No messages yet.</p>
      ) : (
        <table width="100%" cellPadding={8}>
          <thead>
            <tr>
              <th align="left">ID</th>
              <th align="left">To</th>
              <th align="left">Status</th>
              <th align="left">Text</th>
              <th align="left">At</th>
            </tr>
          </thead>
          <tbody>
            {history.map((m) => (
              <tr key={m.id || m.messageId}>
                <td>{m.id || m.messageId}</td>
                <td>{m.to || m.phone || m.msisdn}</td>
                <td>{m.status || m.deliveryStatus || "—"}</td>
                <td>{m.text || m.body}</td>
                <td>{m.createdAt || m.sentAt || m.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
