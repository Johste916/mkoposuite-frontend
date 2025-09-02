import React, { useEffect, useState } from "react";

/**
 * Generic CRUD editor for "templates" that look like:
 * { id, name, subject?, text, channel? }
 *
 * Props:
 * - title: string (UI heading)
 * - loader: () => Promise<Array>
 * - creator: (payload) => Promise<any>
 * - updater: (id, patch) => Promise<any>
 * - remover: (id) => Promise<any>
 * - fields: { showSubject?: boolean, fixedChannel?: string }
 */
export default function TextTemplateEditor({
  title = "Templates",
  loader,
  creator,
  updater,
  remover,
  fields = {},
}) {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    subject: "",
    text: "",
    channel: fields.fixedChannel || "",
  });

  async function load() {
    setErr("");
    try {
      const data = await loader();
      setRows(Array.isArray(data) ? data : (data ? [data] : []));
    } catch (e) {
      console.warn(`${title}: failed to load`, e?.response?.status, e?.response?.data);
      setRows([]);
      if (e?.response?.status === 401) setErr("You are not authorized. Please sign in again.");
    }
  }

  useEffect(() => { load(); }, []);

  async function add() {
    setErr("");
    const { name, subject, text } = form;
    if (!name.trim() || !text.trim()) {
      setErr("name and text are required");
      return;
    }
    setSaving(true);
    try {
      // send text and body for backward compatibility
      const payload = {
        name: name.trim(),
        ...(fields.showSubject ? { subject: subject.trim() } : {}),
        text: text.trim(),
        body: text.trim(),                // ✅ compat with older controllers
        ...(fields.fixedChannel ? { channel: fields.fixedChannel } : {}),
      };
      await creator(payload);
      setForm(s => ({ ...s, name: "", subject: "", text: "" }));
      await load();
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || "Create failed");
    } finally { setSaving(false); }
  }

  async function save(id, patch) {
    setErr("");
    try {
      const payload = {
        ...patch,
        ...(patch.text ? { body: patch.text } : {}), // ✅ compat
      };
      await updater(id, payload);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || "Save failed");
    }
  }

  async function remove(id) {
    if (!confirm("Delete this item?")) return;
    setErr("");
    try { await remover(id); await load(); }
    catch (e) { setErr(e?.response?.data?.error || e.message || "Delete failed"); }
  }

  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3">
      <h1 className="text-xl font-semibold">{title}</h1>
      {err && <div className="text-sm text-rose-600">{err}</div>}

      <div className="grid md:grid-cols-2 gap-3 items-start">
        <div>
          <label className="block text-xs mb-1">Name</label>
          <input
            className="w-full border rounded px-2 py-1 text-sm"
            value={form.name}
            onChange={(e)=>setForm(s=>({...s, name: e.target.value}))}
            placeholder="Welcome template"
          />
        </div>

        {fields.showSubject && (
          <div>
            <label className="block text-xs mb-1">Subject</label>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              value={form.subject}
              onChange={(e)=>setForm(s=>({...s, subject: e.target.value}))}
              placeholder="Welcome to MkopoSuite"
            />
          </div>
        )}

        <div className="md:col-span-2">
          <label className="block text-xs mb-1">Text</label>
          <textarea
            className="w-full min-h-[120px] border rounded px-2 py-1 text-sm"
            value={form.text}
            onChange={(e)=>setForm(s=>({...s, text: e.target.value}))}
            placeholder="Hello {{name}}, …"
          />
        </div>

        <div>
          <button
            onClick={add}
            disabled={saving}
            className="px-3 py-2 border rounded bg-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Add"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-xl">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left">Name</th>
              {fields.showSubject && <th className="p-2 text-left">Subject</th>}
              <th className="p-2 text-left">Preview</th>
              <th className="p-2 w-[1%]"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td className="p-3 text-slate-500" colSpan={fields.showSubject ? 4 : 3}>No items</td></tr>
            ) : rows.map(r => (
              <Row key={r.id || r._id || r.name}
                   row={r}
                   showSubject={!!fields.showSubject}
                   onSave={save}
                   onDelete={remove}/>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ row, showSubject, onSave, onDelete }) {
  const [edit, setEdit] = useState({
    name: row.name || "",
    subject: row.subject || "",
    text: row.text || row.body || "",
  });

  return (
    <tr className="border-b align-top">
      <td className="p-2">
        <input className="w-full border rounded px-2 py-1"
               value={edit.name}
               onChange={(e)=>setEdit(s=>({...s, name: e.target.value}))}/>
      </td>
      {showSubject && (
        <td className="p-2">
          <input className="w-full border rounded px-2 py-1"
                 value={edit.subject}
                 onChange={(e)=>setEdit(s=>({...s, subject: e.target.value}))}/>
        </td>
      )}
      <td className="p-2">
        <textarea className="w-full min-h-[90px] border rounded px-2 py-1"
                  value={edit.text}
                  onChange={(e)=>setEdit(s=>({...s, text: e.target.value}))}/>
      </td>
      <td className="p-2 text-right space-x-2">
        <button className="px-2 py-1 text-xs border rounded" onClick={()=>onSave(row.id || row._id, edit)}>Save</button>
        <button className="px-2 py-1 text-xs border rounded" onClick={()=>onDelete(row.id || row._id)}>Delete</button>
      </td>
    </tr>
  );
}
