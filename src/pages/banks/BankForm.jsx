import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getBank, createBank, updateBank } from "../../services/banking";
import { Save } from "lucide-react";

const card = "bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-5 md:p-7";
const clsInput = "w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all";

export default function BankForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    code: "",
    branch: "",
    accountName: "",
    accountNumber: "",
    swift: "",
    phone: "",
    address: "",
    currency: "TZS",
    openingBalance: "",
    currentBalance: "",
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    const ac = new AbortController();
    (async () => {
      setLoading(true);
      try {
        const b = await getBank(id, { signal: ac.signal });
        setForm({
          name: b.name || "",
          code: b.code || "",
          branch: b.branch || "",
          accountName: b.accountName || "",
          accountNumber: b.accountNumber || "",
          swift: b.swift || "",
          phone: b.phone || "",
          address: b.address || "",
          currency: b.currency || "TZS",
          openingBalance: b.openingBalance ?? "",
          currentBalance: b.currentBalance ?? "",
          isActive: b.isActive !== false,
        });
      } catch (e) {
        if (e?.code !== "ERR_CANCELED") {
          console.error(e);
          alert(e?.normalizedMessage || "Failed to load bank");
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [id, isEdit]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return alert("Bank name is required.");
    setSaving(true);
    try {
      const body = {
        ...form,
        openingBalance: form.openingBalance === "" ? (isEdit ? null : 0) : Number(form.openingBalance),
        currentBalance:
          form.currentBalance === ""
            ? (isEdit ? null : (form.openingBalance === "" ? 0 : Number(form.openingBalance)))
            : Number(form.currentBalance),
      };

      if (isEdit) {
        await updateBank(id, body);
      } else {
        await createBank(body);
      }
      navigate("/banks");
    } catch (e) {
      console.error(e);
      alert(e?.normalizedMessage || "Failed to save bank");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{isEdit ? "Edit Bank" : "Add Bank"}</h1>
          <p className="text-sm text-gray-500">Banks are used for disbursing loans and receiving repayments.</p>
        </div>
        <Link to="/banks" className="text-indigo-600 hover:underline text-sm">Back to Banks</Link>
      </div>

      <form onSubmit={onSubmit} className={card}>
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-600">Name</label>
              <input className={clsInput} value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} required />
            </div>
            <div>
              <label className="text-xs text-gray-600">Code (optional)</label>
              <input className={clsInput} value={form.code} onChange={(e)=>setForm({...form, code: e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-gray-600">Branch (optional)</label>
              <input className={clsInput} value={form.branch} onChange={(e)=>setForm({...form, branch: e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-gray-600">Account Name (optional)</label>
              <input className={clsInput} value={form.accountName} onChange={(e)=>setForm({...form, accountName: e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-gray-600">Account Number (optional)</label>
              <input className={clsInput} value={form.accountNumber} onChange={(e)=>setForm({...form, accountNumber: e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-gray-600">SWIFT (optional)</label>
              <input className={clsInput} value={form.swift} onChange={(e)=>setForm({...form, swift: e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-gray-600">Phone (optional)</label>
              <input className={clsInput} value={form.phone} onChange={(e)=>setForm({...form, phone: e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-gray-600">Currency</label>
              <input className={clsInput} value={form.currency} onChange={(e)=>setForm({...form, currency: e.target.value})} />
            </div>

            <div>
              <label className="text-xs text-gray-600">Opening Balance</label>
              <input type="number" step="0.01" className={clsInput} value={form.openingBalance} onChange={(e)=>setForm({...form, openingBalance: e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-gray-600">Current Balance (optional)</label>
              <input type="number" step="0.01" className={clsInput} value={form.currentBalance} onChange={(e)=>setForm({...form, currentBalance: e.target.value})} />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs text-gray-600">Address (optional)</label>
              <textarea className={`${clsInput} min-h-[84px]`} value={form.address} onChange={(e)=>setForm({...form, address: e.target.value})}/>
            </div>

            <div className="md:col-span-2 flex items-center gap-2">
              <input id="active" type="checkbox" checked={form.isActive} onChange={(e)=>setForm({...form, isActive: e.target.checked})} />
              <label htmlFor="active" className="text-sm text-gray-700">Active</label>
            </div>

            <div className="md:col-span-2 flex justify-end gap-3 pt-2">
              <Link to="/banks" className="px-4 py-2 rounded-xl border hover:bg-gray-50">Cancel</Link>
              <button
                disabled={saving}
                type="submit"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
              >
                <Save className="h-4 w-4"/>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
