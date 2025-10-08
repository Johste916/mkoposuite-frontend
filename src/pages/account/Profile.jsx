// src/pages/account/Profile.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import api from "../../api";

const TZ_OPTIONS = [
  "Africa/Nairobi",
  "Africa/Dar_es_Salaam",
  "Africa/Kampala",
  "Africa/Addis_Ababa",
  "Africa/Kigali",
  "UTC",
];
const LOCALES = ["en", "sw", "fr"];

const PHONE_RX = /^\+?\d{7,15}$/;

export default function Profile() {
  // ----------- data snapshots (for dirty checks) -----------
  const [me, setMe] = useState(null);
  const [branches, setBranches] = useState([]);

  const [form, setForm] = useState({
    displayName: "",
    name: "",
    phone: "",
    branchId: "",
    timezone: "Africa/Nairobi",
    locale: "en",
    title: "",
    department: "",
    employeeCode: "",
  });
  const [serverForm, setServerForm] = useState(null);

  const [prefs, setPrefs] = useState({
    landingPage: "/dashboard",
    defaultCurrency: "TZS",
    dateFormat: "DD/MM/YYYY",
    numberFormat: "1,234.56",
    theme: "system",
    fontScale: "normal",
    reduceMotion: false,
    colorBlindMode: false,
  });
  const [serverPrefs, setServerPrefs] = useState(null);

  const [notifs, setNotifs] = useState({
    channels: { inApp: true, email: true, sms: false },
    events: {
      loanAssigned: true,
      approvalNeeded: true,
      largeRepayment: { enabled: true, threshold: 500000 },
      arrearsDigest: { enabled: true, days: 7, hour: 18 },
      kycAssigned: true,
    },
  });
  const [serverNotifs, setServerNotifs] = useState(null);

  const [sessions, setSessions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const avatarUrl = useMemo(() => me?.user?.avatarUrl || "", [me]);

  // ----------- validation -----------
  const [errors, setErrors] = useState({});
  const validateForm = (f = form) => {
    const e = {};
    if (f.phone && !PHONE_RX.test(f.phone)) e.phone = "Use international format, e.g. +2547…";
    if (!TZ_OPTIONS.includes(f.timezone)) e.timezone = "Choose a supported time zone";
    if (!LOCALES.includes(f.locale)) e.locale = "Choose a supported locale";
    if (f?.employeeCode && String(f.employeeCode).length > 32) e.employeeCode = "Max 32 characters";
    return e;
  };

  // “dirty” helpers
  const json = (v) => JSON.stringify(v ?? {});
  const isFormDirty = serverForm && json(form) !== json(serverForm);
  const isPrefsDirty = serverPrefs && json(prefs) !== json(serverPrefs);
  const isNotifsDirty = serverNotifs && json(notifs) !== json(serverNotifs);
  const hasAnyDirty = !!(isFormDirty || isPrefsDirty || isNotifsDirty);

  // Warn on page leave with unsaved changes
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (!hasAnyDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasAnyDirty]);

  // ----------- effects: initial load -----------
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      setLoading(true);
      try {
        const [meRes, prefRes, notifRes, sessRes, brRes] = await Promise.all([
          api.get("/account/me", { signal: ac.signal }),
          api.get("/account/preferences", { signal: ac.signal }).catch(() => ({ data: {} })),
          api.get("/account/notifications", { signal: ac.signal }).catch(() => ({ data: {} })),
          api.get("/account/security/sessions", { signal: ac.signal }).catch(() => ({ data: { sessions: [] } })),
          api.get("/branches", { signal: ac.signal }).catch(() => ({ data: [] })),
        ]);

        setMe(meRes.data);
        const u = meRes.data?.user || {};
        const nextForm = {
          displayName: u.displayName || u.name || "",
          name: u.name || "",
          phone: u.phone || "",
          branchId: u.branchId || "",
          timezone: u.timezone || "Africa/Nairobi",
          locale: u.locale || "en",
          title: u.title || "",
          department: u.department || "",
          employeeCode: u.employeeCode || "",
        };
        setForm(nextForm);
        setServerForm(nextForm);

        const nextPrefs = { ...prefs, ...(prefRes.data?.preferences || prefRes.data || {}) };
        setPrefs(nextPrefs);
        setServerPrefs(nextPrefs);

        const nextNotifs = { ...notifs, ...(notifRes.data?.notifications || notifRes.data || {}) };
        setNotifs(nextNotifs);
        setServerNotifs(nextNotifs);

        setSessions(sessRes.data?.sessions || []);
        const brData = Array.isArray(brRes.data) ? brRes.data : brRes.data?.items || [];
        setBranches(brData);
      } catch (e) {
        console.error("Failed to load profile:", e?.message || e);
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----------- toasts (tiny) -----------
  const [toasts, setToasts] = useState([]);
  function toast(msg, type = "ok") {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2500);
  }

  // ----------- actions -----------
  const saveIdentity = async () => {
    const e = validateForm();
    setErrors(e);
    if (Object.keys(e).length) {
      toast("Fix validation errors", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        displayName: form.displayName,
        name: form.name,
        phone: form.phone,
        timezone: form.timezone,
        locale: form.locale,
        branchId: form.branchId || null,
        title: form.title,
        department: form.department,
        employeeCode: form.employeeCode,
      };
      const res = await api.put("/account/me", payload);
      setMe({ user: res.data?.user || {} });
      setServerForm(form);
      toast("Saved profile");
    } catch {
      toast("Failed to save profile", "error");
    } finally {
      setSaving(false);
    }
  };

  const resetIdentity = () => {
    if (serverForm) setForm(serverForm);
    setErrors({});
  };

  const applyLocalPrefsSideEffects = (p) => {
    // Optional: broadcast theme change to the rest of the app
    try {
      window.dispatchEvent(new CustomEvent("app:preferences", { detail: p }));
    } catch {}
    // Store for immediate reloads
    try {
      localStorage.setItem("user:prefs", JSON.stringify(p));
    } catch {}
  };

  const savePrefs = async () => {
    setSaving(true);
    try {
      await api.put("/account/preferences", prefs);
      setServerPrefs(prefs);
      applyLocalPrefsSideEffects(prefs);
      toast("Saved preferences");
    } catch {
      toast("Failed to save preferences", "error");
    } finally {
      setSaving(false);
    }
  };

  const resetPrefs = () => setPrefs(serverPrefs || prefs);

  const saveNotifs = async () => {
    setSaving(true);
    try {
      await api.put("/account/notifications", notifs);
      setServerNotifs(notifs);
      toast("Saved notifications");
    } catch {
      toast("Failed to save notifications", "error");
    } finally {
      setSaving(false);
    }
  };

  const testNotifs = async () => {
    try {
      await api.post("/account/notifications/test").catch(() => {});
      toast("Test notification queued");
    } catch {
      toast("Test send not available on this server", "error");
    }
  };

  const revokeOtherSessions = async () => {
    setSaving(true);
    try {
      await api.post("/account/security/sessions/revoke-all");
      // Reload sessions
      const res = await api.get("/account/security/sessions").catch(() => ({ data: { sessions: [] } }));
      setSessions(res.data?.sessions || []);
      toast("Signed out from other devices");
    } catch {
      toast("Failed to revoke sessions", "error");
    } finally {
      setSaving(false);
    }
  };

  const revokeSession = async (sid) => {
    setSaving(true);
    try {
      // try common patterns: DELETE /sessions/:id or POST /sessions/revoke {id}
      await api.delete(`/account/security/sessions/${encodeURIComponent(sid)}`).catch(async () => {
        await api.post("/account/security/sessions/revoke", { id: sid });
      });
      setSessions((s) => s.filter((x) => x.id !== sid));
      toast("Session revoked");
    } catch {
      toast("Failed to revoke session", "error");
    } finally {
      setSaving(false);
    }
  };

  const onAvatarPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast("Image too large (max 2MB)", "error");
    const fd = new FormData();
    fd.append("avatar", file);
    try {
      const res = await api.post("/account/avatar", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMe((m) => ({
        ...(m || {}),
        user: { ...(m?.user || {}), avatarUrl: res.data?.avatarUrl || "" },
      }));
      toast("Avatar updated");
    } catch {
      toast("Failed to upload avatar", "error");
    } finally {
      e.target.value = "";
    }
  };

  const muteProfile = async () => {
    try {
      await api.post("/account/security/mute");
      toast("Profile muted (notifications suppressed)");
    } catch {
      toast("Mute not available on this server", "error");
    }
  };
  const disableProfile = async () => {
    const ok = window.confirm(
      "Disable this profile? You will be signed out and an admin must re-enable it."
    );
    if (!ok) return;
    try {
      await api.post("/account/security/disable");
      toast("Profile disabled");
    } catch {
      toast("Disable not available on this server", "error");
    }
  };
  const deleteProfile = async () => {
    const phrase = window.prompt(
      "Type DELETE to permanently remove your profile. This cannot be undone."
    );
    if (phrase !== "DELETE") return;
    try {
      await api.delete("/account");
      toast("Profile deleted");
      // window.location.href = "/login";
    } catch {
      toast("Delete not available on this server", "error");
    }
  };

  // ----------- UI helpers -----------
  const user = me?.user || {};
  const initials = (user.displayName || user.name || "S")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const currentSessionIdRef = useRef(null);
  useEffect(() => {
    // Some backends send current session id in /me; otherwise leave null
    currentSessionIdRef.current = me?.sessionId || null;
  }, [me]);

  // ----------- render -----------
  return (
    <div className="p-6">
      {/* toasts */}
      <div className="fixed right-4 top-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-3 py-2 rounded shadow text-sm text-white ${
              t.type === "error" ? "bg-rose-600" : "bg-emerald-600"
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>

      <h1 className="text-2xl font-bold mb-4">Profile</h1>

      {loading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          {/* LEFT */}
          <div className="space-y-6">
            {/* Identity */}
            <section className="bg-white border rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold">Identity</h2>
                {isFormDirty && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                    Unsaved changes
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Text
                  label="Display name"
                  value={form.displayName}
                  onChange={(v) => setForm((s) => ({ ...s, displayName: v }))}
                />
                <Text
                  label="Full name"
                  value={form.name}
                  onChange={(v) => setForm((s) => ({ ...s, name: v }))}
                />
                <Text
                  label="Email"
                  value={user.email || ""}
                  readOnly
                  helper="Email is managed by your admin."
                />
                <Text
                  label="Phone"
                  value={form.phone}
                  onChange={(v) => setForm((s) => ({ ...s, phone: v }))}
                  placeholder="+2547…"
                  error={errors.phone}
                />
                <Select
                  label="Default branch"
                  value={String(form.branchId || "")}
                  onChange={(v) => setForm((s) => ({ ...s, branchId: v || "" }))}
                  options={[
                    { value: "", label: "—" },
                    ...branches.map((b) => ({ value: String(b.id), label: b.name })),
                  ]}
                />
                <Select
                  label="Time zone"
                  value={form.timezone}
                  onChange={(v) => setForm((s) => ({ ...s, timezone: v }))}
                  options={TZ_OPTIONS.map((tz) => ({ value: tz, label: tz }))}
                  error={errors.timezone}
                />
                <Select
                  label="Locale"
                  value={form.locale}
                  onChange={(v) => setForm((s) => ({ ...s, locale: v }))}
                  options={LOCALES.map((l) => ({ value: l, label: l }))}
                  error={errors.locale}
                />
              </div>

              <div className="mt-4">
                <h3 className="text-sm font-medium text-slate-700 mb-2">
                  Professional
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Text
                    label="Job title"
                    value={form.title}
                    onChange={(v) => setForm((s) => ({ ...s, title: v }))}
                  />
                  <Text
                    label="Department"
                    value={form.department}
                    onChange={(v) => setForm((s) => ({ ...s, department: v }))}
                  />
                  <Text
                    label="Employee ID"
                    value={form.employeeCode}
                    onChange={(v) =>
                      setForm((s) => ({ ...s, employeeCode: v }))
                    }
                    error={errors.employeeCode}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={saveIdentity}
                  disabled={saving || !isFormDirty}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                <button
                  onClick={resetIdentity}
                  disabled={!isFormDirty || saving}
                  className="px-3 py-2 rounded-lg border bg-white hover:bg-slate-50 disabled:opacity-60"
                >
                  Reset
                </button>
              </div>
            </section>

            {/* Preferences */}
            <section className="bg-white border rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold">Preferences</h2>
                {isPrefsDirty && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                    Unsaved changes
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Select
                  label="Default landing page"
                  value={prefs.landingPage}
                  onChange={(v) => setPrefs((p) => ({ ...p, landingPage: v }))}
                  options={[
                    { value: "/dashboard", label: "Dashboard" },
                    { value: "/loans", label: "Loans" },
                    { value: "/borrowers", label: "Borrowers" },
                    { value: "/collections", label: "Collections" },
                  ]}
                />
                <Select
                  label="Default currency"
                  value={prefs.defaultCurrency}
                  onChange={(v) =>
                    setPrefs((p) => ({ ...p, defaultCurrency: v }))
                  }
                  options={[
                    { value: "TZS", label: "TZS" },
                    { value: "USD", label: "USD" },
                    { value: "KES", label: "KES" },
                  ]}
                />
                <Select
                  label="Date format"
                  value={prefs.dateFormat}
                  onChange={(v) => setPrefs((p) => ({ ...p, dateFormat: v }))}
                  options={[
                    { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
                    { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
                    { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
                  ]}
                />
                <Select
                  label="Theme"
                  value={prefs.theme}
                  onChange={(v) => setPrefs((p) => ({ ...p, theme: v }))}
                  options={[
                    { value: "system", label: "System" },
                    { value: "light", label: "Light" },
                    { value: "dark", label: "Dark" },
                  ]}
                />
                <Select
                  label="Font size"
                  value={prefs.fontScale}
                  onChange={(v) => setPrefs((p) => ({ ...p, fontScale: v }))}
                  options={[
                    { value: "small", label: "Small" },
                    { value: "normal", label: "Normal" },
                    { value: "large", label: "Large" },
                  ]}
                />
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <Checkbox
                  label="Color-blind friendly palette"
                  checked={!!prefs.colorBlindMode}
                  onChange={(v) => setPrefs((p) => ({ ...p, colorBlindMode: v }))}
                />
                <Checkbox
                  label="Reduced motion"
                  checked={!!prefs.reduceMotion}
                  onChange={(v) => setPrefs((p) => ({ ...p, reduceMotion: v }))}
                />
              </div>
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={savePrefs}
                  disabled={saving || !isPrefsDirty}
                  className="px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save Preferences"}
                </button>
                <button
                  onClick={resetPrefs}
                  disabled={!isPrefsDirty || saving}
                  className="px-3 py-2 rounded-lg border bg-white hover:bg-slate-50 disabled:opacity-60"
                >
                  Reset
                </button>
              </div>
            </section>

            {/* Notifications */}
            <section className="bg-white border rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold">Notifications</h2>
                {isNotifsDirty && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                    Unsaved changes
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Checkbox
                  label="In-app"
                  checked={!!notifs.channels?.inApp}
                  onChange={(v) =>
                    setNotifs((n) => ({
                      ...n,
                      channels: { ...n.channels, inApp: v },
                    }))
                  }
                />
                <Checkbox
                  label="Email"
                  checked={!!notifs.channels?.email}
                  onChange={(v) =>
                    setNotifs((n) => ({
                      ...n,
                      channels: { ...n.channels, email: v },
                    }))
                  }
                />
                <Checkbox
                  label="SMS/WhatsApp"
                  checked={!!notifs.channels?.sms}
                  onChange={(v) =>
                    setNotifs((n) => ({
                      ...n,
                      channels: { ...n.channels, sms: v },
                    }))
                  }
                />
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <Checkbox
                  label="New loan assigned to me"
                  checked={!!notifs.events?.loanAssigned}
                  onChange={(v) =>
                    setNotifs((n) => ({
                      ...n,
                      events: { ...n.events, loanAssigned: v },
                    }))
                  }
                />
                <Checkbox
                  label="Approval needed (maker-checker)"
                  checked={!!notifs.events?.approvalNeeded}
                  onChange={(v) =>
                    setNotifs((n) => ({
                      ...n,
                      events: { ...n.events, approvalNeeded: v },
                    }))
                  }
                />
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="border rounded-lg p-3">
                  <Checkbox
                    label="Large repayment"
                    checked={!!notifs.events?.largeRepayment?.enabled}
                    onChange={(v) =>
                      setNotifs((n) => ({
                        ...n,
                        events: {
                          ...n.events,
                          largeRepayment: {
                            ...(n.events?.largeRepayment || {}),
                            enabled: v,
                          },
                        },
                      }))
                    }
                  />
                  <div className="mt-2">
                    <Text
                      label="Threshold"
                      type="number"
                      value={String(
                        notifs.events?.largeRepayment?.threshold ?? 500000
                      )}
                      onChange={(v) =>
                        setNotifs((n) => ({
                          ...n,
                          events: {
                            ...n.events,
                            largeRepayment: {
                              ...(n.events?.largeRepayment || {}),
                              threshold: Math.max(0, Number(v || 0)),
                            },
                          },
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="border rounded-lg p-3">
                  <Checkbox
                    label="Arrears digest"
                    checked={!!notifs.events?.arrearsDigest?.enabled}
                    onChange={(v) =>
                      setNotifs((n) => ({
                        ...n,
                        events: {
                          ...n.events,
                          arrearsDigest: {
                            ...(n.events?.arrearsDigest || {}),
                            enabled: v,
                          },
                        },
                      }))
                    }
                  />
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Text
                      label="Days"
                      type="number"
                      value={String(notifs.events?.arrearsDigest?.days ?? 7)}
                      onChange={(v) =>
                        setNotifs((n) => ({
                          ...n,
                          events: {
                            ...n.events,
                            arrearsDigest: {
                              ...(n.events?.arrearsDigest || {}),
                              days: Math.max(1, Number(v || 1)),
                            },
                          },
                        }))
                      }
                    />
                    <Text
                      label="Hour (24h)"
                      type="number"
                      value={String(notifs.events?.arrearsDigest?.hour ?? 18)}
                      onChange={(v) =>
                        setNotifs((n) => ({
                          ...n,
                          events: {
                            ...n.events,
                            arrearsDigest: {
                              ...(n.events?.arrearsDigest || {}),
                              hour: Math.min(23, Math.max(0, Number(v || 0))),
                            },
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={saveNotifs}
                  disabled={saving || !isNotifsDirty}
                  className="px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save Notifications"}
                </button>
                <button
                  onClick={testNotifs}
                  className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
                >
                  Send test
                </button>
              </div>
            </section>

            {/* Security */}
            <section className="bg-white border rounded-2xl p-4 shadow-sm">
              <h2 className="text-lg font-semibold mb-3">Security</h2>

              <div className="flex flex-wrap gap-2">
                <Link to="/2fa" className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50">
                  Manage Two-Factor
                </Link>
                <Link to="/change-password" className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50">
                  Change Password
                </Link>

                <button onClick={muteProfile} className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50">
                  Mute Profile
                </button>
                <button onClick={disableProfile} className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50">
                  Disable Profile
                </button>
                <button onClick={deleteProfile} className="px-3 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700">
                  Delete Profile
                </button>
              </div>

              <div className="mt-4">
                <h3 className="text-sm font-medium text-slate-700 mb-2">Active sessions</h3>
                {sessions.length === 0 ? (
                  <p className="text-xs text-slate-500 mb-2">Only this device is active.</p>
                ) : (
                  <div className="space-y-2">
                    {sessions.map((s) => {
                      const isCurrent = s.id && s.id === currentSessionIdRef.current;
                      return (
                        <div
                          key={s.id || `${s.ip}-${s.lastActive}`}
                          className="flex items-center justify-between gap-3 border rounded-lg px-3 py-2"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">
                              {s.device || s.userAgent || "Device"} {isCurrent && <span className="text-xs text-emerald-600">(current)</span>}
                            </div>
                            <div className="text-xs text-slate-500 truncate">
                              IP: {s.ip || "-"} · Last active: {s.lastActive || s.last_seen || "-"}
                            </div>
                          </div>
                          {!isCurrent && (
                            <button
                              onClick={() => revokeSession(s.id)}
                              className="text-xs px-2 py-1 rounded bg-rose-600 text-white hover:bg-rose-700"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="mt-3">
                  <button
                    onClick={revokeOtherSessions}
                    className="px-3 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
                  >
                    Sign out of other devices
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT */}
          <aside className="bg-white border rounded-2xl p-4 h-fit shadow-sm">
            <h2 className="text-lg font-semibold mb-3">Avatar</h2>

            <div className="flex items-center gap-3">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-14 h-14 rounded-full object-cover border"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center text-lg font-semibold">
                  {initials}
                </div>
              )}
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={onAvatarPick} />
                Choose image
              </label>
            </div>
            <p className="text-xs text-slate-500 mt-2">PNG/JPG/WEBP up to 2MB.</p>

            {/* Quick hint */}
            {hasAnyDirty && (
              <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                You have unsaved changes on this page.
              </p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

/* ----------------------- tiny inputs ----------------------- */
function Text({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  readOnly = false,
  helper = "",
  error = "",
}) {
  return (
    <label className="block">
      <span className="text-xs text-slate-600">{label}</span>
      <input
        className={`mt-1 w-full border rounded-lg px-3 py-2 outline-none ${
          readOnly
            ? "bg-gray-50"
            : error
            ? "border-rose-400 focus:ring-2 focus:ring-rose-200"
            : "focus:ring-2 focus:ring-indigo-200"
        }`}
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readOnly}
      />
      {helper && <span className="block mt-1 text-[11px] text-slate-500">{helper}</span>}
      {error && <span className="block mt-1 text-[11px] text-rose-600">{error}</span>}
    </label>
  );
}
function Select({ label, value, onChange, options, error = "" }) {
  return (
    <label className="block">
      <span className="text-xs text-slate-600">{label}</span>
      <select
        className={`mt-1 w-full border rounded-lg px-3 py-2 outline-none ${
          error ? "border-rose-400 focus:ring-2 focus:ring-rose-200" : "focus:ring-2 focus:ring-indigo-200"
        }`}
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
      >
        {options.map((o, i) => (
          <option key={i} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <span className="block mt-1 text-[11px] text-rose-600">{error}</span>}
    </label>
  );
}
function Checkbox({ label, checked, onChange }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        className="w-4 h-4"
        checked={!!checked}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
