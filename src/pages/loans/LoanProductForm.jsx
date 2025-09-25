import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import api from "../../api";

const cls = (...xs) => xs.filter(Boolean).join(" ");
const toNumberOrNull = (v) => {
  if (v === "" || v === null || v === undefined) return null;
  if (String(v).trim() === ".") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export default function LoanProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const editing = Boolean(id);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(editing);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    name: "",
    code: "",
    status: "active",
    interestMethod: "flat",
    interestRate: "",
    penaltyRate: "",
    minPrincipal: "",
    maxPrincipal: "",
    minTermMonths: "",
    maxTermMonths: "",
    description: "",
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

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
          interestRate: (data?.interestRate ?? "") === "" ? "" : String(data?.interestRate ?? ""),
          penaltyRate: (data?.penaltyRate ?? "") === "" ? "" : String(data?.penaltyRate ?? ""),
          minPrincipal: (data?.minPrincipal ?? "") === "" ? "" : String(data?.minPrincipal ?? ""),
          maxPrincipal: (data?.maxPrincipal ?? "") === "" ? "" : String(data?.maxPrincipal ?? ""),
          minTermMonths: (data?.minTermMonths ?? "") === "" ? "" : String(data?.minTermMonths ?? ""),
          maxTermMonths: (data?.maxTermMonths ?? "") === "" ? "" : String(data?.maxTermMonths ?? ""),
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

  const validate = () => {
    const e = {};
    const rate = toNumberOrNull(form.interestRate);
    const minP = toNumberOrNull(form.minPrincipal);
    const maxP = toNumberOrNull(form.maxPrincipal);
    const minT = toNumberOrNull(form.minTermMonths);
    const maxT = toNumberOrNull(form.maxTermMonths);

    if (!String(form.name).trim()) e.name = "Name is required";
    if (!String(form.code).trim()) e.code = "Code is required";
    if (rate === null || rate < 0) e.interestRate = "Interest rate must be 0 or more";
    if (minP !== null && maxP !== null && maxP < minP) e.maxPrincipal = "Max must be ≥ Min";
    if (minT !== null && maxT !== null && maxT < minT) e.maxTermMonths = "Max must be ≥ Min";

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
      penaltyRate: toNumberOrNull(form.penaltyRate),
      minPrincipal: toNumberOrNull(form.minPrincipal),
      maxPrincipal: toNumberOrNull(form.maxPrincipal),
      minTermMonths: toNumberOrNull(form.minTermMonths),
      maxTermMonths: toNumberOrNull(form.maxTermMonths),
      description: form.description || "",
    };

    try {
      if (editing) await api.put(`/loan-products/${id}`, payload);
      else await api.post("/loan-products", payload);
      navigate("/loans/products");
    } catch {
      alert("Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ id, label, error, children }) => (
    <div>
      <label htmlFor={id} className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">{label}</label>
      {children}
      {error && <div className="mt-1 text-xs text-rose-600">{error}</div>}
    </div>
  );

  const input =
    "w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800";
  const container = "rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900";

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{editing ? "Edit Loan Product" : "Create Loan Product"}</h2>
        <Link to="/loans/products" className="px-4 py-2 rounded border border-slate-200 dark:border-slate-700">Back to list</Link>
      </div>

      {loading ? (
        <div className={`${container} p-4`}>Loading…</div>
      ) : (
        <form onSubmit={submit} className={`${container} p-4 space-y-4`}>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field id="lp-name" label="Name" error={errors.name}>
              <input id="lp-name" className={input} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Business Working Capital" required />
            </Field>

            <Field id="lp-code" label="Code" error={errors.code}>
              <input id="lp-code" className={input} value={form.code} onChange={(e) => set("code", e.target.value)} onBlur={(e) => set("code", e.target.value.toUpperCase())} placeholder="e.g. BWC" required />
            </Field>

            <Field id="lp-status" label="Status">
              <select id="lp-status" className={input} value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>

            <Field id="lp-method" label="Interest Method">
              <select id="lp-method" className={input} value={form.interestMethod} onChange={(e) => set("interestMethod", e.target.value)}>
                <option value="flat">Flat</option>
                <option value="reducing">Reducing</option>
              </select>
            </Field>

            <Field id="lp-rate" label="Interest Rate (%)" error={errors.interestRate}>
              <input id="lp-rate" type="number" step="0.0001" className={input} value={form.interestRate} onChange={(e) => set("interestRate", e.target.value)} placeholder="e.g. 3 or 3.5" inputMode="decimal" />
            </Field>

            <Field id="lp-penalty" label="Penalty Rate (%)">
              <input id="lp-penalty" type="number" step="0.0001" className={input} value={form.penaltyRate} onChange={(e) => set("penaltyRate", e.target.value)} placeholder="e.g. 1.5" inputMode="decimal" />
            </Field>

            <Field id="lp-minp" label="Min Principal">
              <input id="lp-minp" type="number" className={input} value={form.minPrincipal} onChange={(e) => set("minPrincipal", e.target.value)} placeholder="e.g. 100000" inputMode="numeric" />
            </Field>

            <Field id="lp-maxp" label="Max Principal" error={errors.maxPrincipal}>
              <input id="lp-maxp" type="number" className={input} value={form.maxPrincipal} onChange={(e) => set("maxPrincipal", e.target.value)} placeholder="e.g. 10000000" inputMode="numeric" />
            </Field>

            <Field id="lp-mint" label="Min Term (months)">
              <input id="lp-mint" type="number" className={input} value={form.minTermMonths} onChange={(e) => set("minTermMonths", e.target.value)} placeholder="e.g. 3" inputMode="numeric" />
            </Field>

            <Field id="lp-maxt" label="Max Term (months)" error={errors.maxTermMonths}>
              <input id="lp-maxt" type="number" className={input} value={form.maxTermMonths} onChange={(e) => set("maxTermMonths", e.target.value)} placeholder="e.g. 36" inputMode="numeric" />
            </Field>

            <div className="sm:col-span-2">
              <Field id="lp-desc" label="Internal Notes / Description">
                <textarea id="lp-desc" rows={3} className={input} value={form.description || ""} onChange={(e) => set("description", e.target.value)} placeholder="Optional details visible to staff only." />
              </Field>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Link to="/loans/products" className="px-4 py-2 rounded border border-slate-200 dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!!saving}
              className={cls("px-4 py-2 rounded text-white text-sm", saving ? "bg-indigo-400" : "bg-indigo-600 hover:bg-indigo-700")}
            >
              {saving ? "Saving…" : editing ? "Update Product" : "Create Product"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
