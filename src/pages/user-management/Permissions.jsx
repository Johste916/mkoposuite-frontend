// src/pages/user-management/Permissions.jsx
import React, { useEffect, useState } from "react";
import api from "../../api";

/**
 * Permissions admin:
 *  GET    /permissions
 *  POST   /permissions
 *  DELETE /permissions/:id
 */

export default function Permissions() {
  const [permissions, setPermissions] = useState([]);
  const [newPermission, setNewPermission] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const res = await api.get("/permissions");
      setPermissions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load permissions", err);
      alert(err?.response?.data?.error || "Failed to load permissions");
    } finally {
      setLoading(false);
    }
  };

  const addPermission = async () => {
    const name = newPermission.trim();
    if (!name) return;
    setSaving(true);
    try {
      await api.post("/permissions", { name });
      setNewPermission("");
      loadPermissions();
    } catch (err) {
      console.error("Failed to add permission", err);
      alert(err?.response?.data?.error || "Error adding permission");
    } finally {
      setSaving(false);
    }
  };

  const deletePermission = async (id) => {
    if (!window.confirm("Delete this permission?")) return;
    try {
      await api.delete(`/permissions/${id}`);
      loadPermissions();
    } catch (err) {
      console.error("Failed to delete permission", err);
      alert(err?.response?.data?.error || "Error deleting permission");
    }
  };

  useEffect(() => {
    loadPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Permissions</h1>
        <div className="flex gap-2">
          <input
            type="text"
            className="border px-3 py-2 rounded w-64"
            placeholder="New permission (e.g., loan.approve)"
            value={newPermission}
            onChange={(e) => setNewPermission(e.target.value)}
          />
          <button
            onClick={addPermission}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
            disabled={saving}
          >
            {saving ? "Saving…" : "Add"}
          </button>
        </div>
      </div>

      <div className="bg-white border rounded overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-3 py-2 text-left">ID</th>
              <th className="border px-3 py-2 text-left">Name</th>
              <th className="border px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="text-center py-6 text-gray-500">Loading…</td></tr>
            ) : permissions.length ? (
              permissions.map((p) => (
                <tr key={p.id}>
                  <td className="border px-3 py-2">{p.id}</td>
                  <td className="border px-3 py-2">{p.name}</td>
                  <td className="border px-3 py-2 text-right">
                    <button
                      onClick={() => deletePermission(p.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={3} className="text-center py-6 text-gray-500">No permissions found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
