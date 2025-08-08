import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
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

const DashboardSettings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    // Visibility
    showSummaryCards: true,
    showDefaultersTable: true,
    showRecentLoans: true,
    showCollectionsChart: true,
    showDisbursementsChart: true,
    showTopBorrowers: false,

    // Behaviour
    defaultDateRange: 'last_30_days', // today|this_week|last_7_days|last_30_days|this_month|this_quarter|this_year|custom
    rowsPerTable: 10,
    defaultersThresholdDays: 7, // days overdue to flag as defaulter
    currencyOnCards: 'TZS',
    refreshIntervalSec: 0, // 0 disables auto-refresh
  });

  const setVal = (k) => (v) => setSettings((s) => ({ ...s, [k]: v }));
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setSettings((s) => ({ ...s, [name]: type === 'number' ? Number(value) : value }));
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/settings/dashboard');
      if (data) setSettings((s) => ({ ...s, ...data }));
    } catch {
      toast.error('Failed to load dashboard settings');
    } finally {
      setLoading(false);
    }
  };

  const save = async (e) => {
    e?.preventDefault?.();
    setSaving(true);
    try {
      await axios.put('/api/settings/dashboard', settings);
      toast.success('Dashboard settings saved');
    } catch {
      toast.error('Failed to save dashboard settings');
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
            <h2 className="text-xl font-semibold">Dashboard Settings</h2>
            <p className="text-sm text-muted-foreground">Choose what appears on the main dashboard and how it behaves.</p>
          </div>
          <Button onClick={save} disabled={saving || loading}>
            {saving ? 'Saving…' : 'Save All'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Visibility</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Row
              title="Summary Cards"
              desc="Totals for disbursed, outstanding, payments, defaulters"
              control={<Switch checked={settings.showSummaryCards} onCheckedChange={setVal('showSummaryCards')} />}
            />
            <Row
              title="Defaulters Table"
              desc="Quick view of overdue loans"
              control={<Switch checked={settings.showDefaultersTable} onCheckedChange={setVal('showDefaultersTable')} />}
            />
            <Row
              title="Recent Loans"
              desc="Latest disbursements"
              control={<Switch checked={settings.showRecentLoans} onCheckedChange={setVal('showRecentLoans')} />}
            />
            <Row
              title="Collections Chart"
              desc="Payments over time"
              control={<Switch checked={settings.showCollectionsChart} onCheckedChange={setVal('showCollectionsChart')} />}
            />
            <Row
              title="Disbursements Chart"
              desc="Disbursed amounts over time"
              control={<Switch checked={settings.showDisbursementsChart} onCheckedChange={setVal('showDisbursementsChart')} />}
            />
            <Row
              title="Top Borrowers"
              desc="By outstanding balance"
              control={<Switch checked={settings.showTopBorrowers} onCheckedChange={setVal('showTopBorrowers')} />}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Behaviour</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Default Date Range</Label>
              <Select value={settings.defaultDateRange} onValueChange={setVal('defaultDateRange')}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="last_7_days">Last 7 days</SelectItem>
                  <SelectItem value="last_30_days">Last 30 days</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="this_quarter">This Quarter</SelectItem>
                  <SelectItem value="this_year">This Year</SelectItem>
                  <SelectItem value="custom">Custom (remember last used)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Rows Per Table</Label>
              <Input type="number" min="5" max="100" name="rowsPerTable" value={settings.rowsPerTable} onChange={handleChange} />
            </div>

            <div className="space-y-2">
              <Label>Defaulters Threshold (days)</Label>
              <Input type="number" min="1" name="defaultersThresholdDays" value={settings.defaultersThresholdDays} onChange={handleChange} />
            </div>

            <div className="space-y-2">
              <Label>Currency on Cards</Label>
              <Select value={settings.currencyOnCards} onValueChange={setVal('currencyOnCards')}>
                <SelectTrigger><SelectValue placeholder="Currency" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TZS">TZS</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="KES">KES</SelectItem>
                  <SelectItem value="UGX">UGX</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Auto-refresh (seconds)</Label>
              <Input
                type="number"
                min="0"
                name="refreshIntervalSec"
                value={settings.refreshIntervalSec}
                onChange={handleChange}
              />
              <p className="text-xs text-muted-foreground">Set 0 to disable</p>
            </div>
          </div>

          <div className="pt-2">
            <Button onClick={save} disabled={saving || loading}>
              {saving ? 'Saving…' : 'Save Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardSettings;
