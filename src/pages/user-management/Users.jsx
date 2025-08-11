// src/pages/user-management/Users.jsx
import React, { useEffect, useState } from 'react';
import api from '../../api'; // FIXED: Correct relative path

const Users = () => {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', id: null });

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const openModal = (user = { name: '', email: '', id: null }) => {
    setForm(user);
    setShowModal(true);
  };

  const closeModal = () => {
    setForm({ name: '', email: '', id: null });
    setShowModal(false);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.email) return alert('Please fill in all fields.');

    try {
      if (form.id) {
        await api.put(`/users/${form.id}`, { name: form.name, email: form.email });
        alert('User updated');
      } else {
        await api.post('/users', { name: form.name, email: form.email });
        alert('User created');
      }
      closeModal();
      fetchUsers();
    } catch (err) {
      console.error('Submit error:', err);
      alert('Error saving user');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user?')) return;

    try {
      await api.delete(`/users/${id}`);
      alert('User deleted');
      fetchUsers();
    } catch (err) {
      console.error('Delete error:', err);
      alert('Error deleting user');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Users</h2>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={() => openModal()}
        >
          + New User
        </button>
      </div>

      <table className="w-full table-auto border bg-white shadow-sm rounded">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="p-2">#</th>
            <th className="p-2">Name</th>
            <th className="p-2">Email</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, i) => (
            <tr key={u.id} className="border-t">
              <td className="p-2">{i + 1}</td>
              <td className="p-2">{u.name}</td>
              <td className="p-2">{u.email}</td>
              <td className="p-2 space-x-2">
                <button
                  className="text-blue-500 underline"
                  onClick={() => openModal(u)}
                >
                  Edit
                </button>
                <button
                  className="text-red-500 underline"
                  onClick={() => handleDelete(u.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {form.id ? 'Edit User' : 'Add New User'}
            </h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Full name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
              <div className="flex justify-end gap-2 mt-4">
                <button
                  className="px-4 py-2 bg-gray-300 rounded"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                  onClick={handleSubmit}
                >
                  {form.id ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
