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

const PayrollSettings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [settings, setSettings] = useState({
    enabled: true,
    country: 'TZ',               // TZ|KE|UG|US|OTHER (expand as needed)
    baseCurrency: 'TZS',

    // Pay cycle
    payFrequency: 'monthly',     // monthly|biweekly|weekly
    paydayRule: 'end_of_month',  // end_of_month|specific_day|weekday_after_25th
    specificDay: 25,             // used when paydayRule=specific_day
    useBusinessDays: true,       // shift if payday falls on weekend/holiday

    // Numbering
    employeeCodePrefix: 'EMP',
    nextEmployeeNumber: 1,

    // Statutory (simple flat entries; detailed tables live in backend)
    payeEnabled: true,
    nssfEnabled: true,
    sdlEnabled: true,
    nhifEnabled: false,

    payeNotes: '',
    nssfRateEmployeePct: 10,
    nssfRateEmployerPct: 10,
    sdlRatePct: 4.5,
    nhifRatePct: 3,

    // Defaults
    defaultOvertimeMultiplier: 1.5,
    defaultLeaveDaysPerYear: 28,
    defaultWorkDaysPerWeek: 5,

    // Templates (comma-separated lists; backend keeps canonical list)
    defaultAllowances: 'Transport, Airtime',
    defaultDeductions: 'Loan, Advance',

    // Test calc
    testGross: 1000000,
    testAllowances: 0,
    testDeductions: 0,
  });

  const setVal = (k) => (v) => setSettings((s) => ({ ...s, [k]: v }));
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setSettings((s) => ({ ...s, [name]: type === 'number' ? Number(value) : value }));
  };

  const paydayHint = useMemo(() => {
    if (settings.paydayRule === 'specific_day') return `Pays on day ${settings.specificDay} each month`;
    if (settings.paydayRule === 'weekday_after_25th') return 'Pays on first weekday after the 25th';
    return 'Pays on the last calendar/business day of the month';
  }, [settings.paydayRule, settings.specificDay]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/settings/payroll');
      if (data) setSettings((s) => ({ ...s, ...data }));
    } catch {
      toast.error('Failed to load payroll settings');
    } finally {
      setLoading(false);
    }
  };

  const save = async (e) => {
    e?.preventDefault?.();
    setSaving(true);
    try {
      await axios.put('/api/settings/payroll', settings);
      toast.success('Payroll settings saved');
    } catch {
      toast.error('Failed to save payroll settings');
    } finally {
      setSaving(false);
    }
  };

  const runTestCalc = async () => {
    setTesting(true);
    try {
      const { data } = await axios.post('/api/settings/payroll/test-calc', {
        gross: Number(settings.testGross || 0),
        allowances: Number(settings.testAllowances || 0),
        deductions: Number(settings.testDeductions || 0),
      });
      // Expect { net, paye, nssfEmp, nssfEr, sdl, nhif, details? }
      const parts = [
        `NET: ${data?.net}`,
        `PAYE: ${data?.paye}`,
        `NSSF (Emp): ${data?.nssfEmp}`,
        `NSSF (Er): ${data?.nssfEr}`,
        settings.sdlEnabled ? `SDL: ${data?.sdl}` : null,
        settings.nhifEnabled ? `NHIF: ${data?.nhif}` : null,
      ].filter(Boolean);
      toast.success(`Test calc → ${parts.join(' | ')}`);
    } catch {
      toast.error('Test calculation failed');
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
            <h2 className="text-xl font-semibold">Payroll Settings</h2>
            <p className="text-sm text-muted-foreground">Pay cycles, statutory rates, allowances/deductions, and test calculations.</p>
          </div>
          <Button onClick={save} disabled={saving || loading}>
            {saving ? 'Saving…' : 'Save All'}
          </Button>
        </CardContent>
      </Card>

      {/* General */}
      <Section title="General" subtitle="Country, currency, and payroll enablement.">
        <Row
          title="Enable Payroll"
          control={<Switch checked={!!settings.enabled} onCheckedChange={setVal('enabled')} />}
        />
        <div className="space-y-2">
          <Label>Country</Label>
          <Select value={settings.country} onValueChange={setVal('country')}>
            <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TZ">Tanzania</SelectItem>
              <SelectItem value="KE">Kenya</SelectItem>
              <SelectItem value="UG">Uganda</SelectItem>
              <SelectItem value="US">USA</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Base Currency</Label>
          <Input name="baseCurrency" value={settings.baseCurrency} onChange={handleChange} />
        </div>
      </Section>

      {/* Pay Cycle */}
      <Section title="Pay Cycle" subtitle={`Frequency & payday rules. ${paydayHint}`}>
        <div className="space-y-2">
          <Label>Pay Frequency</Label>
          <Select value={settings.payFrequency} onValueChange={setVal('payFrequency')}>
            <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="biweekly">Bi-Weekly</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Payday Rule</Label>
          <Select value={settings.paydayRule} onValueChange={setVal('paydayRule')}>
            <SelectTrigger><SelectValue placeholder="Select rule" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="end_of_month">End of Month</SelectItem>
              <SelectItem value="specific_day">Specific Day</SelectItem>
              <SelectItem value="weekday_after_25th">Weekday After 25th</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className={`${settings.paydayRule === 'specific_day' ? '' : 'opacity-60 pointer-events-none'} space-y-2`}>
          <Label>Specific Day (1–28)</Label>
          <Input type="number" min="1" max="28" name="specificDay" value={settings.specificDay ?? 25} onChange={handleChange} />
        </div>

        <Row
          title="Shift to Business Day"
          desc="If payday falls on weekend/holiday, move to next business day"
          control={<Switch checked={!!settings.useBusinessDays} onCheckedChange={setVal('useBusinessDays')} />}
        />
      </Section>

      {/* Numbering */}
      <Section title="Employee Numbering" subtitle="Prefixes and sequencing.">
        <div className="space-y-2">
          <Label>Employee Code Prefix</Label>
          <Input name="employeeCodePrefix" value={settings.employeeCodePrefix || ''} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label>Next Employee Number</Label>
          <Input type="number" min="1" name="nextEmployeeNumber" value={settings.nextEmployeeNumber ?? 1} onChange={handleChange} />
        </div>
      </Section>

      {/* Statutory */}
      <Section title="Statutory Contributions & Taxes" subtitle="Simple rates (detailed brackets handled in backend tables).">
        <Row title="Enable PAYE" control={<Switch checked={!!settings.payeEnabled} onCheckedChange={setVal('payeEnabled')} />} />
        <Row title="Enable NSSF" control={<Switch checked={!!settings.nssfEnabled} onCheckedChange={setVal('nssfEnabled')} />} />
        <Row title="Enable SDL"  control={<Switch checked={!!settings.sdlEnabled} onCheckedChange={setVal('sdlEnabled')} />} />
        <Row title="Enable NHIF" control={<Switch checked={!!settings.nhifEnabled} onCheckedChange={setVal('nhifEnabled')} />} />

        <div className="space-y-2">
          <Label>NSSF Employee Rate (%)</Label>
          <Input type="number" step="0.01" min="0" name="nssfRateEmployeePct" value={settings.nssfRateEmployeePct ?? 0} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label>NSSF Employer Rate (%)</Label>
          <Input type="number" step="0.01" min="0" name="nssfRateEmployerPct" value={settings.nssfRateEmployerPct ?? 0} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label>SDL Rate (%)</Label>
          <Input type="number" step="0.01" min="0" name="sdlRatePct" value={settings.sdlRatePct ?? 0} onChange={handleChange} />
        </div>
        <div className={`${settings.nhifEnabled ? '' : 'opacity-60 pointer-events-none'} space-y-2`}>
          <Label>NHIF Rate (%)</Label>
          <Input type="number" step="0.01" min="0" name="nhifRatePct" value={settings.nhifRatePct ?? 0} onChange={handleChange} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>PAYE Notes / Bracket Source</Label>
          <Textarea name="payeNotes" rows={3} value={settings.payeNotes || ''} onChange={handleChange} placeholder="e.g., PAYE brackets maintained in backend table PAYE_BRACKETS_TZ" />
        </div>
      </Section>

      {/* Defaults */}
      <Section title="Defaults & Templates" subtitle="Overtime, leave, and default allowance/deduction items.">
        <div className="space-y-2">
          <Label>Overtime Multiplier</Label>
          <Input type="number" step="0.1" min="1" name="defaultOvertimeMultiplier" value={settings.defaultOvertimeMultiplier ?? 1.5} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label>Leave Days / Year</Label>
          <Input type="number" min="0" name="defaultLeaveDaysPerYear" value={settings.defaultLeaveDaysPerYear ?? 28} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label>Work Days / Week</Label>
          <Input type="number" min="1" max="7" name="defaultWorkDaysPerWeek" value={settings.defaultWorkDaysPerWeek ?? 5} onChange={handleChange} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Default Allowances (comma-separated)</Label>
          <Input name="defaultAllowances" value={settings.defaultAllowances || ''} onChange={handleChange} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Default Deductions (comma-separated)</Label>
          <Input name="defaultDeductions" value={settings.defaultDeductions || ''} onChange={handleChange} />
        </div>
      </Section>

      {/* Test Calc */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Test Payroll Calculation</h3>
          <div className="grid md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Gross</Label>
              <Input type="number" min="0" name="testGross" value={settings.testGross ?? 0} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>Allowances</Label>
              <Input type="number" min="0" name="testAllowances" value={settings.testAllowances ?? 0} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>Deductions</Label>
              <Input type="number" min="0" name="testDeductions" value={settings.testDeductions ?? 0} onChange={handleChange} />
            </div>
            <div className="flex items-end">
              <Button onClick={runTestCalc} disabled={!settings.enabled || testing}>
                {testing ? 'Calculating…' : 'Run Test'}
              </Button>
            </div>
            <div className="flex items-end justify-end">
              <Button onClick={save} disabled={saving || loading}>
                {saving ? 'Saving…' : 'Save All Changes'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollSettings;
