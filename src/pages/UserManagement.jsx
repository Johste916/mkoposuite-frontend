// src/pages/UserManagement.jsx
import React, { useEffect, useState } from 'react';
import api from '../api.js';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [draft, setDraft] = useState({});
  const [error, setError] = useState('');

  const hydrate = (usersRes, rolesRes, branchesRes) => {
    const ux = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.items || []);
    const rx = Array.isArray(rolesRes.data) ? rolesRes.data : (rolesRes.data?.items || []);
    const bx = Array.isArray(branchesRes.data) ? branchesRes.data : (branchesRes.data?.items || []);
    setUsers(ux);
    setRoles(rx);
    setBranches(bx);
    const d = {};
    ux.forEach(u => {
      d[u.id] = {
        roleId: u.roleId ?? u.role?.id ?? '',
        branchId: u.branchId ?? '',
      };
    });
    setDraft(d);
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [usersRes, rolesRes, branchesRes] = await Promise.all([
        api.get('/users', { params: { limit: 1000 } }),
        api.get('/roles'),
        api.get('/branches'),
      ]);
      hydrate(usersRes, rolesRes, branchesRes);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const setDraftFor = (userId, patch) => {
    setDraft(prev => ({ ...prev, [userId]: { ...(prev[userId] || {}), ...patch } }));
  };

  const hasChanged = (u) => {
    const d = draft[u.id] || {};
    const roleServer = u.roleId ?? u.role?.id ?? '';
    const branchServer = u.branchId ?? '';
    return String(d.roleId || '') !== String(roleServer) || String(d.branchId || '') !== String(branchServer);
  };

  const handleSave = async (u) => {
    const userId = u.id;
    const d = draft[userId] || {};
    const payload = {
      roleId: d.roleId ? Number(d.roleId) : null,
      branchId: d.branchId ? Number(d.branchId) : null,
    };
    setSaving(s => ({ ...s, [userId]: true }));
    try {
      await api.post(`/users/${userId}/assign`, payload);
      setUsers(prev => prev.map(x => x.id === userId ? { ...x, roleId: payload.roleId, branchId: payload.branchId } : x));
      // Optional: toast bus if you have one
      // window.dispatchEvent(new CustomEvent('toast',{detail:{type:'success',message:'Assigned successfully'}}));
      alert('Assigned successfully');
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to assign');
    } finally {
      setSaving(s => ({ ...s, [userId]: false }));
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">User Management</h2>
        {!loading && <button onClick={load} className="text-sm px-3 py-1 border rounded bg-white hover:bg-gray-50">Refresh</button>}
      </div>

      {loading ? <p>Loading users...</p> : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border rounded">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Role</th>
                <th className="px-4 py-2 text-left">Branch</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-2">{u.name || `${u.firstName||''} ${u.lastName||''}`.trim() || '—'}</td>
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2">
                    <select
                      className="border rounded px-2 py-1"
                      value={draft[u.id]?.roleId ?? ''}
                      onChange={(e) => setDraftFor(u.id, { roleId: e.target.value })}
                    >
                      <option value="">— Select Role —</option>
                      {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <select
                      className="border rounded px-2 py-1"
                      value={draft[u.id]?.branchId ?? ''}
                      onChange={(e) => setDraftFor(u.id, { branchId: e.target.value })}
                    >
                      <option value="">— Select Branch —</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50"
                      disabled={!hasChanged(u) || saving[u.id]}
                      onClick={() => handleSave(u)}
                    >
                      {saving[u.id] ? 'Saving…' : 'Save'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
