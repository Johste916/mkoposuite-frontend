// src/pages/loans/LoanProductForm.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import api from "../../api";

const cls = (...xs) => xs.filter(Boolean).join(" ");

// convert form string -> number or null for submit
const toNumberOrNull = (v) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// Common props to hard-disable Grammarly and similar injectors
const antiInjectorProps = {
  "data-gramm": "false",
  "data-gramm_editor": "false",
  "data-enable-grammarly": "false",
  "data-ms-editor": "false",
  autoComplete: "off",
  autoCorrect: "off",
  autoCapitalize: "off",
  spellCheck: false,
};

export default function LoanProductForm() {
  const navigate = useNavigate();
  const { id } = useParams(); // if present => edit
  const editing = Boolean(id);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(editing);
  const [errors, setErrors] = useState({});

  // Keep ALL inputs as strings while typing (prevents value “jumping”/clearing)
  const [form, setForm] = useState({
    name: "",
    code: "",
    status: "active",
    interestMethod: "flat",
    interestRate: "",
    minPrincipal: "",
    maxPrincipal: "",
    minTermMonths: "",
    maxTermMonths: "",
    penaltyRate: "",
    description: "",
  });

  // stable setter
  const set = useCallback((k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
  }, []);

  useEffect(() => {
    if (!editing) return;
    (async () => {
      try {
        const { data } = await api.get(`/loan-products/${id}`);
        setForm({
          name: data?.name ?? "",
          code: data?.code ?? "",
          status: data?.status ?? "active",
          interestMethod: data?.interestMethod ?? "flat",
          interestRate:
            data?.interestRate === 0 || data?.interestRate
              ? String(data.interestRate)
              : "",
          minPrincipal:
            data?.minPrincipal === 0 || data?.minPrincipal
              ? String(data.minPrincipal)
              : "",
          maxPrincipal:
            data?.maxPrincipal === 0 || data?.maxPrincipal
              ? String(data.maxPrincipal)
              : "",
          minTermMonths:
            data?.minTermMonths === 0 || data?.minTermMonths
              ? String(data.minTermMonths)
              : "",
          maxTermMonths:
            data?.maxTermMonths === 0 || data?.maxTermMonths
              ? String(data.maxTermMonths)
              : "",
          penaltyRate:
            data?.penaltyRate === 0 || data?.penaltyRate
              ? String(data.penaltyRate)
              : "",
          description: data?.description ?? "",
        });
      } catch {
        alert("Failed to load product");
        navigate("/loans/products", { replace: true });
      } finally {
        setLoading(false);
      }
    })();
  }, [editing, id, navigate]);

  // Stop inputs losing focus / getting cleared by global listeners
  const stopBubble = (e) => {
    e.stopPropagation();
  };
  const preventWheelChange = (e) => {
    // Avoid number inputs changing on mouse wheel and then “snapping back”
    e.target.blur();
    e.stopPropagation();
    setTimeout(() => e.target && e.target.focus(), 0);
  };

  const validate = () => {
    const e = {};

    const interestRate = toNumberOrNull(form.interestRate);
    const minP = toNumberOrNull(form.minPrincipal);
    const maxP = toNumberOrNull(form.maxPrincipal);
    const minT = toNumberOrNull(form.minTermMonths);
    const maxT = toNumberOrNull(form.maxTermMonths);

    if (!String(form.name).trim()) e.name = "Name is required";
    if (!String(form.code).trim()) e.code = "Code is required";
    if (interestRate === null || interestRate < 0)
      e.interestRate = "Interest rate must be 0 or more";
    if (minP !== null && maxP !== null && maxP < minP)
      e.maxPrincipal = "Max must be ≥ Min";
    if (minT !== null && maxT !== null && maxT < minT)
      e.maxTermMonths = "Max must be ≥ Min";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      status: form.status,
      interestMethod: form.interestMethod,
      interestRate: toNumberOrNull(form.interestRate) ?? 0,
      minPrincipal: toNumberOrNull(form.minPrincipal),
      maxPrincipal: toNumberOrNull(form.maxPrincipal),
      minTermMonths: toNumberOrNull(form.minTermMonths),
      maxTermMonths: toNumberOrNull(form.maxTermMonths),
      penaltyRate: toNumberOrNull(form.penaltyRate),
      description: form.description || "",
    };

    try {
      if (editing) {
        await api.put(`/loan-products/${id}`, payload);
      } else {
        await api.post("/loan-products", payload);
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
      <div className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
        {label}
      </div>
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
          <h2 className="text-2xl font-bold">
            {editing ? "Edit Loan Product" : "Create Loan Product"}
          </h2>
        </div>
        <Link
          to="/loans/products"
          className="px-4 py-2 rounded border border-slate-200 dark:border-slate-700"
        >
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
                {...antiInjectorProps}
                name="name"
                className={inputClass}
                value={form.name}
                onKeyDown={stopBubble}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Business Working Capital"
                required
              />
            </Field>

            <Field label="Code" error={errors.code}>
              <input
                {...antiInjectorProps}
                name="code"
                className={inputClass}
                value={form.code}
                onKeyDown={stopBubble}
                onChange={(e) => set("code", e.target.value)}
                onBlur={(e) => set("code", e.target.value.toUpperCase())}
                placeholder="e.g. BWC"
                required
              />
            </Field>

            <Field label="Status">
              <select
                {...antiInjectorProps}
                name="status"
                className={inputClass}
                value={form.status}
                onKeyDown={stopBubble}
                onChange={(e) => set("status", e.target.value)}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>

            <Field label="Interest Method">
              <select
                {...antiInjectorProps}
                name="interestMethod"
                className={inputClass}
                value={form.interestMethod}
                onKeyDown={stopBubble}
                onChange={(e) => set("interestMethod", e.target.value)}
              >
                <option value="flat">Flat</option>
                <option value="reducing">Reducing</option>
              </select>
            </Field>

            <Field label="Interest Rate (%)" error={errors.interestRate}>
              <input
                {...antiInjectorProps}
                name="interestRate"
                type="number"
                step="0.0001"
                className={inputClass}
                value={form.interestRate}
                onWheel={preventWheelChange}
                onKeyDown={stopBubble}
                onChange={(e) => set("interestRate", e.target.value)}
                placeholder="e.g. 3"
                inputMode="decimal"
              />
            </Field>

            <Field label="Penalty Rate (%)">
              <input
                {...antiInjectorProps}
                name="penaltyRate"
                type="number"
                step="0.0001"
                className={inputClass}
                value={form.penaltyRate}
                onWheel={preventWheelChange}
                onKeyDown={stopBubble}
                onChange={(e) => set("penaltyRate", e.target.value)}
                placeholder="e.g. 1.5"
                inputMode="decimal"
              />
            </Field>

            <Field label="Min Principal">
              <input
                {...antiInjectorProps}
                name="minPrincipal"
                type="number"
                className={inputClass}
                value={form.minPrincipal}
                onWheel={preventWheelChange}
                onKeyDown={stopBubble}
                onChange={(e) => set("minPrincipal", e.target.value)}
                placeholder="e.g. 100000"
                inputMode="numeric"
              />
            </Field>

            <Field label="Max Principal" error={errors.maxPrincipal}>
              <input
                {...antiInjectorProps}
                name="maxPrincipal"
                type="number"
                className={inputClass}
                value={form.maxPrincipal}
                onWheel={preventWheelChange}
                onKeyDown={stopBubble}
                onChange={(e) => set("maxPrincipal", e.target.value)}
                placeholder="e.g. 10000000"
                inputMode="numeric"
              />
            </Field>

            <Field label="Min Term (months)">
              <input
                {...antiInjectorProps}
                name="minTermMonths"
                type="number"
                className={inputClass}
                value={form.minTermMonths}
                onWheel={preventWheelChange}
                onKeyDown={stopBubble}
                onChange={(e) => set("minTermMonths", e.target.value)}
                placeholder="e.g. 3"
                inputMode="numeric"
              />
            </Field>

            <Field label="Max Term (months)" error={errors.maxTermMonths}>
              <input
                {...antiInjectorProps}
                name="maxTermMonths"
                type="number"
                className={inputClass}
                value={form.maxTermMonths}
                onWheel={preventWheelChange}
                onKeyDown={stopBubble}
                onChange={(e) => set("maxTermMonths", e.target.value)}
                placeholder="e.g. 36"
                inputMode="numeric"
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Internal Notes / Description">
                <textarea
                  {...antiInjectorProps}
                  name="description"
                  rows={3}
                  className={inputClass}
                  value={form.description || ""}
                  onKeyDown={stopBubble}
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
              {saving ? "Saving…" : editing ? "Update Product" : "Create Product"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
