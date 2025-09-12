// src/pages/SmsCenter.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../api";

/** ────────────── Utils ────────────── */
const nf = new Intl.NumberFormat();
const dt = (s) => (s ? new Date(s).toLocaleString() : "—");
const getFirst = (paths) => api.getFirst(paths);
const postFirst = (paths, body) => api.postFirst(paths, body);

// GSM-7 vs Unicode segment estimation
const GSM7 =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1BÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ`¿abcdefghijklmnopqrstuvwxyzäöñü^{}\\[~]|€";
function isUnicode(msg = "") {
  for (const ch of String(msg)) if (!GSM7.includes(ch)) return true;
  return false;
}
function segmentInfo(text) {
  const uni = isUnicode(text);
  const len = String(text || "").length;
  if (len === 0) return { uni, segs: 0, per: uni ? 70 : 160, left: uni ? 70 : 160 };
  if (!uni) {
    if (len <= 160) return { uni, segs: 1, per: 160, left: 160 - len };
    const segs = Math.ceil(len / 153);
    const rem = len % 153;
    return { uni, segs, per: 153, left: rem === 0 ? 0 : 153 - rem };
  }
  if (len <= 70) return { uni, segs: 1, per: 70, left: 70 - len };
  const segs = Math.ceil(len / 67);
  const rem = len % 67;
  return { uni, segs, per: 67, left: rem === 0 ? 0 : 67 - rem };
}
const applyTemplate = (tpl, vars = {}) =>
  String(tpl || "").replace(/\{\{(\w+)\}\}/g, (_, k) => (k in vars ? String(vars[k]) : ""));

/** ────────────── Page ────────────── */
export default function SmsCenter() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Capabilities (controls Sender field visibility)
  const [caps, setCaps] = useState({ allowBodySender: false, defaultSender: "" });

  // Balance & logs
  const [balance, setBalance] = useState(null);
  const [logs, setLogs] = useState([]);

  // Tabs
  const TABS = ["Single", "Borrowers", "CRM Groups", "CSV Upload"];
  const [tab, setTab] = useState(0);

  // Single
  const [singleTo, setSingleTo] = useState("");
  const [singleMsg, setSingleMsg] = useState("");
  const [singleFrom, setSingleFrom] = useState("");

  // Borrowers
  const [pickQuery, setPickQuery] = useState("");
  const [options, setOptions] = useState([]);
  const [picked, setPicked] = useState([]);
  const [borrowerMsg, setBorrowerMsg] = useState("Hello {{name}}, …");
  const [borrowerFrom, setBorrowerFrom] = useState("");

  // CRM Groups / Segments
  const [segBranch, setSegBranch] = useState("");
  const [segStatus, setSegStatus] = useState("");           // any | active | closed | defaulted
  const [segOverdue, setSegOverdue] = useState(false);      // in arrears
  const [segOfficer, setSegOfficer] = useState("");         // officer id/name (free text)
  const [segTemplate, setSegTemplate] = useState("Dear {{name}}, …");
  const [segFrom, setSegFrom] = useState("");

  // CSV
  const [csvFile, setCsvFile] = useState(null);
  const [csvTemplate, setCsvTemplate] = useState("Hello {{name}}, …");
  const [csvFrom, setCsvFrom] = useState("");

  /** ────────────── Loaders ────────────── */
  async function loadCaps() {
    try {
      const c = await getFirst([
        "/sms/capabilities",
        "/communications/sms/capabilities",
        "/notifications/sms/capabilities",
      ]);
      setCaps(c || { allowBodySender: false, defaultSender: "" });
    } catch {
      setCaps({ allowBodySender: false, defaultSender: "" });
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

  useEffect(() => { loadCaps(); loadBalance(); loadLogs(); }, []);

  /** Borrower quick search */
  useEffect(() => {
    const t = setTimeout(async () => {
      const q = pickQuery.trim();
      if (!q) return setOptions([]);
      try {
        const res =
          (await getFirst([
            `/sms/recipients/borrowers?q=${encodeURIComponent(q)}&limit=20`,
            `/borrowers/search?q=${encodeURIComponent(q)}&limit=20`,
            `/borrowers?search=${encodeURIComponent(q)}&limit=20`,
          ])) || {};
        const items = res.items || res.results || res.rows || [];
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
    if (balance.ok === false) return balance.error || "N/A";
    const credits =
      balance.creditsRounded ??
      balance.credits ??
      (() => {
        const raw = balance.raw || "";
        const parts = String(raw).split(",");
        const v = Number(parts[1]);
        return Number.isFinite(v) ? v : null;
      })();
    if (credits == null) return "Unknown";
    const seg = balance.estSegmentsLeft != null ? ` (~${nf.format(Math.floor(balance.estSegmentsLeft))} SMS)` : "";
    const unit = balance.unit || "credits";
    return `${nf.format(Number(credits.toFixed ? credits.toFixed(2) : credits))} ${unit}${seg}`;
  }, [balance]);

  // Segment counters for textareas
  const singleInfo = useMemo(() => segmentInfo(singleMsg), [singleMsg]);
  const borrowerInfo = useMemo(() => segmentInfo(borrowerMsg), [borrowerMsg]);
  const segTplInfo = useMemo(() => segmentInfo(segTemplate), [segTemplate]);
  const csvTplInfo = useMemo(() => segmentInfo(csvTemplate), [csvTemplate]);

  /** ────────────── Actions ────────────── */
  async function sendSingle() {
    const to = singleTo.trim();
    const message = singleMsg.trim();
    if (!to || !message) return setErr("Phone and message are required.");
    setBusy(true); setErr("");
    try {
      const from = caps.allowBodySender ? (singleFrom || undefined) : undefined;
      const r = await postFirst(
        ["/sms/send", "/communications/sms/send", "/notifications/sms"],
        { to, message, text: message, from, senderId: from }
      );
      if (r && r.ok === false) throw new Error(r.error || "Send failed");
      setSingleMsg("");
      await loadLogs();
    } catch (e) { setErr(e?.message || "Failed to send SMS."); }
    finally { setBusy(false); }
  }

  async function sendToBorrowers() {
    if (!picked.length) return setErr("Pick at least one borrower.");
    const template = borrowerMsg.trim();
    if (!template) return setErr("Message is required.");

    setBusy(true); setErr("");
    try {
      const from = caps.allowBodySender ? (borrowerFrom || undefined) : undefined;
      const messages = picked.map((p) => {
        const full = p.name || "";
        const [firstName, ...rest] = full.split(" ");
        return { to: p.phone, vars: { name: full, firstName, lastName: rest.join(" ") }, from };
      });

      const r = await postFirst(
        ["/sms/bulk", "/communications/sms/bulk", "/notifications/sms/bulk"],
        { messages, template, defaultFrom: from }
      );

      if (!r || r.ok === false) {
        // fallback loop
        for (const m of messages) {
          await postFirst(
            ["/sms/send", "/communications/sms/send", "/notifications/sms"],
            { to: m.to, message: applyTemplate(template, m.vars || {}), from, senderId: from }
          );
        }
      }
      setPicked([]); await loadLogs();
    } catch (e) { setErr(e?.message || "Bulk send failed."); }
    finally { setBusy(false); }
  }

  async function sendSegment() {
    const template = segTemplate.trim();
    if (!template) return setErr("Template is required.");
    setBusy(true); setErr("");

    const filter = {
      branchId: segBranch || undefined,
      loanStatus: segStatus || undefined,
      overdueOnly: !!segOverdue,
      officerId: segOfficer || undefined,
      limit: 500,
    };
    const from = caps.allowBodySender ? (segFrom || undefined) : undefined;

    try {
      // Prefer server side
      try {
        const r = await postFirst(["/sms/to-segment"], { filter, template, from });
        if (r && r.ok) { await loadLogs(); setBusy(false); return; }
      } catch { /* fallback below */ }

      // Fallback: fetch borrowers then bulk
      const q = new URLSearchParams({ limit: "500", branchId: filter.branchId || "" }).toString();
      const res = (await getFirst([
        `/sms/recipients/borrowers?${q}`,
        `/borrowers?${q}`,
      ])) || {};
      const items = res.items || res.results || res.rows || [];
      const recipients = (items || [])
        .map((b) => ({
          name: b.name || [b.firstName, b.lastName].filter(Boolean).join(" "),
          phone: b.phone || b.msisdn || b.mobile,
        }))
        .filter((x) => x.phone);

      const messages = recipients.map((p) => {
        const [firstName, ...rest] = (p.name || "").split(" ");
        return { to: p.phone, vars: { name: p.name, firstName, lastName: rest.join(" ") }, from };
      });

      if (!messages.length) throw new Error("No recipients matched the selected filters.");

      await postFirst(
        ["/sms/bulk", "/communications/sms/bulk", "/notifications/sms/bulk"],
        { messages, template, defaultFrom: from }
      );
      await loadLogs();
    } catch (e) { setErr(e?.message || "Segment send failed."); }
    finally { setBusy(false); }
  }

  async function uploadCsvAndSend() {
    if (!csvFile) return setErr("Choose a CSV first.");
    setBusy(true); setErr("");
    try {
      const text = await csvFile.text();
      const rows = text.split(/\r?\n/).filter((l) => l.trim().length);
      if (rows.length === 0) throw new Error("Empty CSV.");

      // very light CSV split (handles simple quoted commas)
      const smartSplit = (line) => {
        const out = [];
        let cur = "";
        let q = false;
        for (let i = 0; i < line.length; i++) {
          const c = line[i];
          if (c === '"') q = !q;
          else if (c === "," && !q) { out.push(cur); cur = ""; continue; }
          cur += c;
        }
        out.push(cur);
        return out;
      };

      const headers = smartSplit(rows[0]).map((h) => h.trim().replace(/^"|"$/g, ""));
      const lookup = (cols, key) => {
        const i = headers.findIndex((h) => h.toLowerCase() === key.toLowerCase());
        if (i < 0) return "";
        return (cols[i] || "").replace(/^"|"$/g, "").trim();
      };
      const items = rows.slice(1).map((line) => smartSplit(line));
      const from = caps.allowBodySender ? (csvFrom || undefined) : undefined;

      const messages = items
        .map((cols) => {
          const phone = lookup(cols, "phone") || lookup(cols, "msisdn") || lookup(cols, "number");
          const message = lookup(cols, "message");
          const name = lookup(cols, "name");
          const firstName = lookup(cols, "firstName") || (name ? name.split(" ")[0] : "");
          const lastName = lookup(cols, "lastName") || (name ? name.split(" ").slice(1).join(" ") : "");
          const vars = { name, firstName, lastName };
          return { to: phone, message: message || undefined, vars, from };
        })
        .filter((m) => m.to);

      if (!messages.length) throw new Error("No valid rows (need a 'phone' column).");

      await postFirst(
        ["/sms/bulk", "/communications/sms/bulk", "/notifications/sms/bulk"],
        { messages, template: csvTemplate || undefined, defaultFrom: from }
      );

      setCsvFile(null); await loadLogs();
    } catch (e) { setErr(e?.message || "CSV upload failed."); }
    finally { setBusy(false); }
  }

  /** ────────────── UI ────────────── */
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
          <button onClick={loadBalance} className="px-3 py-2 rounded-xl border hover:bg-gray-50">Refresh</button>
        </div>
      </div>
    );
  }

  const SenderHint = ({ label }) =>
    caps.allowBodySender ? (
      <input
        className="w-full rounded-xl border p-2"
        placeholder={`${label} (optional)`}
        value={
          label.includes("Single") ? singleFrom :
          label.includes("Borrower") ? borrowerFrom :
          label.includes("CSV") ? csvFrom :
          segFrom
        }
        onChange={(e) => {
          const v = e.target.value;
          if (label.includes("Single")) setSingleFrom(v);
          else if (label.includes("Borrower")) setBorrowerFrom(v);
          else if (label.includes("CSV")) setCsvFrom(v);
          else setSegFrom(v);
        }}
      />
    ) : (
      <div className="text-xs text-gray-500">
        Sender: <span className="font-medium">{caps.defaultSender || "System"}</span> (locked)
      </div>
    );

  const SegMeta = ({ info }) => (
    <div className="text-xs text-gray-500">
      {info.uni ? "Unicode" : "GSM-7"} • {info.segs} segment{info.segs === 1 ? "" : "s"} • {info.left} chars left
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4">
      <h1 className="text-2xl font-bold">SMS Center</h1>

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
              <input className="w-full rounded-xl border p-2"
                     placeholder="Phone number (e.g. 0784…, +255…)"
                     value={singleTo}
                     onChange={(e) => setSingleTo(e.target.value)} />
              <SenderHint label="Single Sender ID" />
            </div>
            <div className="space-y-1">
              <textarea className="w-full rounded-xl border p-2 h-28"
                        placeholder="Message text"
                        value={singleMsg}
                        onChange={(e) => setSingleMsg(e.target.value)} />
              <SegMeta info={singleInfo} />
            </div>
            <button disabled={busy}
                    onClick={sendSingle}
                    className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50">
              {busy ? "Sending…" : "Send"}
            </button>
            <p className="text-xs text-gray-500">Tip: avoid emojis to keep it single-segment (GSM-7).</p>
          </div>
        )}

        {/* BORROWERS */}
        {tab === 1 && (
          <div className="p-4 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <input className="rounded-xl border p-2"
                     placeholder="Search borrowers by name, phone, NID, account…"
                     value={pickQuery}
                     onChange={(e) => setPickQuery(e.target.value)} />
              <SenderHint label="Borrower Sender ID" />
            </div>

            {options.length > 0 && (
              <div className="max-h-52 overflow-auto border rounded-xl">
                {options.map((o) => {
                  const on = picked.some((p) => p.id === o.id);
                  return (
                    <label key={o.id} className="flex items-center gap-2 p-2 border-b">
                      <input type="checkbox"
                             checked={on}
                             onChange={() =>
                               setPicked((prev) => on ? prev.filter((x) => x.id !== o.id) : [...prev, o])
                             } />
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
              <textarea className="w-full rounded-xl border p-2 h-28"
                        placeholder="Template e.g. Hello {{name}}, your loan is due…"
                        value={borrowerMsg}
                        onChange={(e) => setBorrowerMsg(e.target.value)} />
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Variables: {"{{name}}"} {"{{firstName}}"} {"{{lastName}}"}</span>
                <SegMeta info={borrowerInfo} />
              </div>
            </div>

            <button disabled={busy || picked.length === 0}
                    onClick={sendToBorrowers}
                    className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50">
              Send to {picked.length} borrower{picked.length === 1 ? "" : "s"}
            </button>
          </div>
        )}

        {/* CRM GROUPS */}
        {tab === 2 && (
          <div className="p-4 space-y-3">
            <div className="grid sm:grid-cols-5 gap-3">
              <input className="rounded-xl border p-2"
                     placeholder="Branch ID"
                     value={segBranch}
                     onChange={(e) => setSegBranch(e.target.value)} />
              <select className="rounded-xl border p-2"
                      value={segStatus}
                      onChange={(e) => setSegStatus(e.target.value)}>
                <option value="">Any status</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
                <option value="defaulted">Defaulted</option>
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox"
                       checked={segOverdue}
                       onChange={(e) => setSegOverdue(e.target.checked)} />
                In arrears
              </label>
              <input className="rounded-xl border p-2"
                     placeholder="Loan officer (ID/name)"
                     value={segOfficer}
                     onChange={(e) => setSegOfficer(e.target.value)} />
              <SenderHint label="Segment Sender ID" />
            </div>
            <div className="space-y-1">
              <textarea className="w-full rounded-xl border p-2 h-28"
                        placeholder="Template e.g. Dear {{name}}, …"
                        value={segTemplate}
                        onChange={(e) => setSegTemplate(e.target.value)} />
              <SegMeta info={segTplInfo} />
            </div>
            <button disabled={busy}
                    onClick={sendSegment}
                    className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50">
              Send to group
            </button>
            <div className="text-xs text-gray-500">
              Server tries to honor CRM filters (status, arrears, officer). If not supported in this environment,
              the app falls back to a basic borrower list.
            </div>
          </div>
        )}

        {/* CSV */}
        {tab === 3 && (
          <div className="p-4 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3 items-center">
              <input type="file" accept=".csv,text/csv" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} />
              <SenderHint label="CSV Sender ID" />
            </div>
            <div className="space-y-1">
              <textarea className="w-full rounded-xl border p-2 h-24"
                        placeholder="Optional template (uses CSV column names: Hello {{name}})"
                        value={csvTemplate}
                        onChange={(e) => setCsvTemplate(e.target.value)} />
              <SegMeta info={csvTplInfo} />
            </div>
            <div className="text-xs text-gray-500">
              CSV columns: <code>phone</code>, <code>message</code> (optional), <code>name</code>, <code>firstName</code>, <code>lastName</code>…
            </div>
            <button disabled={busy}
                    onClick={uploadCsvAndSend}
                    className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50">
              Upload &amp; Send
            </button>
          </div>
        )}
      </div>

      {/* Errors */}
      {err ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 p-3 text-sm">{err}</div>
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
                  <div className={`text-xs ${
                      (m.status || "").includes("fail") ? "text-rose-600"
                        : (m.status || "").includes("queued") ? "text-emerald-600"
                        : "text-gray-500"
                    }`}>
                    {m.status || m.deliveryStatus || "—"}
                  </div>
                </div>
                <div className="text-gray-600">{m.message || m.text || m.body || ""}</div>
                <div className="text-xs text-gray-400">{dt(m.at || m.createdAt || m.sentAt || m.timestamp)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
