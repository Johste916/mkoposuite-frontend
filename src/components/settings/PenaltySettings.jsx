import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'react-toastify';

const PenaltySettings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    penaltyType: 'fixed',        // 'fixed' | 'percentage'
    fixedAmount: '',
    percentageRate: '',          // e.g. 2.5 (percent)
    applyAfterDays: '1',         // grace period before penalties start
    applyFrequency: 'daily',     // 'daily' | 'weekly' | 'monthly'
    isCompound: false,           // compound penalties?
    capEnabled: false,
    capAmount: '',
    roundToWhole: false,         // round calculated penalty to whole currency unit
    includeHolidays: false,      // count holidays when accruing?
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/settings/penalty');
      if (data) setSettings((prev) => ({ ...prev, ...data }));
    } catch {
      toast.error('Failed to load penalty settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Basic client-side sanity cleanup
      const payload = {
        ...settings,
        fixedAmount: settings.penaltyType === 'fixed' ? Number(settings.fixedAmount || 0) : null,
        percentageRate: settings.penaltyType === 'percentage' ? Number(settings.percentageRate || 0) : null,
        capAmount: settings.capEnabled ? Number(settings.capAmount || 0) : null,
        applyAfterDays: Number(settings.applyAfterDays || 0),
      };
      await axios.put('/api/settings/penalty', payload);
      toast.success('Penalty settings updated');
    } catch {
      toast.error('Failed to update penalty settings');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const isFixed = useMemo(() => settings.penaltyType === 'fixed', [settings.penaltyType]);
  const isPct = !isFixed;

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <h2 className="text-xl font-semibold">Penalty Settings</h2>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Penalty Type */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Penalty Type</Label>
              <Select
                value={settings.penaltyType}
                onValueChange={(v) => setSettings((s) => ({ ...s, penaltyType: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                  <SelectItem value="percentage">Percentage of Outstanding</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Apply After (days)</Label>
              <Input
                type="number"
                name="applyAfterDays"
                min="0"
                value={settings.applyAfterDays}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Amount / Rate */}
          <div className="grid md:grid-cols-2 gap-4">
            {isFixed ? (
              <div className="space-y-2">
                <Label>Fixed Penalty Amount</Label>
                <Input
                  type="number"
                  name="fixedAmount"
                  min="0"
                  step="0.01"
                  value={settings.fixedAmount ?? ''}
                  onChange={handleChange}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Percentage Rate (%)</Label>
                <Input
                  type="number"
                  name="percentageRate"
                  min="0"
                  step="0.01"
                  value={settings.percentageRate ?? ''}
                  onChange={handleChange}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Application Frequency</Label>
              <Select
                value={settings.applyFrequency}
                onValueChange={(v) => setSettings((s) => ({ ...s, applyFrequency: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced options */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-center justify-between border rounded-xl p-3">
              <div>
                <Label className="font-medium">Compound Penalties</Label>
                <p className="text-sm text-muted-foreground">Accrue on previously applied penalties</p>
              </div>
              <Switch
                checked={settings.isCompound}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, isCompound: v }))}
              />
            </div>

            <div className="flex items-center justify-between border rounded-xl p-3">
              <div>
                <Label className="font-medium">Round To Whole</Label>
                <p className="text-sm text-muted-foreground">Round calculated penalty to whole unit</p>
              </div>
              <Switch
                checked={settings.roundToWhole}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, roundToWhole: v }))}
              />
            </div>

            <div className="flex items-center justify-between border rounded-xl p-3">
              <div>
                <Label className="font-medium">Include Holidays</Label>
                <p className="text-sm text-muted-foreground">Count public holidays when accruing</p>
              </div>
              <Switch
                checked={settings.includeHolidays}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, includeHolidays: v }))}
              />
            </div>
          </div>

          {/* Cap */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between border rounded-xl p-3">
              <div>
                <Label className="font-medium">Enable Cap Amount</Label>
                <p className="text-sm text-muted-foreground">Maximum total penalties per loan</p>
              </div>
              <Switch
                checked={settings.capEnabled}
                onCheckedChange={(v) =>
                  setSettings((s) => ({ ...s, capEnabled: v, capAmount: v ? s.capAmount : '' }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Cap Amount</Label>
              <Input
                type="number"
                name="capAmount"
                min="0"
                step="0.01"
                value={settings.capAmount ?? ''}
                onChange={handleChange}
                disabled={!settings.capEnabled}
              />
            </div>
          </div>

          <div className="pt-2">
            <Button type="submit" disabled={saving || loading}>
              {saving ? 'Saving…' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default PenaltySettings;
