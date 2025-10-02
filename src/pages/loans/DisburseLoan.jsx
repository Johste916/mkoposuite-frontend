// src/pages/loans/DisburseLoan.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import api from "../../api";
import { Wallet, Save, Calendar } from "lucide-react";

/* === high-contrast tokens === */
const ui = {
  page: "w-full px-4 md:px-6 lg:px-10 py-6 text-slate-900 dark:text-slate-100",
  h1: "text-3xl md:text-4xl font-black tracking-tight",
  sub: "text-sm text-slate-700 dark:text-slate-300",
  card: "rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 md:p-6 shadow-sm",
  label: "text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300",
  input:
    "w-full rounded-lg border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 " +
    "focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-600 transition",
  badge:
    "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 border-indigo-300 text-indigo-800 " +
    "bg-indigo-50 dark:border-indigo-900/50 dark:text-indigo-300 dark:bg-indigo-950/30",
  btnGhost:
    "px-4 py-2 rounded-xl border-2 border-slate-300 dark:border-slate-700 hover:bg-slate-50 " +
    "dark:hover:bg-slate-800 transition",
  btnPrimary:
    "inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-700 text-white hover:bg-indigo-800 " +
    "disabled:opacity-60 disabled:cursor-not-allowed shadow",
  alert:
    "rounded-xl border-2 border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-900/60 " +
    "dark:bg-rose-950/30 dark:text-rose-300 px-3 py-2 text-sm",
  divider: "border-t-2 border-slate-300 dark:border-slate-700",
};

const METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "other", label: "Other" },
];

// normalize any backend list shape to an array
const toArray = (data) =>
  Array.isArray(data) ? data
  : Array.isArray(data?.items) ? data.items
  : Array.isArray(data?.rows) ? data.rows
  : Array.isArray(data?.results) ? data.results
  : [];

const readErr = (e) => {
  const d = e?.response?.data;
  if (typeof d === "string") return d;
  if (d?.message) return d.message;
  if (d?.error) return d.error;
  return e?.response?.statusText || e?.message || "Server error";
};

const money = (v, c = "TZS") => `\u200e${c} ${Number(v || 0).toLocaleString()}`;

