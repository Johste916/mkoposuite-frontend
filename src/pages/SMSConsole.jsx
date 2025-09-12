import React, { useEffect, useMemo, useState } from "react";
import api from "../api";

/** Utility formatters */
const nf = new Intl.NumberFormat();
const dt = (s) => (s ? new Date(s).toLocaleString() : "—");
const getFirst = (paths) => api.getFirst(paths);
const postFirst = (paths, body) => api.postFirst(paths, body);

// GSM-7 vs Unicode estimation
const GSM7 =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1BÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ`¿abcdefghijklmnopqrstuvwxyzäöñü^{}\\[~]|€";
const isUnicode = (s = "") => [...String(s)].some((ch) => !GSM7.includes(ch));
function segInfo(text) {
  const uni = isUnicode(text);
  const len = String(text || "").length;
  if (len === 0) return { uni, segs: 0, per: uni ? 70 : 160, left: uni ? 70 : 160 };
  if (!uni) {
    if (len <= 160) return { uni, segs: 1, per: 160, left: 160 - len };
    const segs = Math.ceil(len / 153),
      rem = len % 153;
    return { uni, segs, per: 153, left: rem === 0 ? 0 : 153 - rem };
  }
  if (len <= 70) return { uni, segs: 1, per: 70, left: 70 - len };
  const segs = Math.ceil(len / 67),
    rem = len % 67;
  return { uni, segs, per: 67, left: rem === 0 ? 0 : 67 - rem };
}
const applyTemplate = (tpl, vars = {}) =>
  String(tpl || "").replace(/\{\{(\w+)\}\}/g, (_, k) => (k in vars ? String(vars[k]) : ""));

export default function SMSConsole() {
  /** Global */
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  /** Capabilities to control sender input visibility */
  const [caps, setCaps] = useState({ allowBodySender: true, defaultSender: "" });

  /** Balance + logs */
  const [balance, setBalance] = useState(null);
  const [logs, setLogs] = useState([]);

  /** Tabs */
  const TABS = ["Single", "Borrowers", "Segments/Groups", "CSV Upload"];
  const [tab, setTab] = useState(0);

  /** Single send */
  const [singleTo, setSingleTo] = useState("");
  const [singleMsg, setSingleMsg] = useState("");
  const [singleFrom, setSingleFrom] = useState("");

  /** Borrower pick/send */
  const [pickQuery, setPickQuery] = useState("");
  const [options, setOptions] = useState([]); // borrower mini list
  const [picked, setPicked] = useState([]);
  const [borrowerMsg, setBorrowerMsg] = useState("Hello {{name}}, …");
  const [borrowerFrom, setBorrowerFrom] = useState("");

  /** Light segment filters (client-side assist) */
  const [segBranch, setSegBranch] = useState("");
  const [segActive, setSegActive] = useState(true);
  const [segOverdue, setSegOverdue] = useState(false);
  const [segTemplate, setSegTemplate] = useState("Dear {{name}}, …");
  const [segFrom, setSegFrom] = useState("");

  /** CSV */
  const [csvFile, setCsvFile] = useState(null);
  const [csvTemplate, setCsvTemplate] = useState("Hello {{name}}, …");
  const [csvFrom, setCsvFrom] = useState("");

  /** Load caps + balance + logs */
  async function loadCaps() {
    try {
      const c = await getFirst([
        "/sms/capabilities",
        "/communications/sms/capabilities",
        "/notifications/sms/capabilities",
      ]);
      setCaps(c || { allowBodySender: true, defaultSender: "" });
    } catch {
      setCaps({ allowBodySender: true, defaultSender: "" });
    }
  }
  async function loadBalance() {
    setErr("");
    try {
      const b = await getFirst([
        "/sms/balance",
        "/billing/sms/balance",
        "/notifications/sms/balance",
      ]);
      setBalance(b || null);
    } catch {
      setBalance(null);
    }
  }
  async function loadLogs() {
    try {
      const r = await getFirst([
        "/sms/messages",
        "/notifications/sms/messages",
        "/communications/sms",
      ]);
      const items = Array.isArray(r) ? r : r.items || r.messages || [];
      setLogs(items.slice(0, 100));
    } catch {
      setLogs([]);
    }
  }

  useEffect(() => {
    loadCaps();
    loadBalance();
    loadLogs();
  }, []);

  /** Borrower quick search (with graceful fallbacks) */
  useEffect(() => {
    const t = setTimeout(async () => {
      const q = pickQuery.trim();
      if (!q) {
        setOptions([]);
        return;
      }
      try {
        const res =
          (await getFirst([
            `/sms/recipients/borrowers?q=${encodeURIComponent(q)}&limit=20`,
            `/borrowers/search?q=${encodeURIComponent(q)}&limit=20`,
            `/borrowers?search=${encodeURIComponent(q)}&limit=20`,
          ])) || {};
        const items = res.items || res.results || res.rows || [];
        // Normalise to {id, name, phone}
        const norm = items.map((b) => ({
          id: b.id ?? b.borrowerId ?? b._id ?? `${b.phone || b.msisdn}-${b.id || ""}`,
          name: b.name || [b.firstName, b.lastName].filter(Boolean).join(" ") || b.fullName || "—",
          phone: b.phone || b.msisdn || b.mobile || b.phoneNumber || "",
          branchId: b.branchId ?? null,
        }));
        setOptions(norm.filter((x) => x.phone));
      } catch {
        setOptions([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [pickQuery]);

  /** Friendly balance string */
  const balanceText = useMemo(() => {
    if (!balance) return "—";
    if (balance.error === "Unauthorized" || balance.status === 401) return "Sign in again";
    if (balance.ok === false) return balance.error || "N/A";
    const credits =
      balance.creditsRounded ??
      balance.credits ??
      (() => {
        const raw = balance.raw || ""; // e.g. "OK,1827.72"
        const parts = String(raw).split(",");
        const v = Number(parts[1]);
        return Number.isFinite(v) ? v : null;
      })();
    if (credits == null) return "Unknown";
    const seg = balance.estSegmentsLeft != null ? `  (~${nf.format(Math.floor(balance.estSegmentsLeft))} SMS)` : "";
    const unit = balance.unit || "credits";
    return `${nf.format(Number(credits.toFixed ? credits.toFixed(2) : credits))} ${unit}${seg}`;
  }, [balance]);

  const singleMeta = useMemo(() => segInfo(singleMsg), [singleMsg]);
  const brMeta = useMemo(() => segInfo(borrowerMsg), [borrowerMsg]);
  const segMeta = useMemo(() => segInfo(segTemplate), [segTemplate]);
  const csvMeta = useMemo(() => segInfo(csvTemplate), [csvTemplate]);

  /** SINGLE SEND */
  async function sendSingle() {
    const to = singleTo.trim();
    const message = singleMsg.trim();
    if (!to || !message) return setErr("Phone and message are required.");
    setBusy(true);
    setErr("");
    try {
      const payload = {
        to,
        message,
        text: message, // for very old handlers
        senderId: caps.allowBodySender ? (singleFrom || undefined) : undefined,
        from: caps.allowBodySender ? (singleFrom || undefined) : undefined,
      };
      const r = await postFirst(
        ["/sms/send", "/communications/sms/send", "/notifications/sms"],
        payload
      );
      if (r && r.ok === false) throw new Error(r.error || "Send failed");
      setSingleMsg("");
      await loadLogs();
    } catch (e) {
      setErr(e?.message || "Failed to send SMS.");
    } finally {
      setBusy(false);
    }
  }

  /** SEND TO PICKED BORROWERS (bulk) */
  async function sendToBorrowers() {
    if (!picked.length) return setErr("Pick at least one borrower.");
    const template = borrowerMsg.trim();
    if (!template) return setErr("Message is required.");

    setBusy(true);
    setErr("");
    try {
      const from = caps.allowBodySender ? (borrowerFrom || undefined) : undefined;
      // Build bulk payload for /sms/bulk (preferred)
      const messages = picked.map((p) => {
        const full = p.name || "";
        const [firstName, ...rest] = full.split(" ");
        const lastName = rest.join(" ");
        const vars = { name: full, firstName, lastName };
        return { to: p.phone, vars, from };
      });

      const r = await postFirst(
        ["/sms/bulk", "/communications/sms/bulk", "/notifications/sms/bulk"],
        { messages, template, defaultFrom: from }
      );

      if (!r || r.ok === false) {
        // Fallback: if /bulk is missing, best-effort single loop (keeps UI functional)
        for (const m of messages) {
          const body = {
            to: m.to,
            message: applyTemplate(template, m.vars || {}),
            from,
            senderId: from,
          };
          await postFirst(
            ["/sms/send", "/communications/sms/send", "/notifications/sms"],
            body
          );
        }
      }
      setPicked([]);
      await loadLogs();
    } catch (e) {
      setErr(e?.message || "Bulk send failed.");
    } finally {
      setBusy(false);
    }
  }

  /** SEGMENT/GROUPS (client-side helper; tries server endpoint if present) */
  async function sendSegment() {
    const template = segTemplate.trim();
    if (!template) return setErr("Template is required.");
    setBusy(true);
    setErr("");
    try {
      // If backend provides a smart segment endpoint, use it
      try {
        const r = await postFirst(
          ["/sms/to-segment"],
          {
            filter: {
              branchId: segBranch || undefined,
              hasActiveLoan: !!segActive,
              overdueOnly: !!segOverdue,
            },
            template,
            from: caps.allowBodySender ? (segFrom || undefined) : undefined,
          }
        );
        if (r && r.ok) {
          await loadLogs();
          setBusy(false);
          return;
        }
      } catch {
        /* ignore and fallback below */
      }

      // Fallback: fetch borrowers then /sms/bulk on the client side
      const query = new URLSearchParams({
        branchId: segBranch || "",
        active: String(!!segActive),
        overdueOnly: String(!!segOverdue),
        limit: "500",
      }).toString();

      const res =
        (await getFirst([
          `/sms/recipients/borrowers?${query}`,
          `/borrowers/search?${query}`,
          `/borrowers?${query}`,
        ])) || {};

      const items = res.items || res.results || res.rows || [];
      const recipients = (items || [])
        .map((b) => ({
          name: b.name || [b.firstName, b.lastName].filter(Boolean).join(" "),
          phone: b.phone || b.msisdn || b.mobile,
        }))
        .filter((x) => x.phone);

      const messages = recipients.map((p) => {
        const full = p.name || "";
        const [firstName, ...rest] = full.split(" ");
        const lastName = rest.join(" ");
        return { to: p.phone, vars: { name: full, firstName, lastName }, from: caps.allowBodySender ? (segFrom || undefined) : undefined };
      });

      if (!messages.length) throw new Error("No recipients matched the selected filters.");

      await postFirst(
        ["/sms/bulk", "/communications/sms/bulk", "/notifications/sms/bulk"],
        { messages, template, defaultFrom: caps.allowBodySender ? (segFrom || undefined) : undefined }
      );

      await loadLogs();
    } catch (e) {
      setErr(e?.message || "Segment send failed.");
    } finally {
      setBusy(false);
    }
  }

  /** CSV: parse client-side and call /sms/bulk (no backend upload required) */
  async function uploadCsvAndSend() {
    if (!csvFile) return setErr("Choose a CSV first.");
    setBusy(true);
    setErr("");
    try {
      const text = await csvFile.text();
      const rows = text.split(/\r?\n/).filter((l) => l.trim().length);
      if (rows.length === 0) throw new Error("Empty CSV.");
      const headers = rows[0]
        .split(",")
        .map((h) => h.trim().replace(/^"|"$/g, ""));
      const lookup = (row, key) => {
        const i = headers.findIndex((h) => h.toLowerCase() === key.toLowerCase());
        if (i < 0) return "";
        return (row[i] || "").replace(/^"|"$/g, "").trim();
      };
      const items = rows.slice(1).map((line) => line.split(","));
      const from = caps.allowBodySender ? (csvFrom || undefined) : undefined;

      const messages = items
        .map((cols) => {
          const phone = lookup(cols, "phone") || lookup(cols, "msisdn") || lookup(cols, "number");
          const message = lookup(cols, "message"); // optional
          const name = lookup(cols, "name");
          const firstName = lookup(cols, "firstName") || (name ? name.split(" ")[0] : "");
          const lastName = lookup(cols, "lastName") || (name ? name.split(" ").slice(1).join(" ") : "");
          const vars = { name, firstName, lastName };
          return {
            to: phone,
            message: message || undefined,
            vars,
            from,
          };
        })
        .filter((m) => m.to);

      if (!messages.length) throw new Error("No valid rows (need a 'phone' column).");

      await postFirst(
        ["/sms/bulk", "/communications/sms/bulk", "/notifications/sms/bulk"],
        { messages, template: csvTemplate || undefined, defaultFrom: from }
      );

      setCsvFile(null);
      await loadLogs();
    } catch (e) {
      setErr(e?.message || "CSV upload failed.");
    } finally {
      setBusy(false);
    }
  }

  /** Nice balance badge */
  function BalanceCard() {
    return (
      <div className="rounded-2xl border p-4 shadow-sm bg-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-gray-500">Balance</div>
            <div className="text-2xl font-semibold">{balanceText}</div>
            {balance?.checkedAt && (
              <div className="text-xs text-gray-400">Checked {dt(balance.checkedAt)}</div>
            )}
          </div>
          <button
            onClick={loadBalance}
            className="px-3 py-2 rounded-xl border hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  const SenderField = ({ value, onChange, placeholder }) =>
    caps.allowBodySender ? (
      <input className="rounded-xl border p-2" placeholder={placeholder} value={value} onChange={onChange} />
    ) : (
      <div className="text-xs text-gray-500">
        Sender: <span className="font-medium">{caps.defaultSender || "System"}</span> (locked)
      </div>
    );

  const SegMetaLine = ({ meta }) => (
    <div className="text-xs text-gray-500">
      {meta.uni ? "Unicode" : "GSM-7"} • {meta.segs} segment{meta.segs === 1 ? "" : "s"} • {meta.left} chars left
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4">
      <h1 className="text-2xl font-bold">SMS Console</h1>

      <BalanceCard />

      {/* Tabs */}
      <div className="rounded-2xl border bg-white">
        <div className="grid grid-cols-4 text-sm font-medium border-b">
          {TABS.map((t, i) => (
            <button
              key={t}
              className={`px-4 py-3 text-left ${i === tab ? "bg-gray-50 border-b-2 border-black" : ""}`}
              onClick={() => setTab(i)}
            >
              {t}
            </button>
          ))}
        </div>

        {/* SINGLE */}
        {tab === 0 && (
          <div className="p-4 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                className="w-full rounded-xl border p-2"
                placeholder="Phone number (e.g. 0784…, +255…)"
                value={singleTo}
                onChange={(e) => setSingleTo(e.target.value)}
              />
              <SenderField
                value={singleFrom}
                onChange={(e) => setSingleFrom(e.target.value)}
                placeholder="Sender ID (optional)"
              />
            </div>
            <div className="space-y-1">
              <textarea
                className="w-full rounded-xl border p-2 h-28"
                placeholder="Message text"
                value={singleMsg}
                onChange={(e) => setSingleMsg(e.target.value)}
              />
              <SegMetaLine meta={singleMeta} />
            </div>
            <button
              disabled={busy}
              onClick={sendSingle}
              className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send"}
            </button>
            <p className="text-xs text-gray-500">
              Tip: GSM-7 texts are cheaper—avoid emojis to keep it single-segment.
            </p>
          </div>
        )}

        {/* BORROWERS */}
        {tab === 1 && (
          <div className="p-4 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                className="rounded-xl border p-2"
                placeholder="Search borrowers by name or phone…"
                value={pickQuery}
                onChange={(e) => setPickQuery(e.target.value)}
              />
              <SenderField
                value={borrowerFrom}
                onChange={(e) => setBorrowerFrom(e.target.value)}
                placeholder="Sender ID (optional)"
              />
            </div>

            {options.length > 0 && (
              <div className="max-h-52 overflow-auto border rounded-xl">
                {options.map((o) => {
                  const on = picked.some((p) => p.id === o.id);
                  return (
                    <label key={o.id} className="flex items-center gap-2 p-2 border-b">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          setPicked((prev) =>
                            on ? prev.filter((x) => x.id !== o.id) : [...prev, o]
                          )
                        }
                      />
                      <div className="flex-1">
                        <div className="font-medium">{o.name}</div>
                        <div className="text-xs text-gray-500">{o.phone}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="space-y-1">
              <textarea
                className="w-full rounded-xl border p-2 h-28"
                placeholder="Template e.g. Hello {{name}}, your loan is due…"
                value={borrowerMsg}
                onChange={(e) => setBorrowerMsg(e.target.value)}
              />
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Variables: {"{{name}}"} {"{{firstName}}"} {"{{lastName}}"}</span>
                <SegMetaLine meta={brMeta} />
              </div>
            </div>

            <button
              disabled={busy || picked.length === 0}
              onClick={sendToBorrowers}
              className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50"
            >
              Send to {picked.length} borrower{picked.length === 1 ? "" : "s"}
            </button>
          </div>
        )}

        {/* SEGMENTS / GROUPS */}
        {tab === 2 && (
          <div className="p-4 space-y-3">
            <div className="grid sm:grid-cols-4 gap-3">
              <input
                className="rounded-xl border p-2"
                placeholder="Branch ID (optional)"
                value={segBranch}
                onChange={(e) => setSegBranch(e.target.value)}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={segActive}
                  onChange={(e) => setSegActive(e.target.checked)}
                />
                Active loans
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={segOverdue}
                  onChange={(e) => setSegOverdue(e.target.checked)}
                />
                Overdue only
              </label>
              <SenderField
                value={segFrom}
                onChange={(e) => setSegFrom(e.target.value)}
                placeholder="Sender ID (optional)"
              />
            </div>
            <div className="space-y-1">
              <textarea
                className="w-full rounded-xl border p-2 h-28"
                placeholder="Template e.g. Dear {{name}}, …"
                value={segTemplate}
                onChange={(e) => setSegTemplate(e.target.value)}
              />
              <SegMetaLine meta={segMeta} />
            </div>
            <button
              disabled={busy}
              onClick={sendSegment}
              className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50"
            >
              Send to segment
            </button>
            <div className="text-xs text-gray-500">
              If your server doesn’t expose <code>/sms/to-segment</code>, this will fetch
              borrowers client-side then send in bulk.
            </div>
          </div>
        )}

        {/* CSV */}
        {tab === 3 && (
          <div className="p-4 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3 items-center">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              />
              <SenderField
                value={csvFrom}
                onChange={(e) => setCsvFrom(e.target.value)}
                placeholder="Sender ID (optional)"
              />
            </div>
            <div className="space-y-1">
              <textarea
                className="w-full rounded-xl border p-2 h-24"
                placeholder="Optional template (uses CSV column names: e.g. Hello {{name}})"
                value={csvTemplate}
                onChange={(e) => setCsvTemplate(e.target.value)}
              />
              <SegMetaLine meta={csvMeta} />
            </div>
            <div className="text-xs text-gray-500">
              CSV columns: <code>phone</code>, <code>message</code> (optional),{" "}
              <code>name</code>, <code>firstName</code>, <code>lastName</code>…
            </div>
            <button
              disabled={busy}
              onClick={uploadCsvAndSend}
              className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50"
            >
              Upload &amp; Send
            </button>
          </div>
        )}
      </div>

      {/* Errors */}
      {err ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 p-3 text-sm">
          {err}
        </div>
      ) : null}

      {/* Recent messages */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="text-sm font-medium mb-2">Recent Messages</div>
        {logs.length === 0 ? (
          <div className="text-gray-500 text-sm">No messages yet.</div>
        ) : (
          <div className="divide-y">
            {logs.map((m, i) => (
              <div key={m.id || m.messageId || i} className="py-2 text-sm">
                <div className="flex justify-between">
                  <div className="font-medium">{m.to || m.phone || m.msisdn}</div>
                  <div
                    className={`text-xs ${
                      (m.status || "").includes("fail")
                        ? "text-rose-600"
                        : (m.status || "").includes("queued")
                        ? "text-emerald-600"
                        : "text-gray-500"
                    }`}
                  >
                    {m.status || m.deliveryStatus || "—"}
                  </div>
                </div>
                <div className="text-gray-600">{m.message || m.text || m.body || ""}</div>
                <div className="text-xs text-gray-400">
                  {dt(m.at || m.createdAt || m.sentAt || m.timestamp)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
