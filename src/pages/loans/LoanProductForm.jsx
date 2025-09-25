// src/pages/loans/LoanProducts.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiEdit2,
  FiLoader,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiToggleLeft,
  FiToggleRight,
} from "react-icons/fi";
import api from "../../api";

const PAGINATION_KEYS = { page: "page", limit: "limit", search: "q" };

export default function LoanProducts() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const debRef = useRef(null);

  const readErr = (e) => {
    const d = e?.response?.data;
    if (typeof d === "string") return d;
    if (d?.message) return d.message;
    if (d?.error) return d.error;
    return e?.response?.statusText || e?.message || "Server error";
  };

  const headers = () => {
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

    const h = { Accept: "application/json" };
    if (token) h.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
    if (tenantId) h["x-tenant-id"] = tenantId;
    if (branchId) h["x-branch-id"] = String(branchId);
    return h;
  };

  const currency = (n) => {
    if (n == null || n === "") return "-";
    const num = Number(n);
    if (!Number.isFinite(num)) return String(n);
    return new Intl.NumberFormat().format(num);
  };

  const pick = (...vals) => {
    for (const v of vals) if (v !== undefined && v !== null && v !== "") return v;
    return undefined;
  };

  const cap = (v) => {
    if (v == null || v === "" || v === "-") return "-";
    const s = String(v).toLowerCase();
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const to2 = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return v ?? "-";
    return n.toFixed(2);
  };

  const pluralUnit = (unit, termVal) => {
    if (!unit) return "-";
    const n = Number(termVal);
    const u = String(unit).toLowerCase();
    if (!Number.isFinite(n)) return cap(u);
    const sing = { months: "Month", weeks: "Week", days: "Day", years: "Year" }[u] || cap(u.replace(/s$/, ""));
    return n === 1 ? sing : cap(u.endsWith("s") ? u : `${u}s`);
  };

  const params = (over = {}) => {
    const p = {
      page: over.page ?? page,
      pageSize: over.pageSize ?? pageSize,
      q: (over.q ?? q) || undefined,
    };
    const obj = { [PAGINATION_KEYS.page]: p.page, [PAGINATION_KEYS.limit]: p.pageSize };
    if (p.q !== undefined) obj[PAGINATION_KEYS.search] = p.q;
    return obj;
  };

  const load = async (over = {}) => {
    setLoading(true);
    setErr("");
    try {
      const { data } = await api.get("/loan-products", { params: params(over), headers: headers() });
      if (Array.isArray(data)) {
        setItems(data);
        setTotal(data.length);
      } else if (Array.isArray(data?.items)) {
        setItems(data.items);
        setTotal(Number(data.total ?? data.count ?? data.items.length));
      } else if (Array.isArray(data?.data)) {
        setItems(data.data);
        setTotal(Number(data.total ?? data.count ?? data.data.length));
      } else {
        setItems([]);
        setTotal(0);
      }
    } catch (e) {
      setErr(readErr(e));
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(); // eslint-disable-next-line
  }, [page, pageSize]);
  useEffect(() => {
    clearTimeout(debRef.current);
    debRef.current = setTimeout(() => {
      setPage(1);
      load({ page: 1 });
    }, 300);
    return () => clearTimeout(debRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const toggleActive = async (row) => {
    try {
      setLoading(true);
      const id = row.id || row.uuid || row._id;
      const next =
        !Boolean(row.active ?? row.isActive ?? (String(row.status || "").toLowerCase() === "active"));

      // 1) Prefer dedicated toggle endpoint if available
      try {
        await api.patch(`/loan-products/${id}/toggle`, {}, { headers: headers() });
      } catch {
        // 2) Fallback to PATCH body update
        try {
          await api.patch(
            `/loan-products/${id}`,
            { active: next, isActive: next, status: next ? "active" : "inactive" },
            { headers: headers() }
          );
        } catch {
          // 3) Final fallback to PUT
          await api.put(
            `/loan-products/${id}`,
            { active: next, isActive: next, status: next ? "active" : "inactive" },
            { headers: headers() }
          );
        }
      }
      await load();
    } catch (e) {
      setErr(readErr(e));
    } finally {
      setLoading(false);
    }
  };

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Loan Products</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products…"
              className="w-56 pl-9 pr-3 py-2 rounded-md text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
          <Link
            to="/loans/products/new"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            <FiPlus /> Add Product
          </Link>
        </div>
      </div>

      {err && (
        <div className="rounded-md border border-rose-300 bg-rose-50 text-rose-700 px-3 py-2 text-sm">
          {err}
        </div>
      )}

      <div className="rounded-2xl border border-slate-300 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-separate border-spacing-0">
            <thead className="bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200">
              <tr>
                {[
                  "Name",
                  "Code",
                  "Rate %",
                  "Period",
                  "Term",
                  "Unit",
                  "Principal Min",
                  "Principal Max",
                  "Fees",
                  "Active",
                  "Actions",
                ].map((h, i) => (
                  <th
                    key={h}
                    className={`px-3 py-2 font-semibold text-left border-b border-slate-300 dark:border-slate-700 ${
                      i === 2 || i === 4 || i === 6 || i === 7 || i === 8 ? "text-right" : ""
                    } ${i === 9 ? "text-center" : ""} ${i ? "border-l border-slate-200 dark:border-slate-800" : ""}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-slate-500">
                    <span className="inline-flex items-center gap-2">
                      <FiLoader className="animate-spin" /> Loading…
                    </span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-slate-500">
                    No products found.
                  </td>
                </tr>
              ) : (
                items.map((r, rowIdx) => {
                  const id = r.id || r.uuid || r._id;

                  const rate = pick(r.interestRate, r.interest_rate, r.rate_percent);
                  const period = pick(r.interestPeriod, r.interest_period, r.period, r.periodicity);

                  const termVal = pick(
                    r.term,
                    r.term_value,
                    r.tenor,
                    r.tenure,
                    r.duration,
                    r.period_count,
                    r.loanTerm,
                    r.repayment_term
                  );

                  const unit = pick(
                    r.termUnit,
                    r.term_unit,
                    r.termType,
                    r.term_type,
                    r.unit,
                    r.duration_unit,
                    r.tenor_unit,
                    r.tenure_unit,
                    r.period_unit,
                    r.loanTermUnit,
                    r.repayment_term_unit
                  );

                  // fees: prefer % if present
                  const feePercent = pick(
                    r.feePercent,
                    r.fee_percent,
                    r.fees_percent,
                    r.feeRate,
                    r.rate_fee
                  );
                  const feeAmount = pick(r.fees, r.fees_total, r.fee, r.fee_amount);
                  const feeDisplay = feePercent != null ? `${to2(feePercent)}%` : currency(feeAmount);

                  const active =
                    r.active ?? r.isActive ?? (String(r.status || "").toLowerCase() === "active");

                  const cellBase =
                    "px-3 py-2 border-t border-slate-200 dark:border-slate-800 " +
                    "border-l first:border-l-0 border-slate-200 dark:border-slate-800";

                  return (
                    <tr
                      key={id}
                      className={rowIdx % 2 ? "bg-slate-50/40 dark:bg-slate-800/20" : ""}
                    >
                      <td className={`${cellBase} font-medium`}>{r.name || "-"}</td>
                      <td className={cellBase}>{r.code || "-"}</td>
                      <td className={`${cellBase} text-right`}>{to2(rate)}</td>
                      <td className={cellBase}>{cap(period ?? "-")}</td>
                      <td className={`${cellBase} text-right`}>{termVal ?? "-"}</td>
                      <td className={cellBase}>{pluralUnit(unit ?? "-", termVal)}</td>
                      <td className={`${cellBase} text-right`}>
                        {currency(
                          pick(
                            r.principalMin,
                            r.principal_min,
                            r.min_amount,
                            r.minimum_principal,
                            r.minPrincipal
                          )
                        )}
                      </td>
                      <td className={`${cellBase} text-right`}>
                        {currency(
                          pick(
                            r.principalMax,
                            r.principal_max,
                            r.max_amount,
                            r.maximum_principal,
                            r.maxPrincipal
                          )
                        )}
                      </td>
                      <td className={`${cellBase} text-right`}>{feeDisplay}</td>
                      <td className={`${cellBase} text-center`}>
                        <button
                          onClick={() => toggleActive(r)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ring-1 transition
                                      ${active
                                        ? "bg-emerald-50 ring-emerald-300 text-emerald-700 hover:bg-emerald-100"
                                        : "bg-slate-50 ring-slate-300 text-slate-600 hover:bg-slate-100"}`}
                          title={active ? "Deactivate" : "Activate"}
                        >
                          {active ? <FiToggleRight size={18} /> : <FiToggleLeft size={18} />}
                          <span className="text-xs font-medium">
                            {active ? "Active" : "Inactive"}
                          </span>
                        </button>
                      </td>
                      <td className={`${cellBase} text-right`}>
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/loans/products/${id}/edit`)}
                            className="p-2 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                            title="Edit"
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            onClick={async () => {
                              if (!window.confirm(`Delete product "${r.name}"?`)) return;
                              try {
                                setLoading(true);
                                await api.delete(`/loan-products/${id}`, { headers: headers() });
                                await load();
                              } catch (e) {
                                setErr(readErr(e));
                              } finally {
                                setLoading(false);
                              }
                            }}
                            className="p-2 rounded-md border border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-900/40 dark:hover:bg-rose-900/20"
                            title="Delete"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-3 py-3 bg-slate-100 dark:bg-slate-800/40 border-t border-slate-300 dark:border-slate-800">
          <div className="text-xs text-slate-700 dark:text-slate-300">
            {total
              ? `Showing ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} of ${total}`
              : "—"}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-sm"
              aria-label="Rows per page"
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2 py-1 rounded-md border border-slate-300 dark:border-slate-700 disabled:opacity-50"
              >
                Prev
              </button>
              <span className="px-2 text-sm tabular-nums">
                {page} / {pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="px-2 py-1 rounded-md border border-slate-300 dark:border-slate-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
