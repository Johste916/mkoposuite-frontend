import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { CSVLink } from 'react-csv';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Link } from 'react-router-dom';

const Borrowers = () => {
  const [borrowers, setBorrowers] = useState([]);
  const [form, setForm] = useState({ name: '', nationalId: '', phone: '', email: '', address: '' });
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState(null);

  const borrowersPerPage = 5;
  const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:10000/api';

  const fetchBorrowers = async () => {
    try {
      const res = await axios.get(`${API}/borrowers`);
      setBorrowers(res.data);
    } catch (err) {
      console.error('Error fetching borrowers:', err);
      setError('Failed to load borrowers.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${API}/borrowers/${editingId}`, form);
      } else {
        await axios.post(`${API}/borrowers`, form);
      }
      setForm({ name: '', nationalId: '', phone: '', email: '', address: '' });
      setEditingId(null);
      fetchBorrowers();
    } catch (err) {
      console.error('Error saving borrower:', err);
      setError('Failed to save borrower.');
    }
  };

  const handleEdit = (borrower) => {
    setForm(borrower);
    setEditingId(borrower.id);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this borrower?')) return;
    try {
      await axios.delete(`${API}/borrowers/${id}`);
      fetchBorrowers();
    } catch (err) {
      console.error('Error deleting borrower:', err);
      setError('Failed to delete borrower.');
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text('Borrowers Report', 14, 16);
    doc.autoTable({
      startY: 20,
      head: [['Name', 'National ID', 'Phone', 'Email', 'Address']],
      body: filteredBorrowers.map((b) => [b.name, b.nationalId, b.phone, b.email, b.address]),
    });
    doc.save('borrowers.pdf');
  };

  const filteredBorrowers = borrowers.filter((b) =>
    [b.name, b.nationalId, b.phone].some((field) =>
      field.toLowerCase().includes(search.toLowerCase())
    )
  );

  const indexOfLast = currentPage * borrowersPerPage;
  const indexOfFirst = indexOfLast - borrowersPerPage;
  const currentBorrowers = filteredBorrowers.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredBorrowers.length / borrowersPerPage);

  useEffect(() => {
    fetchBorrowers();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Borrowers</h2>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {/* Form */}
      <form onSubmit={handleSubmit} className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded shadow">
        {['name', 'nationalId', 'phone', 'email', 'address'].map((field) => (
          <input
            key={field}
            className="border px-4 py-2 rounded"
            placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
            value={form[field]}
            onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            required={field !== 'email'}
          />
        ))}
        <button type="submit" className="col-span-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
          {editingId ? 'Update Borrower' : 'Add Borrower'}
        </button>
      </form>

      {/* Search + Export */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-2">
        <input
          type="text"
          placeholder="Search borrowers..."
          className="border px-4 py-2 rounded w-full md:w-1/3"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-2">
          <CSVLink
            data={filteredBorrowers}
            filename={'borrowers.csv'}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Export CSV
          </CSVLink>
          <button onClick={handleExportPDF} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
            Export PDF
          </button>
        </div>
      </div>

      {/* Borrowers Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded shadow table-auto border">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2 border">Name</th>
              <th className="p-2 border">National ID</th>
              <th className="p-2 border">Phone</th>
              <th className="p-2 border">Email</th>
              <th className="p-2 border">Address</th>
              <th className="p-2 border">Loans</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentBorrowers.map((b) => (
              <tr key={b.id}>
                <td className="border px-2">{b.name}</td>
                <td className="border px-2">{b.nationalId}</td>
                <td className="border px-2">{b.phone}</td>
                <td className="border px-2">{b.email}</td>
                <td className="border px-2">{b.address}</td>
                <td className="border px-2 text-center">
                  <Link to={`/borrowers/${b.id}`} className="text-indigo-600 hover:underline">
                    View
                  </Link>
                </td>
                <td className="border px-2 space-x-2 text-center">
                  <button onClick={() => handleEdit(b)} className="text-blue-600 hover:underline">Edit</button>
                  <button onClick={() => handleDelete(b.id)} className="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
            {filteredBorrowers.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center p-4">No borrowers found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex justify-center space-x-2">
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i + 1}
            onClick={() => setCurrentPage(i + 1)}
            className={`px-3 py-1 border rounded ${currentPage === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Borrowers;
