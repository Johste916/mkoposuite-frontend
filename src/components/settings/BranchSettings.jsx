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

const emptyBranch = {
  id: null,
  code: '',
  name: '',
  region: '',
  district: '',
  address: '',
  phone: '',
  email: '',
  timezone: 'Africa/Dar_es_Salaam',
  currency: 'TZS',
  managerUserId: '',

  // Office hours (24h HH:mm)
  officeHours: {
    MON: { open: '08:30', close: '17:00', closed: false },
    TUE: { open: '08:30', close: '17:00', closed: false },
    WED: { open: '08:30', close: '17:00', closed: false },
    THU: { open: '08:30', close: '17:00', closed: false },
    FRI: { open: '08:30', close: '17:00', closed: false },
    SAT: { open: '09:00', close: '13:00', closed: true },
    SUN: { open: '00:00', close: '00:00', closed: true },
  },

  // Cash handling
  cashDrawerEnabled: true,
  cashDrawerLimit: 5000000, // TZS
  vaultAccount: '',

  // GL mapping (optional)
  glCashAccount: '',
  glBankAccount: '',
  glFeeIncomeAccount: '',

  notes: '',
  active: true,
};

const DAYS = ['MON','TUE','WED','THU','FRI','SAT','SUN'];

const BranchSettings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);

  const [branches, setBranches] = useState([]);
  const [users, setUsers]       = useState([]); // for manager dropdown
  const [form, setForm]         = useState(emptyBranch);

  const [query, setQuery]       = useState('');
  const [status, setStatus]     = useState('all'); // all|active|inactive

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return branches
      .filter(b => status === 'all' ? true : status === 'active' ? b.active : !b.active)
      .filter(b => !q || [b.name,b.code,b.region,b.district].some(v => v?.toLowerCase().includes(q)));
  }, [branches, query, status]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [{ data: B }, { data: U }] = await Promise.all([
        axios.get('/api/settings/branches'),
        axios.get('/api/settings/users'), // for manager picklist
      ]);
      setBranches(B || []);
      setUsers(U || []);
    } catch {
      toast.error('Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => setForm(emptyBranch);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'number' ? Number(value) : value }));
  };

  const setOffice = (day, field, value) => {
    setForm(f => ({
      ...f,
      officeHours: { ...f.officeHours, [day]: { ...f.officeHours[day], [field]: value } },
    }));
  };

  const saveBranch = async (e) => {
    e?.preventDefault?.();
    if (!form.code || !form.name) return toast.error('Code and Name are required');
    setSaving(true);
    try {
      if (form.id) {
        await axios.put(`/api/settings/branches/${form.id}`, form);
        toast.success('Branch updated');
      } else {
        await axios.post('/api/settings/branches', form);
        toast.success('Branch created');
      }
      resetForm();
      await loadAll();
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const editRow = (b) => setForm({ ...b });
  const deleteRow = async (b) => {
    if (!confirm(`Delete branch "${b.name}"?`)) return;
    try {
      await axios.delete(`/api/settings/branches/${b.id}`);
      setBranches(arr => arr.filter(x => x.id !== b.id));
      toast.success('Branch deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  useEffect(() => { loadAll(); }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Branch Settings</h2>
            <p className="text-sm text-muted-foreground">Manage branches, office hours, cash limits, and GL mappings.</p>
          </div>
          <div className="flex items-center gap-2">
            <Input placeholder="Search name/code/region…" value={query} onChange={(e) => setQuery(e.target.value)} className="w-64" />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadAll} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</Button>
          </div>
        </CardContent>
      </Card>

      {/* Editor */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">{form.id ? 'Edit Branch' : 'Add Branch'}</h3>
          <form onSubmit={saveBranch} className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input name="code" value={form.code} onChange={handleChange} placeholder="e.g., DSM01" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Name</Label>
              <Input name="name" value={form.name} onChange={handleChange} placeholder="e.g., Dar es Salaam HQ" />
            </div>

            <div className="space-y-2">
              <Label>Region</Label>
              <Input name="region" value={form.region} onChange={handleChange} placeholder="e.g., Dar es Salaam" />
            </div>
            <div className="space-y-2">
              <Label>District</Label>
              <Input name="district" value={form.district} onChange={handleChange} placeholder="e.g., Ilala" />
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label>Timezone</Label>
              <Select value={form.timezone} onValueChange={(v) => setForm(f => ({ ...f, timezone: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Africa/Dar_es_Salaam">Africa/Dar_es_Salaam</SelectItem>
                  <SelectItem value="Africa/Nairobi">Africa/Nairobi</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-3">
              <Label>Address</Label>
              <Textarea name="address" rows={2} value={form.address} onChange={handleChange} />
            </div>

            <div className="space-y-2">
              <Label>Phone</Label>
              <Input name="phone" value={form.phone} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" name="email" value={form.email} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => setForm(f => ({ ...f, currency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TZS">TZS</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="KES">KES</SelectItem>
                  <SelectItem value="UGX">UGX</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Branch Manager</Label>
              <Select value={String(form.managerUserId || '')} onValueChange={(v) => setForm(f => ({ ...f, managerUserId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— None —</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.id} value={String(u.id)}>{u.firstName} {u.lastName} — {u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Office hours */}
            <div className="md:col-span-3">
              <Label className="font-medium">Office Hours</Label>
              <div className="overflow-x-auto border rounded-xl mt-2">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="text-left p-3">Day</th>
                      <th className="text-left p-3">Open</th>
                      <th className="text-left p-3">Close</th>
                      <th className="text-left p-3">Closed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map(d => (
                      <tr key={d} className="border-t">
                        <td className="p-3">{d}</td>
                        <td className="p-3">
                          <Input
                            type="time"
                            value={form.officeHours[d]?.open || '08:30'}
                            onChange={(e) => setOffice(d, 'open', e.target.value)}
                            disabled={form.officeHours[d]?.closed}
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            type="time"
                            value={form.officeHours[d]?.close || '17:00'}
                            onChange={(e) => setOffice(d, 'close', e.target.value)}
                            disabled={form.officeHours[d]?.closed}
                          />
                        </td>
                        <td className="p-3">
                          <Switch
                            checked={!!form.officeHours[d]?.closed}
                            onCheckedChange={(v) => setOffice(d, 'closed', v)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cash handling */}
            <Row
              title="Enable Cash Drawer"
              desc="Track till balances and enforce drawer limit"
              control={<Switch checked={!!form.cashDrawerEnabled} onCheckedChange={(v) => setForm(f => ({ ...f, cashDrawerEnabled: v }))} />}
            />
            <div className={`${form.cashDrawerEnabled ? '' : 'opacity-60 pointer-events-none'} space-y-2`}>
              <Label>Cash Drawer Limit</Label>
              <Input type="number" min="0" name="cashDrawerLimit" value={form.cashDrawerLimit} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>Vault Account (ref)</Label>
              <Input name="vaultAccount" value={form.vaultAccount} onChange={handleChange} placeholder="e.g., VAULT-DSM" />
            </div>

            {/* GL mapping */}
            <div className="space-y-2">
              <Label>GL Cash Account</Label>
              <Input name="glCashAccount" value={form.glCashAccount} onChange={handleChange} placeholder="e.g., 1100-CASH" />
            </div>
            <div className="space-y-2">
              <Label>GL Bank Account</Label>
              <Input name="glBankAccount" value={form.glBankAccount} onChange={handleChange} placeholder="e.g., 1200-BANK" />
            </div>
            <div className="space-y-2">
              <Label>GL Fee Income Account</Label>
              <Input name="glFeeIncomeAccount" value={form.glFeeIncomeAccount} onChange={handleChange} placeholder="e.g., 4100-FEEINC" />
            </div>

            <Row title="Active" control={<Switch checked={!!form.active} onCheckedChange={(v) => setForm(f => ({ ...f, active: v }))} />} />

            <div className="space-y-2 md:col-span-3">
              <Label>Notes</Label>
              <Textarea name="notes" rows={2} value={form.notes} onChange={handleChange} />
            </div>

            <div className="md:col-span-3 flex justify-end gap-2">
              {form.id && <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>}
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : (form.id ? 'Update Branch' : 'Add Branch')}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Branches</h3>
          <div className="overflow-x-auto border rounded-xl">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-muted/40">
                  <th className="text-left p-3">Code</th>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Region/District</th>
                  <th className="text-left p-3">Timezone</th>
                  <th className="text-left p-3">Manager</th>
                  <th className="text-left p-3">Cash Drawer</th>
                  <th className="text-left p-3">Active</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="p-4 text-muted-foreground">No branches found.</td></tr>
                )}
                {filtered.map(b => {
                  const mgr = users.find(u => String(u.id) === String(b.managerUserId));
                  return (
                    <tr key={b.id} className="border-t">
                      <td className="p-3">{b.code}</td>
                      <td className="p-3">{b.name}</td>
                      <td className="p-3">{b.region || '—'} / {b.district || '—'}</td>
                      <td className="p-3">{b.timezone}</td>
                      <td className="p-3">{mgr ? `${mgr.firstName} ${mgr.lastName}` : '—'}</td>
                      <td className="p-3">{b.cashDrawerEnabled ? `${b.cashDrawerLimit} ${b.currency}` : 'Disabled'}</td>
                      <td className="p-3">{b.active ? 'Yes' : 'No'}</td>
                      <td className="p-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" onClick={() => editRow(b)}>Edit</Button>
                          <Button size="sm" variant="destructive" onClick={() => deleteRow(b)}>Delete</Button>
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

export default BranchSettings;
