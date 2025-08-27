// src/pages/investors/InvestorDetails.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api";
import { FiEdit2, FiSave, FiArrowLeft, FiUploadCloud } from "react-icons/fi";

const AvatarBig = ({ name = "", src = "" }) => {
  const initials = (name || "INV").trim().slice(0, 2).toUpperCase();
  return (
    <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
      {src ? (
        // eslint-disable-next-line jsx-a11y/img-redundant-alt
        <img src={src} alt={`${name} photo`} className="w-full h-full object-cover" />
      ) : (
        <span className="text-lg font-bold text-slate-600 dark:text-slate-300">{initials}</span>
      )}
    </div>
  );
};

const fmtInt = (n) => new Intl.NumberFormat().format(Number(n || 0));

export default function InvestorDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState(null);
  const [tx, setTx] = useState({ amount: "", note: "" });
  const [transactions, setTransactions] = useState([]);
  const [loadingTx, setLoadingTx] = useState(false);

  const load = async () => {
    const { data } = await api.get(`/investors/${id}`);
    setData(data);
  };

  const loadTx = async () => {
    try {
      setLoadingTx(true);
      const { data } = await api.get(`/investors/${id}/transactions`);
      setTransactions(Array.isArray(data) ? data : (data?.rows || []));
    } finally {
      setLoadingTx(false);
    }
  };

  useEffect(() => {
    load();
    loadTx();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const [form, setForm] = useState({});
  useEffect(() => {
    if (data) {
      setForm({
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        address: data.address || "",
        shares: data.shares || 0,
        contributions: data.contributions || 0,
        positions: Array.isArray(data.positions) ? data.positions.join(", ") : (data.positions || ""),
        bio: data.bio || "",
      });
    }
  }, [data]);

  const summary = useMemo(() => ([
    { label: "Shares", value: fmtInt(data?.shares) },
    { label: "Contributions", value: fmtInt(data?.contributions) },
    { label: "Positions", value: Array.isArray(data?.positions) ? data.positions.length : (data?.positions ? String(data.positions).split(",").length : 0) },
  ]), [data]);

  const save = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (file) fd.append("photo", file);
      const { data: updated } = await api.put(`/investors/${id}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setData(updated);
      setEditing(false);
      setFile(null);
    } finally {
      setSaving(false);
    }
  };

  const doDeposit = async () => {
    if (!tx.amount) return;
    await api.post(`/investors/${id}/deposits`, { amount: Number(tx.amount), note: tx.note || "" });
    setTx({ amount: "", note: "" });
    load();
    loadTx();
  };
  const doWithdraw = async () => {
    if (!tx.amount) return;
    await api.post(`/investors/${id}/withdrawals`, { amount: Number(tx.amount), note: tx.note || "" });
    setTx({ amount: "", note: "" });
    load();
    loadTx();
  };

  if (!data) {
    return <div className="p-6 text-sm text-slate-500">Loading investor…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <FiArrowLeft /> Back
        </button>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            <FiEdit2 /> Edit
          </button>
        ) : (
          <button
            disabled={saving}
            onClick={save}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            <FiSave /> {saving ? "Saving…" : "Save"}
          </button>
        )}
      </div>

      {/* Header / identity */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex items-start gap-4">
          <AvatarBig name={data.name} src={data.photoUrl} />
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-bold">{data.name}</h1>
            <div className="mt-1 text-sm text-slate-500 space-x-3">
              {data.email && <span>{data.email}</span>}
              {data.phone && <span>• {data.phone}</span>}
              {data.address && <span>• {data.address}</span>}
            </div>
          </div>
        </div>
        {/* KPI tiles */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {summary.map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">{s.label}</div>
              <div className="text-lg font-semibold mt-1">{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Profile form (view/edit) */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <h2 className="text-base font-semibold">Profile</h2>
            <p className="text-xs text-slate-500 mt-1">
              Update identity, contact info, shares and roles.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-slate-500">Name</label>
                <input
                  disabled={!editing}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">Email</label>
                  <input
                    disabled={!editing}
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Phone</label>
                  <input
                    disabled={!editing}
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500">Address</label>
                <input
                  disabled={!editing}
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">Shares</label>
                  <input
                    disabled={!editing}
                    type="number"
                    value={form.shares}
                    onChange={(e) => setForm((f) => ({ ...f, shares: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Contributions</label>
                  <input
                    disabled={!editing}
                    type="number"
                    value={form.contributions}
                    onChange={(e) => setForm((f) => ({ ...f, contributions: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500">Positions (comma-separated)</label>
                <input
                  disabled={!editing}
                  value={form.positions}
                  onChange={(e) => setForm((f) => ({ ...f, positions: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500">Bio / Notes</label>
                <textarea
                  disabled={!editing}
                  rows={4}
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500">Photo</label>
                <div className="mt-1 flex items-center gap-3">
                  <AvatarBig name={form.name} src={data.photoUrl} />
                  <input
                    disabled={!editing}
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>
            </div>

            {editing && (
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={save}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  <FiSave /> {saving ? "Saving…" : "Save Changes"}
                </button>
                <button
                  onClick={() => { setEditing(false); setFile(null); setForm((f) => f); }}
                  className="px-3 py-2 rounded-lg border"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Transactions & Files */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Transactions</h2>
                <p className="text-xs text-slate-500">Deposits & Withdrawals</p>
              </div>
            </div>

            {/* Quick action */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3">
              <input
                type="number"
                placeholder="Amount"
                value={tx.amount}
                onChange={(e) => setTx((t) => ({ ...t, amount: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
              <input
                placeholder="Note (optional)"
                value={tx.note}
                onChange={(e) => setTx((t) => ({ ...t, note: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
              <div className="flex gap-2">
                <button
                  onClick={doDeposit}
                  className="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Deposit
                </button>
                <button
                  onClick={doWithdraw}
                  className="px-3 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
                >
                  Withdraw
                </button>
              </div>
            </div>

            {/* List */}
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[560px] w-full text-sm">
                <thead className="text-left text-slate-500">
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingTx && (
                    <tr><td colSpan={4} className="px-3 py-4 text-slate-500">Loading…</td></tr>
                  )}
                  {!loadingTx && transactions.length === 0 && (
                    <tr><td colSpan={4} className="px-3 py-4 text-slate-500">No transactions yet.</td></tr>
                  )}
                  {transactions.map((t, i) => (
                    <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2">{t.date || t.createdAt || "—"}</td>
                      <td className="px-3 py-2 capitalize">{t.type || "—"}</td>
                      <td className="px-3 py-2">{fmtInt(t.amount)}</td>
                      <td className="px-3 py-2">{t.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <h2 className="text-base font-semibold">Related Files</h2>
            <p className="text-xs text-slate-500">Upload agreements or KYC documents.</p>
            <div className="mt-3">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                <FiUploadCloud /> <span>Select files…</span>
                <input type="file" className="hidden" multiple />
              </label>
              <p className="text-xs text-slate-400 mt-2">
                (Hook this to <code>/api/investors/{id}/files</code> when you’re ready.)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
