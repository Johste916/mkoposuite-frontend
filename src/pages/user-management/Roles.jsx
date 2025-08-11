// src/pages/user-management/Roles.jsx
import React, { useEffect, useState } from 'react';
import api from '../../api';

const Roles = () => {
  const [roles, setRoles] = useState([]);
  const [newRole, setNewRole] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await api.get('/roles');
      setRoles(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching roles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newRole.trim()) return alert('Please enter a role name');
    try {
      if (editId) {
        await api.put(`/roles/${editId}`, { name: newRole.trim() });
      } else {
        await api.post('/roles', { name: newRole.trim() });
      }
      setNewRole('');
      setEditId(null);
      setShowModal(false);
      fetchRoles();
    } catch (err) {
      console.error('Save role error:', err);
      alert(err?.response?.data?.error || 'Error saving role');
    }
  };

  const handleEdit = (role) => {
    setNewRole(role.name);
    setEditId(role.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this role?')) return;
    try {
      await api.delete(`/roles/${id}`);
      fetchRoles();
    } catch (err) {
      console.error('Delete role error:', err);
      alert(err?.response?.data?.error || 'Error deleting role');
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Roles</h2>
        <button
          onClick={() => { setShowModal(true); setNewRole(''); setEditId(null); }}
          className="bg-blue-600 text-white px-4 py-1 rounded"
        >
          + Add Role
        </button>
      </div>

      <div className="bg-white border rounded">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Role Name</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="2" className="px-4 py-6 text-center text-gray-500">Loading…</td></tr>
            ) : roles.length ? (
              roles.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2">{r.name}</td>
                  <td className="px-4 py-2 text-right space-x-3">
                    <button onClick={() => handleEdit(r)} className="text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => handleDelete(r.id)} className="text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="2" className="px-4 py-6 text-center text-gray-500">No roles found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded w-full max-w-md shadow-md">
            <h3 className="text-lg font-bold mb-4">{editId ? 'Edit Role' : 'New Role'}</h3>
            <input
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full border px-3 py-2 mb-4 rounded"
              placeholder="Role name (e.g., Admin, Accountant)"
            />
            <div className="flex justify-end space-x-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-1 rounded border">Cancel</button>
              <button onClick={handleSubmit} className="bg-blue-600 text-white px-4 py-1 rounded">
                {editId ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Roles;
