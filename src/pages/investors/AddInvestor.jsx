import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";

export default function AddInvestor() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    status: "ACTIVE",
    productsCount: 0,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: name === "productsCount" ? Number(value) : value }));
  };

  const save = async () => {
    setErr("");
    if (!form.name) return setErr("Name is required");
    if (!form.phone && !form.email) return setErr("Phone or Email is required");
    try {
      setSaving(true);
      await api.post("/investors", form);
      nav("/investors");
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to create investor");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl bg-white dark:bg-slate-900 border rounded-2xl p-4">
      <h1 className="text-lg font-semibold">Add Investor</h1>
      {err && <div className="mt-2 text-sm text-rose-600">{err}</div>}

      <div className="mt-4 grid grid-cols-1 gap-3">
        <input className="border rounded px-3 py-2" placeholder="Name *" name="name" value={form.name} onChange={onChange} />
        <input className="border rounded px-3 py-2" placeholder="Phone" name="phone" value={form.phone} onChange={onChange} />
        <input className="border rounded px-3 py-2" placeholder="Email" name="email" value={form.email} onChange={onChange} />
        <input className="border rounded px-3 py-2" placeholder="Address" name="address" value={form.address} onChange={onChange} />
        <textarea className="border rounded px-3 py-2" placeholder="Notes" name="notes" value={form.notes} onChange={onChange} />
        <div className="grid grid-cols-2 gap-3">
          <select className="border rounded px-3 py-2" name="status" value={form.status} onChange={onChange}>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
          <input
            type="number"
            min={0}
            className="border rounded px-3 py-2"
            placeholder="Products Count"
            name="productsCount"
            value={form.productsCount}
            onChange={onChange}
          />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button onClick={() => nav(-1)} className="px-3 py-2 rounded border">Cancel</button>
        <button onClick={save} disabled={saving} className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-60">
          {saving ? "Saving…" : "Save Investor"}
        </button>
      </div>
    </div>
  );
}
