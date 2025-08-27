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
    shares: "",
    contributions: "",
    positions: "", // comma-separated e.g. "Board Member, Advisor"
    bio: "",
    notes: "",
    status: "ACTIVE",
  });
  const [photo, setPhoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const save = async () => {
    setErr("");
    if (!form.name) return setErr("Name is required");
    if (!form.shares) return setErr("Shares are required");

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ""));
    if (photo) fd.append("photo", photo);

    try {
      setSaving(true);
      const { data } = await api.post("/investors", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      nav(`/investors/${data.id}`);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to create investor");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl bg-white dark:bg-slate-900 border rounded-2xl p-5">
      <h1 className="text-lg font-semibold">Add Investor</h1>
      {err && <div className="mt-2 text-sm text-rose-600">{err}</div>}

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <label className="text-sm">Photo</label>
          <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
        </div>
        <div>
          <label className="text-sm">Name *</label>
          <input className="border rounded px-3 py-2 w-full" name="name" value={form.name} onChange={onChange} />
        </div>
        <div>
          <label className="text-sm">Phone</label>
          <input className="border rounded px-3 py-2 w-full" name="phone" value={form.phone} onChange={onChange} />
        </div>
        <div>
          <label className="text-sm">Email</label>
          <input className="border rounded px-3 py-2 w-full" name="email" value={form.email} onChange={onChange} />
        </div>
        <div>
          <label className="text-sm">Address</label>
          <input className="border rounded px-3 py-2 w-full" name="address" value={form.address} onChange={onChange} />
        </div>
        <div>
          <label className="text-sm">Shares *</label>
          <input type="number" min="0" className="border rounded px-3 py-2 w-full" name="shares" value={form.shares} onChange={onChange} />
        </div>
        <div>
          <label className="text-sm">Contributions</label>
          <input type="number" min="0" className="border rounded px-3 py-2 w-full" name="contributions" value={form.contributions} onChange={onChange} />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm">Positions (comma-separated)</label>
          <input className="border rounded px-3 py-2 w-full" name="positions" value={form.positions} onChange={onChange} placeholder="e.g. Board Member, Secretary" />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm">Bio</label>
          <textarea className="border rounded px-3 py-2 w-full" name="bio" rows={3} value={form.bio} onChange={onChange} />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm">Notes</label>
          <textarea className="border rounded px-3 py-2 w-full" name="notes" rows={2} value={form.notes} onChange={onChange} />
        </div>
        <div>
          <label className="text-sm">Status</label>
          <select className="border rounded px-3 py-2 w-full" name="status" value={form.status} onChange={onChange}>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <button onClick={() => nav(-1)} className="px-3 py-2 rounded border">Cancel</button>
        <button onClick={save} disabled={saving} className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-60">
          {saving ? "Saving…" : "Save Investor"}
        </button>
      </div>
    </div>
  );
}
