import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'react-toastify';

const Row = ({ title, desc, control }) => (
  <div className="flex items-center justify-between border rounded-xl p-3">
    <div>
      <p className="font-medium">{title}</p>
      {desc && <p className="text-sm text-muted-foreground">{desc}</p>}
    </div>
    {control}
  </div>
);

const TemplateBox = ({ label, name, value, onChange, variables }) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <Textarea name={name} rows={3} value={value || ''} onChange={onChange} />
    {variables?.length ? (
      <p className="text-xs text-muted-foreground">Variables: {variables.map(v => `{{${v}}}`).join(', ')}</p>
    ) : null}
  </div>
);

const BulkSmsSettings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [settings, setSettings] = useState({
    enabled: true,

    // Provider + credentials (mirrors Integration but scoped to Bulk SMS use)
    provider: 'generic', // generic|twilio|infobip|others
    apiKey: '',
    apiSecret: '',
    baseUrl: '',
    senderId: '',
    useUnicode: true,
    dlrCallbackUrl: '',

    // Defaults
    defaultCountryCode: '+255',
    dailyLimit: 5000,
    rateLimitPerMin: 120,

    // Quiet Hours (Do Not Disturb)
    dndEnabled: true,
    dndStartHHmm: '21:00',
    dndEndHHmm: '07:00',
    overrideDndForOTP: true,

    // Lists/Targeting
    optInRequired: true,
    stopKeyword: 'STOP',
    helpKeyword: 'HELP',

    // Templates
    templateOTP: 'Your OTP is {{code}}. It expires in {{minutes}} minutes.',
    templateRepaymentReminder:
      'Hi {{firstName}}, your repayment of {{amount}} {{currency}} is due on {{dueDate}}. Ref: {{loanRef}}.',
    templateOverdue:
      'Hi {{firstName}}, your loan {{loanRef}} is overdue by {{daysOverdue}} day(s). Outstanding: {{amount}} {{currency}}. Please pay to avoid penalties.',
    templateGeneral: 'Hello {{firstName}}, {{message}}',

    // Personalization
    footerEnabled: false,
    footerText: '— {{companyName}}',

    // Test
    testNumber: '',
  });

  const templateVars = useMemo(
    () => ({
      templateOTP: ['code', 'minutes'],
      templateRepaymentReminder: ['firstName', 'amount', 'currency', 'dueDate', 'loanRef'],
      templateOverdue: ['firstName', 'loanRef', 'daysOverdue', 'amount', 'currency'],
      templateGeneral: ['firstName', 'message'],
    }),
    []
  );

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setSettings((s) => ({ ...s, [name]: type === 'number' ? Number(value) : value }));
  };
  const setVal = (k) => (v) => setSettings((s) => ({ ...s, [k]: v }));

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/settings/bulk-sms');
      if (data) setSettings((s) => ({ ...s, ...data }));
    } catch {
      toast.error('Failed to load Bulk SMS settings');
    } finally {
      setLoading(false);
    }
  };

  const save = async (e) => {
    e?.preventDefault?.();
    setSaving(true);
    try {
      await axios.put('/api/settings/bulk-sms', settings);
      toast.success('Bulk SMS settings saved');
    } catch {
      toast.error('Failed to save Bulk SMS settings');
    } finally {
      setSaving(false);
    }
  };

  const testSend = async () => {
    if (!settings.testNumber) {
      return toast.error('Enter a test phone number');
    }
    setTesting(true);
    try {
      await axios.post('/api/settings/bulk-sms/test', {
        to: settings.testNumber,
        message: 'Test message from LMS Bulk SMS settings.',
      });
      toast.success('Test SMS sent');
    } catch {
      toast.error('Test SMS failed');
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Bulk SMS Settings</h2>
            <p className="text-sm text-muted-foreground">Configure provider, limits, templates, and quiet hours.</p>
          </div>
          <Button onClick={save} disabled={saving || loading}>
            {saving ? 'Saving…' : 'Save All'}
          </Button>
        </CardContent>
      </Card>

      {/* Provider */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Provider</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <Row
              title="Enable Bulk SMS"
              control={<Switch checked={!!settings.enabled} onCheckedChange={setVal('enabled')} />}
            />
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={settings.provider} onValueChange={setVal('provider')}>
                <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="generic">Generic</SelectItem>
                  <SelectItem value="twilio">Twilio</SelectItem>
                  <SelectItem value="infobip">Infobip</SelectItem>
                  <SelectItem value="others">Others</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sender ID</Label>
              <Input name="senderId" value={settings.senderId || ''} onChange={handleChange} placeholder="e.g. LMS" />
              <p className="text-xs text-muted-foreground">May require registration/approval.</p>
            </div>

            <div className="space-y-2">
              <Label>API Key</Label>
              <Input name="apiKey" value={settings.apiKey || ''} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>API Secret</Label>
              <Input type="password" name="apiSecret" value={settings.apiSecret || ''} onChange={handleChange} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Base URL</Label>
              <Input name="baseUrl" value={settings.baseUrl || ''} onChange={handleChange} placeholder="https://api.provider.com" />
            </div>

            <div className="space-y-2 md:col-span-1">
              <Label>DLR Callback URL</Label>
              <Input name="dlrCallbackUrl" value={settings.dlrCallbackUrl || ''} onChange={handleChange} placeholder="https://your-domain.tld/webhooks/sms/dlr" />
            </div>

            <Row
              title="Unicode Support"
              desc="Send Unicode (UTF-8) SMS, e.g., Swahili accents"
              control={<Switch checked={!!settings.useUnicode} onCheckedChange={setVal('useUnicode')} />}
            />
          </div>
        </CardContent>
      </Card>

      {/* Defaults & Limits */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Defaults & Limits</h3>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Default Country Code</Label>
              <Input name="defaultCountryCode" value={settings.defaultCountryCode || ''} onChange={handleChange} placeholder="+255" />
            </div>
            <div className="space-y-2">
              <Label>Daily Limit</Label>
              <Input type="number" min="0" name="dailyLimit" value={settings.dailyLimit ?? 0} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>Rate Limit (per min)</Label>
              <Input type="number" min="1" name="rateLimitPerMin" value={settings.rateLimitPerMin ?? 60} onChange={handleChange} />
            </div>
            <Row
              title="Opt-in Required"
              desc="Only send to contacts who consented"
              control={<Switch checked={!!settings.optInRequired} onCheckedChange={setVal('optInRequired')} />}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Quiet Hours (DND)</h3>
          <div className="grid md:grid-cols-4 gap-4">
            <Row
              title="Enable DND"
              desc="Block non-urgent SMS during quiet hours"
              control={<Switch checked={!!settings.dndEnabled} onCheckedChange={setVal('dndEnabled')} />}
            />
            <div className={`${settings.dndEnabled ? '' : 'opacity-60 pointer-events-none'} space-y-2`}>
              <Label>Start (HH:mm)</Label>
              <Input type="time" name="dndStartHHmm" value={settings.dndStartHHmm || '21:00'} onChange={handleChange} />
            </div>
            <div className={`${settings.dndEnabled ? '' : 'opacity-60 pointer-events-none'} space-y-2`}>
              <Label>End (HH:mm)</Label>
              <Input type="time" name="dndEndHHmm" value={settings.dndEndHHmm || '07:00'} onChange={handleChange} />
            </div>
            <Row
              title="Allow OTP During DND"
              control={<Switch checked={!!settings.overrideDndForOTP} onCheckedChange={setVal('overrideDndForOTP')} />}
            />
          </div>
        </CardContent>
      </Card>

      {/* Compliance */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Compliance</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>STOP Keyword</Label>
              <Input name="stopKeyword" value={settings.stopKeyword || ''} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>HELP Keyword</Label>
              <Input name="helpKeyword" value={settings.helpKeyword || ''} onChange={handleChange} />
            </div>
            <Row
              title="Footer on Messages"
              desc="Append a short signature/footer"
              control={<Switch checked={!!settings.footerEnabled} onCheckedChange={setVal('footerEnabled')} />}
            />
            <div className={`${settings.footerEnabled ? '' : 'opacity-60 pointer-events-none'} space-y-2 md:col-span-2`}>
              <Label>Footer Text</Label>
              <Input name="footerText" value={settings.footerText || ''} onChange={handleChange} placeholder="— {{companyName}}" />
              <p className="text-xs text-muted-foreground">Variables: {{'{{companyName}}'}}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Message Templates</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <TemplateBox
              label="OTP"
              name="templateOTP"
              value={settings.templateOTP}
              onChange={handleChange}
              variables={templateVars.templateOTP}
            />
            <TemplateBox
              label="Repayment Reminder"
              name="templateRepaymentReminder"
              value={settings.templateRepaymentReminder}
              onChange={handleChange}
              variables={templateVars.templateRepaymentReminder}
            />
            <TemplateBox
              label="Overdue Notice"
              name="templateOverdue"
              value={settings.templateOverdue}
              onChange={handleChange}
              variables={templateVars.templateOverdue}
            />
            <TemplateBox
              label="General"
              name="templateGeneral"
              value={settings.templateGeneral}
              onChange={handleChange}
              variables={templateVars.templateGeneral}
            />
          </div>
        </CardContent>
      </Card>

      {/* Test */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Send Test SMS</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Test Number</Label>
              <Input name="testNumber" value={settings.testNumber || ''} onChange={handleChange} placeholder="+2557XXXXXXX" />
            </div>
            <div className="flex items-end">
              <Button onClick={testSend} disabled={testing || !settings.enabled}>
                {testing ? 'Sending…' : 'Send Test'}
              </Button>
            </div>
          </div>
          <div className="pt-2">
            <Button onClick={save} disabled={saving || loading}>
              {saving ? 'Saving…' : 'Save All Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkSmsSettings;
