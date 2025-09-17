import React, { useState } from "react";
import api from "../../../api";

const AddGroup = () => {
  const [form, setForm] = useState({
    name: "",
    branchId: "",
    meetingDay: "",
    officerId: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const res = await api.post("/borrowers/groups", {
        name: form.name,
        branchId: form.branchId || null,
        meetingDay: form.meetingDay || null,
        officerId: form.officerId || null,
        notes: form.notes || null,
      });
      setMsg("✅ Group created.");
      if (res?.data?.id) {
        // optional redirect after a short delay; keeping it non-breaking
        // window.location.assign(`/borrowers/groups/${res.data.id}`);
      }
      setForm({ name: "", branchId: "", meetingDay: "", officerId: "", notes: "" });
    } catch {
      setMsg("❌ Failed to create group");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-4">Add Group</h1>
      <form onSubmit={handleSubmit} className="space-y-3 bg-white p-4 rounded-xl border shadow">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Name</label>
          <input
            name="name"
            value={form.name}
            onChange={onChange}
            required
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Group name"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Branch</label>
            <input
              name="branchId"
              value={form.branchId}
              onChange={onChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Branch ID"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Officer</label>
            <input
              name="officerId"
              value={form.officerId}
              onChange={onChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Officer ID"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Meeting Day</label>
            <input
              name="meetingDay"
              value={form.meetingDay}
              onChange={onChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="e.g. Monday"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Notes</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={onChange}
            className="w-full border rounded-lg px-3 py-2"
            rows={3}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Create Group"}
          </button>
          {msg && <div className="text-sm">{msg}</div>}
        </div>
      </form>
    </div>
  );
};

export default AddGroup;
