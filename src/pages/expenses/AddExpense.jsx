// frontend/src/pages/expenses/AddExpense.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";

function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-sm font-medium mb-1">{label}</span>
      {children}
    </label>
  );
}

export default function AddExpense() {
  const navigate = useNavigate();

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [type, setType] = useState("OPERATING"); // OPERATING | ADMIN | MARKETING | OTHER
  const [vendor, setVendor] = useState("");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const canSubmit = useMemo(() => {
    const n = Number(amount);
    return Boolean(date && type && Number.isFinite(n) && n > 0);
  }, [date, type, amount]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!canSubmit) return;

    setSaving(true);
    try {
      const payload = {
        date,
        type,
        vendor: vendor || null,
        reference: reference || null,
        amount: Number(amount),
        note: note || null,
      };

      // attach active branch if you use it elsewhere in the app
      const activeBranchId = localStorage.getItem("activeBranchId");
      if (activeBranchId) payload.branchId = activeBranchId;

      await api.post("/api/expenses", payload);
      navigate("/expenses");
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || "Failed to save expense");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 max-w-2xl">
      <h2 className="text-lg font-semibold mb-3">Add Expense</h2>

      {err && <div className="text-red-600 text-sm mb-3">Error: {err}</div>}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Date *">
          <input
            type="date"
            className="w-full border rounded px-3 py-2"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </Field>

        <Field label="Type *">
          <select
            className="w-full border rounded px-3 py-2"
            value={type}
            onChange={(e) => setType(e.target.value)}
            required
          >
            <option value="OPERATING">OPERATING</option>
            <option value="ADMIN">ADMIN</option>
            <option value="MARKETING">MARKETING</option>
            <option value="OTHER">OTHER</option>
          </select>
        </Field>

        <Field label="Vendor">
          <input
            className="w-full border rounded px-3 py-2"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            placeholder="Vendor name"
          />
        </Field>

        <Field label="Reference">
          <input
            className="w-full border rounded px-3 py-2"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="PO/Invoice #"
          />
        </Field>

        <Field label="Amount *">
          <input
            type="number"
            step="0.01"
            className="w-full border rounded px-3 py-2"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Note">
            <textarea
              rows={3}
              className="w-full border rounded px-3 py-2"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional notes…"
            />
          </Field>
        </div>

        <div className="sm:col-span-2 flex gap-2 pt-2">
          <button
            type="submit"
            disabled={!canSubmit || saving}
            className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Expense"}
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded border"
            onClick={() => navigate("/expenses")}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
