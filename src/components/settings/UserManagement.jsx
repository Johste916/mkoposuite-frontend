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

const PERM_GROUPS = [
  {
    key: 'loans',
    label: 'Loans',
    perms: ['view', 'create', 'approve', 'edit', 'delete', 'disburse', 'collect'],
  },
  {
    key: 'borrowers',
    label: 'Borrowers',
    perms: ['view', 'create', 'edit', 'delete', 'export'],
  },
  {
    key: 'savings',
    label: 'Savings',
    perms: ['view', 'create', 'deposit', 'withdraw', 'edit', 'delete'],
  },
  {
    key: 'reports',
    label: 'Reports',
    perms: ['view', 'export', 'schedule'],
  },
  {
    key: 'settings',
    label: 'Settings',
    perms: ['view', 'edit', 'integrations', 'security'],
  },
  {
    key: 'users',
    label: 'Users & Roles',
    perms: ['view', 'invite', 'edit', 'disable', 'reset_password', 'reset_2fa'],
  },
];

const emptyRole = {
  id: null,
  name: '',
  description: '',
  active: true,
  permissions: {}, // { "loans.view": true, "loans.create": false, ... }
};

const emptyInvite = {
  email: '',
  firstName: '',
  lastName: '',
  roleId: '',
  branchId: '',
  sendEmail: true,
  message: '',
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

const UserManagementSettings = () => {
  const [loading, setLoading] = useState(false);

  // Users
  const [users, setUsers] = useState([]);
  const [uQuery, setUQuery] = useState('');
  const [uStatus, setUStatus] = useState('all'); // all|active|disabled
  const filteredUsers = useMemo(() => {
    const q = uQuery.toLowerCase().trim();
    return users
      .filter(u => (uStatus === 'all' ? true : uStatus === 'active' ? u.active : !u.active))
      .filter(u => !q || [u.email, u.firstName, u.lastName].some(x => x?.toLowerCase().includes(q)));
  }, [users, uQuery, uStatus]);

  // Roles
  const [roles, setRoles] = useState([]);
  const [roleForm, setRoleForm] = useState(emptyRole);

  // Branches for scoping users (optional)
  const [branches, setBranches] = useState([{ id: '', name: '— None —' }]);

  // Invite
  const [invite, setInvite] = useState(emptyInvite);
  const canSaveRole = roleForm.name?.trim();

  const loadAll = async () => {
    setLoading(true);
    try {
      const [{ data: U }, { data: R }, { data: B }] = await Promise.all([
        axios.get('/api/settings/users'),
        axios.get('/api/settings/roles'),
        axios.get('/api/settings/branches'),
      ]);
      setUsers(U || []);
      setRoles(R || []);
      if (B?.length) setBranches([{ id: '', name: '— None —' }, ...B]);
    } catch {
      toast.error('Failed to load user management data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  // ---- Role Helpers ----
  const togglePerm = (groupKey, permKey, value) => {
    const key = `${groupKey}.${permKey}`;
    setRoleForm(r => ({ ...r, permissions: { ...r.permissions, [key]: value } }));
  };
  const setAllInGroup = (groupKey, value) => {
    setRoleForm(r => {
      const next = { ...r.permissions };
      const grp = PERM_GROUPS.find(g => g.key === groupKey);
      grp.perms.forEach(p => { next[`${groupKey}.${p}`] = value; });
      return { ...r, permissions: next };
    });
  };
  const resetRoleForm = () => setRoleForm(emptyRole);

  const saveRole = async (e) => {
    e?.preventDefault?.();
    try {
      if (roleForm.id) {
        await axios.put(`/api/settings/roles/${roleForm.id}`, roleForm);
        toast.success('Role updated');
      } else {
        await axios.post('/api/settings/roles', roleForm);
        toast.success('Role created');
      }
      resetRoleForm();
      const { data } = await axios.get('/api/settings/roles');
      setRoles(data || []);
    } catch {
      toast.error('Saving role failed');
    }
  };

  const editRole = (r) => setRoleForm({ ...r });
  const deleteRole = async (r) => {
    if (!confirm(`Delete role "${r.name}"?`)) return;
    try {
      await axios.delete(`/api/settings/roles/${r.id}`);
      setRoles(rs => rs.filter(x => x.id !== r.id));
      toast.success('Role deleted');
    } catch {
      toast.error('Delete role failed');
    }
  };

  // ---- User Actions ----
  const disableUser = async (u) => {
    try {
      await axios.put(`/api/settings/users/${u.id}/status`, { active: false });
      setUsers(arr => arr.map(x => x.id === u.id ? { ...x, active: false } : x));
      toast.success('User disabled');
    } catch { toast.error('Failed to disable'); }
  };
  const enableUser = async (u) => {
    try {
      await axios.put(`/api/settings/users/${u.id}/status`, { active: true });
      setUsers(arr => arr.map(x => x.id === u.id ? { ...x, active: true } : x));
      toast.success('User enabled');
    } catch { toast.error('Failed to enable'); }
  };
  const changeUserRole = async (u, roleId) => {
    try {
      await axios.put(`/api/settings/users/${u.id}/role`, { roleId });
      setUsers(arr => arr.map(x => x.id === u.id ? { ...x, roleId } : x));
      toast.success('Role updated');
    } catch { toast.error('Failed to update role'); }
  };
  const resetPassword = async (u) => {
    try {
      await axios.post(`/api/settings/users/${u.id}/reset-password`);
      toast.success('Password reset link sent');
    } catch { toast.error('Failed to send reset'); }
  };
  const reset2FA = async (u) => {
    try {
      await axios.post(`/api/settings/users/${u.id}/reset-2fa`);
      toast.success('2FA reset');
    } catch { toast.error('Failed to reset 2FA'); }
  };

  // ---- Invite ----
  const handleInviteChange = (e) => {
    const { name, value, type, checked } = e.target;
    setInvite((s) => ({ ...s, [name]: type === 'checkbox' ? checked : value }));
  };
  const sendInvite = async (e) => {
    e?.preventDefault?.();
    if (!invite.email || !invite.roleId) return toast.error('Email and Role are required');
    try {
      await axios.post('/api/settings/users/invite', invite);
      toast.success('Invitation sent');
      setInvite(emptyInvite);
      const { data } = await axios.get('/api/settings/users');
      setUsers(data || []);
    } catch {
      toast.error('Failed to send invite');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="p-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">User & Role Management</h2>
            <p className="text-sm text-muted-foreground">Invite users, assign roles, and control permissions.</p>
          </div>
          <Button onClick={loadAll} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</Button>
        </CardContent>
      </Card>

      {/* Invite */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Invite User</h3>
          <form onSubmit={sendInvite} className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" name="email" value={invite.email} onChange={handleInviteChange} />
            </div>
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input name="firstName" value={invite.firstName} onChange={handleInviteChange} />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input name="lastName" value={invite.lastName} onChange={handleInviteChange} />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={invite.roleId} onValueChange={(v) => setInvite(s => ({ ...s, roleId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {roles.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Branch (optional)</Label>
              <Select value={invite.branchId} onValueChange={(v) => setInvite(s => ({ ...s, branchId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  {branches.map(b => <SelectItem key={b.id || 'none'} value={String(b.id || '')}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Welcome Message (optional)</Label>
              <Textarea name="message" rows={2} value={invite.message} onChange={handleInviteChange} />
            </div>

            <Row
              title="Send Email Invitation"
              control={
                <Switch
                  checked={!!invite.sendEmail}
                  onCheckedChange={(v) => setInvite(s => ({ ...s, sendEmail: v }))}
                />
              }
            />

            <div className="md:col-span-3 flex justify-end">
              <Button type="submit">Send Invite</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Roles */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{roleForm.id ? 'Edit Role' : 'Create Role'}</h3>
            {roleForm.id && <Button variant="secondary" onClick={() => setRoleForm(emptyRole)}>New Role</Button>}
          </div>

          <form onSubmit={saveRole} className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Role Name</Label>
                <Input name="name" value={roleForm.name} onChange={(e) => setRoleForm(r => ({ ...r, name: e.target.value }))} />
              </div>
              <Row
                title="Active"
                control={<Switch checked={!!roleForm.active} onCheckedChange={(v) => setRoleForm(r => ({ ...r, active: v }))} />}
              />
              <div className="space-y-2 md:col-span-3">
                <Label>Description</Label>
                <Textarea rows={2} value={roleForm.description} onChange={(e) => setRoleForm(r => ({ ...r, description: e.target.value }))} />
              </div>
            </div>

            {/* Permissions matrix */}
            <div className="space-y-3">
              <Label className="font-medium">Permissions</Label>
              <div className="overflow-x-auto border rounded-xl">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="text-left p-3">Module</th>
                      {PERM_GROUPS[0].perms.map((_, i) => <th key={i} className="text-center p-3">Perm {i+1}</th>)}
                      <th className="text-right p-3">All</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PERM_GROUPS.map(group => (
                      <tr key={group.key} className="border-t align-top">
                        <td className="p-3">
                          <div className="font-medium">{group.label}</div>
                          <div className="text-xs text-muted-foreground">{group.perms.join(' · ')}</div>
                        </td>
                        {group.perms.map(perm => {
                          const key = `${group.key}.${perm}`;
                          const checked = !!roleForm.permissions[key];
                          return (
                            <td key={key} className="p-3 text-center">
                              <Switch checked={checked} onCheckedChange={(v) => togglePerm(group.key, perm, v)} />
                            </td>
                          );
                        })}
                        <td className="p-3 text-right">
                          <Button type="button" variant="outline" onClick={() => setAllInGroup(group.key, true)} className="mr-2">All</Button>
                          <Button type="button" variant="ghost" onClick={() => setAllInGroup(group.key, false)}>None</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              {roleForm.id && <Button type="button" variant="secondary" onClick={resetRoleForm}>Cancel</Button>}
              <Button type="submit" disabled={!canSaveRole}>{roleForm.id ? 'Update Role' : 'Create Role'}</Button>
            </div>
          </form>

          {/* Roles list */}
          <div className="pt-6">
            <h4 className="font-medium mb-2">Existing Roles</h4>
            <div className="overflow-x-auto border rounded-xl">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-muted/40">
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">Description</th>
                    <th className="text-left p-3">Active</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.length === 0 && (
                    <tr><td colSpan={4} className="p-4 text-muted-foreground">No roles yet.</td></tr>
                  )}
                  {roles.map(r => (
                    <tr key={r.id} className="border-t">
                      <td className="p-3">{r.name}</td>
                      <td className="p-3">{r.description || '—'}</td>
                      <td className="p-3">{r.active ? 'Yes' : 'No'}</td>
                      <td className="p-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" onClick={() => editRole(r)}>Edit</Button>
                          <Button size="sm" variant="destructive" onClick={() => deleteRole(r)}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Users table */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold">Users</h3>
            <div className="flex items-center gap-2">
              <Input placeholder="Search email or name…" value={uQuery} onChange={(e) => setUQuery(e.target.value)} className="w-64" />
              <Select value={uStatus} onValueChange={setUStatus}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto border rounded-xl">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-muted/40">
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Role</th>
                  <th className="text-left p-3">Branch</th>
                  <th className="text-left p-3">2FA</th>
                  <th className="text-left p-3">Active</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 && (
                  <tr><td colSpan={7} className="p-4 text-muted-foreground">No users found.</td></tr>
                )}
                {filteredUsers.map(u => (
                  <tr key={u.id} className="border-t">
                    <td className="p-3">{u.firstName} {u.lastName}</td>
                    <td className="p-3">{u.email}</td>
                    <td className="p-3">
                      <Select value={String(u.roleId || '')} onValueChange={(v) => changeUserRole(u, v)}>
                        <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {roles.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3">{branches.find(b => String(b.id) === String(u.branchId))?.name || '—'}</td>
                    <td className="p-3">{u.has2FA ? 'Enabled' : '—'}</td>
                    <td className="p-3">{u.active ? 'Yes' : 'No'}</td>
                    <td className="p-3 text-right">
                      <div className="flex gap-2 justify-end">
                        {u.active
                          ? <Button size="sm" variant="destructive" onClick={() => disableUser(u)}>Disable</Button>
                          : <Button size="sm" variant="outline" onClick={() => enableUser(u)}>Enable</Button>}
                        <Button size="sm" variant="outline" onClick={() => resetPassword(u)}>Reset Password</Button>
                        <Button size="sm" variant="secondary" onClick={() => reset2FA(u)}>Reset 2FA</Button>
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

export default UserManagementSettings;
