import React, { useEffect, useState } from 'react';
import api from '../api';

const Branches = () => {
  const [branches, setBranches] = useState([]);
  const [newBranch, setNewBranch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const res = await api.get('/branches');
      // API returns { data: [...], meta: {...} }; but keep compat if array
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setBranches(list);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newBranch) return alert('Please enter branch name');
    if (editId) {
      await api.put(`/branches/${editId}`, { name: newBranch });
    } else {
      await api.post('/branches', { name: newBranch }); // code auto-generated backend
    }
    setNewBranch('');
    setEditId(null);
    setShowModal(false);
    fetchBranches();
  };

  const handleEdit = (branch) => {
    setNewBranch(branch.name);
    setEditId(branch.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this branch?')) {
      await api.delete(`/branches/${id}`);
      fetchBranches();
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Branches</h2>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-1 rounded">
          + Add Branch
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : (
        <table className="min-w-full bg-white border rounded">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Code</th>
              <th className="px-4 py-2 text-left">City</th>
              <th className="px-4 py-2 text-left">Phone</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="px-4 py-2">{b.name}</td>
                <td className="px-4 py-2">{b.code || '-'}</td>
                <td className="px-4 py-2">{b.city || '-'}</td>
                <td className="px-4 py-2">{b.phone || '-'}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button onClick={() => handleEdit(b)} className="text-blue-600 hover:underline">Edit</button>
                  <button onClick={() => handleDelete(b.id)} className="text-rose-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
            {!branches.length && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                  No branches yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white dark:bg-slate-900 p-6 rounded w-full max-w-md shadow-md">
            <h3 className="text-lg font-bold mb-4">{editId ? 'Edit Branch' : 'New Branch'}</h3>
            <input
              value={newBranch}
              onChange={(e) => setNewBranch(e.target.value)}
              className="w-full border px-3 py-2 mb-4 rounded"
              placeholder="Branch name"
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

export default Branches;
