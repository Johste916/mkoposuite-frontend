import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";

/* ---------- helpers ---------- */
const getTimeZones = () => {
  try {
    const list = Intl.supportedValuesOf?.("timeZone") || [];
    return list.length ? list : [Intl.DateTimeFormat().resolvedOptions().timeZone];
  } catch {
    return [Intl.DateTimeFormat().resolvedOptions().timeZone];
  }
};

const readTenantFromStorage = () => {
  try {
    const raw = localStorage.getItem("tenant");
    if (raw) return JSON.parse(raw);
    const id = localStorage.getItem("tenantId");
    const name = localStorage.getItem("tenantName");
    if (id || name) return { id: id || null, name: name || "" };
  } catch {}
  return null;
};

const writeTenantToStorage = (t) => {
  try {
    if (t) {
      localStorage.setItem("tenant", JSON.stringify(t));
      if (t.id) localStorage.setItem("tenantId", String(t.id));
      if (t.name) localStorage.setItem("tenantName", t.name);
    }
  } catch {}
};

const ensureTenantHeader = () => {
  const t = readTenantFromStorage();
  if (t?.id) api.defaults.headers.common["x-tenant-id"] = t.id;
  else delete api.defaults.headers.common["x-tenant-id"];
  return t;
};

/* ---------- resilient API callers ---------- */
async function tryGetProfile() {
  const paths = ["/account/profile", "/auth/me", "/users/me", "/me"];
  for (const p of paths) {
    try { const { data } = await api.get(p); return data; } catch {}
  }
  throw new Error("No profile endpoint available");
}

async function tryUpdateProfile(payload) {
  const attempt = async (m, u) => { try { return await api[m](u, payload); } catch {} };
  return (
    (await attempt("patch", "/account/profile")) ||
    (await attempt("put",   "/account/profile")) ||
    (await attempt("patch", "/users/me")) ||
    (await attempt("put",   "/users/me")) ||
    (await attempt("patch", "/auth/me")) ||
    (await attempt("put",   "/auth/me")) ||
    (await attempt("post",  "/profile"))
  );
}

async function tryUploadAvatar(file) {
  const fd = new FormData();
  fd.append("avatar", file);
  const endpoints = ["/account/profile/avatar", "/users/me/avatar", "/auth/me/avatar", "/profile/avatar"];
  for (const u of endpoints) {
    try { const { data } = await api.post(u, fd, { headers: { "Content-Type": "multipart/form-data" } }); return data; } catch {}
  }
  throw new Error("Avatar upload failed");
}

async function tryListTenants() {
  const paths = ["/tenants", "/auth/tenants", "/account/tenants"];
  for (const p of paths) {
    try {
      const { data } = await api.get(p);
      const arr = Array.isArray(data) ? data : data?.data;
      if (Array.isArray(arr)) return arr;
      // sometimes { tenants: [...] }
      if (Array.isArray(data?.tenants)) return data.tenants;
    } catch {}
  }
  return []; // fine if single-tenant
}

