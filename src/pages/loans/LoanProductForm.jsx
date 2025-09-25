import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api";

export default function LoanProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  // ---------- state
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [err, setErr] = useState("");
  const [debug, setDebug] = useState(null); // attempts + responses
  const [serverShape, setServerShape] = useState(null); // inferred keys from GET /loan-products

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

  // ---------- infer server shape (snake vs camel + known keys)
  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const { data } = await api.get("/loan-products", { headers: buildHeaders(), params: { limit: 1 } });
        if (canceled) return;
        const sample = Array.isArray(data) ? data[0] : (Array.isArray(data?.items) ? data.items[0] : Array.isArray(data?.data) ? data.data[0] : null);
        if (sample && typeof sample === "object") {
          const keys = Object.keys(sample);
          setServerShape({
            snake: keys.some((k) => k.includes("_")),
            keys,
          });
        } else {
          setServerShape({ snake: true, keys: [] }); // default guess
        }
      } catch {
        setServerShape({ snake: true, keys: [] }); // safe default
      }
    })();
    return () => { canceled = true; };
  }, []);

  const prefersSnake = serverShape?.snake ?? true;

  // ---------- build base + alias-rich variants
  const baseNormalized = useMemo(() => {
    const interestPeriod = normEnum(form.interestPeriod, ["weekly", "monthly", "yearly"], "lower");
    const termUnit = normEnum(form.termUnit, ["days", "weeks", "months"], "lower");
    return {
      name: (form.name || "").trim(),
      code: (form.code || "").trim(),
      interestRate: toNumber(form.interestRate) ?? 0,
      interestPeriod,
      term: toNumber(form.term) ?? 0,
      termUnit,
      principalMin: toNumber(form.principalMin) ?? 0,
      principalMax: toNumber(form.principalMax) ?? 0,
      fees: toNumber(form.fees) ?? 0,
      active: !!form.active,
    };
  }, [form]);

  // A super-set payload that includes **aliases** many backends use.
  // We send one payload that covers camelCase, snake_case and common alternates.
  const buildAliasSuperset = (enums = "lower") => {
    const p = baseNormalized;
    const ip = normEnum(p.interestPeriod, ["weekly", "monthly", "yearly"], enums);
    const tu = normEnum(p.termUnit, ["days", "weeks", "months"], enums);

    return {
      // canonical
      name: p.name,
      code: p.code || null,
      interestRate: p.interestRate,
      interestPeriod: ip,
      term: p.term,
      termUnit: tu,
      principalMin: p.principalMin,
      principalMax: p.principalMax,
      fees: p.fees,
      active: p.active,

      // snake aliases
      interest_rate: p.interestRate,
      interest_period: ip,
      term_unit: tu,
      principal_min: p.principalMin,
      principal_max: p.principalMax,
      fees_total: p.fees,

      // other common aliases used by various codebases
      min_amount: p.principalMin,
      max_amount: p.principalMax,
      minimum_principal: p.principalMin,
      maximum_principal: p.principalMax,
      minPrincipal: p.principalMin,
      maxPrincipal: p.principalMax,

      tenor: p.term,              // some APIs use tenor
      tenor_unit: tu,
      duration: p.term,           // others use duration
      duration_unit: tu,
      rate_percent: p.interestRate, // sometimes rate_percent is used
    };
  };

  // ---------- load when editing
  useEffect(() => {
    let canceled = false;
    (async () => {
      if (!isEdit) return;
      try {
        setLoading(true);
        const { data } = await api.get(`/loan-products/${id}`, { headers: buildHeaders() });
        if (canceled) return;
        const get = (a, b, c, d = "") => data?.[a] ?? data?.[b] ?? data?.[c] ?? d;

        setForm({
          name: get("name"),
          code: get("code"),
          interestRate: String(get("interestRate", "interest_rate", "rate_percent", "")),
          interestPeriod: (get("interestPeriod", "interest_period", "", "monthly") || "monthly"),
          term: String(get("term", "tenor", "duration", "")),
          termUnit: (get("termUnit", "term_unit", "tenor_unit", "months") || "months"),
          principalMin: String(get("principalMin", "principal_min", "min_amount", "")),
          principalMax: String(get("principalMax", "principal_max", "max_amount", "")),
          fees: String(get("fees", "fees_total", "fee", "")),
          active: Boolean(get("active", "", "", true)),
        });
      } catch (e) {
        setErr(readErrorBody(e) || "Failed to load product");
      } finally {
        if (!canceled) setLoading(false);
      }
    })();
    return () => { canceled = true; };
  }, [id, isEdit]);

  // ---------- handlers
  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const tryPostOnce = async (payload) => {
    const headers = buildHeaders();
    if (isEdit) {
      return api.put(`/loan-products/${id}`, payload, { headers });
    }
    return api.post(`/loan-products`, payload, { headers });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setDebug(null);

    if (!form.name?.trim()) return setErr("Name is required");
    if (toNumber(form.principalMax) && toNumber(form.principalMin) && toNumber(form.principalMax) < toNumber(form.principalMin)) {
      return setErr("Principal Max cannot be less than Principal Min");
    }

    setSaving(true);

    // Try alias superset with lowercase enums first, then UPPERCASE and Capitalized,
    // so enum mismatch won’t drop fields.
    const attempts = [];
    const variants = [
      { label: "alias_superset_lower", payload: buildAliasSuperset("lower") },
      { label: "alias_superset_upper", payload: buildAliasSuperset("upper") },
      { label: "alias_superset_capital", payload: buildAliasSuperset("capital") },
    ];

    for (const v of variants) {
      try {
        const res = await tryPostOnce(v.payload);
        setSaving(false);
        return navigate("/loans/products", { replace: true });
      } catch (e2) {
        attempts.push({ label: v.label, payload: v.payload, error: readErrorBody(e2), status: e2?.response?.status });
      }
    }

    setSaving(false);
    setErr("Failed to save product");
    setDebug(attempts);
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
          <summary className="cursor-pointer select-none">Show attempts & server responses</summary>
          <pre className="overflow-auto whitespace-pre-wrap">
            {JSON.stringify(debug, null, 2)}
          </pre>
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
            />
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
