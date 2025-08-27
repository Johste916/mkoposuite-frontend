// src/pages/investors/AddInvestor.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import { FiSave, FiArrowLeft } from "react-icons/fi";

export default function AddInvestor() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    shares: "",
    contributions: "",
    positions: "",
    bio: "",
  });

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (file) fd.append("photo", file);
      const { data } = await api.post("/investors", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      navigate(`/investors/${data.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <FiArrowLeft /> Back
        </button>
        <button
          disabled={saving}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          <FiSave /> {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h1 className="text-xl font-bold">Add Investor</h1>
        <p className="text-sm text-slate-500">Create a full investor profile.</p>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Identity */}
          <div className="space-y-3 lg:col-span-2">
            <div>
              <label className="text-xs text-slate-500">Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-lg border"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500">Email</label>
                <input
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg border"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg border"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500">Address</label>
              <input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-lg border"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500">Shares</label>
                <input
                  type="number"
                  value={form.shares}
                  onChange={(e) => setForm((f) => ({ ...f, shares: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg border"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Contributions</label>
                <input
                  type="number"
                  value={form.contributions}
                  onChange={(e) => setForm((f) => ({ ...f, contributions: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg border"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-500">Positions (comma-separated)</label>
              <input
                value={form.positions}
                onChange={(e) => setForm((f) => ({ ...f, positions: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-lg border"
              />
            </div>

            <div>
              <label className="text-xs text-slate-500">Bio / Notes</label>
              <textarea
                rows={4}
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-lg border"
              />
            </div>
          </div>

          {/* Photo */}
          <div>
            <label className="text-xs text-slate-500">Photo</label>
            <div className="mt-1 rounded-xl border border-dashed p-4 text-center">
              <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <p className="text-xs text-slate-500 mt-2">JPG/PNG, up to ~5MB is fine.</p>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
