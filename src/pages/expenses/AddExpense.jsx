import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";

const TYPES = ["OPERATING", "ADMIN", "MARKETING", "OTHER"];

export default function AddExpense() {
  const navigate = useNavigate();

  // form state
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [type, setType] = useState("OPERATING");
  const [vendor, setVendor] = useState("");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [branchId, setBranchId] = useState(localStorage.getItem("activeBranchId") || "");

  // ui state
  const [branches, setBranches] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // load branches for the dropdown (optional)
  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const res = await api.get("/branches");
        if (!stop) {
          const list = Array.isArray(res.data) ? res.data : [];
          setBranches(list);
          if (!branchId && list.length) setBranchId(String(list[0].id));
        }
      } catch {
        // non-fatal — just hide the dropdown if branches can’t load
        setBranches([]);
      }
    })();
    return () => { stop = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSubmit = useMemo(() => {
    const n = Number(amount);
    return date && type && Number.isFinite(n) && n > 0 && !saving;
  }, [date, type, amount, saving]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!canSubmit) return;

    setSaving(true);
    try {
      const payload = {
        date,                         // YYYY-MM-DD
        type,                         // ENUM-ish string
        vendor: vendor || null,
        reference: reference || null,
        amount: String(amount).trim(),// send as string; backend stores DECIMAL
        note: note || null,
        branchId: branchId || null,   // optional
      };

      // Will include Authorization + x-tenant-id + x-branch-id via interceptor
      await api._post("/expenses", payload);

      // simple success UX: go back to list
      navigate("/expenses");
    } catch (err) {
      setError(err?.response?.data?.error || err?.normalizedMessage || err?.message || "Failed to save expense.");
    } finally {
      setSaving(false);
    }
  };

  const card = "bg-white dark:bg-slate-800 rounded-xl shadow p-4";
  const label = "block text-sm font-medium mb-1";
  const input = "w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:border-slate-600";
  const select = input;
  const textarea = "w-full px-3 py-2 border rounded-md h-28 resize-y dark:bg-slate-700 dark:border-slate-600";

  return (
    <div className={card}>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Add Expense</h2>
        <p className="text-xs opacity-70">Create a new operating/admin/marketing expense.</p>
      </div>

      {error ? (
        <div className="mb-3 text-sm text-rose-600 dark:text-rose-300">
          Error: {String(error)}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={label}>Date</label>
          <input
            type="date"
            className={input}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div>
          <label className={label}>Type</label>
          <select className={select} value={type} onChange={(e) => setType(e.target.value)} required>
            {TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={label}>Vendor (optional)</label>
          <input
            type="text"
            className={input}
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            placeholder="e.g. Office Supplies Ltd"
          />
        </div>

        <div>
          <label className={label}>Reference (optional)</label>
          <input
            type="text"
            className={input}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. INV-001"
          />
        </div>

        <div>
          <label className={label}>Amount</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className={input}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>

        {branches.length > 0 ? (
          <div>
            <label className={label}>Branch</label>
            <select
              className={select}
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="md:col-span-2">
          <label className={label}>Note (optional)</label>
          <textarea
            className={textarea}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add details…"
          />
        </div>

        <div className="md:col-span-2 flex items-center gap-2 pt-2">
          <button
            type="submit"
            disabled={!canSubmit}
            className={`px-4 py-2 rounded text-white ${canSubmit ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-300 cursor-not-allowed"}`}
          >
            {saving ? "Saving…" : "Save Expense"}
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded border dark:border-slate-600"
            onClick={() => navigate("/expenses")}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