export default function DisburseLoan() {
  const { id } = useParams();
  const navigate = useNavigate();

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  }, []);
  const role = (user?.role || "").toLowerCase();
  const canDisburse = role === "admin" || role === "accountant";

  const [loan, setLoan] = useState(null);
  const [banks, setBanks] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const slipRef = useRef(null);

  const [form, setForm] = useState({
    method: "cash",
    bankId: "",
    reference: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    note: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const [l, b] = await Promise.all([
          api.get(`/loans/${id}`),
          api.get("/banks").catch(() => ({ data: [] })),
        ]);
        const loanData = l?.data || null;
        setLoan(loanData);
        setBanks(toArray(b?.data));
        if (loanData?.amount && !form.amount) {
          setForm((f) => ({ ...f, amount: String(loanData.amount) }));
        }
      } catch (e) {
        setErr(readErr(e));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canDisburse) return;
    if (!form.amount || Number(form.amount) <= 0) {
      return alert("Enter a valid amount to disburse.");
    }

    setSubmitting(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("method", form.method);
      fd.append("bankId", form.method === "bank" ? (form.bankId || "") : "");
      fd.append("reference", form.reference || "");
      fd.append("amount", form.amount || "");
      fd.append("date", form.date || "");
      fd.append("note", form.note || "");
      if (slipRef.current?.files?.[0]) fd.append("attachment", slipRef.current.files[0]);

      await api.post(`/loans/${id}/disburse`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      alert("Loan disbursed");
      navigate(`/loans/${id}`);
    } catch (e) {
      setErr(readErr(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (!canDisburse) {
    return (
      <div className={ui.page}>
        <div className={ui.card}>
          <p className="text-sm">
            You don’t have permission to disburse loans. This page is available to <b>Admin</b> and <b>Accountant</b> roles.
          </p>
          <div className="mt-4">
            <Link to={`/loans/${id}`} className="text-indigo-700 hover:underline text-sm font-semibold">
              Back to loan
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={ui.page}>
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className={ui.h1}>Disburse Loan</h1>
          {loan && (
            <p className={ui.sub}>
              Borrower: <b>{loan.Borrower?.name || loan.borrowerName || "—"}</b> • Amount: <b>{money(loan.amount, loan.currency || "TZS")}</b>
            </p>
          )}
        </div>
        <Link to={`/loans/${id}`} className="text-indigo-700 hover:underline text-sm font-semibold">
          Back to Loan
        </Link>
      </div>

      {/* Error */}
      {err && <div className={`${ui.alert} mb-4`}>{err}</div>}

      <form onSubmit={onSubmit} className="w-full">
        {/* Snapshot card — crisp separators */}
        {loan && (
          <section className={`${ui.card} mb-6`}>
            <div className="flex items-center gap-2 mb-4">
              <span className={ui.badge}>
                <Wallet className="h-4 w-4" /> Loan Snapshot
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y-2 sm:divide-y-0 sm:divide-x-2 divide-slate-300 dark:divide-slate-700 rounded-lg overflow-hidden border-2 border-slate-200 dark:border-slate-800">
              <KV label="Borrower" value={loan.Borrower?.name || loan.borrowerName || "—"} />
              <KV label="Product" value={loan.Product?.name || loan.productName || "—"} />
              <KV label="Approved Amount" value={money(loan.amount, loan.currency || "TZS")} />
              <KV label="Status" value={(loan.status || "—").replaceAll("_", " ")} />
            </div>
          </section>
        )}

        {/* Disbursement details */}
        <section className={ui.card}>
          <div className="flex items-center gap-2 mb-4">
            <span className={ui.badge}>
              <Wallet className="h-4 w-4" /> Disbursement Details
            </span>
          </div>

          {/* Full-width, parallel grid, strong borders everywhere */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-4">
              <label className={ui.label}>Method</label>
              <select
                className={ui.input}
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value })}
              >
                {METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-12 md:col-span-4">
              <label className={ui.label}>Amount</label>
              <input
                type="number"
                className={ui.input}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>

            <div className="col-span-12 md:col-span-4">
              <label className={`${ui.label} flex items-center gap-1`}>
                <Calendar className="h-3.5 w-3.5" /> Date
              </label>
              <input
                type="date"
                className={ui.input}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>

            {form.method === "bank" && (
              <>
                <div className="col-span-12 md:col-span-6">
                  <label className={ui.label}>Bank</label>
                  <select
                    className={ui.input}
                    value={form.bankId}
                    onChange={(e) => setForm({ ...form, bankId: e.target.value })}
                  >
                    <option value="">Select bank…</option>
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <label className={ui.label}>Reference</label>
                  <input
                    className={ui.input}
                    value={form.reference}
                    onChange={(e) => setForm({ ...form, reference: e.target.value })}
                    placeholder="Txn ref / slip #"
                  />
                </div>
              </>
            )}

            <div className="col-span-12">
              <label className={ui.label}>Note (optional)</label>
              <textarea
                className={`${ui.input} min-h-[110px]`}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>

            <div className="col-span-12">
              <label className={ui.label}>Upload slip / proof (optional)</label>
              <input ref={slipRef} type="file" className={ui.input} />
            </div>
          </div>
        </section>

        {/* Sticky actions — full width, bold border */}
        <div className="sticky bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
          <div className={`${ui.divider}`} />
          <div className="px-4 md:px-6 lg:px-10 py-3 w-full flex justify-end gap-3">
            <Link to={`/loans/${id}`} className={ui.btnGhost}>
              Cancel
            </Link>
            <button type="submit" disabled={submitting} className={ui.btnPrimary}>
              <Save className="h-4 w-4" />
              {submitting ? "Disbursing…" : "Disburse"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

/* --- small “key–value” cell used in the snapshot grid --- */
function KV({ label, value }) {
  return (
    <div className="p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
        {label}
      </div>
      <div className="text-base font-semibold text-slate-900 dark:text-white break-words">
        {value ?? "—"}
      </div>
    </div>
  );
}
