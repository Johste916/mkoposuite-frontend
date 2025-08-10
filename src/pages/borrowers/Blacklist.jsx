import React, { useState } from 'react';

const BorrowerBlacklist = () => {
  const [form, setForm] = useState({
    borrowerId: '',
    reason: '',
    until: '',
  });

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const onSubmit = async (e) => {
    e.preventDefault();
    // TODO: POST /borrowers/blacklist
    alert('TODO: blacklist borrower');
  };

  // TODO: GET /borrowers/blacklist (list)
  const rows = [];

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-semibold">Borrower Blacklist</h1>

      <form onSubmit={onSubmit} className="bg-white rounded shadow p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm text-gray-600">Borrower ID</label>
          <input name="borrowerId" value={form.borrowerId} onChange={onChange} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="text-sm text-gray-600">Until (optional)</label>
          <input type="date" name="until" value={form.until} onChange={onChange} className="w-full border rounded px-3 py-2" />
        </div>
        <div className="md:col-span-3">
          <label className="text-sm text-gray-600">Reason</label>
          <textarea name="reason" value={form.reason} onChange={onChange} className="w-full border rounded px-3 py-2" rows={3} />
        </div>
        <div className="md:col-span-3 flex justify-end gap-2">
          <button type="button" className="px-3 py-2 border rounded">Cancel</button>
          <button type="submit" className="px-3 py-2 bg-red-600 text-white rounded">Blacklist</button>
        </div>
      </form>

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">Borrower</th>
              <th className="text-left p-2">Reason</th>
              <th className="text-left p-2">Until</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td className="p-4 text-gray-500" colSpan={4}>No entries.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.borrowerName}</td>
                <td className="p-2">{r.reason}</td>
                <td className="p-2">{r.until || '—'}</td>
                <td className="p-2">
                  <button className="px-2 py-1 border rounded">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BorrowerBlacklist;