/* ---------- component ---------- */
export default function Profile() {
  const navigate = useNavigate();

  // ensure header even on hard refresh direct to /account/profile
  const [tenant, setTenant] = useState(() => ensureTenantHeader());
  const [tenants, setTenants] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [branches, setBranches] = useState([]);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  const [form, setForm] = useState({
    displayName: "",
    name: "",
    email: "",
    phone: "",
    defaultBranchId: "",
    timezone: "",
    locale: "",
    avatarUrl: "",
  });

  const tzOptions = useMemo(getTimeZones, []);
  const initial = (form.displayName || form.name || form.email || "U").charAt(0).toUpperCase();
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const load = async () => {
    setLoading(true); setErr(""); setMsg("");
    try {
      // tenants (optional)
      const list = await tryListTenants();
      setTenants(list);

      // profile
      const me = await tryGetProfile();
      const d = {
        displayName: me.displayName || me.fullName || me.name || "",
        name:        me.name || me.fullName || "",
        email:       me.email || "",
        phone:       me.phone || me.phoneNumber || "",
        defaultBranchId: String(me.defaultBranchId ?? me.branchId ?? "") || "",
        timezone:    me.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale:      me.locale || navigator.language || "en-US",
        avatarUrl:   me.avatarUrl || me.photoUrl || "",
      };
      setForm(d);
      setAvatarPreview(d.avatarUrl || "");

      // branches are tenant-scoped by header
      try {
        const res = await api.get("/branches");
        const listB = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setBranches(listB);
      } catch {}
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [tenant?.id]);

  // if some other place changes tenant, refresh here
  useEffect(() => {
    const onTenant = (e) => setTenant(e.detail || ensureTenantHeader());
    window.addEventListener("ms:tenant-changed", onTenant);
    return () => window.removeEventListener("ms:tenant-changed", onTenant);
  }, []);

  const onAvatarChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { setErr("Avatar must be 2MB or smaller."); return; }
    setErr("");
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  };

  const save = async () => {
    setSaving(true); setErr(""); setMsg("");
    try {
      let avatarUrl = form.avatarUrl;
      if (avatarFile) {
        const up = await tryUploadAvatar(avatarFile);
        avatarUrl = up?.avatarUrl || up?.url || avatarUrl;
      }

      const payload = {
        displayName: form.displayName,
        name: form.name,
        phone: form.phone,
        defaultBranchId: form.defaultBranchId || null,
        timezone: form.timezone,
        locale: form.locale,
        avatarUrl,
      };
      const { data } = await tryUpdateProfile(payload);

      // sync local user cache (used by header)
      const merged = { ...(JSON.parse(localStorage.getItem("user") || "{}")), ...payload, email: form.email };
      localStorage.setItem("user", JSON.stringify(merged));
      window.dispatchEvent(new CustomEvent("ms:profile-updated", { detail: merged }));

      if (form.defaultBranchId) {
        localStorage.setItem("activeBranchId", String(form.defaultBranchId));
        window.dispatchEvent(new CustomEvent("ms:branch-changed", { detail: { id: String(form.defaultBranchId) } }));
      }

      setMsg(data?.message || "Profile saved.");
      setAvatarFile(null);
      if (avatarUrl) set("avatarUrl", avatarUrl);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const switchTenant = async (nextId) => {
    // find metadata for badge
    const next = tenants.find((t) => String(t.id) === String(nextId)) || { id: nextId, name: nextId };
    // persist + header
    writeTenantToStorage(next);
    api.defaults.headers.common["x-tenant-id"] = next.id;
    setTenant(next);
    // let the shell know
    window.dispatchEvent(new CustomEvent("ms:tenant-changed", { detail: next }));
    // clear branch (new tenant will have own branches)
    localStorage.removeItem("activeBranchId");
    setForm((p) => ({ ...p, defaultBranchId: "" }));
  };

  if (loading) return <div className="p-4 text-sm text-slate-500 dark:text-slate-400">Loading…</div>;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      {/* Left: main form */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Profile</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Update your personal info and preferences.</p>
          </div>
          {tenant?.name && (
            <span className="px-2 py-0.5 text-[11px] rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              {tenant.name}
            </span>
          )}
        </div>

        {msg && <div className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">{msg}</div>}
        {err && <div className="mt-3 text-sm text-rose-600 dark:text-rose-400">{err}</div>}

        {/* Optional tenant switcher (only shown if multiple tenants) */}
        {Array.isArray(tenants) && tenants.length > 1 && (
          <div className="mt-4 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
            <label className="text-xs text-slate-600 dark:text-slate-300">Organization</label>
            <select
              className="mt-1 w-full border rounded px-3 py-2 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
              value={String(tenant?.id || "")}
              onChange={(e) => switchTenant(e.target.value)}
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.name || t.id}</option>
              ))}
            </select>
            <div className="text-[11px] text-slate-500 mt-1">Switch organization. Data below will reload.</div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <label>
            <div className="mb-1 text-slate-700 dark:text-slate-300">Display name</div>
            <input
              className="w-full border rounded px-3 py-2 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
              value={form.displayName}
              onChange={(e) => set("displayName", e.target.value)}
              placeholder="Shown in the app"
            />
          </label>

          <label>
            <div className="mb-1 text-slate-700 dark:text-slate-300">Full name</div>
            <input
              className="w-full border rounded px-3 py-2 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Legal / full name"
            />
          </label>

          <label>
            <div className="mb-1 text-slate-700 dark:text-slate-300">Email</div>
            <input
              className="w-full border rounded px-3 py-2 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
              value={form.email}
              disabled
              readOnly
            />
            <div className="text-xs text-slate-500 mt-1">Email is managed by your admin.</div>
          </label>

          <label>
            <div className="mb-1 text-slate-700 dark:text-slate-300">Phone</div>
            <input
              className="w-full border rounded px-3 py-2 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+2547…"
            />
          </label>

          <label>
            <div className="mb-1 text-slate-700 dark:text-slate-300">Default branch</div>
            <select
              className="w-full border rounded px-3 py-2 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
              value={form.defaultBranchId}
              onChange={(e) => set("defaultBranchId", e.target.value)}
            >
              <option value="">—</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <div className="text-xs text-slate-500 mt-1">Used for filtering & quick actions.</div>
          </label>

          <label>
            <div className="mb-1 text-slate-700 dark:text-slate-300">Time zone</div>
            <select
              className="w-full border rounded px-3 py-2 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
              value={form.timezone}
              onChange={(e) => set("timezone", e.target.value)}
            >
              {tzOptions.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </label>

          <label>
            <div className="mb-1 text-slate-700 dark:text-slate-300">Locale</div>
            <input
              className="w-full border rounded px-3 py-2 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
              value={form.locale}
              onChange={(e) => set("locale", e.target.value)}
              placeholder="e.g. en-US, sw-KE"
            />
          </label>

          <div className="sm:col-span-2">
            <div className="flex items-center gap-2">
              <button
                onClick={save}
                disabled={saving}
                className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <button
                onClick={load}
                disabled={saving}
                className="px-3 py-2 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Refresh
              </button>
              <button
                onClick={() => navigate("/change-password")}
                className="px-3 py-2 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Change Password
              </button>
              <button
                onClick={() => navigate("/2fa")}
                className="px-3 py-2 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Two-Factor
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right: avatar card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 h-fit">
        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Avatar</div>
        <div className="mt-3 flex items-center gap-3">
          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt="Avatar preview"
              className="w-16 h-16 rounded-full object-cover border border-slate-200 dark:border-slate-700"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-lg font-bold">
              {initial}
            </div>
          )}
          <div>
            <label className="inline-block px-3 py-2 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
              Choose image
            </label>
            <div className="text-xs text-slate-500 mt-1">PNG/JPG up to 2MB.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
