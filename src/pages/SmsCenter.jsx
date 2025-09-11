import React, { useEffect, useMemo, useState } from "react";

/** Small helper to build API paths */
const API = (path) => `/api/sms${path}`;

export default function SmsCenter() {
  const [balance, setBalance] = useState(null);
  const [logs, setLogs] = useState([]);
  const [busy, setBusy] = useState(false);

  // ui tabs
  const [tab, setTab] = useState("single"); // single | borrowers | segments | csv

  // single send
  const [singleTo, setSingleTo] = useState("");
  const [singleMsg, setSingleMsg] = useState("");

  // borrowers send
  const [pickQuery, setPickQuery] = useState("");
  const [options, setOptions] = useState([]); // [{id,name,phone,branchId}]
  const [picked, setPicked] = useState([]);
  const [borrowerMsg, setBorrowerMsg] = useState("Hello {{name}}, ...");

  // segment/group
  const [segBranch, setSegBranch] = useState("");
  const [segActive, setSegActive] = useState(true);
  const [segOverdue, setSegOverdue] = useState(false);
  const [segTemplate, setSegTemplate] = useState("Dear {{name}}, ...");

  // csv
  const [csvFile, setCsvFile] = useState(null);
  const [csvTemplate, setCsvTemplate] = useState("Hello {{name}} ...");

  async function loadBalance() {
    const r = await fetch(API("/balance"));
    const j = await r.json();
    setBalance(j);
  }
  async function loadLogs() {
    const r = await fetch(API("/messages"));
    const j = await r.json();
    setLogs(j.items || []);
  }

  useEffect(() => {
    loadBalance();
    loadLogs();
  }, []);

  // borrower search (debounced)
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!pickQuery.trim()) {
        setOptions([]);
        return;
      }
      const r = await fetch(
        API(`/recipients/borrowers?q=${encodeURIComponent(pickQuery)}&limit=20`)
      );
      const j = await r.json();
      setOptions(j.items || []);
    }, 300);
    return () => clearTimeout(t);
  }, [pickQuery]);

  const creditsText = useMemo(() => {
    if (!balance) return "—";
    if (!balance.ok) return balance.error || "N/A";
    const unit = balance.unit || "credits";
    const seg = balance.estSegmentsLeft != null ? ` (~${balance.estSegmentsLeft} SMS)` : "";
    return `${balance.creditsRounded ?? balance.credits} ${unit}${seg}`;
  }, [balance]);

  /* actions */
  async function sendSingle() {
    setBusy(true);
    try {
      const r = await fetch(API("/send"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: singleTo, message: singleMsg }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Send failed");
      await loadLogs();
      alert("Sent!");
      setSingleMsg("");
    } catch (e) {
      alert(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function sendToBorrowers() {
    setBusy(true);
    try {
      const to = picked.map((p) => p.phone);
      const r = await fetch(API("/send-many"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, message: borrowerMsg }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Send failed");
      await loadLogs();
      alert(`Queued ${j.count} messages`);
      setBorrowerMsg("");
      setPicked([]);
    } catch (e) {
      alert(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function sendSegment() {
    setBusy(true);
    try {
      // This expects a backend endpoint /api/sms/to-segment.
      // If you don’t have it yet, keep this UI and wire the backend later.
      const r = await fetch(API("/to-segment"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filter: {
            branchId: segBranch || undefined,
            hasActiveLoan: segActive,
            overdueOnly: segOverdue,
          },
          template: segTemplate,
        }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Send failed");
      await loadLogs();
      alert(`Queued ${j.count} messages`);
    } catch (e) {
      alert(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function uploadCsv() {
    if (!csvFile) {
      alert("Choose a CSV first");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", csvFile);
      fd.append("template", csvTemplate);
      const r = await fetch(API("/upload-csv"), { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok || j.ok === false) throw new Error(j.error || "Upload failed");
      await loadLogs();
      const okCount = j.results ? j.results.filter((x) => x.ok).length : 0;
      alert(`Queued ${okCount} messages`);
      setCsvFile(null);
    } catch (e) {
      alert(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  const tabBtn = (key, label) => (
    <button
      onClick={() => setTab(key)}
      className={
        "px-3 py-2 border-b-2 -mb-px " +
        (tab === key ? "border-black font-semibold" : "border-transparent text-gray-500 hover:text-black")
      }
    >
      {label}
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4">
      {/* Balance card */}
      <div className="rounded-2xl border p-4 shadow-sm bg-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-gray-500">Balance</div>
            <div className="text-2xl font-semibold">{creditsText}</div>
            {balance?.checkedAt && (
              <div className="text-xs text-gray-400">
                Checked {new Date(balance.checkedAt).toLocaleString()}
              </div>
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

      {/* Tabs */}
      <div className="rounded-2xl border bg-white">
        <div className="flex gap-4 px-4 border-b">{tabBtn("single", "Single")}{tabBtn("borrowers", "Borrowers")}{tabBtn("segments", "Segments/Groups")}{tabBtn("csv", "CSV Upload")}</div>

        {/* Single */}
        {tab === "single" && (
          <div className="p-4 space-y-3">
            <input
              className="w-full rounded-xl border p-2"
              placeholder="Phone number (e.g. 0784..., +255...)"
              value={singleTo}
              onChange={(e) => setSingleTo(e.target.value)}
            />
            <textarea
              className="w-full rounded-xl border p-2 h-28"
              placeholder="Message text"
              value={singleMsg}
              onChange={(e) => setSingleMsg(e.target.value)}
            />
            <button
              disabled={busy}
              onClick={sendSingle}
              className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50"
            >
              Send
            </button>
            <p className="text-xs text-gray-500">
              Tip: Use plain GSM-7 (no emoji) to keep it single-segment.
            </p>
          </div>
        )}

        {/* Borrowers */}
        {tab === "borrowers" && (
          <div className="p-4 space-y-3">
            <div className="flex gap-2">
              <input
                className="rounded-xl border p-2 flex-1"
                placeholder="Search borrowers by name or phone..."
                value={pickQuery}
                onChange={(e) => setPickQuery(e.target.value)}
              />
            </div>
            {options.length > 0 && (
              <div className="max-h-44 overflow-auto border rounded-xl">
                {options.map((o) => {
                  const on = picked.some((p) => p.id === o.id);
                  return (
                    <label
                      key={o.id}
                      className="flex items-center gap-2 p-2 border-b"
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => {
                          setPicked((prev) =>
                            on ? prev.filter((x) => x.id !== o.id) : [...prev, o]
                          );
                        }}
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
            <textarea
              className="w-full rounded-xl border p-2 h-28"
              placeholder="Template e.g. Hello {{name}}, ..."
              value={borrowerMsg}
              onChange={(e) => setBorrowerMsg(e.target.value)}
            />
            <div className="text-xs text-gray-500">
              Variables supported: {"{{name}}"} {"{{firstName}}"} {"{{lastName}}"}.
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

        {/* Segments / Groups */}
        {tab === "segments" && (
          <div className="p-4 space-y-3">
            <div className="grid sm:grid-cols-3 gap-3">
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
            </div>
            <textarea
              className="ww-full rounded-xl border p-2 h-28"
              placeholder="Template e.g. Dear {{name}}, ..."
              value={segTemplate}
              onChange={(e) => setSegTemplate(e.target.value)}
            />
            <button
              disabled={busy}
              onClick={sendSegment}
              className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50"
            >
              Send to segment
            </button>
          </div>
        )}

        {/* CSV upload */}
        {tab === "csv" && (
          <div className="p-4 space-y-3">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
            />
            <textarea
              className="w-full rounded-xl border p-2 h-24"
              placeholder="Optional template for CSV rows (uses column names as variables, e.g. Hello {{name}})"
              value={csvTemplate}
              onChange={(e) => setCsvTemplate(e.target.value)}
            />
            <div className="text-xs text-gray-500">
              CSV columns: <code>phone</code>, <code>message</code> (or use a
              template with columns like <code>name</code>).
            </div>
            <button
              disabled={busy}
              onClick={uploadCsv}
              className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50"
            >
              Upload &amp; Send
            </button>
          </div>
        )}
      </div>

      {/* Recent messages */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="text-sm font-medium mb-2">Recent Messages</div>
        {logs.length === 0 ? (
          <div className="text-gray-500 text-sm">No messages yet.</div>
        ) : (
          <div className="divide-y">
            {logs.map((m, i) => (
              <div key={i} className="py-2 text-sm">
                <div className="flex justify-between">
                  <div className="font-medium">{m.to}</div>
                  <div
                    className={
                      "text-xs " +
                      (m.status === "failed"
                        ? "text-red-600"
                        : m.status === "queued"
                        ? "text-emerald-600"
                        : "text-gray-500")
                    }
                  >
                    {m.status}
                  </div>
                </div>
                <div className="text-gray-500">{m.message}</div>
                <div className="text-xs text-gray-400">
                  {new Date(m.at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
