// frontend/src/pages/expenses/Expenses.jsx
import React, { useEffect, useMemo, useState } from "react";
import usePaginatedFetch from "../../hooks/usePaginatedFetch";
import ListShell from "../../components/ListShell";
import api from "../../api";
import { useNavigate } from "react-router-dom";

const TYPES = ["", "OPERATING", "ADMIN", "MARKETING", "OTHER"];

export default function Expenses() {
  const navigate = useNavigate();

  // filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [type, setType] = useState("");
  const [vendor, setVendor] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [branchId, setBranchId] = useState(localStorage.getItem("activeBranchId") || "");
  const [branches, setBranches] = useState([]);

  // fetch branches for filter dropdown (optional)
  useEffect(() => {
    (async () => {
      try {
        const res = await api._get("/branches");
        const list = Array.isArray(res.data) ? res.data : [];
        setBranches(list);
        if (!branchId && list.length) setBranchId(String(list[0].id));
      } catch {
        setBranches([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hook: pass url and params (hook avoids /api/api)
  const {
    rows,
    total,
    page,
    setPage,
    limit,
    setLimit,
    q,
    setQ,
    loading,
    error,
    refresh,
  } = usePaginatedFetch({
    url: "/api/expenses",
    params: {
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      type: type || undefined,
      vendor: vendor || undefined,
      min_amount: minAmount || undefined,
      max_amount: maxAmount || undefined,
      branch_id: branchId || undefined,
    },
  });

  const columns = useMemo(
    () => [
      { key: "date", title: "Date" },
      { key: "type", title: "Type" },
      { key: "vendor", title: "Vendor" },
      { key: "reference", title: "Reference" },
      {
        key: "amount",
        title: "Amount",
        render: ({ value }) => {
          const n = Number(value);
          return Number.isFinite(n) ? n.toLocaleString() : (value ?? "—");
        },
      },
      { key: "note", title: "Note" },
    ],
    []
  );

  const toolbar = (
    <div className="flex flex-col lg:flex-row gap-2 lg:items-end">
      <div>
        <label className="block text-xs mb-1">Date From</label>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
               className="px-2 py-1 border rounded dark:bg-slate-700 dark:border-slate-600"/>
      </div>
      <div>
        <label className="block text-xs mb-1">Date To</label>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
               className="px-2 py-1 border rounded dark:bg-slate-700 dark:border-slate-600"/>
      </div>
      <div>
        <label className="block text-xs mb-1">Type</label>
        <select value={type} onChange={(e) => setType(e.target.value)}
                className="px-2 py-1 border rounded dark:bg-slate-700 dark:border-slate-600">
          {TYPES.map((t) => <option key={t} value={t}>{t || "Any"}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs mb-1">Vendor</label>
        <input value={vendor} onChange={(e) => setVendor(e.target.value)}
               placeholder="contains…"
               className="px-2 py-1 border rounded dark:bg-slate-700 dark:border-slate-600"/>
      </div>
      <div>
        <label className="block text-xs mb-1">Min Amount</label>
        <input type="number" step="0.01" value={minAmount} onChange={(e) => setMinAmount(e.target.value)}
               className="px-2 py-1 border rounded w-28 dark:bg-slate-700 dark:border-slate-600"/>
      </div>
      <div>
        <label className="block text-xs mb-1">Max Amount</label>
        <input type="number" step="0.01" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)}
               className="px-2 py-1 border rounded w-28 dark:bg-slate-700 dark:border-slate-600"/>
      </div>
      {branches.length > 0 && (
        <div>
          <label className="block text-xs mb-1">Branch</label>
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)}
                  className="px-2 py-1 border rounded dark:bg-slate-700 dark:border-slate-600">
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      )}

      <div className="flex-1" />

      <div className="flex gap-2">
        <button
          onClick={() => refresh()}
          className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          Apply
        </button>
        <button
          onClick={() => {
            setDateFrom(""); setDateTo(""); setType(""); setVendor("");
            setMinAmount(""); setMaxAmount("");
            refresh();
          }}
          className="px-3 py-2 rounded border dark:border-slate-600"
        >
          Reset
        </button>
        <button
          onClick={() => navigate("/expenses/add")}
          className="px-3 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700"
        >
          Add
        </button>
        <button
          onClick={() => navigate("/expenses/csv")}
          className="px-3 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700"
        >
          Upload CSV
        </button>
        <button
          onClick={async () => {
            try {
              const params = {
                q: q || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
                type: type || undefined,
                vendor: vendor || undefined,
                min_amount: minAmount || undefined,
                max_amount: maxAmount || undefined,
                branch_id: branchId || undefined,
              };
              const res = await api._get("/expenses/export", { params, responseType: "blob" });
              const blob = new Blob([res.data], { type: "text/csv;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `expenses_${new Date().toISOString().slice(0,10)}.csv`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
            } catch (e) {
              alert(e?.normalizedMessage || e?.message || "Export failed");
            }
          }}
          className="px-3 py-2 rounded bg-slate-700 text-white hover:bg-slate-800"
        >
          Export CSV
        </button>
      </div>
    </div>
  );

  return (
    <ListShell
      title="Expenses"
      q={q}
      setQ={setQ}
      columns={columns}
      rows={Array.isArray(rows) ? rows : []}
      loading={loading}
      error={error}
      page={page}
      setPage={setPage}
      limit={limit}
      setLimit={setLimit}
      total={total}
      toolbar={toolbar}
    />
  );
}
