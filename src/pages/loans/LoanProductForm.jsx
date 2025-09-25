import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api";

export default function LoanProductForm() {
  const navigate = useNavigate();
  const { id } = useParams(); // if present, we’re editing
  const isEdit = Boolean(id);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    name: "",
    code: "",
    interestRate: "",
    interestPeriod: "monthly", // monthly | weekly | yearly
    term: "",
    termUnit: "months",        // months | weeks | days
    principalMin: "",
    principalMax: "",
    fees: "",
    active: true,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isEdit) return;
      try {
        setLoading(true);
        // Adjust endpoint if yours differs:
        const { data } = await api.get(`/loan-products/${id}`);
        if (cancelled) return;
        setForm((f) => ({
          ...f,
          name: data.name ?? "",
          code: data.code ?? "",
          interestRate: data.interestRate ?? "",
          interestPeriod: data.interestPeriod ?? "monthly",
          term: data.term ?? "",
          termUnit: data.termUnit ?? "months",
          principalMin: data.principalMin ?? "",
          principalMax: data.principalMax ?? "",
          fees: data.fees ?? "",
          active: data.active ?? true,
        }));
      } catch (e) {
        if (!cancelled) setErr(e?.response?.data?.message || "Failed to load product");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, isEdit]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setSaving(true);
    try {
      const payload = {
        ...form,
        interestRate: Number(form.interestRate) || 0,
        term: Number(form.term) || 0,
        principalMin: Number(form.principalMin) || 0,
        principalMax: Number(form.principalMax) || 0,
        fees: Number(form.fees) || 0,
      };
      if (isEdit) {
        await api.put(`/loan-products/${id}`, payload);
      } else {
        await api.post(`/loan-products`, payload);
      }
      navigate("/loans/products", { replace: true });
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold mb-4">
        {isEdit ? "Edit Loan Product" : "New Loan Product"}
      </h1>

      {err && (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 text-rose-700 px-3 py-2 text-sm">
          {err}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Name</label>
            <input
              name="name"
              value={form.name}
              onChange={onChange}
              required
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
              placeholder="e.g. SME Working Capital"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Code</label>
            <input
              name="code"
              value={form.code}
              onChange={onChange}
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
              placeholder="e.g. SME-WC"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Interest Rate (%)</label>
            <input
              name="interestRate"
              value={form.interestRate}
              onChange={onChange}
              type="number"
              step="0.01"
              min="0"
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Interest Period</label>
            <select
              name="interestPeriod"
              value={form.interestPeriod}
              onChange={onChange}
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Term</label>
            <input
              name="term"
              value={form.term}
              onChange={onChange}
              type="number"
              min="0"
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
              placeholder="e.g. 12"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Term Unit</label>
            <select
              name="termUnit"
              value={form.termUnit}
              onChange={onChange}
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
            >
              <option value="months">Months</option>
              <option value="weeks">Weeks</option>
              <option value="days">Days</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Principal Min</label>
            <input
              name="principalMin"
              value={form.principalMin}
              onChange={onChange}
              type="number"
              min="0"
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Principal Max</label>
            <input
              name="principalMax"
              value={form.principalMax}
              onChange={onChange}
              type="number"
              min="0"
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Fees (Total)</label>
            <input
              name="fees"
              value={form.fees}
              onChange={onChange}
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
              placeholder="0.00"
            />
          </div>

          <div className="flex items-center gap-2 mt-6">
            <input
              id="active"
              name="active"
              type="checkbox"
              checked={form.active}
              onChange={onChange}
              className="h-4 w-4"
            />
            <label htmlFor="active" className="text-sm">Active</label>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="submit"
            disabled={saving || loading}
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : isEdit ? "Update Product" : "Create Product"}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
