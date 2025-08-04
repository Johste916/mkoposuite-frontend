// src/pages/UserManagement.jsx
import React, { useEffect, useState } from 'react';
import api from '../api.js';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, rolesRes, branchesRes] = await Promise.all([
          api.get('/users'),
          api.get('/roles'),
          api.get('/branches'),
        ]);
        setUsers(usersRes.data);
        setRoles(rolesRes.data);
        setBranches(branchesRes.data);
      } catch (err) {
        console.error('Error loading user data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAssign = async (userId, roleId, branchId) => {
    try {
      await api.post(`/users/${userId}/assign`, { roleId, branchId });
      alert('Assigned successfully');
    } catch (err) {
      console.error('Assign error:', err);
      alert('Failed to assign');
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">User Management</h2>
      {loading ? (
        <p>Loading users...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border rounded">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Branch</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t">
                  <td className="px-4 py-2">{user.name}</td>
                  <td className="px-4 py-2">{user.email}</td>
                  <td className="px-4 py-2">
                    <select
                      defaultValue={user.roleId || ''}
                      onChange={(e) => handleAssign(user.id, e.target.value, user.branchId)}
                    >
                      <option value="">--Select Role--</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <select
                      defaultValue={user.branchId || ''}
                      onChange={(e) => handleAssign(user.id, user.roleId, e.target.value)}
                    >
                      <option value="">--Select Branch--</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      className="bg-blue-500 text-white px-3 py-1 rounded"
                      onClick={() => handleAssign(user.id, user.roleId, user.branchId)}
                    >
                      Save
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
