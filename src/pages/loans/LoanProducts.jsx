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

/**
 * If your backend uses different query param names, change these.
 * Examples:
 *   { page: "pageNumber", limit: "pageSize", search: "search" }
 *   { page: "page", limit: "perPage", search: "query" }
 */
const PAGINATION_KEYS = {
  page: "page",
  limit: "limit",
  search: "q",
};

export default function LoanProducts() {
  const navigate = useNavigate();

  // -------- state
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const debRef = useRef(null);

  // -------- utils
  const readError = (e) => {
    const r = e?.response;
    const d = r?.data;
    try {
      if (typeof d === "string" && d) return d;
      if (d?.message) return d.message;
      if (d?.error) return d.error;
      if (Array.isArray(d?.errors) && d.errors.length)
        return d.errors.map((x) => x.message || x.msg || JSON.stringify(x)).join(", ");
      if (d && typeof d === "object") return JSON.stringify(d);
    } catch {}
    return r?.statusText || e?.message || "Server error";
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

    const headers = { Accept: "application/json" };
    if (token) headers.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
    if (tenantId) headers["x-tenant-id"] = tenantId;
    if (branchId) headers["x-branch-id"] = String(branchId);
    return headers;
  };

  const currency = (n) => {
    if (n == null || n === "") return "-";
    const num = Number(n);
    if (!Number.isFinite(num)) return String(n);
    return new Intl.NumberFormat().format(num);
  };

  const buildParams = (over = {}) => {
    const p = {
      page: over.page ?? page,
      pageSize: over.pageSize ?? pageSize,
      q: (over.q ?? q) || undefined,
    };
    const params = {
      [PAGINATION_KEYS.page]: p.page,
      [PAGINATION_KEYS.limit]: p.pageSize,
    };
    if (p.q !== undefined) params[PAGINATION_KEYS.search] = p.q;

    // If your API uses offset/limit, uncomment:
    // params.offset = (p.page - 1) * p.pageSize;

    return params;
  };

  // -------- data load
  const fetchData = async (opts = {}) => {
    setLoading(true);
    setErr("");
    try {
      const { data } = await api.get("/loan-products", {
        params: buildParams(opts),
        headers: buildHeaders(),
      });

      // Flexible parsing
      if (Array.isArray(data)) {
        setItems(data);
        setTotal(data.length);
      } else if (Array.isArray(data?.items)) {
        setItems(data.items);
        setTotal(Number(data.total ?? data.count ?? data.items.length));
        if (data.page) setPage(Number(data.page));
        if (data.limit) setPageSize(Number(data.limit));
      } else if (Array.isArray(data?.data)) {
        setItems(data.data);
        setTotal(Number(data.total ?? data.count ?? data.data.length));
      } else {
        setItems([]);
        setTotal(0);
      }
    } catch (e) {
      setErr(readError(e));
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // initial + when page/pageSize changes
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  // debounced search
  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => {
      setPage(1);
      fetchData({ page: 1 });
    }, 300);
    return () => debRef.current && clearTimeout(debRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // -------- actions
  const onDelete = async (row) => {
    const ok = window.confirm(`Delete product "${row.name}"? This cannot be undone.`);
    if (!ok) return;
    try {
      setLoading(true);
      const id = row.id || row.uuid || row._id;
      await api.delete(`/loan-products/${id}`, { headers: buildHeaders() });
      await fetchData();
    } catch (e) {
      setErr(readError(e));
    } finally {
      setLoading(false);
    }
  };

  const onToggleActive = async (row) => {
    try {
      setLoading(true);
      const id = row.id || row.uuid || row._id;
      const next = !Boolean(row.active);
      try {
        await api.patch(`/loan-products/${id}`, { active: next }, { headers: buildHeaders() });
      } catch {
        await api.put(`/loan-products/${id}`, { active: next }, { headers: buildHeaders() });
      }
      await fetchData();
    } catch (e) {
      setErr(readError(e));
    } finally {
      setLoading(false);
    }
  };

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  // -------- render
  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Loan Products</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products…"
              className="w-56 pl-9 pr-3 py-2 rounded-md text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
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

      {/* error */}
      {err && (
        <div className="rounded-md border border-rose-200 bg-rose-50 text-rose-700 px-3 py-2 text-sm">
          {err}
        </div>
      )}

      {/* table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">Code</th>
                <th className="text-right px-3 py-2">Rate %</th>
                <th className="text-left px-3 py-2">Period</th>
                <th className="text-right px-3 py-2">Term</th>
                <th className="text-left px-3 py-2">Unit</th>
                <th className="text-right px-3 py-2">Principal Min</th>
                <th className="text-right px-3 py-2">Principal Max</th>
                <th className="text-right px-3 py-2">Fees</th>
                <th className="text-center px-3 py-2">Active</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
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
                items.map((r) => {
                  const id = r.id || r.uuid || r._id;
                  return (
                    <tr key={id}>
                      <td className="px-3 py-2 font-medium">{r.name || "-"}</td>
                      <td className="px-3 py-2">{r.code || "-"}</td>
                      <td className="px-3 py-2 text-right">
                        {r.interestRate ?? r.interest_rate ?? "-"}
                      </td>
                      <td className="px-3 py-2 capitalize">
                        {(r.interestPeriod ?? r.interest_period ?? "-") || "-"}
                      </td>
                      <td className="px-3 py-2 text-right">{r.term ?? "-"}</td>
                      <td className="px-3 py-2 capitalize">
                        {(r.termUnit ?? r.term_unit ?? "-") || "-"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {currency(r.principalMin ?? r.principal_min)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {currency(r.principalMax ?? r.principal_max)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {currency(r.fees ?? r.fees_total)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => onToggleActive(r)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                          title={r.active ? "Deactivate" : "Activate"}
                        >
                          {r.active ? <FiToggleRight /> : <FiToggleLeft />}
                          <span className="text-xs">
                            {r.active ? "Active" : "Inactive"}
                          </span>
                        </button>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/loans/products/${id}/edit`)}
                            className="p-2 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                            title="Edit"
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            onClick={() => onDelete(r)}
                            className="p-2 rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/40 dark:hover:bg-rose-900/20"
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

        {/* footer: pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-3 py-3 bg-slate-50 dark:bg-slate-800/40">
          <div className="text-xs text-slate-600 dark:text-slate-300">
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
              className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-sm"
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
                className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 disabled:opacity-50"
              >
                Prev
              </button>
              <span className="px-2 text-sm">
                {page} / {pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 disabled:opacity-50"
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
