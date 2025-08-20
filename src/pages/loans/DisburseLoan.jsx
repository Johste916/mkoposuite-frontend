// src/pages/loans/DisburseLoan.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import api from "../../api";
import { Wallet, Save, Upload, Calendar } from "lucide-react";

const input = "w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all";
const card = "bg-white rounded-2xl shadow-sm ring-1 ring-indigo-950/5 p-4 md:p-6";

const METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "other", label: "Other" },
];

export default function DisburseLoan() {
  const { id } = useParams();
  const navigate = useNavigate();

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  })();
  const role = (user?.role || "").toLowerCase();

  const canDisburse = role === "admin" || role === "accountant";

  const [loan, setLoan] = useState(null);
  const [banks, setBanks] = useState([]);
  const [submitting, setSubmitting] = useState(false);
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
        setLoan(l.data || null);
        setBanks(Array.isArray(b.data) ? b.data : (b.data?.items || []));
        if (l.data?.amount && !form.amount) setForm(f => ({ ...f, amount: String(l.data.amount) }));
      } catch (e) {
        console.warn(e);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canDisburse) return;

    setSubmitting(true);
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
      console.error(e);
      alert("Failed to disburse");
    } finally {
      setSubmitting(false);
    }
  };

  if (!canDisburse) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto bg-white border rounded-xl p-6">
          <p className="text-sm text-gray-600">
            You don’t have permission to disburse loans. This page is available to <b>Admin</b> and <b>Accountant</b> roles.
          </p>
          <Link to={`/loans/${id}`} className="text-indigo-600 underline text-sm mt-3 inline-block">Back to loan</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Disburse Loan</h1>
          {loan && <p className="text-sm text-gray-500">Borrower: <b>{loan.Borrower?.name || loan.borrowerName || "—"}</b> • Amount: <b>{Number(loan.amount || 0).toLocaleString()}</b></p>}
        </div>
        <Link to={`/loans/${id}`} className="text-indigo-600 hover:underline text-sm">Back to Loan</Link>
      </div>

      <form onSubmit={onSubmit} className="max-w-3xl">
        <section className={card}>
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-indigo-700 bg-indigo-50 border-indigo-200">
              <Wallet className="h-4 w-4" /> Disbursement Details
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-600">Method</label>
              <select className={input} value={form.method} onChange={(e)=>setForm({...form, method:e.target.value})}>
                {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">Amount</label>
              <input type="number" className={input} value={form.amount} onChange={(e)=>setForm({...form, amount:e.target.value})}/>
            </div>
            {form.method === "bank" && (
              <>
                <div>
                  <label className="text-xs text-gray-600">Bank</label>
                  <select className={input} value={form.bankId} onChange={(e)=>setForm({...form, bankId:e.target.value})}>
                    <option value="">Select bank…</option>
                    {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600">Reference</label>
                  <input className={input} value={form.reference} onChange={(e)=>setForm({...form, reference:e.target.value})} placeholder="Txn ref / slip #" />
                </div>
              </>
            )}
            <div>
              <label className="text-xs text-gray-600 flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Date</label>
              <input type="date" className={input} value={form.date} onChange={(e)=>setForm({...form, date:e.target.value})}/>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-600">Note (optional)</label>
              <textarea className={`${input} min-h-[84px]`} value={form.note} onChange={(e)=>setForm({...form, note:e.target.value})}/>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-600">Upload slip / proof (optional)</label>
              <input ref={slipRef} type="file" className={input} />
            </div>
          </div>
        </section>

        <div className="sticky bottom-0 inset-x-0 z-20 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-t mt-6">
          <div className="max-w-3xl px-4 py-3 ml-0 flex justify-end gap-3">
            <Link to={`/loans/${id}`} className="px-4 py-2 rounded-xl border hover:bg-gray-50">Cancel</Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            >
              <Save className="h-4 w-4" />
              {submitting ? "Disbursing…" : "Disburse"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
