import React, { useMemo, useState } from "react";
import api from "../../api";

const scorePassword = (pwd) => {
  let score = 0;
  if (!pwd) return 0;
  if (pwd.length >= 8) score += 1;
  if (pwd.length >= 12) score += 1;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 1;
  if (/\d/.test(pwd)) score += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
  return Math.min(score, 5);
};

const barClass = (s) =>
  s <= 2 ? "bg-rose-500" : s === 3 ? "bg-amber-500" : "bg-emerald-600";

export default function ChangePassword() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [show, setShow] = useState({ cur: false, next: false, conf: false });
  const [signOutAll, setSignOutAll] = useState(false);

  const score = useMemo(() => scorePassword(newPassword), [newPassword]);
  const canSubmit =
    !saving &&
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirm &&
    newPassword !== currentPassword;

  const generate = () => {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const base = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    const suggestion = base.slice(0, 8) + "A!" + base.slice(8, 14) + "7#";
    setNext(suggestion);
    setConfirm(suggestion);
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null); setErr(null);

    if (newPassword !== confirm) { setErr("New password and confirmation do not match."); return; }
    if (newPassword === currentPassword) { setErr("New password must be different from current password."); return; }

    setSaving(true);
    try {
      // prefer /account/change-password, but fall back if needed
      let data;
      try {
        ({ data } = await api.post("/account/change-password", { currentPassword, newPassword, signOutAll }));
      } catch {
        ({ data } = await api.post("/auth/change-password", { currentPassword, newPassword, signOutAll }));
      }
      setMsg(data?.message || "Password updated.");
      setCurrent(""); setNext(""); setConfirm("");

      if (signOutAll) {
        try { await api.post("/auth/logout-all"); } catch {}
        try { localStorage.clear(); } catch {}
      }
    } catch (e2) {
      setErr(e2?.response?.data?.message || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md ms-card p-4">
      <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Change Password</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
        Use a strong password you don’t use elsewhere.
      </p>

      {msg && <div className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">{msg}</div>}
      {err && <div className="mt-3 text-sm text-rose-600 dark:text-rose-400">{err}</div>}

      <form onSubmit={submit} className="mt-4 space-y-3">
        <label className="text-sm block">
          <span className="mb-1 block">Current password</span>
          <div className="relative">
            <input
              type={show.cur ? "text" : "password"}
              className="w-full border rounded px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
              value={currentPassword}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
            <button type="button" onClick={() => setShow((s) => ({ ...s, cur: !s.cur }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-0.5 ms-btn">
              {show.cur ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        <label className="text-sm block">
          <span className="mb-1 block">New password</span>
          <div className="relative">
            <input
              type={show.next ? "text" : "password"}
              className="w-full border rounded px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
              value={newPassword}
              onChange={(e) => setNext(e.target.value)}
              required
              minLength={8}
            />
            <button type="button" onClick={() => setShow((s) => ({ ...s, next: !s.next }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-0.5 ms-btn">
              {show.next ? "Hide" : "Show"}
            </button>
          </div>

          {/* strength meter */}
          <div className="mt-2 h-2 w-full bg-slate-100 dark:bg-slate-800 rounded">
            <div className={`h-2 rounded ${barClass(score)}`} style={{ width: `${(score / 5) * 100}%` }} />
          </div>
          <ul className="mt-1 text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <li className={newPassword.length >= 8 ? "text-emerald-600 dark:text-emerald-400" : ""}>At least 8 characters</li>
            <li className={/[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword) ? "text-emerald-600 dark:text-emerald-400" : ""}>
              Upper & lower case letters
            </li>
            <li className={/\d/.test(newPassword) ? "text-emerald-600 dark:text-emerald-400" : ""}>At least one number</li>
            <li className={/[^A-Za-z0-9]/.test(newPassword) ? "text-emerald-600 dark:text-emerald-400" : ""}>At least one symbol</li>
          </ul>

          <div className="mt-2">
            <button type="button" onClick={generate} className="text-xs px-2 py-1 ms-btn">Generate strong password</button>
          </div>
        </label>

        <label className="text-sm block">
          <span className="mb-1 block">Confirm new password</span>
          <div className="relative">
            <input
              type={show.conf ? "text" : "password"}
              className="w-full border rounded px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            <button type="button" onClick={() => setShow((s) => ({ ...s, conf: !s.conf }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-0.5 ms-btn">
              {show.conf ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4" checked={signOutAll} onChange={(e) => setSignOutAll(e.target.checked)} />
          Sign out of all other devices after update
        </label>

        <button
          type="submit"
          disabled={!canSubmit}
          className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Update Password"}
        </button>
      </form>
    </div>
  );
}
