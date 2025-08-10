import React, { useState } from 'react';

const BorrowerKYC = () => {
  const [form, setForm] = useState({
    borrowerId: '',
    idType: 'national_id',
    idNumber: '',
    idExpiry: '',
    addressProof: '',
    riskRating: 'low',
    pep: false,
    documents: [],
  });

  const onChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === 'checkbox') return setForm((f) => ({ ...f, [name]: checked }));
    if (type === 'file') return setForm((f) => ({ ...f, documents: Array.from(files || []) }));
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    // TODO: POST /borrowers/kyc
    alert('TODO: submit KYC');
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Borrower KYC</h1>
      <form onSubmit={onSubmit} className="bg-white rounded shadow p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-gray-600">Borrower ID</label>
          <input name="borrowerId" value={form.borrowerId} onChange={onChange} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="text-sm text-gray-600">ID Type</label>
          <select name="idType" value={form.idType} onChange={onChange} className="w-full border rounded px-3 py-2">
            <option value="national_id">National ID</option>
            <option value="passport">Passport</option>
            <option value="driver_license">Driver License</option>
            <option value="voter_id">Voter ID</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-600">ID Number</label>
          <input name="idNumber" value={form.idNumber} onChange={onChange} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="text-sm text-gray-600">ID Expiry</label>
          <input type="date" name="idExpiry" value={form.idExpiry} onChange={onChange} className="w-full border rounded px-3 py-2" />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm text-gray-600">Address Proof</label>
          <input name="addressProof" value={form.addressProof} onChange={onChange} className="w-full border rounded px-3 py-2" placeholder="e.g., Utility bill" />
        </div>
        <div>
          <label className="text-sm text-gray-600">Risk Rating</label>
          <select name="riskRating" value={form.riskRating} onChange={onChange} className="w-full border rounded px-3 py-2">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="pep" checked={form.pep} onChange={onChange} /> Politically Exposed Person (PEP)
        </label>
        <div className="md:col-span-2">
          <label className="text-sm text-gray-600">Upload Documents</label>
          <input type="file" multiple onChange={onChange} />
          <div className="text-xs text-gray-500">Accepted: PDF/JPG/PNG</div>
        </div>
        <div className="md:col-span-2 flex justify-end gap-2">
          <button type="button" className="px-3 py-2 border rounded">Cancel</button>
          <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded">Save</button>
        </div>
      </form>
    </div>
  );
};

export default BorrowerKYC;
