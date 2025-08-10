import React, { useState } from 'react';

const AddBorrower = () => {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    nationalId: '',
    branchId: '',
    officerId: '',
    address: '',
    notes: '',
  });

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const onSubmit = async (e) => {
    e.preventDefault();
    // TODO: POST /borrowers
    alert('TODO: create borrower');
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Add Borrower</h1>
      <form onSubmit={onSubmit} className="bg-white rounded shadow p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-gray-600">First Name</label>
          <input name="firstName" value={form.firstName} onChange={onChange} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="text-sm text-gray-600">Last Name</label>
          <input name="lastName" value={form.lastName} onChange={onChange} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="text-sm text-gray-600">Phone</label>
          <input name="phone" value={form.phone} onChange={onChange} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="text-sm text-gray-600">Email</label>
          <input name="email" value={form.email} onChange={onChange} className="w-full border rounded px-3 py-2" type="email" />
        </div>
        <div>
          <label className="text-sm text-gray-600">National ID</label>
          <input name="nationalId" value={form.nationalId} onChange={onChange} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="text-sm text-gray-600">Branch</label>
          <input name="branchId" value={form.branchId} onChange={onChange} className="w-full border rounded px-3 py-2" placeholder="branch id" />
        </div>
        <div>
          <label className="text-sm text-gray-600">Loan Officer</label>
          <input name="officerId" value={form.officerId} onChange={onChange} className="w-full border rounded px-3 py-2" placeholder="officer id" />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm text-gray-600">Address</label>
          <input name="address" value={form.address} onChange={onChange} className="w-full border rounded px-3 py-2" />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm text-gray-600">Notes</label>
          <textarea name="notes" value={form.notes} onChange={onChange} className="w-full border rounded px-3 py-2" rows={3} />
        </div>
        <div className="md:col-span-2 flex justify-end gap-2">
          <button type="button" className="px-3 py-2 border rounded">Cancel</button>
          <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded">Save</button>
        </div>
      </form>
    </div>
  );
};

export default AddBorrower;
