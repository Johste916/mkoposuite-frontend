import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'react-toastify';

const SecretInput = ({ label, name, value, onChange, disabled }) => {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          type={revealed ? 'text' : 'password'}
          name={name}
          value={value || ''}
          onChange={onChange}
          disabled={disabled}
          placeholder={revealed ? '••••••' : '••••••'}
        />
        <Button type="button" variant="secondary" onClick={() => setRevealed((v) => !v)}>
          {revealed ? 'Hide' : 'Show'}
        </Button>
      </div>
    </div>
  );
};

const IntegrationCard = ({ title, description, enabled, onToggle, children, actions }) => (
  <Card>
    <CardContent className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Label>Enabled</Label>
          <Switch checked={enabled} onCheckedChange={onToggle} />
        </div>
      </div>
      <div className={`grid md:grid-cols-2 gap-4 ${!enabled ? 'opacity-60 pointer-events-none' : ''}`}>
        {children}
      </div>
      {actions && <div className="pt-2 flex flex-wrap gap-2">{actions}</div>}
    </CardContent>
  </Card>
);

const IntegrationSettings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    // Global
    environment: 'sandbox', // 'sandbox' | 'production'
    webhookBaseUrl: '',

    // QuickBooks
    quickbooksEnabled: false,
    quickbooksClientId: '',
    quickbooksClientSecret: '',
    quickbooksRealmId: '',
    quickbooksRedirectUri: '',
    quickbooksWebhookSecret: '',

    // ClickPesa / Payment Gateway (example)
    paymentEnabled: false,
    paymentProvider: 'clickpesa', // future-proof
    paymentApiKey: '',
    paymentApiSecret: '',
    paymentWebhookSecret: '',
    paymentCallbackUrl: '',

    // SMS Gateway
    smsEnabled: false,
    smsProvider: 'generic',
    smsApiKey: '',
    smsApiSecret: '',
    smsSenderId: '',

    // NIDA Gateway (ID verification)
    nidaEnabled: false,
    nidaApiKey: '',
    nidaApiSecret: '',
    nidaEndpoint: '',

    // Developer Keys / Open APIs
    apiEnabled: false,
    apiPublicKey: '',
    apiSecretKey: '',
    apiRateLimitPerMin: 60,

    // Provisioning
    provisioningEnabled: false,
    provisioningNotes: '',
  });

  const webhookExamples = useMemo(() => {
    const base = settings.webhookBaseUrl?.replace(/\/+$/, '') || 'https://your-domain.tld/webhooks';
    return {
      quickbooks: `${base}/quickbooks`,
      payments: `${base}/payments`,
    };
  }, [settings.webhookBaseUrl]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/settings/integration');
      if (data) setSettings((prev) => ({ ...prev, ...data }));
    } catch {
      toast.error('Failed to load integration settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setSettings((s) => ({ ...s, [name]: type === 'number' ? Number(value) : value }));
  };

  const handleToggle = (key) => (v) => setSettings((s) => ({ ...s, [key]: v }));

  const saveAll = async (e) => {
    e?.preventDefault?.();
    setSaving(true);
    try {
      await axios.put('/api/settings/integration', settings);
      toast.success('Integration settings saved');
    } catch {
      toast.error('Failed to save integration settings');
    } finally {
      setSaving(false);
    }
  };

  // Test helpers
  const testConnection = async (path, msg) => {
    try {
      await axios.post(`/api/settings/integration/test/${path}`);
      toast.success(`${msg} connection OK`);
    } catch (e) {
      toast.error(`${msg} test failed`);
    }
  };

  const rotateKeys = async (path, msg) => {
    try {
      const { data } = await axios.post(`/api/settings/integration/rotate/${path}`);
      setSettings((s) => ({ ...s, ...data })); // expects API to return new keys
      toast.success(`${msg} keys rotated`);
    } catch {
      toast.error(`Failed to rotate ${msg} keys`);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Integration Settings</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Environment</Label>
              <Select
                value={settings.environment}
                onValueChange={(v) => setSettings((s) => ({ ...s, environment: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select environment" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Webhook Base URL</Label>
              <Input
                name="webhookBaseUrl"
                value={settings.webhookBaseUrl || ''}
                onChange={handleChange}
                placeholder="https://your-domain.tld/webhooks"
              />
              <p className="text-xs text-muted-foreground">
                QuickBooks: <span className="font-mono">{webhookExamples.quickbooks}</span> | Payments: <span className="font-mono">{webhookExamples.payments}</span>
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Button onClick={saveAll} disabled={saving || loading}>
              {saving ? 'Saving…' : 'Save All'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* QuickBooks */}
      <IntegrationCard
        title="QuickBooks"
        description="Link LMS with QuickBooks for chart of accounts, journal sync, and reconciliations."
        enabled={settings.quickbooksEnabled}
        onToggle={handleToggle('quickbooksEnabled')}
        actions={[
          <Button key="test" variant="outline" onClick={() => testConnection('quickbooks', 'QuickBooks')} disabled={!settings.quickbooksEnabled}>Test Connection</Button>,
          <Button key="save" onClick={saveAll} disabled={!settings.quickbooksEnabled || saving}>Save</Button>,
        ]}
      >
        <div className="space-y-2">
          <Label>Client ID</Label>
          <Input name="quickbooksClientId" value={settings.quickbooksClientId || ''} onChange={handleChange} />
        </div>
        <SecretInput label="Client Secret" name="quickbooksClientSecret" value={settings.quickbooksClientSecret || ''} onChange={handleChange} />
        <div className="space-y-2">
          <Label>Realm ID</Label>
          <Input name="quickbooksRealmId" value={settings.quickbooksRealmId || ''} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label>Redirect URI</Label>
          <Input name="quickbooksRedirectUri" value={settings.quickbooksRedirectUri || ''} onChange={handleChange} />
        </div>
        <SecretInput label="Webhook Secret" name="quickbooksWebhookSecret" value={settings.quickbooksWebhookSecret || ''} onChange={handleChange} />
      </IntegrationCard>

      {/* Payment Gateway */}
      <IntegrationCard
        title="Payment Gateway (ClickPesa)"
        description="Automate disbursements and collections."
        enabled={settings.paymentEnabled}
        onToggle={handleToggle('paymentEnabled')}
        actions={[
          <Button key="test" variant="outline" onClick={() => testConnection('payments', 'Payment gateway')} disabled={!settings.paymentEnabled}>Test Connection</Button>,
          <Button key="rotate" variant="secondary" onClick={() => rotateKeys('payments', 'Payment')} disabled={!settings.paymentEnabled}>Rotate Keys</Button>,
          <Button key="save" onClick={saveAll} disabled={!settings.paymentEnabled || saving}>Save</Button>,
        ]}
      >
        <div className="space-y-2">
          <Label>Provider</Label>
          <Select
            value={settings.paymentProvider}
            onValueChange={(v) => setSettings((s) => ({ ...s, paymentProvider: v }))}
          >
            <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="clickpesa">ClickPesa</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <SecretInput label="API Key" name="paymentApiKey" value={settings.paymentApiKey || ''} onChange={handleChange} />
        <SecretInput label="API Secret" name="paymentApiSecret" value={settings.paymentApiSecret || ''} onChange={handleChange} />
        <SecretInput label="Webhook Secret" name="paymentWebhookSecret" value={settings.paymentWebhookSecret || ''} onChange={handleChange} />
        <div className="space-y-2">
          <Label>Callback URL</Label>
          <Input name="paymentCallbackUrl" value={settings.paymentCallbackUrl || ''} onChange={handleChange} placeholder={webhookExamples.payments} />
        </div>
      </IntegrationCard>

      {/* SMS Gateway */}
      <IntegrationCard
        title="SMS Gateway"
        description="Send OTPs and borrower notifications."
        enabled={settings.smsEnabled}
        onToggle={handleToggle('smsEnabled')}
        actions={[
          <Button key="test" variant="outline" onClick={() => testConnection('sms', 'SMS gateway')} disabled={!settings.smsEnabled}>Test Connection</Button>,
          <Button key="save" onClick={saveAll} disabled={!settings.smsEnabled || saving}>Save</Button>,
        ]}
      >
        <div className="space-y-2">
          <Label>Provider</Label>
          <Select
            value={settings.smsProvider}
            onValueChange={(v) => setSettings((s) => ({ ...s, smsProvider: v }))}
          >
            <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="generic">Generic</SelectItem>
              <SelectItem value="twilio">Twilio</SelectItem>
              <SelectItem value="infobip">Infobip</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <SecretInput label="API Key" name="smsApiKey" value={settings.smsApiKey || ''} onChange={handleChange} />
        <SecretInput label="API Secret" name="smsApiSecret" value={settings.smsApiSecret || ''} onChange={handleChange} />
        <div className="space-y-2">
          <Label>Sender ID</Label>
          <Input name="smsSenderId" value={settings.smsSenderId || ''} onChange={handleChange} />
        </div>
      </IntegrationCard>

      {/* NIDA Gateway */}
      <IntegrationCard
        title="NIDA Gateway"
        description="National ID verification for KYC."
        enabled={settings.nidaEnabled}
        onToggle={handleToggle('nidaEnabled')}
        actions={[
          <Button key="test" variant="outline" onClick={() => testConnection('nida', 'NIDA')} disabled={!settings.nidaEnabled}>Test Connection</Button>,
          <Button key="save" onClick={saveAll} disabled={!settings.nidaEnabled || saving}>Save</Button>,
        ]}
      >
        <SecretInput label="API Key" name="nidaApiKey" value={settings.nidaApiKey || ''} onChange={handleChange} />
        <SecretInput label="API Secret" name="nidaApiSecret" value={settings.nidaApiSecret || ''} onChange={handleChange} />
        <div className="space-y-2">
          <Label>Endpoint</Label>
          <Input name="nidaEndpoint" value={settings.nidaEndpoint || ''} onChange={handleChange} placeholder="https://api.nida.go.tz/v1/verify" />
        </div>
      </IntegrationCard>

      {/* Developer Keys / Open APIs */}
      <IntegrationCard
        title="Developer Keys & Open API"
        description="Enable external integrations with secure keys and rate limiting."
        enabled={settings.apiEnabled}
        onToggle={handleToggle('apiEnabled')}
        actions={[
          <Button key="rotate" variant="secondary" onClick={() => rotateKeys('api', 'API')} disabled={!settings.apiEnabled}>Rotate Keys</Button>,
          <Button key="save" onClick={saveAll} disabled={!settings.apiEnabled || saving}>Save</Button>,
        ]}
      >
        <div className="space-y-2">
          <Label>Rate Limit (requests/min)</Label>
          <Input type="number" min="1" name="apiRateLimitPerMin" value={settings.apiRateLimitPerMin ?? 60} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label>Public Key</Label>
          <Textarea name="apiPublicKey" value={settings.apiPublicKey || ''} onChange={handleChange} rows={4} />
        </div>
        <SecretInput label="Secret Key" name="apiSecretKey" value={settings.apiSecretKey || ''} onChange={handleChange} />
      </IntegrationCard>

      {/* Provisioning */}
      <IntegrationCard
        title="Provisioning"
        description="Service-level configurations and activation notes."
        enabled={settings.provisioningEnabled}
        onToggle={handleToggle('provisioningEnabled')}
        actions={[<Button key="save" onClick={saveAll} disabled={!settings.provisioningEnabled || saving}>Save</Button>]}
      >
        <div className="md:col-span-2 space-y-2">
          <Label>Notes</Label>
          <Textarea name="provisioningNotes" value={settings.provisioningNotes || ''} onChange={handleChange} rows={4} />
        </div>
      </IntegrationCard>

      <div className="flex justify-end">
        <Button onClick={saveAll} disabled={saving || loading}>
          {saving ? 'Saving…' : 'Save All Changes'}
        </Button>
      </div>
    </div>
  );
};

export default IntegrationSettings;
