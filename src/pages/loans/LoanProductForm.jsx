// src/pages/loans/LoanProductForm.jsx
import React, { useEffect, useState } from "react";
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

const LOWER_UNITS = ["days", "weeks", "months", "years"];

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
    fees: "",
    active: true,
  });

  // ---------------- utils
  const buildHeaders = () => {
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

    const headers = { "Content-Type": "application/json", Accept: "application/json" };
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

  const normUnit = (v) => {
    const s = String(v || "").toLowerCase();
    if (LOWER_UNITS.includes(s)) return s;
    if (s.endsWith("s") && LOWER_UNITS.includes(s)) return s;
    // singulars
    if (s === "day") return "days";
    if (s === "week") return "weeks";
    if (s === "month") return "months";
    if (s === "year") return "years";
    return "months";
  };

  const toNumber = (v) => {
    if (v === "" || v == null) return null;
    const n = Number(String(v).replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  };

  // ---------------- read when editing (broad alias + heuristics)
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
          return undefined;
        };

        // 1) try known aliases first
        let termVal = get("term", "tenor", "duration", "term_value", "loanTerm", "period_count", "repayment_term");
        let unitVal = get("termUnit", "term_unit", "unit", "termType", "term_type", "duration_unit", "tenor_unit", "period_unit", "repayment_term_unit", "loanTermUnit");

        // 2) heuristics: find any small-ish integer for term; any unit-like string for unit
        if (termVal === undefined) {
          for (const [k, v] of Object.entries(data)) {
            if (v === null || v === undefined) continue;
            if (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 480) {
              if (/(term|tenor|duration|period)/i.test(k)) { termVal = v; break; }
            }
          }
        }
        if (unitVal === undefined) {
          for (const [k, v] of Object.entries(data)) {
            if (v === null || v === undefined) continue;
            const sv = String(v).toLowerCase();
            if (typeof v === "string" && (LOWER_UNITS.includes(sv) || /(day|week|month|year)/i.test(sv))) {
              if (/(unit|type|term|duration|tenor|period)/i.test(k) || LOWER_UNITS.includes(sv)) {
                unitVal = sv; break;
              }
            }
          }
        }

        // active aliases
        const activeVal = get("active", "isActive", "enabled", "is_enabled", "is_enabled") ??
          (String(get("status") || "").toLowerCase() === "active");

        setForm({
          name: String(get("name") || ""),
          code: String(get("code") || ""),
          interestRate: String(get("interestRate", "interest_rate", "rate_percent", "")),
          interestPeriod: String(get("interestPeriod", "interest_period", "period", "periodicity", "monthly") || "monthly").toLowerCase(),
          term: termVal !== undefined ? String(termVal) : "",
          termUnit: normUnit(unitVal),
          principalMin: new Intl.NumberFormat().format(Number(get("principalMin", "principal_min", "min_amount", "minimum_principal", "minPrincipal", 0))),
          principalMax: new Intl.NumberFormat().format(Number(get("principalMax", "principal_max", "max_amount", "maximum_principal", "maxPrincipal", 0))),
          fees: new Intl.NumberFormat().format(Number(get("fees", "fees_total", "fee", 0))),
          active: Boolean(activeVal),
        });
      } catch (e) {
        setErr(readErrorBody(e) || "Failed to load product");
      } finally {
        if (!canceled) setLoading(false);
      }
    })();
    return () => { canceled = true; };
  }, [id, isEdit]);

  // ---------------- handlers
  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const buildAliasSuperset = (enums = "lower") => {
    const periodLower = String(form.interestPeriod || "monthly").toLowerCase();
    const period =
      enums === "upper" ? periodLower.toUpperCase()
      : enums === "capital" ? periodLower.charAt(0).toUpperCase() + periodLower.slice(1)
      : periodLower;

    const unitLower = normUnit(form.termUnit);
    const unit =
      enums === "upper" ? unitLower.toUpperCase()
      : enums === "capital" ? unitLower.charAt(0).toUpperCase() + unitLower.slice(1)
      : unitLower;

    const pMin = parseMoney(form.principalMin) ?? 0;
    const pMax = parseMoney(form.principalMax) ?? 0;
    const feeN = parseMoney(form.fees) ?? 0;

    const payload = {
      // canonical (camel)
      name: (form.name || "").trim(),
      code: (form.code || "").trim() || null,
      interestRate: toNumber(form.interestRate) ?? 0,
      interestPeriod: period,
      term: toNumber(form.term) ?? 0,
      termUnit: unit,
      principalMin: pMin,
      principalMax: pMax,
      fees: feeN,
      active: !!form.active,
      isActive: !!form.active,
      status: form.active ? "active" : "inactive",

      // snake aliases
      interest_rate: toNumber(form.interestRate) ?? 0,
      interest_period: period,
      term_unit: unit,
      principal_min: pMin,
      principal_max: pMax,
      fees_total: feeN,

      // alternates
      min_amount: pMin,
      max_amount: pMax,
      minimum_principal: pMin,
      maximum_principal: pMax,
      minPrincipal: pMin,
      maxPrincipal: pMax,

      tenor: toNumber(form.term) ?? 0,
      tenor_unit: unit,
      duration: toNumber(form.term) ?? 0,
      duration_unit: unit,

      term_value: toNumber(form.term) ?? 0,
      term_type: unit,

      rate_percent: toNumber(form.interestRate) ?? 0,
      period: period,
      period_unit: unit,
      periodicity: period,
      periodicity_unit: unit,
    };

    return payload;
  };

  const submitWithVariants = async () => {
    const headers = buildHeaders();
    const variants = [
      { label: "alias_superset_lower", payload: buildAliasSuperset("lower") },
      { label: "alias_superset_upper", payload: buildAliasSuperset("upper") },
      { label: "alias_superset_capital", payload: buildAliasSuperset("capital") },
    ];
    const attempts = [];
    for (const v of variants) {
      try {
        if (isEdit) {
          return await api.put(`/loan-products/${id}`, v.payload, { headers });
        }
        return await api.post(`/loan-products`, v.payload, { headers });
      } catch (e) {
        attempts.push({ label: v.label, status: e?.response?.status, error: readErrorBody(e) });
      }
    }
    throw attempts;
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
    try {
      await submitWithVariants();
      navigate("/loans/products", { replace: true });
    } catch (attempts) {
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

          <div>
            <label className="block text-sm mb-1">Fees (Total)</label>
            <MoneyInput name="fees" value={form.fees} onChange={onChange} placeholder="0" />
          </div>

          <div className="flex items-center gap-2 mt-6">
            <input
              id="active"
              name="active"
              type="checkbox"
              checked={!!form.active}
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
