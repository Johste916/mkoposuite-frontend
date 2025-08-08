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

const emptyItem = {
  id: null,
  code: '',
  name: '',
  category: 'employment',      // employment | business | farming | remittance | rental | pension | other
  verificationRequired: true,
  requiredDocuments: 'ID, Payslip', // comma-separated
  seasonal: false,
  seasonMonths: '',            // e.g. "Jun-Sep"
  avgStabilityScore: 3,        // 1..5 (subjective)
  notes: '',
  active: true,
};

const IncomeSourceSettings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);

  const [items, setItems] = useState([]);
  const [form, setForm]   = useState(emptyItem);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState({ active: 'all', category: 'all' });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter(i => filter.active === 'all' ? true : filter.active === 'active' ? i.active : !i.active)
      .filter(i => filter.category === 'all' ? true : i.category === filter.category)
      .filter(i => !q || i.name?.toLowerCase().includes(q) || i.code?.toLowerCase().includes(q));
  }, [items, query, filter]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/settings/income-sources');
      setItems(data || []);
    } catch {
      toast.error('Failed to load income sources');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => setForm(emptyItem);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'number' ? Number(value) : value }));
  };

  const saveItem = async (e) => {
    e?.preventDefault?.();
    if (!form.code || !form.name) return toast.error('Code and Name are required');
    setSaving(true);
    try {
      if (form.id) {
        await axios.put(`/api/settings/income-sources/${form.id}`, form);
        toast.success('Income source updated');
      } else {
        await axios.post('/api/settings/income-sources', form);
        toast.success('Income source created');
      }
      resetForm();
      await loadItems();
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const editRow = (i) => setForm({ ...i });
  const deleteRow = async (i) => {
    if (!confirm(`Delete income source "${i.name}"?`)) return;
    try {
      await axios.delete(`/api/settings/income-sources/${i.id}`);
      setItems((arr) => arr.filter((x) => x.id !== i.id));
      toast.success('Income source deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  const exportCSV = () => {
    const header = ['id','code','name','category','verificationRequired','requiredDocuments','seasonal','seasonMonths','avgStabilityScore','active','notes'];
    const rows = items.map(i => header.map(h => (i[h] ?? '')).join(','));
    const csv  = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'income_sources.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => { loadItems(); }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Income Source Settings</h2>
            <p className="text-sm text-muted-foreground">Standardize borrower income types for KYC and risk assessment.</p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search code or name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-56"
            />
            <Select value={filter.category} onValueChange={(v) => setFilter((f) => ({ ...f, category: v }))}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="employment">Employment</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="farming">Farming</SelectItem>
                <SelectItem value="remittance">Remittance</SelectItem>
                <SelectItem value="rental">Rental</SelectItem>
                <SelectItem value="pension">Pension</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filter.active} onValueChange={(v) => setFilter((f) => ({ ...f, active: v }))}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Active" /></SelectTrigger>
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
          <h3 className="text-lg font-semibold">{form.id ? 'Edit Income Source' : 'Add Income Source'}</h3>
          <form onSubmit={saveItem} className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input name="code" value={form.code} onChange={handleChange} placeholder="e.g., EMP" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Name</Label>
              <Input name="name" value={form.name} onChange={handleChange} placeholder="e.g., Salaried Employment" />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="employment">Employment</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="farming">Farming</SelectItem>
                  <SelectItem value="remittance">Remittance</SelectItem>
                  <SelectItem value="rental">Rental</SelectItem>
                  <SelectItem value="pension">Pension</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Row
              title="Verification Required"
              desc="Requires proof (e.g., payslip, bank statement)"
              control={
                <Switch
                  checked={!!form.verificationRequired}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, verificationRequired: v }))}
                />
              }
            />

            <div className="space-y-2 md:col-span-2">
              <Label>Required Documents (comma-separated)</Label>
              <Input
                name="requiredDocuments"
                value={form.requiredDocuments}
                onChange={handleChange}
                placeholder="ID, Payslip"
              />
            </div>

            <Row
              title="Seasonal Income"
              desc="E.g., crop harvest months"
              control={<Switch checked={!!form.seasonal} onCheckedChange={(v) => setForm((f) => ({ ...f, seasonal: v }))} />}
            />

            <div className={`${form.seasonal ? '' : 'opacity-60 pointer-events-none'} space-y-2`}>
              <Label>Season Months</Label>
              <Input
                name="seasonMonths"
                value={form.seasonMonths}
                onChange={handleChange}
                placeholder="e.g., Jun-Sep"
              />
            </div>

            <div className="space-y-2">
              <Label>Avg Stability Score (1–5)</Label>
              <Input
                type="number"
                min="1" max="5" step="1"
                name="avgStabilityScore"
                value={form.avgStabilityScore}
                onChange={handleChange}
              />
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
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : (form.id ? 'Update Income Source' : 'Add Income Source')}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Income Sources</h3>
          <div className="overflow-x-auto border rounded-xl">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-muted/40">
                  <th className="text-left p-3">Code</th>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Category</th>
                  <th className="text-left p-3">Verification</th>
                  <th className="text-left p-3">Seasonal</th>
                  <th className="text-left p-3">Stability</th>
                  <th className="text-left p-3">Active</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="p-4 text-muted-foreground">No income sources found.</td></tr>
                )}
                {filtered.map((i) => (
                  <tr key={i.id} className="border-t">
                    <td className="p-3">{i.code}</td>
                    <td className="p-3">{i.name}</td>
                    <td className="p-3 capitalize">{i.category}</td>
                    <td className="p-3">{i.verificationRequired ? 'Required' : 'Optional'}</td>
                    <td className="p-3">{i.seasonal ? (i.seasonMonths || 'Yes') : 'No'}</td>
                    <td className="p-3">{i.avgStabilityScore}</td>
                    <td className="p-3">{i.active ? 'Yes' : 'No'}</td>
                    <td className="p-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => editRow(i)}>Edit</Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteRow(i)}>Delete</Button>
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

export default IncomeSourceSettings;
