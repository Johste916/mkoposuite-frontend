// src/pages/loans/LoanProducts.jsx
import React, { useEffect, useState } from "react";
import api from "../../api";

export default function LoanProducts() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({
    name: "",
    code: "",
    status: "active",
    interestMethod: "flat",
    interestRate: 0,
    minPrincipal: "",
    maxPrincipal: "",
    minTermMonths: "",
    maxTermMonths: "",
    penaltyRate: "",
    fees: [], // keep simple for now
    eligibility: {},
  });
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await api.get("/loan-products", { params: { q } });
      const arr = Array.isArray(res.data) ? res.data : res.data.items || [];
      setItems(arr);
    } catch {
      setItems([]);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (editingId) {
        await api.put(`/loan-products/${editingId}`, form);
      } else {
        await api.post("/loan-products", form);
      }
      setForm({
        name: "",
        code: "",
        status: "active",
        interestMethod: "flat",
        interestRate: 0,
        minPrincipal: "",
        maxPrincipal: "",
        minTermMonths: "",
        maxTermMonths: "",
        penaltyRate: "",
        fees: [],
        eligibility: {},
      });
      setEditingId(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const edit = (p) => {
    setEditingId(p.id);
    setForm({
      name: p.name || "",
      code: p.code || "",
      status: p.status || "active",
      interestMethod: p.interestMethod || "flat",
      interestRate: p.interestRate ?? 0,
      minPrincipal: p.minPrincipal ?? "",
      maxPrincipal: p.maxPrincipal ?? "",
      minTermMonths: p.minTermMonths ?? "",
      maxTermMonths: p.maxTermMonths ?? "",
      penaltyRate: p.penaltyRate ?? "",
      fees: p.fees || [],
      eligibility: p.eligibility || {},
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (id) => {
    if (!window.confirm("Delete product?")) return;
    setBusy(true);
    try {
      await api.delete(`/loan-products/${id}`);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (id) => {
    setBusy(true);
    try {
      await api.patch(`/loan-products/${id}/toggle`);
      await load();
    } finally {
      setBusy(false);
    }
  };

  // small badge for status with dark-mode
  const badge = (status) =>
    `px-2 py-0.5 rounded text-xs ${
      status === "active"
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
        : "bg-slate-200 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
    }`;

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Loan Products</h2>
      </div>

      {/* Form */}
      <form onSubmit={submit} className="grid sm:grid-cols-2 gap-3 card">
        <input
          className="input"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          className="input"
          placeholder="Code"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          required
        />
        <select
          className="input"
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          className="input"
          value={form.interestMethod}
          onChange={(e) => setForm({ ...form, interestMethod: e.target.value })}
        >
          <option value="flat">Flat</option>
          <option value="reducing">Reducing</option>
        </select>
        <input
          type="number"
          step="0.0001"
          className="input"
          placeholder="Interest Rate (%)"
          value={form.interestRate}
          onChange={(e) =>
            setForm({ ...form, interestRate: e.target.value })
          }
          required
        />
        <input
          type="number"
          className="input"
          placeholder="Min Principal"
          value={form.minPrincipal}
          onChange={(e) =>
            setForm({ ...form, minPrincipal: e.target.value })
          }
        />
        <input
          type="number"
          className="input"
          placeholder="Max Principal"
          value={form.maxPrincipal}
          onChange={(e) =>
            setForm({ ...form, maxPrincipal: e.target.value })
          }
        />
        <input
          type="number"
          className="input"
          placeholder="Min Term (months)"
          value={form.minTermMonths}
          onChange={(e) =>
            setForm({ ...form, minTermMonths: e.target.value })
          }
        />
        <input
          type="number"
          className="input"
          placeholder="Max Term (months)"
          value={form.maxTermMonths}
          onChange={(e) =>
            setForm({ ...form, maxTermMonths: e.target.value })
          }
        />
        <input
          type="number"
          step="0.0001"
          className="input"
          placeholder="Penalty Rate (%)"
          value={form.penaltyRate}
          onChange={(e) =>
            setForm({ ...form, penaltyRate: e.target.value })
          }
        />
        <button
          disabled={busy}
          className="col-span-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-60"
        >
          {editingId ? "Update Product" : "Create Product"}
        </button>
      </form>

      {/* Search */}
      <div className="flex items-center justify-between">
        <div />
        <input
          className="input md:w-80"
          placeholder="Search name/code"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto card">
        <table className="min-w-full rounded text-sm">
          <thead className="text-[var(--fg)]">
            <tr>
              <th className="p-2 border-b border-[var(--border)] text-left">Name</th>
              <th className="p-2 border-b border-[var(--border)] text-left">Code</th>
              <th className="p-2 border-b border-[var(--border)] text-left">Method</th>
              <th className="p-2 border-b border-[var(--border)] text-left">Rate (%)</th>
              <th className="p-2 border-b border-[var(--border)] text-left">Principal Range</th>
              <th className="p-2 border-b border-[var(--border)] text-left">Term Range</th>
              <th className="p-2 border-b border-[var(--border)] text-left">Status</th>
              <th className="p-2 border-b border-[var(--border)] text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr
                key={p.id}
                className="border-b border-[var(--border)] hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <td className="px-2 py-2">{p.name}</td>
                <td className="px-2 py-2">{p.code}</td>
                <td className="px-2 py-2">{p.interestMethod}</td>
                <td className="px-2 py-2">{p.interestRate}</td>
                <td className="px-2 py-2">
                  {p.minPrincipal ?? "—"} — {p.maxPrincipal ?? "—"}
                </td>
                <td className="px-2 py-2">
                  {p.minTermMonths ?? "—"} — {p.maxTermMonths ?? "—"}
                </td>
                <td className="px-2 py-2">
                  <span className={badge(p.status)}>{p.status}</span>
                </td>
                <td className="px-2 py-2 space-x-3">
                  <button
                    className="text-indigo-600 hover:underline"
                    onClick={() => edit(p)}
                  >
                    Edit
                  </button>
                  <button
                    className="text-amber-700 hover:underline"
                    onClick={() => toggle(p.id)}
                  >
                    {p.status === "active" ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    className="text-rose-600 hover:underline"
                    onClick={() => remove(p.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td className="p-4 text-center muted" colSpan="8">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
