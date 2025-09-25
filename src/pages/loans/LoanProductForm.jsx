// src/pages/loans/LoanProductForm.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api";

export default function LoanProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
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

  // ---- Load for edit
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isEdit) return;
      try {
        setLoading(true);
        const { data } = await api.get(`/loan-products/${id}`);
        if (cancelled) return;

        // accept either camelCase or snake_case from API
        const get = (a, b, d = "") => data?.[a] ?? data?.[b] ?? d;

        setForm({
          name: get("name"),
          code: get("code"),
          interestRate: String(get("interestRate", "interest_rate", "")),
          interestPeriod: (get("interestPeriod", "interest_period", "monthly") || "monthly").toLowerCase(),
          term: String(get("term", "", "")),
          termUnit: (get("termUnit", "term_unit", "months") || "months").toLowerCase(),
          principalMin: String(get("principalMin", "principal_min", "")),
          principalMax: String(get("principalMax", "principal_max", "")),
          fees: String(get("fees", "fees_total", "")),
          active: Boolean(get("active", "", true)),
        });
      } catch (e) {
        if (!cancelled) {
          setErr(readError(e) || "Failed to load product");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, isEdit]);

  // ---- helpers
  const readError = (e) => {
    const r = e?.response;
    return (
      r?.data?.message ||
      r?.data?.error ||
      (Array.isArray(r?.data?.errors) ? r.data.errors.map(x => x.message || x).join(", ") : null) ||
      r?.statusText ||
      e?.message
    );
  };

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const toNumber = (v) => {
    if (v === "" || v === null || typeof v === "undefined") return null;
    const n = Number(String(v).replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  };

  const validate = () => {
    const interestRate = toNumber(form.interestRate) ?? 0;
    const term = toNumber(form.term) ?? 0;
    const min = toNumber(form.principalMin) ?? 0;
    const max = toNumber(form.principalMax) ?? 0;

    if (!form.name?.trim()) return "Name is required";
    if (interestRate < 0 || interestRate > 100) return "Interest rate must be between 0 and 100";
    if (term < 0) return "Term must be a positive number";
    if (min < 0 || max < 0) return "Principal amounts must be positive";
    if (max && min && max < min) return "Principal Max cannot be less than Principal Min";
    return "";
  };

  const buildPayload = () => {
    // normalize enums to lowercase
    const interestPeriod = String(form.interestPeriod || "").toLowerCase();
    const termUnit = String(form.termUnit || "").toLowerCase();

    const payloadCamel = {
      name: form.name?.trim(),
      code: form.code?.trim(),
      interestRate: toNumber(form.interestRate) ?? 0,
      interestPeriod,
      term: toNumber(form.term) ?? 0,
      termUnit,
      principalMin: toNumber(form.principalMin) ?? 0,
      principalMax: toNumber(form.principalMax) ?? 0,
      fees: toNumber(form.fees) ?? 0,
      active: !!form.active,
    };

    // include snake_case aliases to satisfy backends that expect them
    const payloadSnake = {
      interest_rate: payloadCamel.interestRate,
      interest_period: payloadCamel.interestPeriod,
      term_unit: payloadCamel.termUnit,
      principal_min: payloadCamel.principalMin,
      principal_max: payloadCamel.principalMax,
      fees_total: payloadCamel.fees,
    };

    return { ...payloadCamel, ...payloadSnake };
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    const v = validate();
    if (v) {
      setErr(v);
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      const config = { headers: { "Content-Type": "application/json" } };

      if (isEdit) {
        await api.put(`/loan-products/${id}`, payload, config);
      } else {
        await api.post(`/loan-products`, payload, config);
      }
      navigate("/loans/products", { replace: true });
    } catch (e) {
      const msg = readError(e) || "Failed to save product";
      setErr(msg);
      // Optional: keep this during debugging; comment out later
      // eslint-disable-next-line no-console
      console.error("LoanProduct save error:", e?.response || e);
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
              placeholder="e.g. Express Loan"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Code</label>
            <input
              name="code"
              value={form.code}
              onChange={onChange}
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
              placeholder="e.g. 001"
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
