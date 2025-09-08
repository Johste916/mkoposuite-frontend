import React, { useEffect, useMemo, useState } from "react";
import api from "../api";

const STATUS_OPTIONS = ["OPEN", "RESOLVED", "CANCELED"];

function TicketRow({ t, onUpdateStatus, onAddComment }) {
  const [note, setNote] = useState("");
  return (
    <tr>
      <td>{t.id}</td>
      <td>{t.subject || t.title || "(no subject)"}</td>
      <td>{t.requesterEmail || t.requester || t.createdBy || "—"}</td>
      <td>{t.status}</td>
      <td>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onUpdateStatus(t, s)}
              disabled={t.status === s}
            >
              {s}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add internal note / comment"
            style={{ width: 220 }}
          />
          <button
            onClick={() => {
              if (note.trim()) onAddComment(t, note.trim()).then(() => setNote(""));
            }}
          >
            Comment
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function SupportTickets() {
  const [tab, setTab] = useState("OPEN");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ subject: "", message: "" });

  const basePaths = useMemo(
    () => ({
      list: ["/support/tickets", "/admin/support/tickets", "/tickets?type=support", "/tickets"],
      create: ["/support/tickets", "/admin/support/tickets", "/tickets"],
      update: (id) => [`/support/tickets/${id}`, `/admin/support/tickets/${id}`, `/tickets/${id}`],
      comment: (id) => [
        `/support/tickets/${id}/comments`,
        `/admin/support/tickets/${id}/comments`,
        `/tickets/${id}/comments`,
      ],
    }),
    []
  );

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await api.getFirst(basePaths.list);
      const items = Array.isArray(data) ? data : data.items || data.tickets || [];
      setTickets(items.filter((t) => (t.status || "OPEN").toUpperCase() === tab));
    } catch (e) {
      setErr(e.normalizedMessage || "Failed to load tickets.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function createTicket() {
    if (!form.subject.trim() || !form.message.trim()) return;
    setCreating(true);
    setErr("");
    try {
      await api.postFirst(basePaths.create, {
        subject: form.subject.trim(),
        message: form.message.trim(),
        origin: "admin_console",
      });
      setForm({ subject: "", message: "" });
      await load();
    } catch (e) {
      setErr(e.normalizedMessage || "Failed to create ticket.");
    } finally {
      setCreating(false);
    }
  }

  async function updateStatus(ticket, status) {
    try {
      // prefer PATCH, fallback to POST /event
      await api.patchFirst(basePaths.update(ticket.id), { status });
      await load();
    } catch {
      try {
        await api.postFirst(
          basePaths.update(ticket.id).map((p) => `${p}/event`),
          { type: "status", status }
        );
        await load();
      } catch (e2) {
        setErr(e2.normalizedMessage || "Failed to update status.");
      }
    }
  }

  async function addComment(ticket, text) {
    try {
      await api.postFirst(basePaths.comment(ticket.id), { text });
      await load();
    } catch (e) {
      setErr(e.normalizedMessage || "Failed to add comment.");
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Support Tickets</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setTab(s)}
            style={{
              background: tab === s ? "#333" : "#eee",
              color: tab === s ? "#fff" : "#000",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="card" style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Create Ticket</h3>
        <div style={{ display: "grid", gap: 8, maxWidth: 560 }}>
          <input
            placeholder="Subject"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          />
          <textarea
            placeholder="Describe the issue…"
            rows={4}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
          <div>
            <button onClick={createTicket} disabled={creating}>
              {creating ? "Submitting…" : "Submit Ticket"}
            </button>
          </div>
        </div>
      </div>

      {err ? <p style={{ color: "crimson" }}>{err}</p> : null}
      {loading ? <p>Loading…</p> : null}

      <table width="100%" cellPadding={8}>
        <thead>
          <tr>
            <th align="left">ID</th>
            <th align="left">Subject</th>
            <th align="left">Requester</th>
            <th align="left">Status</th>
            <th align="left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <TicketRow
              key={t.id}
              t={t}
              onUpdateStatus={updateStatus}
              onAddComment={addComment}
            />
          ))}
        </tbody>
      </table>
      {tickets.length === 0 && !loading && (
        <p style={{ opacity: 0.7 }}>No tickets in "{tab}"</p>
      )}
    </div>
  );
}
