// src/pages/loans/LoanProductForm.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api";

/* ---------- Inputs ---------- */
function MoneyInput({ name, value, onChange, placeholder = "0", ...rest }) {
  const reformat = (raw) => {
    const digits = String(raw ?? "").replace(/[^\d.-]/g, "");
    if (digits === "" || digits === "-") return digits;
    const n = Number(digits);
    if (!Number.isFinite(n)) return digits;
    return new Intl.NumberFormat().format(n);
  };
  const handle = (e) => {
    const formatted = reformat(e.target.value);
    onChange({ target: { name, value: formatted } });
  };
  return (
    <input
      name={name}
      value={value}
      onChange={handle}
      inputMode="numeric"
      placeholder={placeholder}
      className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
      {...rest}
    />
  );
}
const parseMoney = (s) => {
  if (s === "" || s == null) return null;
  const n = Number(String(s).replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
};

/* ---------- Page ---------- */
const LOWER_UNITS = ["days", "weeks", "months", "years"];
const normUnit = (v) => {
  const s = String(v || "").toLowerCase();
  if (LOWER_UNITS.includes(s)) return s;
  if (s === "day") return "days";
  if (s === "week") return "weeks";
  if (s === "month") return "months";
  if (s === "year") return "years";
  return "months";
};

export default function LoanProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [err, setErr] = useState("");
  const [debug, setDebug] = useState(null);

  const [form, setForm] = useState({
    name: "",
    code: "",
    interestRate: "",
    interestPeriod: "monthly",
    term: "",
    termUnit: "months",
    principalMin: "",
    principalMax: "",
    // fees
    feeType: "amount", // amount | percent
    fees: "",          // shown when feeType=amount
    feePercent: "",    // shown when feeType=percent
    active: true,
  });

  /* ---------- utils ---------- */
  const headers = () => {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("jwt") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("accessToken");
    let tenantId = "";
    try { const t = localStorage.getItem("tenant"); if (t) tenantId = JSON.parse(t)?.id || ""; } catch {}
    tenantId = tenantId || localStorage.getItem("tenantId") || "";
    const branchId = localStorage.getItem("activeBranchId") || "";

    const h = { "Content-Type": "application/json", Accept: "application/json" };
    if (token) h.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
    if (tenantId) h["x-tenant-id"] = tenantId;
    if (branchId) h["x-branch-id"] = String(branchId);
    return h;
  };

  const readErr = (e) => {
    const d = e?.response?.data;
    if (typeof d === "string") return d;
    if (d?.message) return d.message;
    if (d?.error) return d.error;
    return e?.response?.statusText || e?.message || "Server error";
  };

  const toNumber = (v) => {
    if (v === "" || v == null) return null;
    const n = Number(String(v).replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  };

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  /* ---------- read existing ---------- */
  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!isEdit) return;
      try {
        setLoading(true);
        const { data } = await api.get(`/loan-products/${id}`, { headers: headers() });
        if (cancel) return;

        const pick = (...keys) => {
          for (const k of keys) {
            const v = data?.[k];
            if (v !== undefined && v !== null && v !== "") return v;
          }
          return undefined;
        };

        // term + unit (many aliases + heuristics)
        let termVal = pick("term","term_value","tenor","tenure","duration","period_count","loanTerm","repayment_term");
        let unitVal = pick("termUnit","term_unit","termType","term_type","unit","duration_unit","tenor_unit","tenure_unit","period_unit","loanTermUnit","repayment_term_unit");

        if (termVal === undefined) {
          for (const [k, v] of Object.entries(data)) {
            if (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 480 && /(term|tenor|tenure|duration|period)/i.test(k)) { termVal = v; break; }
          }
        }
        if (unitVal === undefined) {
          for (const [k, v] of Object.entries(data)) {
            const sv = String(v || "").toLowerCase();
            if (typeof v === "string" && (LOWER_UNITS.includes(sv) || /(day|week|month|year)/i.test(sv))) {
              if (/(term|tenor|tenure|duration|period|unit|type)/i.test(k)) { unitVal = sv; break; }
            }
          }
        }

        // fees: detect whether backend stored amount or percent
        const feePercent = pick("feePercent","fee_percent","fees_percent","feeRate","rate_fee");
        const feeAmount  = pick("fees","fees_total","fee","fee_amount");
        const feeType = feePercent != null ? "percent" : "amount";

        const act = pick("active","isActive","enabled","is_enabled") ?? (String(pick("status") || "").toLowerCase() === "active");

        setForm({
          name: String(pick("name") || ""),
          code: String(pick("code") || ""),
          interestRate: String(pick("interestRate","interest_rate","rate_percent","") || ""),
          interestPeriod: String(pick("interestPeriod","interest_period","period","periodicity","monthly") || "monthly").toLowerCase(),
          term: termVal !== undefined ? String(termVal) : "",
          termUnit: normUnit(unitVal),
          principalMin: new Intl.NumberFormat().format(Number(pick("principalMin","principal_min","min_amount","minimum_principal","minPrincipal",0))),
          principalMax: new Intl.NumberFormat().format(Number(pick("principalMax","principal_max","max_amount","maximum_principal","maxPrincipal",0))),
          feeType,
          fees: feeType === "amount" ? new Intl.NumberFormat().format(Number(feeAmount||0)) : "",
          feePercent: feeType === "percent" ? String(feePercent) : "",
          active: Boolean(act),
        });
      } catch (e) {
        setErr(readErr(e) || "Failed to load product");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [id, isEdit]);

  /* ---------- build payload (aliases) ---------- */
  const buildPayload = (style = "lower") => {
    const periodLower = String(form.interestPeriod || "monthly").toLowerCase();
    const period =
      style === "upper" ? periodLower.toUpperCase()
      : style === "capital" ? periodLower.charAt(0).toUpperCase() + periodLower.slice(1)
      : periodLower;

    const unitLower = normUnit(form.termUnit);
    const unit =
      style === "upper" ? unitLower.toUpperCase()
      : style === "capital" ? unitLower.charAt(0).toUpperCase() + unitLower.slice(1)
      : unitLower;

    const pMin = parseMoney(form.principalMin) ?? 0;
    const pMax = parseMoney(form.principalMax) ?? 0;

    // amount vs percent
    const isPct = form.feeType === "percent";
    const feeAmount = parseMoney(form.fees) ?? 0;
    const feePercent = Number(form.feePercent || 0);

    const common = {
      name: (form.name || "").trim(),
      code: (form.code || "").trim() || null,
      interestRate: toNumber(form.interestRate) ?? 0,
      interest_rate: toNumber(form.interestRate) ?? 0,
      interestPeriod: period,
      interest_period: period,
      period,
      periodicity: period,
      term: toNumber(form.term) ?? 0,
      term_value: toNumber(form.term) ?? 0,
      duration: toNumber(form.term) ?? 0,
      tenor: toNumber(form.term) ?? 0,
      tenure: toNumber(form.term) ?? 0,
      termUnit: unit,
      term_unit: unit,
      termType: unit,
      term_type: unit,
      duration_unit: unit,
      tenor_unit: unit,
      tenure_unit: unit,
      period_unit: unit,
      principalMin: pMin, principal_min: pMin, min_amount: pMin, minimum_principal: pMin, minPrincipal: pMin,
      principalMax: pMax, principal_max: pMax, max_amount: pMax, maximum_principal: pMax, maxPrincipal: pMax,
      active: !!form.active, isActive: !!form.active, status: form.active ? "active" : "inactive",
    };

    if (isPct) {
      return {
        ...common,
        feePercent, fee_percent: feePercent, fees_percent: feePercent, feeRate: feePercent, rate_fee: feePercent,
        fees: 0, fees_total: 0, fee: 0, fee_amount: 0,
      };
    }
    return {
      ...common,
      fees: feeAmount, fees_total: feeAmount, fee: feeAmount, fee_amount: feeAmount,
      feePercent: 0, fee_percent: 0, fees_percent: 0, feeRate: 0, rate_fee: 0,
    };
  };

  const save = async () => {
    const variants = ["lower", "upper", "capital"];
    const atts = [];
    for (const v of variants) {
      try {
        if (isEdit) return await api.put(`/loan-products/${id}`, buildPayload(v), { headers: headers() });
        return await api.post(`/loan-products`, buildPayload(v), { headers: headers() });
      } catch (e) { atts.push({ v, status: e?.response?.status, error: readErr(e) }); }
    }
    throw atts;
  };

  /* ---------- submit ---------- */
  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setDebug(null);

    const pMin = parseMoney(form.principalMin) ?? 0;
    const pMax = parseMoney(form.principalMax) ?? 0;
    if (!form.name?.trim()) return setErr("Name is required");
    if (pMax && pMin && pMax < pMin) return setErr("Principal Max cannot be less than Principal Min");
    if (form.feeType === "percent" && (Number(form.feePercent) < 0 || Number(form.feePercent) > 100)) {
      return setErr("Fee % must be between 0 and 100");
    }

    setSaving(true);
    try {
      await save();
      navigate("/loans/products", { replace: true });
    } catch (attempts) {
      setErr("Failed to save product");
      setDebug(attempts);
    } finally { setSaving(false); }
  };

  /* ---------- UI ---------- */
  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold mb-4">{isEdit ? "Edit Loan Product" : "New Loan Product"}</h1>

      {err && <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 text-rose-700 px-3 py-2 text-sm">{err}</div>}
      {debug && (
        <details open className="mb-3 rounded-md border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-xs">
          <summary className="cursor-pointer select-none">Show attempts</summary>
          <pre className="overflow-auto whitespace-pre-wrap">{JSON.stringify(debug, null, 2)}</pre>
        </details>
      )}

      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Name</label>
            <input name="name" value={form.name} onChange={onChange} required className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" placeholder="e.g. Express Loan" />
          </div>
          <div>
            <label className="block text-sm mb-1">Code</label>
            <input name="code" value={form.code} onChange={onChange} className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" placeholder="e.g. 001" />
          </div>

          <div>
            <label className="block text-sm mb-1">Interest Rate (%)</label>
            <input name="interestRate" value={form.interestRate} onChange={onChange} type="number" step="0.01" min="0" className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" placeholder="e.g. 10" />
            <p className="mt-1 text-xs text-slate-500">Will display with 2 decimals (e.g. 10.00)</p>
          </div>
          <div>
            <label className="block text-sm mb-1">Interest Period</label>
            <select name="interestPeriod" value={form.interestPeriod} onChange={onChange} className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 capitalize">
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Term</label>
            <input name="term" value={form.term} onChange={onChange} type="number" min="0" className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" placeholder="e.g. 12" />
          </div>
          <div>
            <label className="block text-sm mb-1">Term Unit</label>
            <select name="termUnit" value={form.termUnit} onChange={onChange} className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 capitalize">
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
              <option value="years">Years</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Principal Min</label>
            <MoneyInput name="principalMin" value={form.principalMin} onChange={onChange} placeholder="0" />
          </div>
  <div>
            <label className="block text-sm mb-1">Principal Max</label>
            <MoneyInput name="principalMax" value={form.principalMax} onChange={onChange} placeholder="0" />
          </div>

          {/* FEES */}
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-[180px_1fr] gap-3 items-end">
            <div>
              <label className="block text-sm mb-1">Fee Type</label>
              <select name="feeType" value={form.feeType} onChange={onChange} className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2">
                <option value="amount">Amount (TZS)</option>
                <option value="percent">Percentage (%)</option>
              </select>
            </div>

            {form.feeType === "percent" ? (
              <div>
                <label className="block text-sm mb-1">Fee (%)</label>
                <input
                  name="feePercent"
                  value={form.feePercent}
                  onChange={onChange}
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="e.g. 2.5"
                  className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm mb-1">Fee (Amount)</label>
                <MoneyInput name="fees" value={form.fees} onChange={onChange} placeholder="0" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <input id="active" name="active" type="checkbox" checked={!!form.active} onChange={onChange} className="h-4 w-4" />
            <label htmlFor="active" className="text-sm">Active</label>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button type="submit" disabled={saving || loading} className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
            {saving ? "Saving..." : isEdit ? "Update Product" : "Create Product"}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700">Cancel</button>
        </div>
      </form>
    </div>
  );
}
