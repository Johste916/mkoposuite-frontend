import React, { useEffect, useMemo, useState } from "react";

/** ---------- tiny helpers ---------- */
const gsm7 =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1BÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ`¿abcdefghijklmnopqrstuvwxyzäöñü^{}\\[~]|€";
function usesUnicode(s) {
  for (const ch of s) {
    if (!gsm7.includes(ch)) return true;
  }
  return false;
}
function smsSegments(text) {
  const isUnicode = usesUnicode(text);
  const len = text.length;
  if (len === 0) return { isUnicode, segments: 0, perSegment: isUnicode ? 70 : 160, charsLeft: isUnicode ? 70 : 160 };
  if (!isUnicode) {
    if (len <= 160) return { isUnicode, segments: 1, perSegment: 160, charsLeft: 160 - len };
    const seg = Math.ceil(len / 153);
    const mod = len % 153;
    return { isUnicode, segments: seg, perSegment: 153, charsLeft: mod === 0 ? 0 : 153 - mod };
  }
  if (len <= 70) return { isUnicode, segments: 1, perSegment: 70, charsLeft: 70 - len };
  const seg = Math.ceil(len / 67);
  const mod = len % 67;
  return { isUnicode, segments: seg, perSegment: 67, charsLeft: mod === 0 ? 0 : 67 - mod };
}
function cls(...xs) { return xs.filter(Boolean).join(" "); }
function formatTZ(msisdn) {
  // Accepts 0784..., +255784..., 255784..., returns "2557..."
  if (!msisdn) return "";
  let p = String(msisdn).replace(/[^\d+]/g, "");
  if (p.startsWith("+255")) p = p.slice(1);
  else if (p.startsWith("0")) p = "255" + p.slice(1);
  else if (p.startsWith("+")) p = p.slice(1);
  return p;
}

/** ---------- API base ---------- */
const API_BASE = import.meta.env.VITE_API_BASE || ""; // e.g., https://mkoposuite-backend…/api
const withApi = (p) => `${API_BASE.replace(/\/+$/,"")}/api${p}`;

/** ---------- Simple toast ---------- */
function Toast({ kind = "ok", msg, onClose }) {
  const styles = {
    ok: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    err: "bg-rose-50 text-rose-800 ring-rose-200",
    info: "bg-sky-50 text-sky-800 ring-sky-200",
  }[kind];
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={cls("fixed right-4 top-4 z-50 rounded-xl px-4 py-3 ring-1 shadow", styles)}>
      <div className="font-medium">{msg}</div>
    </div>
  );
}

/** ---------- Main component ---------- */
export default function Sms() {
  const [tab, setTab] = useState("single"); // single | multiple | segment
  const [balance, setBalance] = useState(null);
  const [sender, setSender] = useState(""); // placeholder shows default
  const [text, setText] = useState("");
  const [phone, setPhone] = useState(""); // single recipient
  const [logs, setLogs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  // Borrower list (for multiple)
  const [brwSearch, setBrwSearch] = useState("");
  const [brwPage, setBrwPage] = useState(1);
  const [brwSize, setBrwSize] = useState(25);
  const [brwItems, setBrwItems] = useState([]);
  const [brwTotal, setBrwTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Segment builder (very light and safe)
  const [segBranch, setSegBranch] = useState("");
  const [segHasActiveLoan, setSegHasActiveLoan] = useState(true);
  const [segOverdueOnly, setSegOverdueOnly] = useState(false);

  const segInfo = useMemo(() => smsSegments(text), [text]);

  /* -------- load balance + logs -------- */
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(withApi("/sms/balance"), { credentials: "include" });
        const j = await r.json();
        setBalance(j);
      } catch {}
    })();
    (async () => {
      try {
        const r = await fetch(withApi("/sms/messages"), { credentials: "include" });
        const j = await r.json();
        setLogs(Array.isArray(j.items) ? j.items : []);
      } catch {}
    })();
  }, []);

  /* -------- borrowers list (multiple) -------- */
  useEffect(() => {
    if (tab !== "multiple") return;
    const ctrl = new AbortController();
    (async () => {
      try {
        // Your API supports many shapes; this keeps it tolerant
        const q = new URLSearchParams();
        if (brwSearch) q.set("q", brwSearch);
        q.set("page", String(brwPage));
        q.set("limit", String(brwSize));
        const r = await fetch(withApi(`/borrowers?${q.toString()}`), { credentials: "include", signal: ctrl.signal });
        const j = await r.json();
        const items = Array.isArray(j) ? j : (j.items || []);
        setBrwItems(items);
        const total = Number(r.headers.get("X-Total-Count") || items.length || 0);
        setBrwTotal(total);
      } catch (e) { /* ignore on tab switch */ }
    })();
    return () => ctrl.abort();
  }, [tab, brwSearch, brwPage, brwSize]);

  /* -------- actions -------- */
  function notice(kind, msg) { setToast({ kind, msg }); }

  async function sendSingle() {
    const to = formatTZ(phone);
    if (!to) return notice("err", "Please enter a valid phone number");
    if (!text.trim()) return notice("err", "Please type a message");
    setBusy(true);
    try {
      const r = await fetch(withApi("/sms/send"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ to, message: text, from: sender || undefined }),
      });
      const j = await r.json();
      if (!r.ok || j.ok === false) throw new Error(j.error || "Failed");
      notice("ok", "Message queued");
      setText("");
      refreshLogs();
    } catch (e) {
      notice("err", e.message);
    } finally { setBusy(false); }
  }

  async function sendMultiple() {
    if (selectedIds.size === 0) return notice("err", "Select at least one borrower");
    if (!text.trim()) return notice("err", "Please type a message");
    setBusy(true);
    try {
      // Let the backend resolve borrower IDs to phones to avoid leaking logic to the client
      const r = await fetch(withApi("/sms/to-borrowers"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          borrowerIds: Array.from(selectedIds),
          template: text, // supports {{name}}
          from: sender || undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok || j.ok === false) throw new Error(j.error || "Failed");
      notice("ok", `Queued ${j.count} messages`);
      setSelectedIds(new Set());
      refreshLogs();
    } catch (e) {
      notice("err", e.message);
    } finally { setBusy(false); }
  }

  async function sendSegment() {
    if (!text.trim()) return notice("err", "Please type a message");
    setBusy(true);
    try {
      const r = await fetch(withApi("/sms/to-segment"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          filter: {
            branchId: segBranch || null,
            hasActiveLoan: !!segHasActiveLoan,
            overdueOnly: !!segOverdueOnly,
          },
          template: text,
          from: sender || undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok || j.ok === false) throw new Error(j.error || "Failed");
      notice("ok", `Queued ${j.count} messages`);
      refreshLogs();
    } catch (e) {
      notice("err", e.message);
    } finally { setBusy(false); }
  }

  async function refreshLogs() {
    try {
      const r = await fetch(withApi("/sms/messages"), { credentials: "include" });
      const j = await r.json();
      setLogs(Array.isArray(j.items) ? j.items : []);
    } catch {}
  }

  /* -------- render -------- */
  const selectedCount = selectedIds.size;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {toast && <Toast kind={toast.kind} msg={toast.msg} onClose={() => setToast(null)} />}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">SMS Console</h2>
          <p className="text-sm text-slate-500">Send one-off or bulk SMS via sms.co.tz</p>
        </div>
        <div className="rounded-xl border bg-white px-4 py-2 text-sm text-slate-700 shadow-sm">
          <div className="font-medium">Balance</div>
          <div className="text-slate-600">
            {balance ? JSON.stringify(balance) : "…"}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        {["single","multiple","segment"].map(k => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cls(
              "rounded-xl px-3 py-2 text-sm font-medium ring-1",
              tab === k ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
            )}
          >
            {k === "single" && "Single Borrower"}
            {k === "multiple" && "Multiple Borrowers"}
            {k === "segment" && "Group / Segment"}
          </button>
        ))}
      </div>

      {/* Composer */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 rounded-2xl border bg-white p-4 shadow-sm">
          <div className="grid gap-3">
            {/* Sender */}
            <div className="grid gap-1">
              <label className="text-sm font-medium text-slate-700">Sender ID (optional)</label>
              <input
                className="w-full rounded-xl border px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800"
                placeholder="Uses default if left blank"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
              />
            </div>

            {/* Recipient / selection controls */}
            {tab === "single" && (
              <div className="grid gap-1">
                <label className="text-sm font-medium text-slate-700">Recipient phone</label>
                <input
                  className="w-full rounded-xl border px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800"
                  placeholder="e.g., 0784 123 456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            )}

            {tab === "multiple" && (
              <div className="rounded-xl border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex gap-2">
                    <input
                      className="w-64 rounded-lg border px-3 py-2 text-sm"
                      placeholder="Search borrowers"
                      value={brwSearch}
                      onChange={(e) => { setBrwSearch(e.target.value); setBrwPage(1); }}
                    />
                    <select className="rounded-lg border px-3 py-2 text-sm" value={brwSize} onChange={(e)=>setBrwSize(Number(e.target.value))}>
                      {[10,25,50,100].map(n => <option key={n} value={n}>{n}/page</option>)}
                    </select>
                  </div>
                  <div className="text-sm text-slate-600">
                    Selected: <span className="font-medium">{selectedCount}</span>
                  </div>
                </div>
                <div className="max-h-64 overflow-auto rounded-lg border">
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50">
                      <tr className="text-left">
                        <th className="px-3 py-2"><input
                          type="checkbox"
                          onChange={(e) => {
                            const next = new Set(selectedIds);
                            if (e.target.checked) brwItems.forEach(b => next.add(String(b.id)));
                            else brwItems.forEach(b => next.delete(String(b.id)));
                            setSelectedIds(next);
                          }}
                          checked={brwItems.every(b => selectedIds.has(String(b.id))) && brwItems.length>0}
                        /></th>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Phone</th>
                        <th className="px-3 py-2">Branch</th>
                      </tr>
                    </thead>
                    <tbody>
                      {brwItems.map(b => (
                        <tr key={b.id} className="border-t hover:bg-slate-50">
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(String(b.id))}
                              onChange={(e) => {
                                const next = new Set(selectedIds);
                                e.target.checked ? next.add(String(b.id)) : next.delete(String(b.id));
                                setSelectedIds(next);
                              }}
                            />
                          </td>
                          <td className="px-3 py-2">{b.name || `${b.firstName ?? ""} ${b.lastName ?? ""}`.trim() || "-"}</td>
                          <td className="px-3 py-2">{b.phone || b.msisdn || "-"}</td>
                          <td className="px-3 py-2">{b.branchName || b.branch || "-"}</td>
                        </tr>
                      ))}
                      {brwItems.length === 0 && (
                        <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={4}>No borrowers</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-xs text-slate-500">Total: {brwTotal}</div>
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-lg border px-2 py-1 text-sm"
                      onClick={() => setBrwPage(p => Math.max(1, p - 1))}
                      disabled={brwPage <= 1}
                    >Prev</button>
                    <div className="text-sm">Page {brwPage}</div>
                    <button
                      className="rounded-lg border px-2 py-1 text-sm"
                      onClick={() => setBrwPage(p => p + 1)}
                      disabled={brwPage * brwSize >= brwTotal}
                    >Next</button>
                  </div>
                </div>
              </div>
            )}

            {tab === "segment" && (
              <div className="rounded-xl border p-3 grid gap-3 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">Branch (optional)</label>
                  <input
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                    placeholder="Branch ID or code"
                    value={segBranch}
                    onChange={(e)=>setSegBranch(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input id="hasloan" type="checkbox" checked={segHasActiveLoan} onChange={(e)=>setSegHasActiveLoan(e.target.checked)} />
                  <label htmlFor="hasloan" className="text-sm text-slate-700">Has active loan</label>
                </div>
                <div className="flex items-center gap-2">
                  <input id="overdue" type="checkbox" checked={segOverdueOnly} onChange={(e)=>setSegOverdueOnly(e.target.checked)} />
                  <label htmlFor="overdue" className="text-sm text-slate-700">Overdue only</label>
                </div>
                <p className="md:col-span-3 text-xs text-slate-500">
                  Tip: you can start simple. Filters are optional and safely ignored if unsupported by the backend.
                </p>
              </div>
            )}

            {/* Message */}
            <div className="grid gap-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Message</label>
                <span className="text-xs text-slate-500">
                  {segInfo.isUnicode ? "Unicode" : "GSM-7"} • {segInfo.segments} segment{segInfo.segments===1?"":"s"} • {segInfo.charsLeft} chars left in this segment
                </span>
              </div>
              <textarea
                className="min-h-[120px] w-full resize-y rounded-xl border px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800"
                placeholder="Type your message. You can use {{name}} in templates for multiple/segment sends."
                value={text}
                onChange={(e)=>setText(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              {tab === "single" && (
                <button
                  onClick={sendSingle}
                  disabled={busy}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-white shadow hover:bg-slate-800 disabled:opacity-50"
                >
                  {busy ? "Sending…" : "Send SMS"}
                </button>
              )}
              {tab === "multiple" && (
                <button
                  onClick={sendMultiple}
                  disabled={busy}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-white shadow hover:bg-slate-800 disabled:opacity-50"
                >
                  {busy ? "Queuing…" : `Send to ${selectedCount} borrower${selectedCount===1?"":"s"}`}
                </button>
              )}
              {tab === "segment" && (
                <button
                  onClick={sendSegment}
                  disabled={busy}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-white shadow hover:bg-slate-800 disabled:opacity-50"
                >
                  {busy ? "Queuing…" : "Send to segment"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar: recent & tips */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-3 text-sm font-semibold text-slate-700">Recent Messages</div>
          <div className="space-y-3 max-h-[360px] overflow-auto">
            {logs.slice(-15).reverse().map(it => (
              <div key={it.id} className="rounded-xl border p-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{new Date(it.at).toLocaleString()}</span>
                  <span className={cls("rounded px-2 py-0.5 text-[11px]",
                    it.status === "failed" ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200" :
                    it.status === "dry-run" ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200" :
                    "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  )}>
                    {it.status}
                  </span>
                </div>
                <div className="mt-1 text-sm font-medium">{it.to}</div>
                <div className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{it.message}</div>
              </div>
            ))}
            {logs.length === 0 && <div className="text-sm text-slate-500">No messages yet.</div>}
          </div>

          <div className="mt-6 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            <div className="font-semibold mb-1">Tips</div>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use templates like <code>{"{{name}}"}</code> on bulk/segment sends.</li>
              <li>GSM-7 texts are cheaper: avoid emojis to keep it single-segment.</li>
              <li>You can leave “Sender ID” empty to use the default configured one.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
