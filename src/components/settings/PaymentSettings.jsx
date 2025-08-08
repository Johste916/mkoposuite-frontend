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

const Row = ({ title, desc, control }) => (
  <div className="flex items-center justify-between border rounded-xl p-3">
    <div>
      <p className="font-medium">{title}</p>
      {desc && <p className="text-sm text-muted-foreground">{desc}</p>}
    </div>
    {control}
  </div>
);

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

const PaymentSettings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    enabled: true,
    environment: 'sandbox', // sandbox | production

    // Providers / rails
    defaultProvider: 'clickpesa', // clickpesa|mpesa|tigo|airtel|bank
    allowedRails: ['mobile_money', 'bank_transfer'], // mobile_money|bank_transfer|card

    // Credentials (scoped here for payments module)
    apiKey: '',
    apiSecret: '',
    webhookSecret: '',
    callbackBaseUrl: '',

    // Disbursement
    disbursementsEnabled: true,
    disbursementRail: 'mobile_money', // mobile_money|bank_transfer
    settlementAccountName: '',
    settlementAccountNumber: '',
    settlementBankCode: '',

    // Collections
    collectionsEnabled: true,
    paymentRefPrefix: 'LMS',
    allowPartialPayments: true,
    minPaymentAmount: 0,

    // Allocation rules
    allocationRule: 'oldest_due_first', // oldest_due_first|principal_first|interest_first|fees_first|custom
    customAllocationOrder: 'penalties,interest,fees,principal', // used when allocationRule=custom

    // Fees
    passThroughGatewayFees: true,
    convenienceFeeEnabled: false,
    convenienceFeeType: 'flat', // flat|percent
    convenienceFeeValue: 0,

    // Reconciliation
    autoReconcile: true,
    reconcileWindowHours: 24,

    // Receipts
    autoIssueReceipt: true,
    receiptFooter: 'Thank you for your payment.',

    // Risk & Limits
    perTxnLimit: 2000000,
    dailyTxnLimit: 5000000,

    // Test
    testPhone: '',
    testAmount: 1000,
  });

  const setVal = (k) => (v) => setSettings((s) => ({ ...s, [k]: v }));
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setSettings((s) => ({ ...s, [name]: type === 'number' ? Number(value) : value }));
  };

  const webhookExamples = useMemo(() => {
    const base = settings.callbackBaseUrl?.replace(/\/+$/, '') || 'https://your-domain.tld/webhooks';
    return {
      payments: `${base}/payments`,
      disbursements: `${base}/disbursements`,
    };
  }, [settings.callbackBaseUrl]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/settings/payment');
      if (data) setSettings((s) => ({ ...s, ...data }));
    } catch {
      toast.error('Failed to load payment settings');
    } finally {
      setLoading(false);
    }
  };

  const save = async (e) => {
    e?.preventDefault?.();
    setSaving(true);
    try {
      await axios.put('/api/settings/payment', settings);
      toast.success('Payment settings saved');
    } catch {
      toast.error('Failed to save payment settings');
    } finally {
      setSaving(false);
    }
  };

  const testCollection = async () => {
    if (!settings.testPhone || !settings.testAmount) return toast.error('Enter test phone and amount');
    try {
      await axios.post('/api/settings/payment/test/collect', {
        phone: settings.testPhone,
        amount: Number(settings.testAmount),
      });
      toast.success('Test collection initiated');
    } catch {
      toast.error('Test collection failed');
    }
  };

  const testDisbursement = async () => {
    if (!settings.testPhone || !settings.testAmount) return toast.error('Enter test phone and amount');
    try {
      await axios.post('/api/settings/payment/test/disburse', {
        phone: settings.testPhone,
        amount: Number(settings.testAmount),
      });
      toast.success('Test disbursement initiated');
    } catch {
      toast.error('Test disbursement failed');
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Payment Settings</h2>
            <p className="text-sm text-muted-foreground">Configure collections, disbursements, allocation, fees, and reconciliation.</p>
          </div>
          <Button onClick={save} disabled={saving || loading}>
            {saving ? 'Saving…' : 'Save All'}
          </Button>
        </CardContent>
      </Card>

      <Section title="General" subtitle="Toggle payments and environment.">
        <Row
          title="Enable Payments"
          control={<Switch checked={!!settings.enabled} onCheckedChange={setVal('enabled')} />}
        />
        <div className="space-y-2">
          <Label>Environment</Label>
          <Select value={settings.environment} onValueChange={setVal('environment')}>
            <SelectTrigger><SelectValue placeholder="Select environment" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sandbox">Sandbox</SelectItem>
              <SelectItem value="production">Production</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Default Provider</Label>
          <Select value={settings.defaultProvider} onValueChange={setVal('defaultProvider')}>
            <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="clickpesa">ClickPesa</SelectItem>
              <SelectItem value="mpesa">M-Pesa</SelectItem>
              <SelectItem value="tigo">Tigo Pesa</SelectItem>
              <SelectItem value="airtel">Airtel Money</SelectItem>
              <SelectItem value="bank">Bank Transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Allowed Rails</Label>
          <Select
            value={settings.allowedRails?.[0] || 'mobile_money'}
            onValueChange={(v) => setVal('allowedRails')([v])}
          >
            <SelectTrigger><SelectValue placeholder="Select rail" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mobile_money">Mobile Money</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              <SelectItem value="card">Card</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Multiple rails can be supported; UI sets one for now.</p>
        </div>
      </Section>

      <Section title="Credentials & Webhooks" subtitle="Used to authenticate with the payment provider and receive events.">
        <div className="space-y-2">
          <Label>API Key</Label>
          <Input name="apiKey" value={settings.apiKey || ''} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label>API Secret</Label>
          <Input type="password" name="apiSecret" value={settings.apiSecret || ''} onChange={handleChange} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Callback Base URL</Label>
          <Input
            name="callbackBaseUrl"
            value={settings.callbackBaseUrl || ''}
            onChange={handleChange}
            placeholder="https://your-domain.tld/webhooks"
          />
          <p className="text-xs text-muted-foreground">
            Payments: <span className="font-mono">{webhookExamples.payments}</span> | Disbursements: <span className="font-mono">{webhookExamples.disbursements}</span>
          </p>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Webhook Secret</Label>
          <Input type="password" name="webhookSecret" value={settings.webhookSecret || ''} onChange={handleChange} />
        </div>
      </Section>

      <Section title="Collections" subtitle="Payment collection preferences.">
        <Row
          title="Enable Collections"
          control={<Switch checked={!!settings.collectionsEnabled} onCheckedChange={setVal('collectionsEnabled')} />}
        />
        <div className="space-y-2">
          <Label>Reference Prefix</Label>
          <Input name="paymentRefPrefix" value={settings.paymentRefPrefix || ''} onChange={handleChange} />
        </div>
        <Row
          title="Allow Partial Payments"
          control={<Switch checked={!!settings.allowPartialPayments} onCheckedChange={setVal('allowPartialPayments')} />}
        />
        <div className="space-y-2">
          <Label>Minimum Payment Amount</Label>
          <Input type="number" min="0" name="minPaymentAmount" value={settings.minPaymentAmount ?? 0} onChange={handleChange} />
        </div>
      </Section>

      <Section title="Disbursements" subtitle="Outward payments to borrowers or bank accounts.">
        <Row
          title="Enable Disbursements"
          control={<Switch checked={!!settings.disbursementsEnabled} onCheckedChange={setVal('disbursementsEnabled')} />}
        />
        <div className="space-y-2">
          <Label>Disbursement Rail</Label>
          <Select value={settings.disbursementRail} onValueChange={setVal('disbursementRail')}>
            <SelectTrigger><SelectValue placeholder="Select rail" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mobile_money">Mobile Money</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Settlement Account Name</Label>
          <Input name="settlementAccountName" value={settings.settlementAccountName || ''} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label>Settlement Account Number</Label>
          <Input name="settlementAccountNumber" value={settings.settlementAccountNumber || ''} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label>Bank Code (if bank transfer)</Label>
          <Input name="settlementBankCode" value={settings.settlementBankCode || ''} onChange={handleChange} />
        </div>
      </Section>

      <Section title="Allocation Rules" subtitle="How incoming payments are split across components.">
        <div className="space-y-2">
          <Label>Allocation Strategy</Label>
          <Select value={settings.allocationRule} onValueChange={setVal('allocationRule')}>
            <SelectTrigger><SelectValue placeholder="Select rule" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="oldest_due_first">Oldest Due First</SelectItem>
              <SelectItem value="principal_first">Principal First</SelectItem>
              <SelectItem value="interest_first">Interest First</SelectItem>
              <SelectItem value="fees_first">Fees First</SelectItem>
              <SelectItem value="custom">Custom Order</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className={`${settings.allocationRule === 'custom' ? '' : 'opacity-60 pointer-events-none'} space-y-2 md:col-span-1`}>
          <Label>Custom Allocation Order</Label>
          <Input
            name="customAllocationOrder"
            value={settings.customAllocationOrder || ''}
            onChange={handleChange}
            placeholder="penalties,interest,fees,principal"
          />
          <p className="text-xs text-muted-foreground">Comma-separated components.</p>
        </div>
      </Section>

      <Section title="Fees" subtitle="Configure who pays gateway/convenience fees.">
        <Row
          title="Pass Through Gateway Fees"
          desc="Add provider fees on top of customer payment"
          control={<Switch checked={!!settings.passThroughGatewayFees} onCheckedChange={setVal('passThroughGatewayFees')} />}
        />
        <Row
          title="Enable Convenience Fee"
          control={<Switch checked={!!settings.convenienceFeeEnabled} onCheckedChange={setVal('convenienceFeeEnabled')} />}
        />
        <div className={`${settings.convenienceFeeEnabled ? '' : 'opacity-60 pointer-events-none'} space-y-2`}>
          <Label>Convenience Fee Type</Label>
          <Select value={settings.convenienceFeeType} onValueChange={setVal('convenienceFeeType')}>
            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="flat">Flat</SelectItem>
              <SelectItem value="percent">Percent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className={`${settings.convenienceFeeEnabled ? '' : 'opacity-60 pointer-events-none'} space-y-2`}>
          <Label>Convenience Fee Value</Label>
          <Input type="number" min="0" step="0.01" name="convenienceFeeValue" value={settings.convenienceFeeValue ?? 0} onChange={handleChange} />
        </div>
      </Section>

      <Section title="Reconciliation & Receipts" subtitle="Match payments and send receipts automatically.">
        <Row
          title="Auto Reconcile"
          desc="Match provider webhooks to payments"
          control={<Switch checked={!!settings.autoReconcile} onCheckedChange={setVal('autoReconcile')} />}
        />
        <div className="space-y-2">
          <Label>Reconcile Window (hours)</Label>
          <Input type="number" min="1" name="reconcileWindowHours" value={settings.reconcileWindowHours ?? 24} onChange={handleChange} />
        </div>
        <Row
          title="Auto Issue Receipt"
          control={<Switch checked={!!settings.autoIssueReceipt} onCheckedChange={setVal('autoIssueReceipt')} />}
        />
        <div className="space-y-2 md:col-span-2">
          <Label>Receipt Footer</Label>
          <Textarea name="receiptFooter" rows={3} value={settings.receiptFooter || ''} onChange={handleChange} />
        </div>
      </Section>

      <Section title="Risk & Limits" subtitle="Basic limits to reduce fraud or mistakes.">
        <div className="space-y-2">
          <Label>Per-Transaction Limit</Label>
          <Input type="number" min="0" name="perTxnLimit" value={settings.perTxnLimit ?? 0} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label>Daily Limit</Label>
          <Input type="number" min="0" name="dailyTxnLimit" value={settings.dailyTxnLimit ?? 0} onChange={handleChange} />
        </div>
      </Section>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Run Tests</h3>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Test Phone</Label>
              <Input name="testPhone" value={settings.testPhone || ''} onChange={handleChange} placeholder="+2557XXXXXXX" />
            </div>
            <div className="space-y-2">
              <Label>Test Amount</Label>
              <Input type="number" min="100" step="1" name="testAmount" value={settings.testAmount ?? 1000} onChange={handleChange} />
            </div>
            <div className="flex items-end">
              <Button onClick={testCollection} disabled={!settings.enabled || !settings.collectionsEnabled}>Test Collection</Button>
            </div>
            <div className="flex items-end">
              <Button variant="secondary" onClick={testDisbursement} disabled={!settings.enabled || !settings.disbursementsEnabled}>Test Disbursement</Button>
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

export default PaymentSettings;
