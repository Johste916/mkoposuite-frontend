import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";

/** small helpers */
const cls = (...a) => a.filter(Boolean).join(" ");

export default function LoanProductForm() {
  const nav = useNavigate();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [interestPeriod, setInterestPeriod] = useState("monthly");

  const [termValue, setTermValue] = useState("");
  const [termUnit, setTermUnit] = useState("months");

  const [minPrincipal, setMinPrincipal] = useState("0");
  const [maxPrincipal, setMaxPrincipal] = useState("0");

  const [feeType, setFeeType] = useState("amount");
  const [feeAmount, setFeeAmount] = useState("0");
  const [feePercent, setFeePercent] = useState("");

  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        name,
        code,
        status: active ? "active" : "inactive",
        interestMethod: "flat",
        interestRate: Number(interestRate || 0),

        // new fields:
        interestPeriod,
        termValue: termValue ? Number(termValue) : null,
        termUnit,

        minPrincipal: minPrincipal ? Number(String(minPrincipal).replace(/,/g, "")) : null,
        maxPrincipal: maxPrincipal ? Number(String(maxPrincipal).replace(/,/g, "")) : null,

        feeType,
        feeAmount: feeType === "amount" ? Number(feeAmount || 0) : null,
        feePercent: feeType === "percent" ? Number(feePercent || 0) : null,
      };

      await api.post("/loan-products", payload);
      nav("/loans/products");
    } catch (e2) {
      console.error("create product error:", e2);
      setError("Failed to create product");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">New Loan Product</h1>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm px-3 py-2">
          {error}
        </div>
      )}

      {/* Full-width, roomy form */}
      <form
        onSubmit={save}
        className="rounded-2xl border border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-700 px-4 sm:px-6 py-6"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Name */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Express Loan"
              className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-700"
            />
          </div>

          {/* Code */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. 001"
              className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-700"
            />
          </div>

          {/* Interest Rate */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Interest Rate (%)</label>
            <input
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              placeholder="e.g. 10"
              className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-700"
            />
            <div className="text-xs text-slate-500">Will display with 2 decimals (e.g. 10.00)</div>
          </div>

          {/* Interest Period */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Interest Period</label>
            <select
              value={interestPeriod}
              onChange={(e) => setInterestPeriod(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-700"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          {/* Term */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Term</label>
            <input
              value={termValue}
              onChange={(e) => setTermValue(e.target.value)}
              placeholder="e.g. 12"
              className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-700"
            />
          </div>

          {/* Term Unit */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Term Unit</label>
            <select
              value={termUnit}
              onChange={(e) => setTermUnit(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-700"
            >
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
              <option value="years">Years</option>
            </select>
          </div>

          {/* Principal Min */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Principal Min</label>
            <input
              value={minPrincipal}
              onChange={(e) => setMinPrincipal(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-700"
            />
          </div>

          {/* Principal Max */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Principal Max</label>
            <input
              value={maxPrincipal}
              onChange={(e) => setMaxPrincipal(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-700"
            />
          </div>

          {/* Fee Type */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Fee Type</label>
            <select
              value={feeType}
              onChange={(e) => setFeeType(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-700"
            >
              <option value="amount">Amount (TZS)</option>
              <option value="percent">Percentage (%)</option>
            </select>
          </div>

          {/* Fee Value */}
          <div className="space-y-1">
            <label className="text-sm font-medium">
              {feeType === "percent" ? "Fee (%)" : "Fee (Amount)"}
            </label>
            <input
              value={feeType === "percent" ? feePercent : feeAmount}
              onChange={(e) =>
                feeType === "percent" ? setFeePercent(e.target.value) : setFeeAmount(e.target.value)
              }
              placeholder={feeType === "percent" ? "e.g. 2.5" : "e.g. 2000"}
              className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-700"
            />
          </div>
        </div>

        {/* status + actions */}
        <div className="mt-6 flex items-center justify-between">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium">Active</span>
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => nav(-1)}
              className="px-3 py-2 rounded-md border border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={cls(
                "px-4 py-2 rounded-md text-white",
                saving ? "bg-blue-400 cursor-wait" : "bg-blue-600 hover:bg-blue-700"
              )}
            >
              {saving ? "Creating…" : "Create Product"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
