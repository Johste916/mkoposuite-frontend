// src/pages/account/Profile.jsx
import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api';
import { useNavigate } from 'react-router-dom';

const TIMEZONES = [
  'Africa/Nairobi','Africa/Kampala','Africa/Dar_es_Salaam','Africa/Lagos',
  'Africa/Johannesburg','UTC','Europe/London','Europe/Berlin','Asia/Dubai'
];

const LANDING_PAGES = [
  { value: '/dashboard', label: 'Dashboard' },
  { value: '/borrowers', label: 'Borrowers' },
  { value: '/loans/review-queue', label: 'Loan Review Queue' },
  { value: '/collections', label: 'Collections' },
  { value: '/reports/borrowers', label: 'Reports' },
];

export default function Profile() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState([]);

  // core profile
  const [u, setU] = useState({
    displayName: '',
    name: '',
    email: '',
    phone: '',
    branchId: '',
    timezone: 'Africa/Nairobi',
    locale: 'en',
    avatarUrl: null,
    title: '',
    department: '',
    employeeCode: '',
  });

  // preferences
  const [prefs, setPrefs] = useState({
    landingPage: '/dashboard',
    defaultCurrency: 'TZS',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: '1,234.56',
    theme: 'system',
    fontScale: 'normal',
    reduceMotion: false,
    colorBlindMode: false,
  });

  // notifications
  const [notif, setNotif] = useState({
    channels: { inApp: true, email: true, sms: false },
    events: {
      loanAssigned: true,
      approvalNeeded: true,
      largeRepayment: { enabled: true, threshold: 500000 },
      arrearsDigest: { enabled: true, days: 7, hour: 18 },
      kycAssigned: true,
    },
  });

  // sessions
  const [sessions, setSessions] = useState([]);

  const initials = useMemo(() => {
    const s = (u.displayName || u.name || u.email || 'U').trim();
    const parts = s.split(/\s+/);
    return (parts[0]?.[0] || 'U').toUpperCase() + (parts[1]?.[0] || '').toUpperCase();
  }, [u.displayName, u.name, u.email]);

  const load = async () => {
    setLoading(true);
    try {
      const [me, pr, nf, br, ss] = await Promise.all([
        api.get('/account/me'),
        api.get('/account/preferences'),
        api.get('/account/notifications'),
        api.get('/branches'),
        api.get('/account/security/sessions').catch(() => ({ data: { sessions: [] } })),
      ]);

      const meU = me.data?.user || {};
      setU({
        displayName: meU.displayName || meU.name || '',
        name: meU.name || '',
        email: meU.email || '',
        phone: meU.phone || '',
        branchId: meU.branchId || '',
        timezone: meU.timezone || 'Africa/Nairobi',
        locale: meU.locale || 'en',
        avatarUrl: meU.avatarUrl || null,
        title: meU.title || '',
        department: meU.department || '',
        employeeCode: meU.employeeCode || '',
      });

      const p = pr.data?.preferences || {};
      setPrefs(prev => ({ ...prev, ...p }));

      const n = nf.data?.notifications || {};
      // merge deeply but shallow is fine for now
      setNotif(prev => ({
        channels: { ...prev.channels, ...(n.channels || {}) },
        events: {
          ...prev.events,
          ...(n.events || {}),
          largeRepayment: { ...prev.events.largeRepayment, ...(n.events?.largeRepayment || {}) },
          arrearsDigest: { ...prev.events.arrearsDigest, ...(n.events?.arrearsDigest || {}) },
        },
      }));

      const list = Array.isArray(br.data) ? br.data : br.data?.data || [];
      setBranches(list);

      setSessions(Array.isArray(ss.data?.sessions) ? ss.data.sessions : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const payload = {
        displayName: u.displayName,
        name: u.name,
        phone: u.phone,
        branchId: u.branchId || null,
        timezone: u.timezone,
        locale: u.locale || 'en',
      };
      await api.put('/account/me', payload);
    } finally {
      setSaving(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      await api.put('/account/preferences', prefs);
    } finally {
      setSaving(false);
    }
  };

  const saveNotifications = async () => {
    setSaving(true);
    try {
      await api.put('/account/notifications', notif);
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('avatar', file);
    const { data } = await api.post('/account/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    setU((prev) => ({ ...prev, avatarUrl: data.avatarUrl }));
  };

  const revokeAll = async () => {
    await api.post('/account/security/sessions/revoke-all');
    setSessions([]);
  };

  if (loading) return <div className="p-6 text-sm text-slate-500">Loading…</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      {/* Left: sections */}
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-4">
        <h1 className="text-xl font-semibold mb-4">Profile</h1>

        {/* Identity */}
        <Section title="Identity">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input label="Display name" value={u.displayName} onChange={(v)=>setU({...u, displayName:v})} />
            <Input label="Full name" value={u.name} onChange={(v)=>setU({...u, name:v})} />
            <Input label="Email" value={u.email} disabled hint="Email is managed by your admin." />
            <Input label="Phone" value={u.phone} onChange={(v)=>setU({...u, phone:v})} placeholder="+2547…" />
            <Select
              label="Default branch"
              value={u.branchId || ''}
              onChange={(v)=>setU({...u, branchId: v})}
              options={[{value:'',label:'—'}, ...branches.map(b=>({ value:String(b.id), label:b.name }))]}
            />
            <Select
              label="Time zone"
              value={u.timezone}
              onChange={(v)=>setU({...u, timezone:v})}
              options={TIMEZONES.map(t=>({ value:t, label:t }))}
            />
            <Input label="Locale" value={u.locale} onChange={(v)=>setU({...u, locale:v})} placeholder="en" />
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={saveProfile} loading={saving}>Save Changes</Button>
            <Button type="secondary" onClick={load}>Refresh</Button>
            <Button type="secondary" onClick={()=>navigate('/change-password')}>Change Password</Button>
            <Button type="secondary" onClick={()=>navigate('/2fa')}>Two-Factor</Button>
          </div>
        </Section>

        {/* Professional (read-only) */}
        <Section title="Professional">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input label="Job title" value={u.title} disabled />
            <Input label="Department" value={u.department} disabled />
            <Input label="Employee ID" value={u.employeeCode} disabled />
          </div>
        </Section>

        {/* Preferences */}
        <Section title="Preferences">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Select
              label="Default landing page"
              value={prefs.landingPage}
              onChange={(v)=>setPrefs({...prefs, landingPage:v})}
              options={LANDING_PAGES}
            />
            <Input
              label="Default currency"
              value={prefs.defaultCurrency}
              onChange={(v)=>setPrefs({...prefs, defaultCurrency:v.toUpperCase()})}
              placeholder="TZS"
            />
            <Select
              label="Date format"
              value={prefs.dateFormat}
              onChange={(v)=>setPrefs({...prefs, dateFormat:v})}
              options={[
                { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY' },
                { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY' },
              ]}
            />
            <Select
              label="Theme"
              value={prefs.theme}
              onChange={(v)=>setPrefs({...prefs, theme:v})}
              options={[
                { value:'system', label:'System' },
                { value:'light',  label:'Light' },
                { value:'dark',   label:'Dark' },
              ]}
            />
            <Select
              label="Font size"
              value={prefs.fontScale}
              onChange={(v)=>setPrefs({...prefs, fontScale:v})}
              options={[
                { value:'normal', label:'Normal' },
                { value:'large',  label:'Large' },
              ]}
            />
            <Toggle
              label="Reduced motion"
              checked={prefs.reduceMotion}
              onChange={(v)=>setPrefs({...prefs, reduceMotion:v})}
            />
            <Toggle
              label="Color-blind friendly palette"
              checked={prefs.colorBlindMode}
              onChange={(v)=>setPrefs({...prefs, colorBlindMode:v})}
            />
          </div>
          <div className="mt-3"><Button onClick={savePreferences} loading={saving}>Save Preferences</Button></div>
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Toggle label="In-app"   checked={!!notif.channels.inApp}  onChange={(v)=>setNotif({...notif, channels:{...notif.channels, inApp:v}})} />
            <Toggle label="Email"    checked={!!notif.channels.email}   onChange={(v)=>setNotif({...notif, channels:{...notif.channels, email:v}})} />
            <Toggle label="SMS/WhatsApp" checked={!!notif.channels.sms} onChange={(v)=>setNotif({...notif, channels:{...notif.channels, sms:v}})} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <Toggle label="New loan assigned to me" checked={!!notif.events.loanAssigned} onChange={(v)=>setNotif({...notif, events:{...notif.events, loanAssigned:v}})} />
            <Toggle label="Approval needed (maker–checker)" checked={!!notif.events.approvalNeeded} onChange={(v)=>setNotif({...notif, events:{...notif.events, approvalNeeded:v}})} />
            <div className="border rounded-lg p-3">
              <div className="font-medium text-sm">Large repayment</div>
              <div className="mt-2 flex items-center gap-2">
                <Toggle
                  label="Enabled"
                  checked={!!notif.events.largeRepayment?.enabled}
                  onChange={(v)=>setNotif({...notif, events:{...notif.events, largeRepayment:{ ...(notif.events.largeRepayment||{}), enabled:v }}})}
                />
                <Input
                  label="Threshold"
                  value={String(notif.events.largeRepayment?.threshold ?? 500000)}
                  onChange={(v)=>setNotif({...notif, events:{...notif.events, largeRepayment:{ ...(notif.events.largeRepayment||{}), threshold:Number(v)||0 }}})}
                />
              </div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="font-medium text-sm">Arrears digest</div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <Toggle
                  label="Enabled"
                  checked={!!notif.events.arrearsDigest?.enabled}
                  onChange={(v)=>setNotif({...notif, events:{...notif.events, arrearsDigest:{ ...(notif.events.arrearsDigest||{}), enabled:v }}})}
                />
                <Input
                  label="Days"
                  value={String(notif.events.arrearsDigest?.days ?? 7)}
                  onChange={(v)=>setNotif({...notif, events:{...notif.events, arrearsDigest:{ ...(notif.events.arrearsDigest||{}), days:Math.max(1, Number(v)||1) }}})}
                />
                <Input
                  label="Hour (24h)"
                  value={String(notif.events.arrearsDigest?.hour ?? 18)}
                  onChange={(v)=>setNotif({...notif, events:{...notif.events, arrearsDigest:{ ...(notif.events.arrearsDigest||{}), hour:Math.min(23, Math.max(0, Number(v)||0)) }}})}
                />
              </div>
            </div>
            <Toggle label="KYC item assigned to me" checked={!!notif.events.kycAssigned} onChange={(v)=>setNotif({...notif, events:{...notif.events, kycAssigned:v}})} />
          </div>
          <div className="mt-3"><Button onClick={saveNotifications} loading={saving}>Save Notifications</Button></div>
        </Section>

        {/* Security */}
        <Section title="Security">
          <div className="flex flex-wrap gap-2">
            <Button type="secondary" onClick={()=>navigate('/2fa')}>Manage Two-Factor</Button>
            <Button type="secondary" onClick={()=>navigate('/change-password')}>Change Password</Button>
          </div>

          <div className="mt-4">
            <div className="text-sm font-medium mb-2">Active sessions</div>
            {sessions.length === 0 ? (
              <div className="text-sm text-slate-500">Only this device is active.</div>
            ) : (
              <ul className="space-y-2">
                {sessions.map((s, i) => (
                  <li key={i} className="border rounded-lg p-2 text-sm flex justify-between">
                    <span>{s.device || 'Device'} • {s.ip || 'IP'} • {s.lastSeen ? new Date(s.lastSeen).toLocaleString() : ''}</span>
                    <span className="opacity-60">{s.userAgent || ''}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-2">
              <Button type="danger" onClick={revokeAll}>Sign out of other devices</Button>
            </div>
          </div>
        </Section>
      </div>

      {/* Right: avatar */}
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-4">
        <div className="text-sm font-medium mb-3">Avatar</div>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center text-lg font-bold">
            {u.avatarUrl ? (
              <img src={u.avatarUrl} alt="avatar" className="w-14 h-14 rounded-full object-cover" />
            ) : initials}
          </div>
          <div>
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer hover:bg-slate-50">
              <input type="file" className="hidden" accept="image/*" onChange={(e)=>uploadAvatar(e.target.files?.[0])} />
              Choose image
            </label>
            <div className="text-xs text-slate-500 mt-1">PNG/JPG up to 2MB.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- tiny UI atoms ----------------------------- */
function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-2">{title}</h2>
      {children}
    </div>
  );
}

function Input({ label, value, onChange, placeholder, disabled, hint }) {
  return (
    <label className="block">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <input
        className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e)=>onChange && onChange(e.target.value)}
        disabled={disabled}
      />
      {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <select
        className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800"
        value={value}
        onChange={(e)=>onChange && onChange(e.target.value)}
      >
        {(options || []).map(opt => (
          <option key={String(opt.value)} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" className="h-4 w-4" checked={!!checked} onChange={(e)=>onChange && onChange(e.target.checked)} />
      <span className="text-sm">{label}</span>
    </label>
  );
}

function Button({ children, onClick, type='primary', loading }) {
  const cls = type === 'secondary'
    ? 'border bg-white hover:bg-slate-50 text-slate-800'
    : type === 'danger'
      ? 'bg-rose-600 hover:bg-rose-700 text-white'
      : 'bg-blue-600 hover:bg-blue-700 text-white';
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${cls} disabled:opacity-60`}
    >
      {loading ? 'Saving…' : children}
    </button>
  );
}
