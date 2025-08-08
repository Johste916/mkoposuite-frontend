import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'react-toastify';

const Section = ({ title, subtitle, children }) => (
  <Card>
    <CardContent className="p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="grid md:grid-cols-2 gap-4">{children}</div>
    </CardContent>
  </Card>
);

const SystemSettings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fileRef = useRef(null);
  const [logoPreview, setLogoPreview] = useState(null);

  const [settings, setSettings] = useState({
    // Organization
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    companyAddress: '',

    // Locale
    baseCurrency: 'TZS',
    locale: 'en-TZ',
    timezone: 'Africa/Dar_es_Salaam',
    dateFormat: 'YYYY-MM-DD',
    numberFormat: '1,234.56', // or '1.234,56'
    financialYearStartMonth: 7, // 1-12

    // Branding
    brandLogoUrl: '',

    // Notifications
    emailNotifications: true,
    smsNotifications: true,
    dueDateReminders: true,
    lowBalanceAlerts: false,

    // Security
    sessionTimeoutMinutes: 30,
    enforce2FA: false,

    // Backups
    autoBackupEnabled: true,
    backupFrequency: 'daily', // daily|weekly
    backupTimeHHmm: '02:00',
    retentionDays: 30,
  });

  const currencies = ['TZS', 'USD', 'KES', 'UGX', 'ZMW'];
  const locales = ['en-TZ', 'sw-TZ', 'en-KE', 'en-UG'];
  const timezones = [
    'Africa/Dar_es_Salaam',
    'Africa/Nairobi',
    'Africa/Kampala',
    'UTC',
  ];
  const dateFormats = ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'];
  const numberFormats = ['1,234.56', '1.234,56'];

  const fyLabel = useMemo(() => {
    const m = Number(settings.financialYearStartMonth);
    const d = new Date(2000, m - 1, 1).toLocaleString('en', { month: 'long' });
    return d || 'Month';
  }, [settings.financialYearStartMonth]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setSettings((s) => ({ ...s, [name]: type === 'number' ? Number(value) : value }));
  };

  const setVal = (key) => (v) => setSettings((s) => ({ ...s, [key]: v }));

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/settings/system');
      if (data) {
        setSettings((prev) => ({ ...prev, ...data }));
        setLogoPreview(data.brandLogoUrl || null);
      }
    } catch (e) {
      toast.error('Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (e) => {
    e?.preventDefault?.();
    setSaving(true);
    try {
      await axios.put('/api/settings/system', settings);
      toast.success('System settings saved');
    } catch (e) {
      toast.error('Failed to save system settings');
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please select an image file');
    if (file.size > 2 * 1024 * 1024) return toast.error('Max size is 2MB');

    const form = new FormData();
    form.append('file', file);

    try {
      const { data } = await axios.post('/api/settings/system/brand-logo', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // Expect { url: 'https://...' }
      setSettings((s) => ({ ...s, brandLogoUrl: data.url }));
      setLogoPreview(data.url);
      toast.success('Logo updated');
    } catch (e) {
      toast.error('Logo upload failed');
    } finally {
      fileRef.current && (fileRef.current.value = '');
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">System Settings</h2>
            <p className="text-sm text-muted-foreground">Organization, locale, branding, notifications, security, and backups.</p>
          </div>
          <Button onClick={saveSettings} disabled={saving || loading}>
            {saving ? 'Saving…' : 'Save All'}
          </Button>
        </CardContent>
      </Card>

      {/* Organization */}
      <Section title="Organization" subtitle="Basic company information shown on invoices, statements, and reports.">
        <div className="space-y-2">
          <Label>Company Name</Label>
          <Input name="companyName" value={settings.companyName || ''} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" name="companyEmail" value={settings.companyEmail || ''} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input name="companyPhone" value={settings.companyPhone || ''} onChange={handleChange} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Address</Label>
          <Textarea name="companyAddress" value={settings.companyAddress || ''} onChange={handleChange} rows={3} />
        </div>
      </Section>

      {/* Locale */}
      <Section title="Locale" subtitle="Regional preferences for formatting and reporting.">
        <div className="space-y-2">
          <Label>Base Currency</Label>
          <Select value={settings.baseCurrency} onValueChange={setVal('baseCurrency')}>
            <SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger>
            <SelectContent>
              {currencies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Locale</Label>
          <Select value={settings.locale} onValueChange={setVal('locale')}>
            <SelectTrigger><SelectValue placeholder="Select locale" /></SelectTrigger>
            <SelectContent>
              {locales.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Timezone</Label>
          <Select value={settings.timezone} onValueChange={setVal('timezone')}>
            <SelectTrigger><SelectValue placeholder="Select timezone" /></SelectTrigger>
            <SelectContent>
              {timezones.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Date Format</Label>
          <Select value={settings.dateFormat} onValueChange={setVal('dateFormat')}>
            <SelectTrigger><SelectValue placeholder="Select date format" /></SelectTrigger>
            <SelectContent>
              {dateFormats.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Number Format</Label>
          <Select value={settings.numberFormat} onValueChange={setVal('numberFormat')}>
            <SelectTrigger><SelectValue placeholder="Select number format" /></SelectTrigger>
            <SelectContent>
              {numberFormats.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Financial Year Start (Month)</Label>
          <Input
            type="number"
            min="1"
            max="12"
            name="financialYearStartMonth"
            value={settings.financialYearStartMonth ?? 1}
            onChange={handleChange}
          />
          <p className="text-xs text-muted-foreground">Current: {fyLabel}</p>
        </div>
      </Section>

      {/* Branding */}
      <Section title="Branding" subtitle="Logo used on the app header and exported documents.">
        <div className="space-y-2">
          <Label>Brand Logo</Label>
          <div className="flex items-center gap-4">
            <Input type="file" accept="image/*" ref={fileRef} onChange={(e) => uploadLogo(e.target.files?.[0])} />
            <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}>Upload</Button>
          </div>
          {logoPreview && (
            <div className="mt-2">
              <img src={logoPreview} alt="Brand Logo" className="h-14 w-auto rounded-md border" />
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label>Logo URL (read-only)</Label>
          <Input value={settings.brandLogoUrl || ''} readOnly />
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Notifications" subtitle="Enable/disable system notifications.">
        <div className="flex items-center justify-between border rounded-xl p-3">
          <div>
            <Label className="font-medium">Email Notifications</Label>
            <p className="text-sm text-muted-foreground">Send system emails to users and borrowers</p>
          </div>
          <Switch checked={!!settings.emailNotifications} onCheckedChange={(v) => setVal('emailNotifications')(v)} />
        </div>

        <div className="flex items-center justify-between border rounded-xl p-3">
          <div>
            <Label className="font-medium">SMS Notifications</Label>
            <p className="text-sm text-muted-foreground">Send SMS alerts via configured gateway</p>
          </div>
          <Switch checked={!!settings.smsNotifications} onCheckedChange={(v) => setVal('smsNotifications')(v)} />
        </div>

        <div className="flex items-center justify-between border rounded-xl p-3">
          <div>
            <Label className="font-medium">Due Date Reminders</Label>
            <p className="text-sm text-muted-foreground">Notify borrowers before and on due dates</p>
          </div>
          <Switch checked={!!settings.dueDateReminders} onCheckedChange={(v) => setVal('dueDateReminders')(v)} />
        </div>

        <div className="flex items-center justify-between border rounded-xl p-3">
          <div>
            <Label className="font-medium">Low Balance Alerts</Label>
            <p className="text-sm text-muted-foreground">Alert when operational balance is low</p>
          </div>
          <Switch checked={!!settings.lowBalanceAlerts} onCheckedChange={(v) => setVal('lowBalanceAlerts')(v)} />
        </div>
      </Section>

      {/* Security */}
      <Section title="Security" subtitle="Session and authentication controls.">
        <div className="space-y-2">
          <Label>Session Timeout (minutes)</Label>
          <Input
            type="number"
            min="5"
            name="sessionTimeoutMinutes"
            value={settings.sessionTimeoutMinutes ?? 30}
            onChange={handleChange}
          />
        </div>
        <div className="flex items-center justify-between border rounded-xl p-3">
          <div>
            <Label className="font-medium">Enforce 2FA</Label>
            <p className="text-sm text-muted-foreground">Require two-factor authentication for all users</p>
          </div>
          <Switch checked={!!settings.enforce2FA} onCheckedChange={(v) => setVal('enforce2FA')(v)} />
        </div>
      </Section>

      {/* Backups */}
      <Section title="Backups" subtitle="Automated backups and retention.">
        <div className="flex items-center justify-between border rounded-xl p-3">
          <div>
            <Label className="font-medium">Enable Auto Backups</Label>
            <p className="text-sm text-muted-foreground">Create automatic database backups</p>
          </div>
          <Switch checked={!!settings.autoBackupEnabled} onCheckedChange={(v) => setVal('autoBackupEnabled')(v)} />
        </div>

        <div className={`${settings.autoBackupEnabled ? '' : 'opacity-60 pointer-events-none'} space-y-2`}>
          <Label>Backup Frequency</Label>
          <Select value={settings.backupFrequency} onValueChange={setVal('backupFrequency')}>
            <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className={`${settings.autoBackupEnabled ? '' : 'opacity-60 pointer-events-none'} space-y-2`}>
          <Label>Backup Time (HH:mm)</Label>
          <Input
            type="time"
            name="backupTimeHHmm"
            value={settings.backupTimeHHmm || '02:00'}
            onChange={handleChange}
          />
        </div>

        <div className={`${settings.autoBackupEnabled ? '' : 'opacity-60 pointer-events-none'} space-y-2`}>
          <Label>Retention (days)</Label>
          <Input
            type="number"
            min="1"
            name="retentionDays"
            value={settings.retentionDays ?? 30}
            onChange={handleChange}
          />
        </div>
      </Section>

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving || loading}>
          {saving ? 'Saving…' : 'Save All Changes'}
        </Button>
      </div>
    </div>
  );
};

export default SystemSettings;
