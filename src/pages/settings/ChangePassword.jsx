import React, { useState } from "react";
import api from "../../api";

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null); setErr(null);
    if (newPassword.length < 8) return setErr("New password must be at least 8 characters.");
    if (newPassword !== confirm) return setErr("Passwords do not match.");

    setBusy(true);
    try {
      await api.post("/auth/change-password", { currentPassword, newPassword });
      setMsg("Password updated successfully.");
      setCurrentPassword(""); setNewPassword(""); setConfirm("");
    } catch (e) {
      setErr(e?.response?.data?.error || "Failed to update password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold mb-4">Change Password</h1>
      {msg && <div className="mb-3 p-3 rounded bg-emerald-50 text-emerald-700 text-sm">{msg}</div>}
      {err && <div className="mb-3 p-3 rounded bg-rose-50 text-rose-700 text-sm">{err}</div>}
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800"
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800"
            required
            minLength={8}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Confirm New Password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full px-3 py-2 border rounded bg-white dark:bg-slate-800"
            required
          />
        </div>
        <button
          disabled={busy}
          className="h-10 px-4 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {busy ? "Updating…" : "Update Password"}
        </button>
      </form>
    </div>
  );
}
