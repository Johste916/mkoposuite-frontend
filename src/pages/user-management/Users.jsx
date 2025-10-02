// src/pages/user-management/Users.jsx
import React, { useEffect, useRef, useState } from "react";
import api from "../../api";

const emailOk = (v = "") => /.+@.+\..+/.test(v);

/* UI tokens (same feel as Loan Details) */
const ui = {
  page: "w-full px-4 md:px-6 lg:px-10 py-6 text-slate-900",
  h1: "text-3xl font-extrabold tracking-tight",
  sub: "text-sm text-slate-700",
  card: "rounded-2xl border-2 border-slate-300 bg-white shadow",
  th: "bg-slate-100 text-left text-[12px] uppercase tracking-wide text-slate-700 font-semibold px-3 py-2 border-2 border-slate-200",
  td: "px-3 py-2 border-2 border-slate-200 text-sm",
  field: "h-11 w-full rounded-lg border-2 border-slate-300 bg-white text-sm px-3 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-600",
  btn: "inline-flex items-center rounded-lg border-2 border-slate-300 px-3 py-2 hover:bg-slate-50 font-semibold",
  btnPrimary: "inline-flex items-center rounded-lg bg-indigo-600 text-white px-3 py-2 font-semibold hover:bg-indigo-700",
};

const Users = () => {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", id: null });
  const timerRef = useRef();

  const fetchUsers = async (query = "") => {
    setLoading(true);
    try {
      const res = await api.get("/users", { params: { q: query, limit: 100 } });
      const data = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setUsers(data);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchUsers(q), 300);
    return () => clearTimeout(timerRef.current);
  }, [q]);

  const openModal = (user = { name: "", email: "", id: null }) => {
    setForm(user);
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setForm({ name: "", email: "", id: null });
    setShowModal(false);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !emailOk(form.email)) return alert("Please provide a valid name and email.");
    setSaving(true);
    try {
      if (form.id) {
        await api.put(`/users/${form.id}`, { name: form.name.trim(), email: form.email.trim() });
        alert("User updated");
      } else {
        await api.post("/users", { name: form.name.trim(), email: form.email.trim() });
        alert("User created");
      }
      closeModal();
      fetchUsers(q);
    } catch (err) {
      console.error("Submit error:", err);
      alert(err?.response?.data?.error || "Error saving user");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await api.delete(`/users/${id}`);
      alert("User deleted");
      fetchUsers(q);
    } catch (err) {
      console.error("Delete error:", err);
      alert(err?.response?.data?.error || "Error deleting user");
    }
  };

  return (
    <div className={ui.page}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-4">
        <div>
          <h1 className={ui.h1}>Users</h1>
          <p className={ui.sub}>Create, edit, and search users.</p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="block text-[12px] font-semibold text-slate-600">Search</label>
            <input
              className={`${ui.field} w-64 h-10`}
              placeholder="name or email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <button className={ui.btnPrimary} onClick={() => openModal()}>
            + New User
          </button>
        </div>
      </div>

      <div className={`${ui.card} overflow-x-auto`}>
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr>
              {["#", "Name", "Email", "Actions"].map((h, i) => (
                <th key={h} className={`${ui.th} ${i === 3 ? "text-right" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className={`${ui.td} text-center py-8 text-slate-600`}>Loading…</td></tr>
            ) : users.length ? (
              users.map((u, i) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className={ui.td}>{i + 1}</td>
                  <td className={ui.td}>{u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim()}</td>
                  <td className={ui.td}>{u.email}</td>
                  <td className={`${ui.td} text-right`}>
                    <div className="inline-flex gap-2">
                      <button className={ui.btn} onClick={() => openModal(u)}>Edit</button>
                      <button className={ui.btnDanger} onClick={() => handleDelete(u.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={4} className={`${ui.td} text-center py-8 text-slate-600`}>No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={form.id ? "Edit User" : "Add New User"} onClose={closeModal}>
          <div className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-slate-600">Full name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={ui.field}
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-600">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={`${ui.field} ${form.email && !emailOk(form.email) ? "!border-rose-400" : ""}`}
              />
              {form.email && !emailOk(form.email) && (
                <div className="text-[12px] text-rose-600 mt-1">Please enter a valid email.</div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button className={ui.btn} onClick={closeModal} disabled={saving}>Cancel</button>
              <button className={`${ui.btnPrimary} disabled:opacity-50`} onClick={handleSubmit} disabled={saving}>
                {saving ? "Saving…" : form.id ? "Update" : "Create"}
              </button>
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
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border-2 border-slate-300 bg-white p-5 shadow"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold tracking-tight mb-3">{title}</h3>
        {children}
      </div>
    </div>
  );
}
