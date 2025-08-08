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

const emptyProduct = {
  id: null,
  code: '',
  name: '',
  description: '',
  active: true,

  // Interest
  interestEnabled: true,
  interestMethod: 'simple_daily', // simple_daily|simple_monthly|compound_monthly
  interestRateAnnualPct: 5,
  interestPosting: 'monthly', // daily|monthly|quarterly|yearly|on_maturity
  interestBaseDays: 365, // 360|365

  // Terms
  minBalance: 0,
  openingDeposit: 0,
  minDeposit: 0,
  maxDeposit: 0,
  withdrawalLimitPerDay: 3,
  allowOverdraft: false,
  overdraftLimit: 0,
  overdraftRateAnnualPct: 18,

  // Fees
  monthlyFee: 0,
  depositFeeFlat: 0,
  withdrawalFeeFlat: 0,
  withdrawalFeePct: 0,

  // Ledger/GL mapping (optional)
  glProductAccount: '',
  glInterestExpenseAccount: '',
  glFeeIncomeAccount: '',
};

const SavingAccountSettings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);

  const [products, setProducts] = useState([]);
  const [form, setForm]         = useState(emptyProduct);
  const [query, setQuery]       = useState('');
  const [filterActive, setFilterActive] = useState('all'); // all|active|inactive

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter(p => filterActive === 'all' ? true : filterActive === 'active' ? p.active : !p.active)
      .filter(p => !q || p.name?.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q));
  }, [products, query, filterActive]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/settings/saving-products');
      setProducts(data || []);
    } catch {
      toast.error('Failed to load saving products');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => setForm(emptyProduct);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'number' ? Number(value) : value }));
  };

  const saveProduct = async (e) => {
    e?.preventDefault?.();
    if (!form.name || !form.code) return toast.error('Code and Name are required');
    setSaving(true);
    try {
      if (form.id) {
        await axios.put(`/api/settings/saving-products/${form.id}`, form);
        toast.success('Product updated');
      } else {
        await axios.post('/api/settings/saving-products', form);
        toast.success('Product created');
      }
      resetForm();
      await loadProducts();
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const editRow = (p) => setForm({ ...p });
  const deleteRow = async (p) => {
    if (!confirm(`Delete saving product "${p.name}"?`)) return;
    try {
      await axios.delete(`/api/settings/saving-products/${p.id}`);
      setProducts((arr) => arr.filter((x) => x.id !== p.id));
      toast.success('Product deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  useEffect(() => { loadProducts(); }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Saving Account Settings</h2>
            <p className="text-sm text-muted-foreground">Create and manage savings products, interest rules, and fees.</p>
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
          </div>
        </CardContent>
      </Card>

      {/* Editor */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">{form.id ? 'Edit Product' : 'Add Product'}</h3>
          <form onSubmit={saveProduct} className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input name="code" value={form.code} onChange={handleChange} placeholder="e.g., SAV-BASIC" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Name</Label>
              <Input name="name" value={form.name} onChange={handleChange} placeholder="e.g., Basic Savings" />
            </div>

            <div className="space-y-2 md:col-span-3">
              <Label>Description</Label>
              <Textarea name="description" rows={2} value={form.description} onChange={handleChange} />
            </div>

            <Row
              title="Active"
              control={<Switch checked={!!form.active} onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))} />}
            />

            {/* Interest */}
            <Row
              title="Enable Interest"
              control={<Switch checked={!!form.interestEnabled} onCheckedChange={(v) => setForm((f) => ({ ...f, interestEnabled: v }))} />}
            />

            <div className={`${form.interestEnabled ? '' : 'opacity-60 pointer-events-none'} space-y-2`}>
              <Label>Interest Method</Label>
              <Select
                value={form.interestMethod}
                onValueChange={(v) => setForm((f) => ({ ...f, interestMethod: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple_daily">Simple (Daily Balance)</SelectItem>
                  <SelectItem value="simple_monthly">Simple (Monthly Balance)</SelectItem>
                  <SelectItem value="compound_monthly">Compound (Monthly)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className={`${form.interestEnabled ? '' : 'opacity-60 pointer-events-none'} space-y-2`}>
              <Label>Annual Interest Rate (%)</Label>
              <Input
                type="number" min="0" step="0.01"
                name="interestRateAnnualPct" value={form.interestRateAnnualPct}
                onChange={handleChange}
              />
            </div>

            <div className={`${form.interestEnabled ? '' : 'opacity-60 pointer-events-none'} space-y-2`}>
              <Label>Interest Posting</Label>
              <Select
                value={form.interestPosting}
                onValueChange={(v) => setForm((f) => ({ ...f, interestPosting: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="on_maturity">On Maturity</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className={`${form.interestEnabled ? '' : 'opacity-60 pointer-events-none'} space-y-2`}>
              <Label>Interest Day Count Base</Label>
              <Select
                value={String(form.interestBaseDays)}
                onValueChange={(v) => setForm((f) => ({ ...f, interestBaseDays: Number(v) }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="365">Actual/365</SelectItem>
                  <SelectItem value="360">Banker’s 360</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Terms */}
            <div className="space-y-2">
              <Label>Minimum Balance</Label>
              <Input type="number" min="0" step="0.01" name="minBalance" value={form.minBalance} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>Opening Deposit</Label>
              <Input type="number" min="0" step="0.01" name="openingDeposit" value={form.openingDeposit} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>Minimum Deposit</Label>
              <Input type="number" min="0" step="0.01" name="minDeposit" value={form.minDeposit} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>Maximum Deposit (0 = no cap)</Label>
              <Input type="number" min="0" step="0.01" name="maxDeposit" value={form.maxDeposit} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>Withdrawals per Day</Label>
              <Input type="number" min="0" name="withdrawalLimitPerDay" value={form.withdrawalLimitPerDay} onChange={handleChange} />
            </div>

            <Row
              title="Allow Overdraft"
              control={<Switch checked={!!form.allowOverdraft} onCheckedChange={(v) => setForm((f) => ({ ...f, allowOverdraft: v }))} />}
            />
            <div className={`${form.allowOverdraft ? '' : 'opacity-60 pointer-events-none'} space-y-2`}>
              <Label>Overdraft Limit</Label>
              <Input type="number" min="0" step="0.01" name="overdraftLimit" value={form.overdraftLimit} onChange={handleChange} />
            </div>
            <div className={`${form.allowOverdraft ? '' : 'opacity-60 pointer-events-none'} space-y-2`}>
              <Label>Overdraft Interest Rate (%)</Label>
              <Input type="number" min="0" step="0.01" name="overdraftRateAnnualPct" value={form.overdraftRateAnnualPct} onChange={handleChange} />
            </div>

            {/* Fees */}
            <div className="space-y-2">
              <Label>Monthly Maintenance Fee</Label>
              <Input type="number" min="0" step="0.01" name="monthlyFee" value={form.monthlyFee} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>Deposit Fee (flat)</Label>
              <Input type="number" min="0" step="0.01" name="depositFeeFlat" value={form.depositFeeFlat} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>Withdrawal Fee (flat)</Label>
              <Input type="number" min="0" step="0.01" name="withdrawalFeeFlat" value={form.withdrawalFeeFlat} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>Withdrawal Fee (%)</Label>
              <Input type="number" min="0" step="0.01" name="withdrawalFeePct" value={form.withdrawalFeePct} onChange={handleChange} />
            </div>

            {/* GL mapping */}
            <div className="space-y-2">
              <Label>GL Product Account</Label>
              <Input name="glProductAccount" value={form.glProductAccount} onChange={handleChange} placeholder="e.g., 2100-SAVINGS" />
            </div>
            <div className="space-y-2">
              <Label>GL Interest Expense Account</Label>
              <Input name="glInterestExpenseAccount" value={form.glInterestExpenseAccount} onChange={handleChange} placeholder="e.g., 5200-INTEXP" />
            </div>
            <div className="space-y-2">
              <Label>GL Fee Income Account</Label>
              <Input name="glFeeIncomeAccount" value={form.glFeeIncomeAccount} onChange={handleChange} placeholder="e.g., 4100-FEEINC" />
            </div>

            <div className="md:col-span-3 flex justify-end gap-2">
              {form.id && <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>}
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : (form.id ? 'Update Product' : 'Add Product')}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Saving Products</h3>
          <div className="overflow-x-auto border rounded-xl">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-muted/40">
                  <th className="text-left p-3">Code</th>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Interest</th>
                  <th className="text-left p-3">Min Bal</th>
                  <th className="text-left p-3">Monthly Fee</th>
                  <th className="text-left p-3">Active</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="p-4 text-muted-foreground">No saving products found.</td></tr>
                )}
                {filtered.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-3">{p.code}</td>
                    <td className="p-3">{p.name}</td>
                    <td className="p-3">
                      {p.interestEnabled ? `${p.interestRateAnnualPct}% (${p.interestMethod.replace('_', ' ')})` : '—'}
                    </td>
                    <td className="p-3">{p.minBalance}</td>
                    <td className="p-3">{p.monthlyFee}</td>
                    <td className="p-3">{p.active ? 'Yes' : 'No'}</td>
                    <td className="p-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => editRow(p)}>Edit</Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteRow(p)}>Delete</Button>
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

export default SavingAccountSettings;
