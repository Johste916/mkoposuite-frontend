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

const emptyHoliday = { id: null, name: '', date: '', repeatsAnnually: true, region: 'ALL', notes: '' };

const HolidaySettings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [holidays, setHolidays] = useState([]);
  const [branches, setBranches] = useState([{ id: 'ALL', name: 'All Branches' }]);
  const [form, setForm] = useState(emptyHoliday);
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  const [bulk, setBulk] = useState({ country: 'TZ', year: String(new Date().getFullYear()) });

  const [rules, setRules] = useState({
    weekendIsHoliday: true,
    weekendDays: ['SAT', 'SUN'], // SAT|SUN|FRI etc.
    shiftIfWeekend: true,        // move to next business day
    carryForwardIfWeekend: false,
    allowRegionalHolidays: true, // branch-specific
  });

  const setVal = (k) => (v) => setRules((s) => ({ ...s, [k]: v }));
  const handleForm = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const years = useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, i) => String(y - 2 + i));
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [{ data: meta }, { data: list }] = await Promise.all([
        axios.get('/api/settings/holidays/meta'), // { rules, branches }
        axios.get('/api/settings/holidays', { params: { year: filterYear } }),
      ]);
      if (meta?.rules) setRules((r) => ({ ...r, ...meta.rules }));
      if (meta?.branches?.length) setBranches([{ id: 'ALL', name: 'All Branches' }, ...meta.branches]);
      setHolidays(list || []);
    } catch {
      toast.error('Failed to load holiday settings');
    } finally {
      setLoading(false);
    }
  };

  const saveRules = async () => {
    setSaving(true);
    try {
      await axios.put('/api/settings/holidays/rules', rules);
      toast.success('Holiday rules saved');
    } catch {
      toast.error('Failed to save rules');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => setForm(emptyHoliday);

  const createOrUpdate = async (e) => {
    e?.preventDefault?.();
    if (!form.name || !form.date) return toast.error('Name and date are required');
    try {
      if (form.id) {
        await axios.put(`/api/settings/holidays/${form.id}`, form);
        toast.success('Holiday updated');
      } else {
        await axios.post('/api/settings/holidays', form);
        toast.success('Holiday added');
      }
      resetForm();
      await loadAll();
    } catch {
      toast.error('Save failed');
    }
  };

  const editRow = (h) => setForm({ ...h });
  const deleteRow = async (h) => {
    if (!confirm(`Delete holiday "${h.name}" on ${h.date}?`)) return;
    try {
      await axios.delete(`/api/settings/holidays/${h.id}`);
      setHolidays((arr) => arr.filter((x) => x.id !== h.id));
      toast.success('Holiday deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  const importCountry = async () => {
    setSaving(true);
    try {
      await axios.post('/api/settings/holidays/import', { country: bulk.country, year: bulk.year });
      toast.success('Imported public holidays');
      await loadAll();
    } catch {
      toast.error('Import failed');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => { loadAll(); }, [filterYear]);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Holiday Settings</h2>
            <p className="text-sm text-muted-foreground">Manage public & regional holidays and weekend rules.</p>
          </div>
          <div className="flex gap-2">
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Year" /></SelectTrigger>
              <SelectContent>
                {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={loadAll} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</Button>
          </div>
        </CardContent>
      </Card>

      {/* Global rules */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Rules</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <Row
              title="Weekends Are Holidays"
              desc="Count weekend days as non-working"
              control={<Switch checked={!!rules.weekendIsHoliday} onCheckedChange={setVal('weekendIsHoliday')} />}
            />
            <div className="space-y-2">
              <Label>Weekend Days</Label>
              <Select
                value={rules.weekendDays[0]}
                onValueChange={(v) => setVal('weekendDays')([v, rules.weekendDays[1] || 'SUN'])}
              >
                <SelectTrigger><SelectValue placeholder="First day" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FRI">Friday</SelectItem>
                  <SelectItem value="SAT">Saturday</SelectItem>
                  <SelectItem value="SUN">Sunday</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={rules.weekendDays[1] || 'SUN'}
                onValueChange={(v) => setVal('weekendDays')([rules.weekendDays[0] || 'SAT', v])}
              >
                <SelectTrigger className="mt-2"><SelectValue placeholder="Second day" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FRI">Friday</SelectItem>
                  <SelectItem value="SAT">Saturday</SelectItem>
                  <SelectItem value="SUN">Sunday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Row
              title="Shift If Falls on Weekend"
              desc="Move observed holiday to next business day"
              control={<Switch checked={!!rules.shiftIfWeekend} onCheckedChange={setVal('shiftIfWeekend')} />}
            />
            <Row
              title="Carry Forward If Weekend"
              desc="Carry forward leave accrual if holiday on weekend"
              control={<Switch checked={!!rules.carryForwardIfWeekend} onCheckedChange={setVal('carryForwardIfWeekend')} />}
            />
            <Row
              title="Enable Regional Holidays"
              desc="Allow branch-specific holidays"
              control={<Switch checked={!!rules.allowRegionalHolidays} onCheckedChange={setVal('allowRegionalHolidays')} />}
            />
          </div>
          <div className="pt-2">
            <Button onClick={saveRules} disabled={saving || loading}>{saving ? 'Saving…' : 'Save Rules'}</Button>
          </div>
        </CardContent>
      </Card>

      {/* Import */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Import Public Holidays</h3>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Country</Label>
              <Select value={bulk.country} onValueChange={(v) => setBulk((b) => ({ ...b, country: v }))}>
                <SelectTrigger><SelectValue placeholder="Country" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TZ">Tanzania</SelectItem>
                  <SelectItem value="KE">Kenya</SelectItem>
                  <SelectItem value="UG">Uganda</SelectItem>
                  <SelectItem value="RW">Rwanda</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={bulk.year} onValueChange={(v) => setBulk((b) => ({ ...b, year: v }))}>
                <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={importCountry} disabled={saving || loading}>Import</Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Imports official dates; you can edit after import.</p>
        </CardContent>
      </Card>

      {/* List + Editor */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Holidays ({filterYear})</h3>

          {/* Inline editor */}
          <form onSubmit={createOrUpdate} className="grid md:grid-cols-6 gap-4 border rounded-xl p-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Name</Label>
              <Input name="name" value={form.name} onChange={handleForm} placeholder="e.g., New Year" />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" name="date" value={form.date} onChange={handleForm} />
            </div>
            <div className="space-y-2">
              <Label>Repeats Annually</Label>
              <Select
                value={form.repeatsAnnually ? 'yes' : 'no'}
                onValueChange={(v) => setForm((f) => ({ ...f, repeatsAnnually: v === 'yes' }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className={`space-y-2 ${rules.allowRegionalHolidays ? '' : 'opacity-60 pointer-events-none'}`}>
              <Label>Region/Branch</Label>
              <Select
                value={form.region || 'ALL'}
                onValueChange={(v) => setForm((f) => ({ ...f, region: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-6">
              <Label>Notes</Label>
              <Textarea name="notes" rows={2} value={form.notes} onChange={handleForm} />
            </div>
            <div className="md:col-span-6 flex gap-2 justify-end">
              {form.id && <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>}
              <Button type="submit">{form.id ? 'Update Holiday' : 'Add Holiday'}</Button>
            </div>
          </form>

          {/* Table */}
          <div className="overflow-x-auto border rounded-xl">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-muted/40">
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Annual</th>
                  <th className="text-left p-3">Region</th>
                  <th className="text-left p-3">Notes</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {holidays.length === 0 && (
                  <tr><td colSpan={6} className="p-4 text-muted-foreground">No holidays found for {filterYear}.</td></tr>
                )}
                {holidays.map((h) => (
                  <tr key={h.id} className="border-t">
                    <td className="p-3">{h.name}</td>
                    <td className="p-3">{h.date}</td>
                    <td className="p-3">{h.repeatsAnnually ? 'Yes' : 'No'}</td>
                    <td className="p-3">{branches.find((b) => b.id === h.region)?.name || h.region || 'All'}</td>
                    <td className="p-3">{h.notes || ''}</td>
                    <td className="p-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => editRow(h)}>Edit</Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteRow(h)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </CardContent>
      </Card>
    </div>
  );
};

export default HolidaySettings;
