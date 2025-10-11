// src/pages/user-management/Roles.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../api";

const ui = {
  page: "w-full px-4 md:px-6 lg:px-10 py-6 text-slate-900",
  h1: "text-3xl font-extrabold tracking-tight",
  card: "rounded-2xl border-2 border-slate-300 bg-white shadow",
  th: "bg-slate-100 text-left text-[12px] uppercase tracking-wide text-slate-700 font-semibold px-3 py-2 border-2 border-slate-200",
  td: "px-3 py-2 border-2 border-slate-200 text-sm",
  field: "h-11 w-full rounded-lg border-2 border-slate-300 bg-white text-sm px-3 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-600",
  textarea: "w-full rounded-lg border-2 border-slate-300 bg-white text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-600",
  btn: "inline-flex items-center rounded-lg border-2 border-slate-300 px-3 py-2 hover:bg-slate-50 font-semibold",
  btnPrimary: "inline-flex items-center rounded-lg bg-indigo-600 text-white px-3 py-2 font-semibold hover:bg-indigo-700 disabled:opacity-60",
  btnDanger: "inline-flex items-center rounded-lg bg-rose-600 text-white px-3 py-2 font-semibold hover:bg-rose-700 disabled:opacity-60",
  badge: "inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-2 py-[2px] text-xs border border-slate-300",
  muted: "text-slate-500",
};

function ErrorNote({ message }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border-2 border-rose-300 bg-rose-50 text-rose-800 text-sm px-3 py-2">
      {message}
    </div>
  );
}

