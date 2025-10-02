// src/pages/user-management/Roles.jsx
import React, { useEffect, useState } from "react";
import api from "../../api";

const ui = {
  page: "w-full px-4 md:px-6 lg:px-10 py-6 text-slate-900",
  h1: "text-3xl font-extrabold tracking-tight",
  card: "rounded-2xl border-2 border-slate-300 bg-white shadow",
  th: "bg-slate-100 text-left text-[12px] uppercase tracking-wide text-slate-700 font-semibold px-3 py-2 border-2 border-slate-200",
  td: "px-3 py-2 border-2 border-slate-200 text-sm",
  field: "h-11 w-full rounded-lg border-2 border-slate-300 bg-white text-sm px-3 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-600",
  btn: "inline-flex items-center rounded-lg border-2 border-slate-300 px-3 py-2 hover:bg-slate-50 font-semibold",
  btnPrimary: "inline-flex items-center rounded-lg bg-indigo-600 text-white px-3 py-2 font-semibold hover:bg-indigo-700",
  btnDanger: "inline-flex items-center rounded-lg bg-rose-600 text-white px-3 py-2 font-semibold hover:bg-rose-700",
};

const Roles = () => {
  const [roles, setRoles] = useState([]);
  const [newRole, setNewRole] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await api.get("/roles");
      setRoles(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching roles:", err);
      alert(err?.response?.data?.error || "Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    const name = newRole.trim();
    if (!name) return alert("Please enter a role name");
    try {
      if (editId) {
        await api.put(`/roles/${editId}`, { name });
      } else {
        await api.post("/roles", { name });
      }
      setNewRole("");
      setEditId(null);
      setShowModal(false);
      fetchRoles();
    } catch (err) {
      console.error("Save role error:", err);
      alert(err?.response?.data?.error || "Error saving role");
    }
  };

  const handleEdit = (role) => {
    setNewRole(role.name);
    setEditId(role.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this role?")) return;
    try {
      await api.delete(`/roles/${id}`);
      fetchRoles();
    } catch (err) {
      console.error("Delete role error:", err);
      alert(err?.response?.data?.error || "Error deleting role");
    }
  };

  return (
    <div className={ui.page}>
      <div className="flex items-center justify-between mb-4">
        <h1 className={ui.h1}>Roles</h1>
        <button
          onClick={() => {
            setShowModal(true);
            setNewRole("");
            setEditId(null);
          }}
          className={ui.btnPrimary}
        >
          + Add Role
        </button>
      </div>

      <div className={`${ui.card} overflow-x-auto`}>
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th className={ui.th}>Role Name</th>
              <th className={`${ui.th} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={2} className={`${ui.td} text-center py-8 text-slate-600`}>Loading…</td></tr>
            ) : roles.length ? (
              roles.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className={ui.td}>{r.name}</td>
                  <td className={`${ui.td} text-right`}>
                    <div className="inline-flex gap-2">
                      <button onClick={() => handleEdit(r)} className={ui.btn}>Edit</button>
                      <button onClick={() => handleDelete(r.id)} className={ui.btnDanger}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={2} className={`${ui.td} text-center py-8 text-slate-600`}>No roles found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="w-full max-w-md rounded-2xl border-2 border-slate-300 bg-white p-5 shadow">
            <h3 className="text-lg font-bold tracking-tight mb-3">{editId ? "Edit Role" : "New Role"}</h3>
            <input
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className={`${ui.field} mb-3`}
              placeholder="Role name (e.g., Admin, Accountant)"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className={ui.btn}>Cancel</button>
              <button onClick={handleSubmit} className={ui.btnPrimary}>
                {editId ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Roles;
