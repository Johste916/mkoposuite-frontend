// src/components/RepaymentModal.jsx
import React, { useState } from 'react';
import axios from 'axios';

const RepaymentModal = ({ isOpen, onClose, borrowerId, onSaved }) => {
  const [form, setForm] = useState({
    amount: '',
    date: '',
    method: 'manual',
  });
  const [loading, setLoading] = useState(false);
  const API = import.meta.env.VITE_API_BASE_URL;

  const handleSave = async () => {
    if (!form.amount || !form.date) return alert('Fill all fields');
    setLoading(true);
    try {
      await axios.post(`${API}/repayments`, {
        borrowerId,
        ...form,
      });
      onSaved();
      onClose();
    } catch (err) {
      alert('Failed to save repayment');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-md space-y-4">
        <h2 className="text-xl font-bold">Add Manual Repayment</h2>
        <input
          type="number"
          placeholder="Amount"
          className="w-full border px-3 py-2 rounded"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />
        <input
          type="date"
          className="w-full border px-3 py-2 rounded"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RepaymentModal;
