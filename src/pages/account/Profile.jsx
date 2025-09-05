import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";

const TZ_OPTIONS = [
  "Africa/Nairobi", "Africa/Dar_es_Salaam", "Africa/Kampala",
  "Africa/Addis_Ababa", "Africa/Kigali", "UTC",
];

const LOCALES = ["en", "sw", "fr"];

export default function Profile() {
  // ----------- data -----------
  const [me, setMe] = useState(null);
  const [branches, setBranches] = useState([]);

  // identity form (aka “me”)
  const [form, setForm] = useState({
    displayName: "",
    name: "",
    phone: "",
    branchId: "",
    timezone: "Africa/Nairobi",
    locale: "en",

    // professional extras
    title: "",
    department: "",
    employeeCode: "",
  });

  // preferences
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

  // notifications
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

  // security
  const [sessions, setSessions] = useState([]);
  const [saving, setSaving] = useState(false);

  const avatarUrl = useMemo(() => me?.user?.avatarUrl || "", [me]);

  // ----------- effects -----------
  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        const [meRes, prefRes, notifRes, sessRes, brRes] = await Promise.all([
          api.get("/account/me", { signal: ac.signal }),
          api.get("/account/preferences", { signal: ac.signal }),
          api.get("/account/notifications", { signal: ac.signal }),
          api.get("/account/security/sessions", { signal: ac.signal }),
          api.get("/branches", { signal: ac.signal }).catch(() => ({ data: [] })),
        ]);

        setMe(meRes.data);
        const u = meRes.data?.user || {};
        setForm((f) => ({
          ...f,
          displayName: u.displayName || u.name || "",
          name: u.name || "",
          phone: u.phone || "",
          branchId: u.branchId || "",
          timezone: u.timezone || f.timezone,
          locale: u.locale || f.locale,
          title: u.title || "",
          department: u.department || "",
          employeeCode: u.employeeCode || "",
        }));

        setPrefs((p) => ({ ...p, ...(prefRes.data?.preferences || {}) }));
        setNotifs((n) => ({ ...n, ...(notifRes.data?.notifications || {}) }));
        setSessions(sessRes.data?.sessions || []);
        setBranches(Array.isArray(brRes.data) ? brRes.data : (brRes.data?.items || []));
      } catch (e) {
        console.error("Failed to load profile:", e?.message || e);
      }
    })();

    return () => ac.abort();
  }, []);

  // ----------- actions -----------
  const saveIdentity = async () => {
    setSaving(true);
    try {
      const payload = {
        displayName: form.displayName,
        name: form.name,
        phone: form.phone,
        timezone: form.timezone,
        locale: form.locale,
        branchId: form.branchId || null,
        // you can persist the professional extras server-side if your model supports them
        title: form.title,
        department: form.department,
        employeeCode: form.employeeCode,
      };
      const res = await api.put("/account/me", payload);
      setMe({ user: res.data?.user || {} });
      toast("Saved profile");
    } catch (e) {
      toast("Failed to save profile", "error");
    } finally {
      setSaving(false);
    }
  };

  const savePrefs = async () => {
    setSaving(true);
    try {
      await api.put("/account/preferences", prefs);
      toast("Saved preferences");
    } catch {
      toast("Failed to save preferences", "error");
    } finally {
      setSaving(false);
    }
  };

  const saveNotifs = async () => {
    setSaving(true);
    try {
      await api.put("/account/notifications", notifs);
      toast("Saved notifications");
    } catch {
      toast("Failed to save notifications", "error");
    } finally {
      setSaving(false);
    }
  };

  const revokeOtherSessions = async () => {
    setSaving(true);
    try {
      await api.post("/account/security/sessions/revoke-all");
      setSessions([]);
      toast("Signed out from other devices");
    } catch {
      toast("Failed to revoke sessions", "error");
    } finally {
      setSaving(false);
    }
  };

  const onAvatarPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast("Image too large (max 2MB)", "error");
      return;
    }
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
    } catch (e) {
      toast("Failed to upload avatar", "error");
    } finally {
      e.target.value = "";
    }
  };

  // ----------- tiny toast -----------
  const [toasts, setToasts] = useState([]);
  function toast(msg, type = "ok") {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2500);
  }

  // ----------- UI -----------
  const user = me?.user || {};
  const initials = (user.displayName || user.name || "S").split(" ").map(s => s[0]).join("").slice(0,2).toUpperCase();

  return (
    <div className="p-6">
      {/* toasts */}
      <div className="fixed right-4 top-4 z-50 space-y-2">
        {toasts.map(t => (
          <div key={t.id} className={`px-3 py-2 rounded shadow text-sm text-white ${t.type==='error'?'bg-rose-600':'bg-emerald-600'}`}>{t.msg}</div>
        ))}
      </div>

      <h1 className="text-2xl font-bold mb-4">Profile</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* LEFT: forms */}
        <div className="space-y-6">
          {/* Identity (no change password / 2fa here) */}
          <section className="bg-white border rounded-2xl p-4 shadow-sm">
            <h2 className="text-lg font-semibold mb-3">Identity</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Text label="Display name" value={form.displayName} onChange={(v)=>setForm(s=>({...s,displayName:v}))}/>
              <Text label="Full name" value={form.name} onChange={(v)=>setForm(s=>({...s,name:v}))}/>
              <Text label="Email" value={user.email || ""} readOnly helper="Email is managed by your admin."/>
              <Text label="Phone" value={form.phone} onChange={(v)=>setForm(s=>({...s,phone:v}))} placeholder="+2547…"/>
              <Select
                label="Default branch"
                value={String(form.branchId || "")}
                onChange={(v)=>setForm(s=>({...s,branchId:v||""}))}
                options={[{value:"",label:"—"}, ...branches.map(b=>({value:String(b.id), label:b.name}))]}
              />
              <Select
                label="Time zone"
                value={form.timezone}
                onChange={(v)=>setForm(s=>({...s,timezone:v}))}
                options={TZ_OPTIONS.map(tz=>({value:tz, label:tz}))}
              />
              <Select
                label="Locale"
                value={form.locale}
                onChange={(v)=>setForm(s=>({...s,locale:v}))}
                options={LOCALES.map(l=>({value:l,label:l}))}
              />
            </div>

            {/* Professional */}
            <div className="mt-4">
              <h3 className="text-sm font-medium text-slate-700 mb-2">Professional</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Text label="Job title" value={form.title} onChange={(v)=>setForm(s=>({...s,title:v}))}/>
                <Text label="Department" value={form.department} onChange={(v)=>setForm(s=>({...s,department:v}))}/>
                <Text label="Employee ID" value={form.employeeCode} onChange={(v)=>setForm(s=>({...s,employeeCode:v}))}/>
              </div>
            </div>

            {/* Save row — NO Refresh/Change Password/Two-Factor here anymore */}
            <div className="mt-4 flex items-center gap-2">
              <button onClick={saveIdentity} disabled={saving} className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60">
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </section>

          {/* Preferences */}
          <section className="bg-white border rounded-2xl p-4 shadow-sm">
            <h2 className="text-lg font-semibold mb-3">Preferences</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Select
                label="Default landing page"
                value={prefs.landingPage}
                onChange={(v)=>setPrefs(p=>({...p,landingPage:v}))}
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
                onChange={(v)=>setPrefs(p=>({...p,defaultCurrency:v}))}
                options={[{value:"TZS",label:"TZS"},{value:"USD",label:"USD"},{value:"KES",label:"KES"}]}
              />
              <Select
                label="Date format"
                value={prefs.dateFormat}
                onChange={(v)=>setPrefs(p=>({...p,dateFormat:v}))}
                options={[
                  { value:"DD/MM/YYYY", label:"DD/MM/YYYY" },
                  { value:"YYYY-MM-DD", label:"YYYY-MM-DD" },
                  { value:"MM/DD/YYYY", label:"MM/DD/YYYY" },
                ]}
              />
              <Select
                label="Theme"
                value={prefs.theme}
                onChange={(v)=>setPrefs(p=>({...p,theme:v}))}
                options={[
                  { value:"system", label:"System" },
                  { value:"light", label:"Light" },
                  { value:"dark", label:"Dark" },
                ]}
              />
              <Select
                label="Font size"
                value={prefs.fontScale}
                onChange={(v)=>setPrefs(p=>({...p,fontScale:v}))}
                options={[
                  { value:"small", label:"Small" },
                  { value:"normal", label:"Normal" },
                  { value:"large", label:"Large" },
                ]}
              />
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <Checkbox
                label="Color-blind friendly palette"
                checked={!!prefs.colorBlindMode}
                onChange={(v)=>setPrefs(p=>({...p,colorBlindMode:v}))}
              />
              <Checkbox
                label="Reduced motion"
                checked={!!prefs.reduceMotion}
                onChange={(v)=>setPrefs(p=>({...p,reduceMotion:v}))}
              />
            </div>
            <div className="mt-4">
              <button onClick={savePrefs} disabled={saving} className="px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 disabled:opacity-60">
                {saving ? "Saving…" : "Save Preferences"}
              </button>
            </div>
          </section>

          {/* Notifications */}
          <section className="bg-white border rounded-2xl p-4 shadow-sm">
            <h2 className="text-lg font-semibold mb-3">Notifications</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Checkbox label="In-app" checked={!!notifs.channels?.inApp}
                        onChange={(v)=>setNotifs(n=>({...n,channels:{...n.channels,inApp:v}}))}/>
              <Checkbox label="Email" checked={!!notifs.channels?.email}
                        onChange={(v)=>setNotifs(n=>({...n,channels:{...n.channels,email:v}}))}/>
              <Checkbox label="SMS/WhatsApp" checked={!!notifs.channels?.sms}
                        onChange={(v)=>setNotifs(n=>({...n,channels:{...n.channels,sms:v}}))}/>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <Checkbox label="New loan assigned to me"
                        checked={!!notifs.events?.loanAssigned}
                        onChange={(v)=>setNotifs(n=>({...n,events:{...n.events,loanAssigned:v}}))}/>
              <Checkbox label="Approval needed (maker-checker)"
                        checked={!!notifs.events?.approvalNeeded}
                        onChange={(v)=>setNotifs(n=>({...n,events:{...n.events,approvalNeeded:v}}))}/>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="border rounded-lg p-3">
                <Checkbox
                  label="Large repayment"
                  checked={!!notifs.events?.largeRepayment?.enabled}
                  onChange={(v)=>setNotifs(n=>({...n,events:{...n.events,largeRepayment:{...(n.events?.largeRepayment||{}),enabled:v}}}))}
                />
                <div className="mt-2">
                  <Text
                    label="Threshold"
                    type="number"
                    value={String(notifs.events?.largeRepayment?.threshold ?? 500000)}
                    onChange={(v)=>setNotifs(n=>({...n,events:{...n.events,largeRepayment:{...(n.events?.largeRepayment||{}),threshold:Number(v||0)}}}))}
                  />
                </div>
              </div>

              <div className="border rounded-lg p-3">
                <Checkbox
                  label="Arrears digest"
                  checked={!!notifs.events?.arrearsDigest?.enabled}
                  onChange={(v)=>setNotifs(n=>({...n,events:{...n.events,arrearsDigest:{...(n.events?.arrearsDigest||{}),enabled:v}}}))}
                />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Text
                    label="Days"
                    type="number"
                    value={String(notifs.events?.arrearsDigest?.days ?? 7)}
                    onChange={(v)=>setNotifs(n=>({...n,events:{...n.events,arrearsDigest:{...(n.events?.arrearsDigest||{}),days:Number(v||0)}}}))}
                  />
                  <Text
                    label="Hour (24h)"
                    type="number"
                    value={String(notifs.events?.arrearsDigest?.hour ?? 18)}
                    onChange={(v)=>setNotifs(n=>({...n,events:{...n.events,arrearsDigest:{...(n.events?.arrearsDigest||{}),hour:Number(v||0)}}}))}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <button onClick={saveNotifs} disabled={saving} className="px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 disabled:opacity-60">
                {saving ? "Saving…" : "Save Notifications"}
              </button>
            </div>
          </section>

          {/* Security — Change Password + Two-Factor live here now */}
          <section className="bg-white border rounded-2xl p-4 shadow-sm">
            <h2 className="text-lg font-semibold mb-3">Security</h2>

            <div className="flex flex-wrap gap-2">
              <Link
                to="/2fa"
                className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
              >
                Manage Two-Factor
              </Link>
              <Link
                to="/change-password"
                className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
              >
                Change Password
              </Link>
            </div>

            <div className="mt-4">
              <h3 className="text-sm font-medium text-slate-700 mb-2">Active sessions</h3>
              <p className="text-xs text-slate-500 mb-2">Only this device is active.</p>
              <button
                onClick={revokeOtherSessions}
                className="px-3 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
              >
                Sign out of other devices
              </button>
            </div>
          </section>
        </div>

        {/* RIGHT: avatar card */}
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
          {/* 🔥 No “Refresh” button anymore */}
        </aside>
      </div>
    </div>
  );
}

/* ----------------------- tiny inputs ----------------------- */
function Text({ label, value, onChange, type="text", placeholder="", readOnly=false, helper="" }) {
  return (
    <label className="block">
      <span className="text-xs text-slate-600">{label}</span>
      <input
        className={`mt-1 w-full border rounded-lg px-3 py-2 outline-none ${readOnly ? "bg-gray-50" : "focus:ring-2 focus:ring-indigo-200"}`}
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={e=>onChange?.(e.target.value)}
        readOnly={readOnly}
      />
      {helper && <span className="block mt-1 text-[11px] text-slate-500">{helper}</span>}
    </label>
  );
}
function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="text-xs text-slate-600">{label}</span>
      <select
        className="mt-1 w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200"
        value={value ?? ""}
        onChange={e=>onChange?.(e.target.value)}
      >
        {options.map((o,i)=>(<option key={i} value={o.value}>{o.label}</option>))}
      </select>
    </label>
  );
}
function Checkbox({ label, checked, onChange }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <input type="checkbox" className="w-4 h-4" checked={!!checked} onChange={e=>onChange?.(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