const Roles = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // modal state
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");

  // delete confirmation state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [attached, setAttached] = useState([]); // [{id,name,email,role,branchId}]
  const [confirmMsg, setConfirmMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const fetchRoles = async () => {
    setErr("");
    try {
      setLoading(true);
      const res = await api.get("/roles");
      const list = Array.isArray(res.data) ? res.data : [];
      setRoles(list);
    } catch (e) {
      console.error("Error fetching roles:", e);
      setErr(e?.response?.data?.error || "Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const openCreate = () => {
    setEditId(null);
    setFormName("");
    setFormDesc("");
    setShowModal(true);
  };

  const openEdit = (role) => {
    setEditId(role.id);
    setFormName(role.name || "");
    setFormDesc(role.description || "");
    setShowModal(true);
  };

  const saveRole = async () => {
    const name = formName.trim();
    const description = formDesc.trim();
    if (!name) return alert("Please enter a role name");

    try {
      setBusy(true);
      if (editId) {
        await api.put(`/roles/${editId}`, { name, description });
      } else {
        await api.post("/roles", { name, description });
      }
      setShowModal(false);
      await fetchRoles();
    } catch (e) {
      console.error("Save role error:", e);
      alert(e?.response?.data?.error || "Error saving role");
    } finally {
      setBusy(false);
    }
  };

  const tryDelete = async (id) => {
    setErr("");
    if (!window.confirm("Delete this role?")) return;

    try {
      setBusy(true);
      await api.delete(`/roles/${id}`);
      await fetchRoles();
    } catch (e) {
      // If backend says 409, fetch attachments and open confirmation modal
      if (e?.response?.status === 409) {
        const msg = e?.response?.data?.error || "Role is attached to users";
        setConfirmMsg(msg);

        try {
          const r = await api.get(`/roles/${id}/assignments`, {
            params: { activeOnly: 1 },
          });
          const items = Array.isArray(r?.data?.items) ? r.data.items : [];
          setAttached(items);
        } catch (x) {
          console.warn("Failed to load assignments:", x);
          setAttached([]);
        }

        setDeletingId(id);
        setConfirmOpen(true);
      } else {
        console.error("Delete role error:", e);
        alert(e?.response?.data?.error || "Error deleting role");
      }
    } finally {
      setBusy(false);
    }
  };

  const forceDelete = async () => {
    if (!deletingId) return;
    try {
      setBusy(true);
      await api.delete(`/roles/${deletingId}`, { params: { force: 1 } });
      setConfirmOpen(false);
      setDeletingId(null);
      setAttached([]);
      await fetchRoles();
    } catch (e) {
      console.error("Force delete failed:", e);
      alert(e?.response?.data?.error || "Force delete failed");
    } finally {
      setBusy(false);
    }
  };

  const attachedCount = attached?.length || 0;

  const confirmDetails = useMemo(() => {
    if (!attachedCount) return "No active users are currently assigned.";
    const preview = attached.slice(0, 6);
    return (
      <div className="space-y-2">
        <div className="text-sm">
          <span className="font-semibold">{attachedCount}</span> active user
          {attachedCount > 1 ? "s are" : " is"} assigned to this role:
        </div>
        <ul className="pl-4 list-disc space-y-1">
          {preview.map((u) => (
            <li key={u.id} className="text-sm">
              <span className="font-medium">{u.name || u.email || u.id}</span>{" "}
              <span className={ui.muted}>
                {u.email ? `· ${u.email}` : ""}{" "}
                {u.role ? `· role: ${u.role}` : ""}{" "}
                {u.branchId ? `· branch: ${u.branchId}` : ""}
              </span>
            </li>
          ))}
        </ul>
        {attachedCount > preview.length && (
          <div className={ui.muted}>
            …and {attachedCount - preview.length} more.
          </div>
        )}
      </div>
    );
  }, [attached, attachedCount]);

  return (
    <div className={ui.page}>
      <div className="flex items-center justify-between mb-4">
        <h1 className={ui.h1}>Roles</h1>
        <button onClick={openCreate} className={ui.btnPrimary}>
          + Add Role
        </button>
      </div>

      <ErrorNote message={err} />

      <div className={`${ui.card} overflow-x-auto mt-3`}>
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th className={ui.th}>Role Name</th>
              <th className={ui.th}>Description</th>
              <th className={`${ui.th} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className={`${ui.td} text-center py-8 ${ui.muted}`}>
                  Loading…
                </td>
              </tr>
            ) : roles.length ? (
              roles.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className={ui.td}>
                    <span className="font-medium">{r.name}</span>{" "}
                    {r.isSystem ? <span className={ui.badge}>system</span> : null}
                  </td>
                  <td className={`${ui.td} ${ui.muted}`}>{r.description || "—"}</td>
                  <td className={`${ui.td} text-right`}>
                    <div className="inline-flex gap-2">
                      <button onClick={() => openEdit(r)} className={ui.btn}>
                        Edit
                      </button>
                      <button
                        onClick={() => tryDelete(r.id)}
                        className={ui.btnDanger}
                        disabled={busy}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className={`${ui.td} text-center py-8 ${ui.muted}`}>
                  No roles found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="w-full max-w-md rounded-2xl border-2 border-slate-300 bg-white p-5 shadow space-y-3">
            <h3 className="text-lg font-bold tracking-tight">
              {editId ? "Edit Role" : "New Role"}
            </h3>

            <label className="text-xs font-semibold text-slate-600">Role name</label>
            <input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className={ui.field}
              placeholder="Role name (e.g., Admin, Accountant)"
            />

            <label className="text-xs font-semibold text-slate-600">Description (optional)</label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              rows={3}
              className={ui.textarea}
              placeholder="What permissions or purpose does this role have?"
            />

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setShowModal(false)} className={ui.btn}>
                Cancel
              </button>
              <button onClick={saveRole} className={ui.btnPrimary} disabled={busy}>
                {editId ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm with attachments */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="w-full max-w-lg rounded-2xl border-2 border-slate-300 bg-white p-5 shadow space-y-3">
            <h3 className="text-lg font-bold tracking-tight">Can’t delete yet</h3>
            <div className={ui.muted}>{confirmMsg}</div>
            <div>{confirmDetails}</div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => {
                  setConfirmOpen(false);
                  setDeletingId(null);
                  setAttached([]);
                }}
                className={ui.btn}
              >
                Close
              </button>
              <button onClick={forceDelete} className={ui.btnDanger} disabled={busy}>
                Force delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Roles;
