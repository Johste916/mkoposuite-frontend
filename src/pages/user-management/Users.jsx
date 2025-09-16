// src/pages/user-management/Users.jsx
import React, { useEffect, useRef, useState } from 'react';
import api from '../../api';

const emailOk = (v='') => /.+@.+\..+/.test(v);

const Users = () => {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', id: null });
  const timerRef = useRef();

  const fetchUsers = async (query='') => {
    setLoading(true);
    try {
      const res = await api.get('/users', { params: { q: query, limit: 100 } });
      const data = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchUsers(q), 300);
    return () => clearTimeout(timerRef.current);
  }, [q]);

  const openModal = (user = { name: '', email: '', id: null }) => {
    setForm(user);
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setForm({ name: '', email: '', id: null });
    setShowModal(false);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !emailOk(form.email)) return alert('Please provide a valid name and email.');
    setSaving(true);
    try {
      if (form.id) {
        await api.put(`/users/${form.id}`, { name: form.name.trim(), email: form.email.trim() });
        alert('User updated');
      } else {
        await api.post('/users', { name: form.name.trim(), email: form.email.trim() });
        alert('User created');
      }
      closeModal();
      fetchUsers(q);
    } catch (err) {
      console.error('Submit error:', err);
      alert(err?.response?.data?.error || 'Error saving user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      alert('User deleted');
      fetchUsers(q);
    } catch (err) {
      console.error('Delete error:', err);
      alert(err?.response?.data?.error || 'Error deleting user');
    }
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex justify-between items-end gap-2">
        <div>
          <h2 className="text-xl font-bold">Users</h2>
          <p className="text-xs text-gray-500">Create, edit, and search users.</p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="block text-xs text-gray-500">Search</label>
            <input
              className="border rounded px-3 py-2 w-64"
              placeholder="name or email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => openModal()}>
            + New User
          </button>
        </div>
      </div>

      <div className="bg-white border rounded">
        <table className="w-full table-auto">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-2">#</th>
              <th className="p-2">Name</th>
              <th className="p-2">Email</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" className="p-4 text-center text-gray-500">Loading…</td></tr>
            ) : users.length ? (
              users.map((u, i) => (
                <tr key={u.id} className="border-t">
                  <td className="p-2">{i + 1}</td>
                  <td className="p-2">{u.name || `${u.firstName||''} ${u.lastName||''}`.trim()}</td>
                  <td className="p-2">{u.email}</td>
                  <td className="p-2 space-x-2">
                    <button className="text-blue-500 underline" onClick={() => openModal(u)}>Edit</button>
                    <button className="text-red-500 underline" onClick={() => handleDelete(u.id)}>Delete</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="4" className="p-4 text-center text-gray-500">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={form.id ? 'Edit User' : 'Add New User'} onClose={closeModal}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500">Full name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded" />
            </div>
            <div>
              <label className="block text-xs text-gray-500">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={`w-full px-3 py-2 border rounded ${form.email && !emailOk(form.email) ? 'border-red-400' : ''}`} />
              {form.email && !emailOk(form.email) && <div className="text-xs text-red-600 mt-1">Please enter a valid email.</div>}
            </div>
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 bg-gray-200 rounded" onClick={closeModal} disabled={saving}>Cancel</button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : (form.id ? 'Update' : 'Create')}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Users;

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}
