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

const emptySector = {
  id: null,
  code: '',
  name: '',
  parentId: null,
  riskTier: 'medium',       // low | medium | high
  maxExposurePct: 25,       // % of total portfolio allowed
  collateralRequired: false,
  minCollateralCoverage: 0, // % of loan amount
  active: true,
  notes: '',
};

const Row = ({ title, desc, control }) => (
  <div className="flex items-center justify-between border rounded-xl p-3">
    <div>
      <p className="font-medium">{title}</p>
      {desc && <p className="text-sm text-muted-foreground">{desc}</p>}
    </div>
    {control}
  </div>
);

const LoanSectorSettings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);

  const [sectors, setSectors] = useState([]);
  const [form, setForm]       = useState(emptySector);
  const [query, setQuery]     = useState('');
  const [filterActive, setFilterActive] = useState('all'); // all|active|inactive

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sectors
      .filter(s => filterActive === 'all' ? true : filterActive === 'active' ? s.active : !s.active)
      .filter(s => !q || s.name?.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q));
  }, [sectors, query, filterActive]);

  const loadSectors = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/settings/loan-sectors');
      setSectors(data || []);
    } catch {
      toast.error('Failed to load loan sectors');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => setForm(emptySector);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'number' ? Number(value) : value }));
  };

  const saveSector = async (e) => {
    e?.preventDefault?.();
    if (!form.name || !form.code) return toast.error('Code and Name are required');
    setSaving(true);
    try {
      if (form.id) {
        await axios.put(`/api/settings/loan-sectors/${form.id}`, form);
        toast.success('Sector updated');
      } else {
        await axios.post('/api/settings/loan-sectors', form);
        toast.success('Sector created');
      }
      resetForm();
      await loadSectors();
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const editRow = (s) => setForm({ ...s });
  const deleteRow = async (s) => {
    if (!confirm(`Delete sector "${s.name}"?`)) return;
    try {
      await axios.delete(`/api/settings/loan-sectors/${s.id}`);
      setSectors((arr) => arr.filter((x) => x.id !== s.id));
      toast.success('Sector deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  const exportCSV = () => {
    const header = ['id','code','name','parentId','riskTier','maxExposurePct','collateralRequired','minCollateralCoverage','active','notes'];
    const rows = sectors.map(s => header.map(h => (s[h] ?? '')).join(','));
    const csv  = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'loan_sectors.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => { loadSectors(); }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Loan Sector Settings</h2>
            <p className="text-sm text-muted-foreground">Define sectors, risk tiers, exposure limits, and collateral rules.</p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search code or name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-56"
            />
            <Select value={filterActive} onValueChange={setFilterActive}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Filter" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportCSV}>Export CSV</Button>
          </div>
        </CardContent>
      </Card>

      {/* Editor */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">{form.id ? 'Edit Sector' : 'Add Sector'}</h3>
          <form onSubmit={saveSector} className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input name="code" value={form.code} onChange={handleChange} placeholder="e.g., AGRI" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Name</Label>
              <Input name="name" value={form.name} onChange={handleChange} placeholder="e.g., Agriculture" />
            </div>

            <div className="space-y-2">
              <Label>Parent Sector</Label>
              <Select
                value={String(form.parentId ?? '')}
                onValueChange={(v) => setForm((f) => ({ ...f, parentId: v ? Number(v) : null }))}
              >
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {sectors.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Risk Tier</Label>
              <Select
                value={form.riskTier}
                onValueChange={(v) => setForm((f) => ({ ...f, riskTier: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Max Exposure %</Label>
              <Input type="number" min="0" max="100" step="0.1" name="maxExposurePct" value={form.maxExposurePct} onChange={handleChange} />
              <p className="text-xs text-muted-foreground">Portfolio limit for this sector.</p>
            </div>

            <Row
              title="Collateral Required"
              control={
                <Switch
                  checked={!!form.collateralRequired}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, collateralRequired: v }))}
                />
              }
            />

            <div className={`${form.collateralRequired ? '' : 'opacity-60 pointer-events-none'} space-y-2`}>
              <Label>Min Collateral Coverage %</Label>
              <Input type="number" min="0" max="500" step="1" name="minCollateralCoverage" value={form.minCollateralCoverage} onChange={handleChange} />
            </div>

            <Row
              title="Active"
              control={<Switch checked={!!form.active} onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))} />}
            />

            <div className="space-y-2 md:col-span-3">
              <Label>Notes</Label>
              <Textarea name="notes" rows={2} value={form.notes} onChange={handleChange} />
            </div>

            <div className="md:col-span-3 flex justify-end gap-2">
              {form.id && <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>}
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : (form.id ? 'Update Sector' : 'Add Sector')}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Sectors</h3>
          <div className="overflow-x-auto border rounded-xl">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-muted/40">
                  <th className="text-left p-3">Code</th>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Parent</th>
                  <th className="text-left p-3">Risk</th>
                  <th className="text-left p-3">Max Exp (%)</th>
                  <th className="text-left p-3">Collateral</th>
                  <th className="text-left p-3">Active</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="p-4 text-muted-foreground">No sectors found.</td></tr>
                )}
                {filtered.map((s) => {
                  const parent = sectors.find(p => p.id === s.parentId);
                  return (
                    <tr key={s.id} className="border-t">
                      <td className="p-3">{s.code}</td>
                      <td className="p-3">{s.name}</td>
                      <td className="p-3">{parent?.name || '—'}</td>
                      <td className="p-3 capitalize">{s.riskTier}</td>
                      <td className="p-3">{s.maxExposurePct}</td>
                      <td className="p-3">{s.collateralRequired ? `${s.minCollateralCoverage}%` : 'No'}</td>
                      <td className="p-3">{s.active ? 'Yes' : 'No'}</td>
                      <td className="p-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" onClick={() => editRow(s)}>Edit</Button>
                          <Button size="sm" variant="destructive" onClick={() => deleteRow(s)}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoanSectorSettings;
