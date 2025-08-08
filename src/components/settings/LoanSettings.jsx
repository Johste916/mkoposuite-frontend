import React, { useEffect, useState } from 'react';
import axios from 'axios';

const LoanSettings = () => {
  const [formData, setFormData] = useState({
    defaultLoanAmount: '',
    maxLoanAmount: '',
    interestRate: '',
    loanTermMonths: '',
    requireGuarantor: false,
    allowTopUp: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Load loan settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get('/api/settings/loan-settings', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        if (res.data) {
          setFormData(prev => ({
            ...prev,
            ...res.data,
          }));
        }
      } catch (err) {
        console.error('Failed to fetch loan settings:', err);
        setMessage('Error loading settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Handle input change
  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Save settings
  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await axios.put(
        '/api/settings/loan-settings',
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      setMessage('✅ Loan settings saved successfully');
    } catch (err) {
      console.error('Error saving loan settings:', err);
      setMessage('❌ Failed to save loan settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>Loading loan settings...</p>;

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white shadow rounded">
      <h2 className="text-2xl font-semibold mb-4">Loan Settings</h2>

      {message && (
        <div className="mb-4 text-sm text-gray-700 bg-gray-100 p-2 rounded">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        <div>
          <label className="block font-medium">Default Loan Amount</label>
          <input
            type="number"
            name="defaultLoanAmount"
            value={formData.defaultLoanAmount}
            onChange={handleChange}
            className="form-input w-full"
          />
        </div>

        <div>
          <label className="block font-medium">Maximum Loan Amount</label>
          <input
            type="number"
            name="maxLoanAmount"
            value={formData.maxLoanAmount}
            onChange={handleChange}
            className="form-input w-full"
          />
        </div>

        <div>
          <label className="block font-medium">Interest Rate (%)</label>
          <input
            type="number"
            name="interestRate"
            value={formData.interestRate}
            onChange={handleChange}
            step="0.01"
            className="form-input w-full"
          />
        </div>

        <div>
          <label className="block font-medium">Loan Term (Months)</label>
          <input
            type="number"
            name="loanTermMonths"
            value={formData.loanTermMonths}
            onChange={handleChange}
            className="form-input w-full"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            name="requireGuarantor"
            checked={formData.requireGuarantor}
            onChange={handleChange}
            className="form-checkbox"
          />
          <label className="ml-2">Require Guarantor</label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            name="allowTopUp"
            checked={formData.allowTopUp}
            onChange={handleChange}
            className="form-checkbox"
          />
          <label className="ml-2">Allow Top-up Loans</label>
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
};

export default LoanSettings;
