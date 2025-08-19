// src/pages/loans/LoanApplications.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api";

// tiny helper: always return an array from various API shapes
const toArray = (x) =>
  Array.isArray(x)            ? x :
  Array.isArray(x?.rows)      ? x.rows :
  Array.isArray(x?.items)     ? x.items :
  Array.isArray(x?.data)      ? x.data :
  Array.isArray(x?.results)   ? x.results :
  Array.isArray(x?.borrowers) ? x.borrowers :
  [];

export default function LoanApplications() {
  const navigate = useNavigate();

  const [apps, setApps] = useState([]);         // list of loans (pending)
  const [borrowers, setBorrowers] = useState([]); // <- keep as array
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    productId: "",
    amount: "",
    interestRate: "",
    termMonths: "",
    interestMethod: "flat",
    borrowerId: "",
    branchId: "",
    startDate: "",
    endDate: "",
  });

  // --- fetchers ---
  const fetchLoans = async () => {
    setLoading(true);
    try {
      const res = await api.get("/loans");
      const list = toArray(res.data);
      setApps(list.filter((l) => l?.status === "pending"));
    } catch {
      alert("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const fetchBorrowers = async () => {
    try {
      const r = await api.get("/borrowers");
      setBorrowers(toArray(r.data));
    } catch {
      setBorrowers([]); // stay an array even on error
    }
  };

  const fetchBranches = async () => {
    try {
      const r = await api.get("/branches");
      setBranches(toArray(r.data));
    } catch {
      setBranches([]);
    }
  };

  const fetchProducts = async () => {
    try {
      const r = await api.get("/loan-products");
      setProducts(toArray(r.data));
    } catch {
      setProducts([]);
    }
  };

  useEffect(() => {
    fetchLoans();
    fetchBorrowers();
    fetchBranches();
    fetchProducts();
  }, []);

  // --- helpers ---
  const selectedProduct = useMemo(
    () => products.find((p) => String(p.id) === String(form.productId)),
    [products, form.productId]
  );

  const validateForm = () => {
    if (!form.borrowerId) return alert("Select a borrower"), false;
    const a = Number(form.amount || 0);
    const t = Number(form.termMonths || 0);
    if (a <= 0) return alert("Enter amount"), false;
    if (t <= 0) return alert("Enter term months"), false;

    if (selectedProduct) {
      if (selectedProduct.minPrincipal && a < Number(selectedProduct.minPrincipal))
        return alert(`Amount must be at least ${selectedProduct.minPrincipal}`), false;
      if (selectedProduct.maxPrincipal && a > Number(selectedProduct.maxPrincipal))
        return alert(`Amount must not exceed ${selectedProduct.maxPrincipal}`), false;
      if (selectedProduct.minTermMonths && t < Number(selectedProduct.minTermMonths))
        return alert(`Term must be at least ${selectedProduct.minTermMonths} months`), false;
      if (selectedProduct.maxTermMonths && t > Number(selectedProduct.maxTermMonths))
        return alert(`Term must not exceed ${selectedProduct.maxTermMonths} months`), false;
    } else {
      if (!form.interestRate) return alert("Enter interest rate or select a product"), false;
    }
    return true;
  };

  // --- actions ---
  const submitApplication = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      await api.post("/loans", form); // backend sets status="pending"
      resetForm();
      fetchLoans();
      alert("Application submitted.");
    } catch {
      alert("Failed to submit application");
    }
  };

  const approve = async (id) => {
    try {
      await api.patch(`/loans/${id}/approve`);
    } catch {
      // fallback to generic status endpoint if specific route is missing
      try { await api.patch(`/loans/${id}/status`, { status: "approved" }); }
      catch { return alert("Failed to approve"); }
    }
    fetchLoans();
  };

  const reject = async (id) => {
    try {
      await api.patch(`/loans/${id}/reject`);
    } catch {
      try { await api.patch(`/loans/${id}/status`, { status: "rejected" }); }
      catch { return alert("Failed to reject"); }
    }
    fetchLoans();
  };

  const resetForm = () => {
    setForm({
      productId: "",
      amount: "",
      interestRate: "",
      termMonths: "",
      interestMethod: "flat",
      borrowerId: "",
      branchId: "",
      startDate: "",
      endDate: "",
    });
  };

  const filtered = (apps ?? []).filter((l) =>
    (l?.Borrower?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Loan Applications</h2>
        <Link className="text-blue-600 underline text-sm" to="/loans">Back to Loans</Link>
      </div>

      {/* Intake form */}
      <form onSubmit={submitApplication} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded shadow">
        {/* Product */}
        <select
          value={form.productId}
          onChange={(e) => {
            const pid = e.target.value;
            const p = products.find((x) => String(x.id) === String(pid));
            setForm((f) => ({
              ...f,
              productId: pid,
              // only auto-fill if empty (so edits aren't overwritten)
              interestMethod: f.interestMethod || p?.interestMethod || "flat",
              interestRate: f.interestRate || p?.interestRate || p?.defaultInterestRate || "",
            }));
          }}
          className="border px-4 py-2 rounded"
        >
          <option value="">Select Product (optional)</option>
          {(products ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} {p.code ? `(${p.code})` : ""}
            </option>
          ))}
        </select>

        {/* Amount */}
        <input
          type="number"
          placeholder="Amount"
          value={form.amount}
          min={selectedProduct?.minPrincipal ?? 0}
          max={selectedProduct?.maxPrincipal ?? undefined}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          required
          className="border px-4 py-2 rounded"
        />

        {/* Term */}
        <input
          type="number"
          placeholder="Term (Months)"
          value={form.termMonths}
          min={selectedProduct?.minTermMonths ?? 1}
          max={selectedProduct?.maxTermMonths ?? undefined}
          onChange={(e) => setForm({ ...form, termMonths: e.target.value })}
          required
          className="border px-4 py-2 rounded"
        />

        {/* Interest (only if no product) */}
        {!form.productId && (
          <>
            <input
              type="number"
              placeholder="Interest Rate (%)"
              value={form.interestRate}
              onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
              required
              className="border px-4 py-2 rounded"
            />
            <select
              value={form.interestMethod}
              onChange={(e) => setForm({ ...form, interestMethod: e.target.value })}
              className="border px-4 py-2 rounded"
            >
              <option value="flat">Flat</option>
              <option value="reducing">Reducing Balance</option>
            </select>
          </>
        )}

        {/* Borrower */}
        <select
          value={form.borrowerId}
          onChange={(e) => setForm({ ...form, borrowerId: e.target.value })}
          required
          className="border px-4 py-2 rounded"
        >
          <option value="">Select Borrower</option>
          {(borrowers ?? []).map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        {/* Branch */}
        <select
          value={form.branchId}
          onChange={(e) => setForm({ ...form, branchId: e.target.value })}
          className="border px-4 py-2 rounded"
        >
          <option value="">Select Branch</option>
          {(branches ?? []).map((br) => (
            <option key={br.id} value={br.id}>{br.name}</option>
          ))}
        </select>

        {/* Dates */}
        <input
          type="date"
          value={form.startDate}
          onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          required
          className="border px-4 py-2 rounded"
        />
        <input
          type="date"
          value={form.endDate}
          onChange={(e) => setForm({ ...form, endDate: e.target.value })}
          className="border px-4 py-2 rounded"
        />

        <div className="col-span-full flex gap-2">
          <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
            Submit Application
          </button>
          <button type="button" onClick={resetForm} className="px-4 py-2 rounded border">
            Reset
          </button>
        </div>
      </form>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Pending Applications</h3>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search borrower..."
          className="border px-3 py-2 rounded"
        />
      </div>

      {/* List */}
      <div className="overflow-x-auto">
        {loading ? (
          <p>Loading applications...</p>
        ) : filtered.length === 0 ? (
          <p>No pending applications.</p>
        ) : (
          <table className="min-w-full bg-white rounded shadow border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1">Borrower</th>
                <th className="border px-2 py-1">Amount</th>
                <th className="border px-2 py-1">Rate</th>
                <th className="border px-2 py-1">Term</th>
                <th className="border px-2 py-1">Branch</th>
                <th className="border px-2 py-1">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id}>
                  <td className="border px-2">{l?.Borrower?.name || "N/A"}</td>
                  <td className="border px-2">{l?.amount}</td>
                  <td className="border px-2">{l?.interestRate}</td>
                  <td className="border px-2">{l?.termMonths}</td>
                  <td className="border px-2">{l?.branch?.name || "—"}</td>
                  <td className="border px-2 space-x-2">
                    <button onClick={() => navigate(`/loans/${l.id}`)} className="text-indigo-600 hover:underline">
                      View
                    </button>
                    <button onClick={() => approve(l.id)} className="text-green-600 hover:underline">
                      Approve
                    </button>
                    <button onClick={() => reject(l.id)} className="text-red-600 hover:underline">
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
