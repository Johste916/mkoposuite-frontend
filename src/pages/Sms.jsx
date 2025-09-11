import React, { useState } from "react";
import api from "../api";

const Sms = () => {
  const [to, setTo] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [recent, setRecent] = useState([]);

  async function send() {
    setError("");
    setSending(true);

    const payload = { to, message: text };

    // Try preferred endpoint first, then legacy aliases (so old builds still work)
    const endpoints = [
      "/sms/send",                 // => /api/sms/send
      "/communications/sms/send",  // legacy
      "/notifications/sms",        // legacy
    ];

    let resp = null;
    let lastErr = null;

    for (const ep of endpoints) {
      try {
        resp = await api.post(ep, payload);
        break; // success
      } catch (e) {
        lastErr = e;
        if (e?.response?.status === 404) continue; // try next
        break; // other errors (400/500) -> stop
      }
    }

    setSending(false);

    if (!resp || resp.status >= 400) {
      const msg =
        lastErr?.response?.data?.error ||
        lastErr?.message ||
        "Failed to send";
      setError(msg);
      return;
    }

    const data = resp.data || {};
    setRecent((list) => [
      {
        id: data.providerId || Date.now().toString(),
        to,
        text,
        at: new Date().toISOString(),
        status: data.ok ? "sent" : "queued",
        provider: data.provider || "smsco",
      },
      ...list,
    ]);

    setTo("");
    setText("");
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">SMS Console</h2>

      <div className="max-w-xl space-y-3">
        <div>
          <label className="block text-sm mb-1">Recipient</label>
          <input
            className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            placeholder="e.g. 0769… or +2557…"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Message</label>
          <textarea
            className="w-full h-28 px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            placeholder="Type your message…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={send}
            disabled={sending || !to || !text}
            className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
          >
            {sending ? "Sending…" : "Send"}
          </button>
          {error && <span className="text-sm text-rose-600">{error}</span>}
        </div>

        <div className="pt-4">
          <h3 className="font-medium mb-2">Recent Messages</h3>
          {recent.length === 0 ? (
            <p className="text-sm text-slate-500">No messages yet.</p>
          ) : (
            <ul className="space-y-2">
              {recent.map((m) => (
                <li key={m.id} className="border rounded p-2 text-sm">
                  <div className="text-slate-800 dark:text-slate-200">
                    <span className="font-medium">{m.to}</span> — {m.text}
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(m.at).toLocaleString()} • {m.provider} • {m.status}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sms;
