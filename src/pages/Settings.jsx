import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Settings = () => {
  const API = import.meta.env.VITE_API_BASE_URL;

  const [activeTab, setActiveTab] = useState('loanCategories');

  // Loan Categories
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });

  // Loan Settings
  const [loanSettings, setLoanSettings] = useState({
    defaultInterestRate: '',
    defaultLoanTerm: '',
    maxLoanAmount: '',
    penaltyRate: '',
    gracePeriodDays: '',
    processingFee: '',
    requireCollateral: false,
  });

  // System Settings
  const [systemSettings, setSystemSettings] = useState({
    currency: '',
    timezone: '',
    language: '',
  });

  useEffect(() => {
    fetchCategories();
    fetchLoanSettings();
    fetchSystemSettings();
  }, []);

  const fetchCategories = async () => {
    const res = await axios.get(`${API}/settings/loan-categories`);
    setCategories(res.data);
  };

  const fetchLoanSettings = async () => {
    const res = await axios.get(`${API}/settings/loan-settings`);
    setLoanSettings(res.data || {});
  };

  const fetchSystemSettings = async () => {
    const res = await axios.get(`${API}/settings/system-settings`);
    setSystemSettings(res.data || {});
  };

  const saveLoanSettings = async () => {
    await axios.post(`${API}/settings/loan-settings`, loanSettings);
    alert('Loan settings saved');
  };

  const saveSystemSettings = async () => {
    await axios.post(`${API}/settings/system-settings`, systemSettings);
    alert('System settings saved');
  };

  const addCategory = async () => {
    if (!newCategory.name) return;
    await axios.post(`${API}/settings/loan-categories`, newCategory);
    setNewCategory({ name: '', description: '' });
    fetchCategories();
  };

  const deleteCategory = async (id) => {
    if (!confirm('Delete this category?')) return;
    await axios.delete(`${API}/settings/loan-categories/${id}`);
    fetchCategories();
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">System Settings</h2>

      {/* Tabs */}
      <div className="flex gap-4 mb-4">
        <button
          onClick={() => setActiveTab('loanCategories')}
          className={`px-4 py-2 rounded ${activeTab === 'loanCategories' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Loan Categories
        </button>
        <button
          onClick={() => setActiveTab('loanSettings')}
          className={`px-4 py-2 rounded ${activeTab === 'loanSettings' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Loan Settings
        </button>
        <button
          onClick={() => setActiveTab('systemSettings')}
          className={`px-4 py-2 rounded ${activeTab === 'systemSettings' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          System Settings
        </button>
      </div>

      {/* Loan Categories */}
      {activeTab === 'loanCategories' && (
        <div>
          <h3 className="font-semibold text-lg mb-2">Loan Categories</h3>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="Name"
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              className="border px-2 py-1 rounded"
            />
            <input
              type="text"
              placeholder="Description"
              value={newCategory.description}
              onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
              className="border px-2 py-1 rounded"
            />
            <button onClick={addCategory} className="bg-green-600 text-white px-3 py-1 rounded">Add</button>
          </div>

          <ul className="space-y-2">
            {categories.map(cat => (
              <li key={cat.id} className="flex justify-between items-center border p-2 rounded">
                <div>
                  <p className="font-semibold">{cat.name}</p>
                  <p className="text-sm text-gray-500">{cat.description}</p>
                </div>
                <button onClick={() => deleteCategory(cat.id)} className="text-red-500">Delete</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Loan Settings */}
      {activeTab === 'loanSettings' && (
        <div>
          <h3 className="font-semibold text-lg mb-2">Loan Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="number"
              placeholder="Default Interest Rate (%)"
              value={loanSettings.defaultInterestRate}
              onChange={(e) => setLoanSettings({ ...loanSettings, defaultInterestRate: e.target.value })}
              className="border px-3 py-2 rounded"
            />
            <input
              type="number"
              placeholder="Default Loan Term (months)"
              value={loanSettings.defaultLoanTerm}
              onChange={(e) => setLoanSettings({ ...loanSettings, defaultLoanTerm: e.target.value })}
              className="border px-3 py-2 rounded"
            />
            <input
              type="number"
              placeholder="Max Loan Amount"
              value={loanSettings.maxLoanAmount}
              onChange={(e) => setLoanSettings({ ...loanSettings, maxLoanAmount: e.target.value })}
              className="border px-3 py-2 rounded"
            />
            <input
              type="number"
              placeholder="Penalty Rate (%)"
              value={loanSettings.penaltyRate}
              onChange={(e) => setLoanSettings({ ...loanSettings, penaltyRate: e.target.value })}
              className="border px-3 py-2 rounded"
            />
            <input
              type="number"
              placeholder="Grace Period (days)"
              value={loanSettings.gracePeriodDays}
              onChange={(e) => setLoanSettings({ ...loanSettings, gracePeriodDays: e.target.value })}
              className="border px-3 py-2 rounded"
            />
            <input
              type="number"
              placeholder="Processing Fee (flat)"
              value={loanSettings.processingFee}
              onChange={(e) => setLoanSettings({ ...loanSettings, processingFee: e.target.value })}
              className="border px-3 py-2 rounded"
            />
            <label className="flex items-center gap-2 col-span-1">
              <input
                type="checkbox"
                checked={loanSettings.requireCollateral}
                onChange={(e) => setLoanSettings({ ...loanSettings, requireCollateral: e.target.checked })}
              />
              Require Collateral
            </label>
          </div>

          <button onClick={saveLoanSettings} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded">
            Save Loan Settings
          </button>
        </div>
      )}

      {/* System Settings */}
      {activeTab === 'systemSettings' && (
        <div>
          <h3 className="font-semibold text-lg mb-2">System Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Currency"
              value={systemSettings.currency}
              onChange={(e) => setSystemSettings({ ...systemSettings, currency: e.target.value })}
              className="border px-3 py-2 rounded"
            />
            <input
              type="text"
              placeholder="Timezone"
              value={systemSettings.timezone}
              onChange={(e) => setSystemSettings({ ...systemSettings, timezone: e.target.value })}
              className="border px-3 py-2 rounded"
            />
            <input
              type="text"
              placeholder="Language"
              value={systemSettings.language}
              onChange={(e) => setSystemSettings({ ...systemSettings, language: e.target.value })}
              className="border px-3 py-2 rounded"
            />
          </div>

          <button onClick={saveSystemSettings} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded">
            Save System Settings
          </button>
        </div>
      )}
    </div>
  );
};

export default Settings;
