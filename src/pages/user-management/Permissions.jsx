// src/pages/user-management/Permissions.jsx
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
    <div className={ui.page}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
        <h1 className={ui.h1}>Permissions</h1>
        <div className="flex gap-2">
          <input
            type="text"
            className={`${ui.field} w-72 h-10`}
            placeholder="New permission (e.g., loan.approve)"
            value={newPermission}
            onChange={(e) => setNewPermission(e.target.value)}
          />
          <button onClick={addPermission} className={`${ui.btnPrimary} disabled:opacity-60`} disabled={saving}>
            {saving ? "Saving…" : "Add"}
          </button>
        </div>
      </div>

      <div className={`${ui.card} overflow-x-auto`}>
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr>
              {["ID", "Name", "Actions"].map((h, i) => (
                <th key={h} className={`${ui.th} ${i === 2 ? "text-right" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className={`${ui.td} text-center py-8 text-slate-600`}>Loading…</td></tr>
            ) : permissions.length ? (
              permissions.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className={ui.td}>{p.id}</td>
                  <td className={ui.td}>{p.name}</td>
                  <td className={`${ui.td} text-right`}>
                    <button onClick={() => deletePermission(p.id)} className={ui.btnDanger}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={3} className={`${ui.td} text-center py-8 text-slate-600`}>No permissions found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
