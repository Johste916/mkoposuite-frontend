import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api";

export default function InvestorDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const [inv, setInv] = useState(null);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [err, setErr] = useState("");

  const load = async () => {
    try {
      const { data } = await api.get(`/investors/${id}`);
      setInv(data);
      setForm({ ...data, positions: (data.positions || []).join(", ") });
    } catch (e) {
      setErr("Failed to load investor");
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const save = async () => {
    try {
      setErr("");
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ""));
      if (photo) fd.append("photo", photo);
      const { data } = await api.put(`/investors/${id}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setInv(data);
      setEdit(false);
      setPhoto(null);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to update");
    }
  };

  if (!inv) return <div className="p-4 text-sm text-slate-500">Loading… {err}</div>;

  return (
    <div className="grid gap-4 md:grid-cols-[340px_1fr]">
      {/* Profile card */}
      <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <img
            src={photo ? URL.createObjectURL(photo) : inv.photoUrl || "https://placehold.co/96x96?text=INV"}
            alt={inv.name}
            className="w-20 h-20 rounded-full object-cover border"
          />
          {!edit ? (
            <div>
              <div className="text-xl font-semibold">{inv.name}</div>
              <div className="text-sm text-slate-500">{inv.email || "—"} · {inv.phone || "—"}</div>
              <div className="text-sm text-slate-500">{inv.address || "—"}</div>
            </div>
          ) : (
            <div className="space-y-2">
              <input className="border rounded px-2 py-1 w-full" name="name" value={form.name} onChange={onChange} />
              <input className="border rounded px-2 py-1 w-full" name="email" value={form.email || ""} onChange={onChange} placeholder="Email" />
              <input className="border rounded px-2 py-1 w-full" name="phone" value={form.phone || ""} onChange={onChange} placeholder="Phone" />
              <input className="border rounded px-2 py-1 w-full" name="address" value={form.address || ""} onChange={onChange} placeholder="Address" />
              <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="p-3 rounded border bg-slate-50 dark:bg-slate-800">
            <div className="text-xs uppercase text-slate-500">Shares</div>
            {!edit ? (
              <div className="text-lg font-semibold">{inv.shares}</div>
            ) : (
              <input className="border rounded px-2 py-1 w-full" name="shares" value={form.shares} onChange={onChange} />
            )}
          </div>
          <div className="p-3 rounded border bg-slate-50 dark:bg-slate-800">
            <div className="text-xs uppercase text-slate-500">Contributions</div>
            {!edit ? (
              <div className="text-lg font-semibold">{new Intl.NumberFormat().format(Number(inv.contributions || 0))}</div>
            ) : (
              <input className="border rounded px-2 py-1 w-full" name="contributions" value={form.contributions || ""} onChange={onChange} />
            )}
          </div>
        </div>

        <div className="mt-3">
          <div className="text-xs uppercase text-slate-500">Positions</div>
          {!edit ? (
            <div className="text-sm">{(inv.positions || []).join(", ") || "—"}</div>
          ) : (
            <input className="border rounded px-2 py-1 w-full" name="positions" value={form.positions || ""} onChange={onChange} placeholder="comma-separated" />
          )}
        </div>

        <div className="mt-3">
          <div className="text-xs uppercase text-slate-500">Bio</div>
          {!edit ? (
            <div className="text-sm whitespace-pre-wrap">{inv.bio || "—"}</div>
          ) : (
            <textarea className="border rounded px-2 py-1 w-full" rows={3} name="bio" value={form.bio || ""} onChange={onChange} />
          )}
        </div>

        <div className="mt-4 flex gap-2">
          {!edit ? (
            <>
              <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={() => setEdit(true)}>Edit</button>
              <button className="px-3 py-2 rounded border" onClick={() => nav("/investors")}>Back</button>
            </>
          ) : (
            <>
              <button className="px-3 py-2 rounded bg-emerald-600 text-white" onClick={save}>Save</button>
              <button className="px-3 py-2 rounded border" onClick={() => { setEdit(false); setPhoto(null); setForm({ ...inv, positions: (inv.positions || []).join(", ") }); }}>Cancel</button>
            </>
          )}
        </div>
        {!!err && <div className="mt-2 text-sm text-rose-600">{err}</div>}
      </div>

      {/* Related: transactions / deposits / withdrawals / files */}
      <div className="space-y-4">
        <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Transactions</h2>
            <div className="text-xs text-slate-500">Deposits & Withdrawals</div>
          </div>
          <div className="text-sm text-slate-500 mt-2">
            (Endpoints available: <code>/api/investors/{id}/deposits</code>, <code>/api/investors/{id}/withdrawals</code>. UI can be added here when models are ready.)
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4">
          <h2 className="font-semibold">Upload Related Files</h2>
          <div className="text-sm text-slate-500 mt-2">Hook this to <code>/api/investors/{id}/files</code> once you’re ready.</div>
        </div>
      </div>
    </div>
  );
}
