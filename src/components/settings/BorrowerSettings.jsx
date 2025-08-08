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

const BorrowerSettings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);

  const [settings, setSettings] = useState({
    enabled: true,

    // KYC & Identity
    kycLevel: 'standard', // light|standard|enhanced
    requireNationalId: true,
    allowedIdTypes: 'NIDA, Passport, VoterID, DrivingLicense',
    minAge: 18,
    maxAge: 75,
    nidaAutoVerify: false,
    nidaFailPolicy: 'allow_with_flag', // block|allow_with_flag

    // Contacts & Consents
    requirePrimaryPhone: true,
    requireEmail: false,
    consentStatement: 'I consent to data processing and credit checks.',
    consentRequired: true,
    allowMarketingComms: false,

    // Addressing
    requirePhysicalAddress: true,
    requireRegionDistrict: true,

    // Duplicate & Fraud checks
    duplicateCheckFields: 'nationalId, phone',
    blockIfDuplicate: true,
    watchlistEnabled: true,
    blacklistReasons: 'Fraud, Default, Sanctions',

    // Risk scoring (basic knobs; model server-side)
    baseRiskScore: 50, // 0..100 starting point
    riskBoostIfNoPayslip: 10,
    riskBoostIfNoBankStmt: 8,
    riskCapMinScore: 20,
    riskCapMaxScore: 95,

    // Credit limits policy
    defaultCreditLimit: 1000000,
    maxCreditLimit: 10000000,
    incomeToLimitMultiplier: 3,

    // Delinquency & penalties
    daysPastDueForDelinquent: 7,
    autoApplyPenalty: true, // hooks Penalty settings
    autoBlockNewLoanIfOverdue: true,

    // Documents required (comma-separated templates)
    requiredDocsStandard: 'ID Front, ID Back, Passport Photo',
    requiredDocsEnhanced: 'Bank Statement (3m), Payslip (3m), Business License',

    // Data retention & privacy
    retentionYearsAfterClosure: 7,
    purgePIIOnRetentionExpiry: true,

    // UI defaults
    defaultCountryCode: '+255',
    defaultRegion: '',
    notes: '',
  });

  const setVal = (k) => (v) => setSettings((s) => ({ ...s, [k]: v }));
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setSettings((s) => ({ ...s, [name]: type === 'number' ? Number(value) : value }));
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/settings/borrowers');
      if (data) setSettings((s) => ({ ...s, ...data }));
    } catch {
      toast.error('Failed to load borrower settings');
    } finally {
      setLoading(false);
    }
  };

  const save = async (e) => {
    e?.preventDefault?.();
    setSaving(true);
    try {
      await axios.put('/api/settings/borrowers', settings);
      toast.success('Borrower settings saved');
    } catch {
      toast.error('Failed to save borrower settings');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Borrower Settings</h2>
            <p className="text-sm text-muted-foreground">KYC rules, fraud checks, risk, credit limits, and retention.</p>
          </div>
          <Button onClick={save} disabled={saving || loading}>
            {saving ? 'Saving…' : 'Save All'}
          </Button>
        </CardContent>
      </Card>

      {/* KYC */}
      <Section title="KYC & Identity" subtitle="Identity capture and verification requirements.">
        <div className="space-y-2">
          <Label>KYC Level</Label>
          <Select value={settings.kycLevel} onValueChange={setVal('kycLevel')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="enhanced">Enhanced</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Row title="Require National ID" control={<Switch checked={!!settings.requireNationalId} onCheckedChange={setVal('requireNationalId')} />} />
        <div className="space-y-2">
          <Label>Allowed ID Types (comma-separated)</Label>
          <Input name="allowedIdTypes" value={settings.allowedIdTypes} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label>Min Age</Label>
          <Input type="number" min="16" name="minAge" value={settings.minAge} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label>Max Age</Label>
          <Input type="number" min="16" name="maxAge" value={settings.maxAge} onChange={handleChange} />
        </div>
        <Row
          title="Auto-verify with NIDA"
          desc="If enabled, verify National ID against NIDA gateway"
          control={<Switch checked={!!settings.nidaAutoVerify} onCheckedChange={setVal('nidaAutoVerify')} />}
        />
        <div className="space-y-2">
          <Label>When NIDA verification fails</Label>
          <Select value={settings.nidaFailPolicy} onValueChange={setVal('nidaFailPolicy')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="block">Block borrower creation</SelectItem>
              <SelectItem value="allow_with_flag">Allow but flag for review</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Section>

      {/* Contacts & Consents */}
      <Section title="Contacts & Consents" subtitle="Contact fields and compliance statements.">
        <Row title="Require Primary Phone" control={<Switch checked={!!settings.requirePrimaryPhone} onCheckedChange={setVal('requirePrimaryPhone')} />} />
        <Row title="Require Email" control={<Switch checked={!!settings.requireEmail} onCheckedChange={setVal('requireEmail')} />} />
        <Row title="Allow Marketing Communications" control={<Switch checked={!!settings.allowMarketingComms} onCheckedChange={setVal('allowMarketingComms')} />} />
        <Row title="Consent Required" control={<Switch checked={!!settings.consentRequired} onCheckedChange={setVal('consentRequired')} />} />
        <div className="space-y-2 md:col-span-2">
          <Label>Consent Statement</Label>
          <Textarea name="consentStatement" rows={3} value={settings.consentStatement} onChange={handleChange} />
        </div>
      </Section>

      {/* Addressing */}
      <Section title="Addressing" subtitle="Granularity for KYC and collections.">
        <Row title="Require Physical Address" control={<Switch checked={!!settings.requirePhysicalAddress} onCheckedChange={setVal('requirePhysicalAddress')} />} />
        <Row title="Require Region & District" control={<Switch checked={!!settings.requireRegionDistrict} onCheckedChange={setVal('requireRegionDistrict')} />} />
        <div className="space-y-2">
          <Label>Default Country Code</Label>
          <Input name="defaultCountryCode" value={settings.defaultCountryCode} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label>Default Region (optional)</Label>
          <Input name="defaultRegion" value={settings.defaultRegion} onChange={handleChange} />
        </div>
      </Section>

      {/* Duplicate & Fraud */}
      <Section title="Duplicate & Fraud Checks" subtitle="Prevent duplicate profiles and screen risk.">
        <div className="space-y-2">
          <Label>Duplicate Check Fields (comma-separated)</Label>
          <Input name="duplicateCheckFields" value={settings.duplicateCheckFields} onChange={handleChange} placeholder="nationalId, phone" />
        </div>
        <Row title="Block If Duplicate Found" control={<Switch checked={!!settings.blockIfDuplicate} onCheckedChange={setVal('blockIfDuplicate')} />} />
        <Row title="Enable Watchlist/Blacklist" control={<Switch checked={!!settings.watchlistEnabled} onCheckedChange={setVal('watchlistEnabled')} />} />
        <div className="space-y-2">
          <Label>Blacklist Reasons (comma-separated)</Label>
          <Input name="blacklistReasons" value={settings.blacklistReasons} onChange={handleChange} />
        </div>
      </Section>

      {/* Risk & Limits */}
      <Section title="Risk Scoring & Credit Limits" subtitle="Simple tunables (core model runs on backend).">
        <div className="space-y-2">
          <Label>Base Risk Score (0–100)</Label>
          <Input type="number" min="0" max="100" name="baseRiskScore" value={settings.baseRiskScore} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label>Risk Boost if No Payslip</Label>
          <Input type="number" min="0" name="riskBoostIfNoPayslip" value={settings.riskBoostIfNoPayslip} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label>Risk Boost if No Bank Statement</Label>
          <Input type="number" min="0" name="riskBoostIfNoBankStmt" value={settings.riskBoostIfNoBankStmt} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label>Risk Floor / Cap</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" min="0" max="100" name="riskCapMinScore" value={settings.riskCapMinScore} onChange={handleChange} />
            <Input type="number" min="0" max="100" name="riskCapMaxScore" value={settings.riskCapMaxScore} onChange={handleChange} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Default Credit Limit</Label>
          <Input type="number" min="0" name="defaultCreditLimit" value={settings.defaultCreditLimit} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label>Max Credit Limit</Label>
          <Input type="number" min="0" name="maxCreditLimit" value={settings.maxCreditLimit} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label>Income to Limit Multiplier</Label>
          <Input type="number" min="1" step="0.1" name="incomeToLimitMultiplier" value={settings.incomeToLimitMultiplier} onChange={handleChange} />
        </div>
      </Section>

      {/* Delinquency */}
      <Section title="Delinquency & Penalties" subtitle="When to mark delinquent and enforce penalties/blocks.">
        <div className="space-y-2">
          <Label>Days Past Due → Delinquent</Label>
          <Input type="number" min="1" name="daysPastDueForDelinquent" value={settings.daysPastDueForDelinquent} onChange={handleChange} />
        </div>
        <Row title="Auto-apply Penalties to Overdue" control={<Switch checked={!!settings.autoApplyPenalty} onCheckedChange={setVal('autoApplyPenalty')} />} />
        <Row title="Block New Loan if Overdue" control={<Switch checked={!!settings.autoBlockNewLoanIfOverdue} onCheckedChange={setVal('autoBlockNewLoanIfOverdue')} />} />
      </Section>

      {/* Documents */}
      <Section title="Required Documents" subtitle="Driven by KYC level; backend validates on submission.">
        <div className="space-y-2 md:col-span-2">
          <Label>Standard KYC Docs (comma-separated)</Label>
          <Input name="requiredDocsStandard" value={settings.requiredDocsStandard} onChange={handleChange} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Enhanced KYC Docs (comma-separated)</Label>
          <Input name="requiredDocsEnhanced" value={settings.requiredDocsEnhanced} onChange={handleChange} />
        </div>
      </Section>

      {/* Retention & Privacy */}
      <Section title="Data Retention & Privacy" subtitle="Retention policy for closed borrowers.">
        <div className="space-y-2">
          <Label>Retention (years after closure)</Label>
          <Input type="number" min="1" name="retentionYearsAfterClosure" value={settings.retentionYearsAfterClosure} onChange={handleChange} />
        </div>
        <Row title="Purge PII on Retention Expiry" control={<Switch checked={!!settings.purgePIIOnRetentionExpiry} onCheckedChange={setVal('purgePIIOnRetentionExpiry')} />} />
        <div className="space-y-2 md:col-span-2">
          <Label>Internal Notes</Label>
          <Textarea name="notes" rows={2} value={settings.notes} onChange={handleChange} />
        </div>
      </Section>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving || loading}>
          {saving ? 'Saving…' : 'Save All Changes'}
        </Button>
      </div>
    </div>
  );
};

export default BorrowerSettings;
