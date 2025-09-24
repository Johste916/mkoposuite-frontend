import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import api from "../../api";

const cls = (...xs) => xs.filter(Boolean).join(" ");
const asFloat = (v) => (v === "" || v === null || v === undefined ? "" : Number(v));

export default function LoanProductForm() {
  const navigate = useNavigate();
  const { id } = useParams(); // if present => edit
  const editing = Boolean(id);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(editing);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    name: "",
    code: "",
    status: "active",
    interestMethod: "flat",
    interestRate: 0,
    minPrincipal: "",
    maxPrincipal: "",
    minTermMonths: "",
    maxTermMonths: "",
    penaltyRate: "",
    description: "",
  });

  useEffect(() => {
    if (!editing) return;
    (async () => {
      try {
        const { data } = await api.get(`/loan-products/${id}`);
        setForm({
          name: data.name || "",
          code: data.code || "",
          status: data.status || "active",
          interestMethod: data.interestMethod || "flat",
          interestRate: data.interestRate ?? 0,
          minPrincipal: data.minPrincipal ?? "",
          maxPrincipal: data.maxPrincipal ?? "",
          minTermMonths: data.minTermMonths ?? "",
          maxTermMonths: data.maxTermMonths ?? "",
          penaltyRate: data.penaltyRate ?? "",
          description: data.description || "",
        });
      } catch {
        alert("Failed to load product");
        navigate("/loans/products", { replace: true });
      } finally {
        setLoading(false);
      }
    })();
  }, [editing, id, navigate]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!String(form.name).trim()) e.name = "Name is required";
    if (!String(form.code).trim()) e.code = "Code is required";
    if (form.interestRate === "" || Number(form.interestRate) < 0)
      e.interestRate = "Interest rate must be 0 or more";
    if (form.minPrincipal !== "" && form.maxPrincipal !== "" && Number(form.maxPrincipal) < Number(form.minPrincipal))
      e.maxPrincipal = "Max must be ≥ Min";
    if (form.minTermMonths !== "" && form.maxTermMonths !== "" && Number(form.maxTermMonths) < Number(form.minTermMonths))
      e.maxTermMonths = "Max must be ≥ Min";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/loan-products/${id}`, form);
      } else {
        await api.post("/loan-products", form);
      }
      navigate("/loans/products");
    } catch {
      alert("Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, children, error }) => (
    <label className="block">
      <div className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">{label}</div>
      {children}
      {error && <div className="mt-1 text-xs text-rose-600">{error}</div>}
    </label>
  );

  const inputClass =
    "w-full input border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded px-3 py-2 text-sm";

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{editing ? "Edit Loan Product" : "Create Loan Product"}</h2>
          <p className="muted text-sm">
            {editing ? "Update a loan product’s lending terms." : "Define a new loan product for use in applications."}
          </p>
        </div>
        <Link to="/loans/products" className="px-4 py-2 rounded border border-slate-200 dark:border-slate-700">
          Back to list
        </Link>
      </div>

      {loading ? (
        <div className="card p-4">Loading…</div>
      ) : (
        <form onSubmit={submit} className="card p-4 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Name" error={errors.name}>
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Business Working Capital"
                required
              />
            </Field>
            <Field label="Code" error={errors.code}>
              <input
                className={inputClass}
                value={form.code}
                onChange={(e) => set("code", e.target.value.toUpperCase())}
                placeholder="e.g. BWC"
                required
              />
            </Field>
            <Field label="Status">
              <select className={inputClass} value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
            <Field label="Interest Method">
              <select
                className={inputClass}
                value={form.interestMethod}
                onChange={(e) => set("interestMethod", e.target.value)}
              >
                <option value="flat">Flat</option>
                <option value="reducing">Reducing</option>
              </select>
            </Field>
            <Field label="Interest Rate (%)" error={errors.interestRate}>
              <input
                type="number"
                step="0.0001"
                className={inputClass}
                value={form.interestRate}
                onChange={(e) => set("interestRate", asFloat(e.target.value))}
                placeholder="e.g. 3"
              />
            </Field>
            <Field label="Penalty Rate (%)">
              <input
                type="number"
                step="0.0001"
                className={inputClass}
                value={form.penaltyRate}
                onChange={(e) => set("penaltyRate", asFloat(e.target.value))}
                placeholder="e.g. 1.5"
              />
            </Field>
            <Field label="Min Principal">
              <input
                type="number"
                className={inputClass}
                value={form.minPrincipal}
                onChange={(e) => set("minPrincipal", asFloat(e.target.value))}
                placeholder="e.g. 100000"
              />
            </Field>
            <Field label="Max Principal" error={errors.maxPrincipal}>
              <input
                type="number"
                className={inputClass}
                value={form.maxPrincipal}
                onChange={(e) => set("maxPrincipal", asFloat(e.target.value))}
                placeholder="e.g. 10000000"
              />
            </Field>
            <Field label="Min Term (months)">
              <input
                type="number"
                className={inputClass}
                value={form.minTermMonths}
                onChange={(e) => set("minTermMonths", asFloat(e.target.value))}
                placeholder="e.g. 3"
              />
            </Field>
            <Field label="Max Term (months)" error={errors.maxTermMonths}>
              <input
                type="number"
                className={inputClass}
                value={form.maxTermMonths}
                onChange={(e) => set("maxTermMonths", asFloat(e.target.value))}
                placeholder="e.g. 36"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Internal Notes / Description">
                <textarea
                  rows={3}
                  className={inputClass}
                  value={form.description || ""}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Optional details visible to staff only."
                />
              </Field>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Link
              to="/loans/products"
              className="px-4 py-2 rounded border border-slate-200 dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!!saving}
              className={cls(
                "px-4 py-2 rounded text-white text-sm",
                saving ? "bg-indigo-400" : "bg-indigo-600 hover:bg-indigo-700"
              )}
            >
              {saving ? "Saving…" : (editing ? "Update Product" : "Create Product")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
