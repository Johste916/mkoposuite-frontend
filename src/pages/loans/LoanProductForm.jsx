// src/pages/loans/LoanProductForm.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api";

/** Money input with live thousands separators, stored as string; use parseMoney to send */
function MoneyInput({ name, value, onChange, placeholder = "0", ...rest }) {
  const format = (raw) => {
    const digits = String(raw ?? "").replace(/[^\d.-]/g, "");
    if (digits === "" || digits === "-") return digits;
    const n = Number(digits);
    if (!Number.isFinite(n)) return digits;
    return new Intl.NumberFormat().format(n);
  };
  const handle = (e) => {
    // keep the raw characters but reformat
    const raw = e.target.value;
    const digits = raw.replace(/[^\d.-]/g, "");
    const formatted = format(digits);
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

export default function LoanProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  // ---------- state
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [err, setErr] = useState("");
  const [debug, setDebug] = useState(null);

  const [form, setForm] = useState({
    name: "",
    code: "",
    interestRate: "",
    interestPeriod: "monthly", // weekly | monthly | yearly
    term: "",
    termUnit: "months",        // days | weeks | months
    principalMin: "",
    principalMax: "",
    fees: "",
    active: true,
  });

  // ---------- utils
  const toNumber = (v) => {
    if (v === "" || v == null) return null;
    const n = Number(String(v).replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  };

  const normEnum = (v, allowed, casing = "lower") => {
    const s = String(v || "");
    const lower = s.toLowerCase();
    const val = allowed.includes(lower) ? lower : allowed[0];
    if (casing === "upper") return val.toUpperCase();
    if (casing === "capital") return val.charAt(0).toUpperCase() + val.slice(1);
    return val;
  };

  const buildHeaders = () => {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("jwt") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("accessToken");

    let tenantId = "";
    try {
      const t = localStorage.getItem("tenant");
      if (t) tenantId = JSON.parse(t)?.id || "";
    } catch {}
    tenantId = tenantId || localStorage.getItem("tenantId") || "";

    const branchId = localStorage.getItem("activeBranchId") || "";

    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (token) headers.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
    if (tenantId) headers["x-tenant-id"] = tenantId;
    if (branchId) headers["x-branch-id"] = String(branchId);
    return headers;
  };

  const readErrorBody = (e) => {
    const r = e?.response;
    const d = r?.data;
    if (typeof d === "string" && d) return d;
    if (d?.message) return d.message;
    if (d?.error) return d.error;
    if (d?.detail) return d.detail;
    if (Array.isArray(d?.errors) && d.errors.length)
      return d.errors.map((x) => x.message || x.msg || JSON.stringify(x)).join(", ");
    if (d && typeof d === "object") return JSON.stringify(d);
    return r?.statusText || e?.message || "Server error";
  };

  // ---------- handlers
  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  // read aliases when editing
  useEffect(() => {
    let canceled = false;
    (async () => {
      if (!isEdit) return;
      try {
        setLoading(true);
        const { data } = await api.get(`/loan-products/${id}`, { headers: buildHeaders() });
        if (canceled) return;
        const get = (...keys) => {
          for (const k of keys) {
            const v = data?.[k];
            if (v !== undefined && v !== null && v !== "") return v;
          }
          return "";
        };

        setForm({
          name: get("name"),
          code: get("code"),
          interestRate: String(get("interestRate", "interest_rate", "rate_percent", "")),
          interestPeriod: (get("interestPeriod", "interest_period", "period", "periodicity", "monthly") || "monthly"),
          term: String(get("term", "tenor", "duration", "term_value", "")),
          termUnit: (get("termUnit", "term_unit", "unit", "termType", "term_type", "duration_unit", "tenor_unit", "period_unit", "months") || "months"),
          principalMin: new Intl.NumberFormat().format(Number(get("principalMin", "principal_min", "min_amount", "minimum_principal", "minPrincipal", 0))),
          principalMax: new Intl.NumberFormat().format(Number(get("principalMax", "principal_max", "max_amount", "maximum_principal", "maxPrincipal", 0))),
          fees: new Intl.NumberFormat().format(Number(get("fees", "fees_total", "fee", 0))),
          active: Boolean(get("active", "")) || false,
        });
      } catch (e) {
        setErr(readErrorBody(e) || "Failed to load product");
      } finally {
        if (!canceled) setLoading(false);
      }
    })();
    return () => { canceled = true; };
  }, [id, isEdit]);

  const buildAliasSuperset = (enums = "lower") => {
    // numbers parsed from formatted fields
    const pMin = parseMoney(form.principalMin);
    const pMax = parseMoney(form.principalMax);
    const feeN = parseMoney(form.fees);

    const interestPeriod = normEnum(form.interestPeriod, ["weekly", "monthly", "yearly"], enums);
    const termUnit = normEnum(form.termUnit, ["days", "weeks", "months"], enums);

    const p = {
      name: (form.name || "").trim(),
      code: (form.code || "").trim() || null,
      interestRate: toNumber(form.interestRate) ?? 0,
      interestPeriod,
      term: toNumber(form.term) ?? 0,
      termUnit,
      principalMin: pMin ?? 0,
      principalMax: pMax ?? 0,
      fees: feeN ?? 0,
      active: !!form.active,
    };

    return {
      // canonical
      name: p.name,
      code: p.code,
      interestRate: p.interestRate,
      interestPeriod: p.interestPeriod,
      term: p.term,
      termUnit: p.termUnit,
      principalMin: p.principalMin,
      principalMax: p.principalMax,
      fees: p.fees,
      active: p.active,

      // snake
      interest_rate: p.interestRate,
      interest_period: p.interestPeriod,
      term_unit: p.termUnit,
      principal_min: p.principalMin,
      principal_max: p.principalMax,
      fees_total: p.fees,

      // alternates used by various stacks
      min_amount: p.principalMin,
      max_amount: p.principalMax,
      minimum_principal: p.principalMin,
      maximum_principal: p.principalMax,
      minPrincipal: p.principalMin,
      maxPrincipal: p.principalMax,

      tenor: p.term,
      tenor_unit: p.termUnit,
      duration: p.term,
      duration_unit: p.termUnit,

      term_value: p.term,
      term_type: p.termUnit,

      rate_percent: p.interestRate,
      period: p.interestPeriod,
      period_unit: p.termUnit, // some APIs call unit "period_unit"
      periodicity: p.interestPeriod,
      periodicity_unit: p.termUnit,
    };
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setDebug(null);

    // validation
    const pMin = parseMoney(form.principalMin) ?? 0;
    const pMax = parseMoney(form.principalMax) ?? 0;
    if (!form.name?.trim()) return setErr("Name is required");
    if (pMax && pMin && pMax < pMin) return setErr("Principal Max cannot be less than Principal Min");

    setSaving(true);
    const variants = [
      { label: "alias_superset_lower", payload: buildAliasSuperset("lower") },
      { label: "alias_superset_upper", payload: buildAliasSuperset("upper") },
      { label: "alias_superset_capital", payload: buildAliasSuperset("capital") },
    ];
    const attempts = [];
    try {
      const headers = buildHeaders();
      for (const v of variants) {
        try {
          if (isEdit) {
            await api.put(`/loan-products/${id}`, v.payload, { headers });
          } else {
            await api.post(`/loan-products`, v.payload, { headers });
          }
          setSaving(false);
          return navigate("/loans/products", { replace: true });
        } catch (e2) {
          attempts.push({ label: v.label, status: e2?.response?.status, error: readErrorBody(e2) });
        }
      }
      setErr("Failed to save product");
      setDebug(attempts);
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
        <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 text-rose-700 px-3 py-2 text-sm">
          {err}
        </div>
      )}
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
              placeholder="e.g. 10"
            />
            <p className="mt-1 text-xs text-slate-500">Will display with 2 decimals (e.g. 10.00)</p>
          </div>

          <div>
            <label className="block text-sm mb-1">Interest Period</label>
            <select
              name="interestPeriod"
              value={form.interestPeriod}
              onChange={onChange}
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 capitalize"
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
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 capitalize"
            >
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Principal Min</label>
            <MoneyInput
              name="principalMin"
              value={form.principalMin}
              onChange={onChange}
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Principal Max</label>
            <MoneyInput
              name="principalMax"
              value={form.principalMax}
              onChange={onChange}
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Fees (Total)</label>
            <MoneyInput
              name="fees"
              value={form.fees}
              onChange={onChange}
              placeholder="0"
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
