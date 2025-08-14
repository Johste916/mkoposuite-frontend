// src/pages/admin/LoanTemplates.jsx
import React from "react";
import api from "../../api";
import { useSettingsResource } from "../../hooks/useSettingsResource";
import { SettingsAPI } from "../../api/settings";

// Safe ID generator (no uuid package needed)
const makeId = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export default function LoanTemplates() {
  const { data, setData, loading, saving, error, success, save } =
    useSettingsResource(
      SettingsAPI.getLoanTemplates,   // make sure these exist in SettingsAPI
      SettingsAPI.saveLoanTemplates,  // getLoanTemplates / saveLoanTemplates
      { templates: [] }
    );

  const add = () =>
    setData((p) => ({
      ...p,
      templates: [
        ...(p.templates || []),
        { id: makeId(), name: "", type: "application", fileUrl: "", active: true },
      ],
    }));

  const update = (id, patch) =>
    setData((p) => ({
      ...p,
      templates: (p.templates || []).map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));

  const remove = (id) =>
    setData((p) => ({
      ...p,
      templates: (p.templates || []).filter((t) => t.id !== id),
    }));

  const upload = async (file, id) => {
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append("file", file);
      // Adjust the endpoint if your backend expects a different path:
      // e.g. "/api/uploads/file" or "/api/uploads/template"
      const res = await api.post("/uploads/image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = res?.data?.url || "";
      update(id, { fileUrl: url });
    } catch (e) {
      console.error("Upload failed:", e);
      // Soft feedback; replace with your toast system if available
      alert(e?.response?.data?.message || e.message || "Upload failed");
    }
  };

  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;

  return (
    <div className="space-y-4">
      <header className="bg-white dark:bg-slate-900 border rounded-2xl p-4">
        <h1 className="text-xl font-semibold">Loan Templates (Applications/Agreements)</h1>
        <p className="text-sm text-slate-500">Upload and manage template files.</p>
      </header>

      {error && <div className="text-sm text-rose-600">{error}</div>}
      {success && <div className="text-sm text-emerald-600">{success}</div>}

      <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3">
        <button className="px-3 py-1.5 rounded bg-slate-100" onClick={add}>
          Add Template
        </button>

        {(data.templates || []).length === 0 ? (
          <div className="text-sm text-slate-500">No templates yet.</div>
        ) : (
          <div className="space-y-3">
            {data.templates.map((t) => (
              <div
                key={t.id}
                className="p-3 border rounded-lg grid grid-cols-1 md:grid-cols-6 gap-2"
              >
                {/* Name */}
                <input
                  className="rounded border px-3 py-2 text-sm"
                  placeholder="Name"
                  value={t.name || ""}
                  onChange={(e) => update(t.id, { name: e.target.value })}
                />

                {/* Type */}
                <select
                  className="rounded border px-3 py-2 text-sm"
                  value={t.type || "application"}
                  onChange={(e) => update(t.id, { type: e.target.value })}
                >
                  <option value="application">Application</option>
                  <option value="agreement">Agreement</option>
                  <option value="collateral">Collateral</option>
                </select>

                {/* File upload */}
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.odt,.rtf,.png,.jpg,.jpeg"
                    onChange={(e) => upload(e.target.files?.[0], t.id)}
                    className="text-sm"
                  />
                  {t.fileUrl ? (
                    <a
                      href={t.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 text-sm underline"
                    >
                      View
                    </a>
                  ) : (
                    <span className="text-xs text-slate-500">No file</span>
                  )}
                </div>

                {/* Active */}
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!t.active}
                    onChange={(e) => update(t.id, { active: e.target.checked })}
                  />
                  Active
                </label>

                {/* Actions */}
                <div className="md:col-span-2 flex items-center gap-2">
                  <button
                    className="px-3 py-1.5 rounded bg-rose-50 text-rose-700"
                    onClick={() => remove(t.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm"
        disabled={saving}
        onClick={() => save()}
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
