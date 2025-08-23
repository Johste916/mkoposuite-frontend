// frontend/src/pages/collections/CollectionSheets.jsx
import React, { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import usePaginatedFetch from "../../hooks/usePaginatedFetch";
import ListShell from "../../components/ListShell";
import api from "../../api";

/* Derive scope from route */
function useScopeFromPath() {
  const { pathname } = useLocation();
  if (pathname.endsWith("/daily")) return "daily";
  if (pathname.endsWith("/missed")) return "missed";
  if (pathname.endsWith("/past-maturity")) return "past-maturity";
  return ""; // default list
}

/* UI-only role gate (server still enforces) */
function useRole() {
  try {
    const raw = localStorage.getItem("auth") || localStorage.getItem("user") || "";
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed?.role || parsed?.user?.role || "user";
  } catch {
    return "user";
  }
}
const canWriteRoles = new Set(["admin", "director", "branch_manager"]);
const canCommsRoles = new Set(["admin", "director", "branch_manager", "comms"]);

/* Safe id getter */
const getRowId = (row) => row?.id ?? row?.ID ?? row?._id ?? row?.uuid ?? null;

/* Summary cards */
function SummaryBar({ summary }) {
  if (!summary) return null;
  const { total = 0, byStatus = {}, byType = {} } = summary;
  return (
    <div className="mb-3 grid gap-2 sm:grid-cols-3">
      <div className="rounded-lg border p-3">
        <div className="text-xs text-slate-500">Total sheets</div>
        <div className="text-xl font-semibold">{total}</div>
      </div>
      <div className="rounded-lg border p-3">
        <div className="text-xs text-slate-500 mb-1">By status</div>
        <div className="flex flex-wrap gap-2">
          {Object.keys(byStatus).length === 0 && <span className="text-xs text-slate-400">n/a</span>}
          {Object.entries(byStatus).map(([k, v]) => (
            <span key={k} className="text-xs px-2 py-1 rounded-full border">
              {k}: {v}
            </span>
          ))}
        </div>
      </div>
      <div className="rounded-lg border p-3">
        <div className="text-xs text-slate-500 mb-1">By type</div>
        <div className="flex flex-wrap gap-2">
          {Object.keys(byType).length === 0 && <span className="text-xs text-slate-400">n/a</span>}
          {Object.entries(byType).map(([k, v]) => (
            <span key={k} className="text-xs px-2 py-1 rounded-full border">
              {k}: {v}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Tiny modal */
function Modal({ open, onClose, children, title = "Dialog" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl shadow-xl border">
          <div className="p-3 border-b font-semibold">{title}</div>
          <div className="p-4">{children}</div>
          <div className="p-3 border-t text-right">
            <button onClick={onClose} className="px-3 py-1 text-sm border rounded hover:bg-gray-50">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CollectionSheets() {
  const scope = useScopeFromPath();
  const role = useRole();
  const canWrite = canWriteRoles.has(role);
  const canComms = canCommsRoles.has(role);

  // Filters
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [collector, setCollector] = useState("");
  const [loanOfficer, setLoanOfficer] = useState("");

  // Selection + UI
  const [selected, setSelected] = useState({}); // map of __rid -> boolean
  const [toast, setToast] = useState("");

  // Bulk SMS state (DECLARED ONCE)
  const [smsTo, setSmsTo] = useState("collector"); // collector | loanOfficer | custom
  const [smsBody, setSmsBody] = useState("");
  const [customPhones, setCustomPhones] = useState("");
  const [smsOpen, setSmsOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const description = useMemo(() => {
    switch (scope) {
      case "daily":
        return "Showing today’s collection sheets.";
      case "missed":
        return "Sheets scheduled before today and not completed.";
      case "past-maturity":
        return "Sheets older than 30 days and not completed.";
      default:
        return "All collection sheets. Use filters to narrow results.";
    }
  }, [scope]);

  // Build URL with filters
  const baseUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("withSummary", "1");
    if (scope) params.set("scope", scope);
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (collector) params.set("collector", collector);
    if (loanOfficer) params.set("loanOfficer", loanOfficer);
    const qs = params.toString();
    return qs ? `/api/collections?${qs}` : "/api/collections";
  }, [scope, status, type, dateFrom, dateTo, collector, loanOfficer]);

  const {
    rows: rawRows,
    total,
    page,
    setPage,
    limit,
    setLimit,
    q,
    setQ,
    loading,
    error,
    summary,
  } = usePaginatedFetch({ url: baseUrl });

  // Normalize rows and attach a safe render id
  const rows = useMemo(() => {
    const arr = Array.isArray(rawRows) ? rawRows.filter(Boolean) : [];
    return arr.map((r, idx) => {
      const rid = getRowId(r);
      return {
        ...r,
        __rid: rid || `tmp-${idx}`, // display-only id if real one is missing
      };
    });
  }, [rawRows]);

  const columns = useMemo(() => {
    const base = [
      {
        key: "__select__",
        title: "",
        width: 30,
        render: (row) => {
          if (!row) return null;
          const rid = row.__rid;
          const selectable = rid && !String(rid).startsWith("tmp-");
          return (
            <input
              type="checkbox"
              disabled={!selectable}
              checked={!!selected[rid]}
              onChange={(e) => setSelected((s) => ({ ...s, [rid]: e.target.checked }))}
            />
          );
        },
      },
      { key: "date", title: "Date" },
      { key: "type", title: "Type" },
      { key: "collector", title: "Collector" },
      { key: "loanOfficer", title: "Loan Officer" },
      { key: "status", title: "Status" },
    ];

    if (canWrite) {
      base.push({
        key: "__actions__",
        title: "Actions",
        render: (row) => {
          if (!row) return null;
          const rid = row.__rid;
          const editable = rid && !String(rid).startsWith("tmp-");
          return editable ? (
            <Link to={`/collections/${rid}/edit`} className="text-blue-600 hover:underline text-sm">
              Edit
            </Link>
          ) : (
            <span className="text-slate-400 text-xs">No ID</span>
          );
        },
      });
    }
    return base;
  }, [canWrite, selected]);

  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (scope) params.set("scope", scope);
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (collector) params.set("collector", collector);
    if (loanOfficer) params.set("loanOfficer", loanOfficer);
    params.set("export", "csv");
    return `/api/collections?${params.toString()}`;
  }, [scope, q, status, type, dateFrom, dateTo, collector, loanOfficer]);

  const title = useMemo(() => {
    switch (scope) {
      case "daily":
        return "Daily Collection Sheet";
      case "missed":
        return "Missed Repayment Sheet";
      case "past-maturity":
        return "Past Maturity Loans";
      default:
        return "Collection Sheets";
    }
  }, [scope]);

  const selectedIds = useMemo(
    () =>
      Object.entries(selected)
        .filter(([rid, on]) => on && !String(rid).startsWith("tmp-"))
        .map(([rid]) => rid),
    [selected]
  );

  // Bulk SMS
  const sendBulkSms = async () => {
    if (!canComms) {
      setToast("You do not have permission to send SMS.");
      return;
    }
    if (smsTo !== "custom" && selectedIds.length === 0) {
      setToast("Select at least one row.");
      return;
    }
    if (!smsBody.trim()) {
      setToast("Message cannot be empty.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        ids: selectedIds,
        to: smsTo,
        message: smsBody,
        customPhones:
          smsTo === "custom"
            ? customPhones
                .split(/[,\s;]+/)
                .map((s) => s.trim())
                .filter(Boolean)
            : undefined,
      };
      const res = await api.post("/api/collections/bulk-sms", payload);
      setToast(
        `Sent: ${res.data.sent} / ${res.data.total}${
          res.data.failed ? `, failed: ${res.data.failed}` : ""
        }`
      );
      setSmsOpen(false);
      setSelected({});
      setSmsBody("");
      setCustomPhones("");
    } catch (e) {
      setToast(e?.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {toast && (
        <div className="mb-2 text-sm p-2 rounded border bg-emerald-50 text-emerald-700">
          {toast}
        </div>
      )}

      <SummaryBar summary={summary} />

      <ListShell
        title={title}
        subtitle={<span className="text-xs text-slate-500">{description}</span>}
        q={q}
        setQ={setQ}
        columns={columns}
        rows={rows}               // normalized rows with safe __rid
        loading={loading}
        error={error}
        page={page}
        setPage={setPage}
        limit={limit}
        setLimit={setLimit}
        total={total}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 w-full">
            {canWrite && (
              <Link
                to="/collections/new"
                className="mr-3 border rounded px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700"
              >
                + New Collection Sheet
              </Link>
            )}

            <label className="text-sm">Status</label>
            <select className="border rounded px-2 py-1" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              <option value="pending">pending</option>
              <option value="completed">completed</option>
              <option value="cancelled">cancelled</option>
            </select>

            <label className="text-sm ml-3">Type</label>
            <select className="border rounded px-2 py-1" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">All</option>
              <option value="FIELD">FIELD</option>
              <option value="OFFICE">OFFICE</option>
              <option value="AGENCY">AGENCY</option>
            </select>

            <label className="text-sm ml-3">From</label>
            <input type="date" className="border rounded px-2 py-1" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <label className="text-sm">To</label>
            <input type="date" className="border rounded px-2 py-1" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />

            <input
              placeholder="Collector"
              className="border rounded px-2 py-1 ml-3"
              value={collector}
              onChange={(e) => setCollector(e.target.value)}
            />
            <input
              placeholder="Loan Officer"
              className="border rounded px-2 py-1"
              value={loanOfficer}
              onChange={(e) => setLoanOfficer(e.target.value)}
            />

            <a href={exportHref} className="ml-auto inline-flex items-center border rounded px-3 py-1 text-sm hover:bg-gray-50">
              Export CSV
            </a>

            {canComms && (
              <button
                type="button"
                onClick={() => setSmsOpen(true)}
                className="border rounded px-3 py-1 text-sm bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Bulk SMS
              </button>
            )}
          </div>
        }
      />

      {/* Bulk SMS modal */}
      <Modal open={smsOpen} onClose={() => setSmsOpen(false)} title="Send Bulk SMS">
        <div className="space-y-3">
          <div className="text-xs text-slate-500">
            Selected rows: <b>{selectedIds.length}</b>
          </div>
          <div>
            <label className="text-sm block mb-1">Recipients</label>
            <select className="border rounded w-full px-2 py-1" value={smsTo} onChange={(e) => setSmsTo(e.target.value)}>
              <option value="collector">Collectors (from selected rows)</option>
              <option value="loanOfficer">Loan Officers (from selected rows)</option>
              <option value="custom">Custom phone numbers…</option>
            </select>
          </div>
          {smsTo === "custom" && (
            <div>
              <label className="text-sm block mb-1">Phone numbers (comma/space separated, E.164 or local)</label>
              <textarea
                className="border rounded w-full px-2 py-1 h-20"
                value={customPhones}
                onChange={(e) => setCustomPhones(e.target.value)}
                placeholder="+2557..., 0712..., 2557..."
              />
            </div>
          )}
          <div>
            <label className="text-sm block mb-1">Message</label>
            <textarea
              className="border rounded w-full px-2 py-1 h-28"
              value={smsBody}
              onChange={(e) => setSmsBody(e.target.value)}
              placeholder="Your message…"
            />
          </div>
          <div className="text-right">
            <button
              disabled={busy}
              onClick={sendBulkSms}
              className="border rounded px-3 py-1 text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send SMS"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
