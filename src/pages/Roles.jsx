// src/pages/Roles.jsx
import React, { useEffect, useState } from 'react';
import api from '../api';

const Roles = () => {
  const [roles, setRoles] = useState([]);
  const [newRole, setNewRole] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);

  const fetchRoles = async () => {
    const res = await api.get('/roles');
    setRoles(res.data);
  };

  const handleSubmit = async () => {
    if (!newRole) return alert('Please enter a role name');
    if (editId) {
      await api.put(`/roles/${editId}`, { name: newRole });
    } else {
      await api.post('/roles', { name: newRole });
    }
    setNewRole('');
    setEditId(null);
    setShowModal(false);
    fetchRoles();
  };

  const handleEdit = (role) => {
    setNewRole(role.name);
    setEditId(role.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this role?')) {
      await api.delete(`/roles/${id}`);
      fetchRoles();
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Roles</h2>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-1 rounded">
          + Add Role
        </button>
      </div>

      <table className="min-w-full bg-white border rounded">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left">Role Name</th>
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="px-4 py-2">{r.name}</td>
              <td className="px-4 py-2 text-right space-x-2">
                <button onClick={() => handleEdit(r)} className="text-blue-500">Edit</button>
                <button onClick={() => handleDelete(r.id)} className="text-red-500">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded w-full max-w-md shadow-md">
            <h3 className="text-lg font-bold mb-4">{editId ? 'Edit Role' : 'New Role'}</h3>
            <input
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full border px-3 py-2 mb-4 rounded"
              placeholder="Role name"
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
