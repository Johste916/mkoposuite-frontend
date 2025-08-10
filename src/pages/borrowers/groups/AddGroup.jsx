import React, { useState } from 'react';

const AddGroup = () => {
  const [form, setForm] = useState({
    name: '',
    branchId: '',
    meetingDay: '',
    officerId: '',
    notes: '',
    members: [], // array of borrowerIds
  });

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const handleSubmit = async (e) => {
    e.preventDefault();
    // TODO: POST /borrowers/groups
    alert('TODO: Submit group to backend.');
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Add Group</h1>
      <div className="bg-white rounded shadow p-4 space-y-4">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600">Group Name</label>
            <input name="name" value={form.name} onChange={handleChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Branch</label>
            <input name="branchId" value={form.branchId} onChange={handleChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Meeting Day</label>
            <input name="meetingDay" value={form.meetingDay} onChange={handleChange} className="w-full border rounded px-3 py-2" placeholder="e.g., Friday" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Loan Officer</label>
            <input name="officerId" value={form.officerId} onChange={handleChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm text-gray-600">Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} className="w-full border rounded px-3 py-2" rows={3} />
          </div>
          {/* Members UI to be wired later (search + chips) */}
          <div className="md:col-span-2 flex justify-end gap-2">
            <button type="button" className="px-3 py-2 border rounded">Cancel</button>
            <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddGroup;
