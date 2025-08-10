// src/pages/Loan.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { CSVLink } from "react-csv";

const Loan = () => {
  const [loans, setLoans] = useState([]);
  const [borrowers, setBorrowers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [showDetails, setShowDetails] = useState(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleData, setScheduleData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    amount: "",
    interestRate: "",
    termMonths: "",
    interestMethod: "flat",
    borrowerId: "",
    branchId: "",
    startDate: "",
    endDate: "",
  });

  const API = import.meta.env.VITE_API_BASE_URL;

  // =========================
  // FETCH DATA
  // =========================
  const fetchLoans = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/loans`);
      setLoans(res.data || []);
    } catch (err) {
      console.error("Error fetching loans:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBorrowers = async () => {
    try {
      const res = await axios.get(`${API}/borrowers`);
      setBorrowers(res.data || []);
    } catch (err) {
      console.error("Error fetching borrowers:", err);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await axios.get(`${API}/branches`);
      setBranches(res.data || []);
    } catch (err) {
      console.error("Error fetching branches:", err);
    }
  };

  useEffect(() => {
    fetchLoans();
    fetchBorrowers();
    fetchBranches();
  }, []);

  // =========================
  // FORM HANDLERS
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${API}/loans/${editingId}`, form);
      } else {
        await axios.post(`${API}/loans`, form);
      }
      resetForm();
      fetchLoans();
    } catch (err) {
      console.error("Error saving loan:", err);
    }
  };

  const handleEdit = (loan) => {
    setForm({
      amount: loan.amount,
      interestRate: loan.interestRate,
      termMonths: loan.termMonths,
      interestMethod: loan.interestMethod || "flat",
      borrowerId: loan.borrowerId,
      branchId: loan.branchId,
      startDate: loan.startDate?.slice(0, 10) || "",
      endDate: loan.endDate?.slice(0, 10) || "",
    });
    setEditingId(loan.id);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this loan?")) return;
    try {
      await axios.delete(`${API}/loans/${id}`);
      fetchLoans();
    } catch (err) {
      console.error("Error deleting loan:", err);
    }
  };

  const resetForm = () => {
    setForm({
      amount: "",
      interestRate: "",
      termMonths: "",
      interestMethod: "flat",
      borrowerId: "",
      branchId: "",
      startDate: "",
      endDate: "",
    });
    setEditingId(null);
  };

  // =========================
  // STATUS ACTIONS
  // =========================
  const handleStatusUpdate = async (id, action) => {
    try {
      await axios.patch(`${API}/loans/${id}/${action}`);
      fetchLoans();
    } catch (err) {
      console.error(`Error updating loan (${action}):`, err);
    }
  };

  // =========================
  // VIEW SCHEDULE
  // =========================
  const viewSchedule = async (loanId) => {
    try {
      const res = await axios.get(`${API}/loans/${loanId}/schedule`);
      setScheduleData(res.data.schedule || []);
      setShowSchedule(true);
    } catch (err) {
      console.error("Error fetching schedule:", err);
    }
  };

  // =========================
  // EXPORTS
  // =========================
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("Loan Report", 14, 16);
    doc.autoTable({
      startY: 20,
      head: [["Amount", "Rate", "Term", "Borrower", "Status"]],
      body: filteredLoans.map((l) => [
        l.amount,
        l.interestRate,
        l.termMonths,
        l.Borrower?.name || "N/A",
        l.status,
      ]),
    });
    doc.save("loans.pdf");
  };

  // =========================
  // FILTERING
  // =========================
  const filteredLoans = loans.filter(
    (l) =>
      (statusFilter === "all" || l.status === statusFilter) &&
      (l.Borrower?.name?.toLowerCase() || "").includes(search.toLowerCase())
  );

  // =========================
  // STATUS BADGE
  // =========================
  const getStatusBadge = (status) => {
    const base = "px-2 py-1 rounded text-xs font-semibold";
    switch (status) {
      case "pending":
        return `${base} bg-yellow-100 text-yellow-700`;
      case "approved":
        return `${base} bg-green-100 text-green-700`;
      case "rejected":
        return `${base} bg-red-100 text-red-700`;
      case "disbursed":
      case "active":
        return `${base} bg-blue-100 text-blue-700`;
      case "closed":
        return `${base} bg-gray-100 text-gray-700`;
      default:
        return `${base} bg-gray-200 text-gray-600`;
    }
  };

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-2xl font-bold">Loan Management</h2>

      {/* CREATE / UPDATE FORM */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded shadow"
      >
        <input
          type="number"
          placeholder="Amount"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          required
          className="border px-4 py-2 rounded"
        />
        <input
          type="number"
          placeholder="Interest Rate (%)"
          value={form.interestRate}
          onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
          required
          className="border px-4 py-2 rounded"
        />
        <input
          type="number"
          placeholder="Term (Months)"
          value={form.termMonths}
          onChange={(e) => setForm({ ...form, termMonths: e.target.value })}
          required
          className="border px-4 py-2 rounded"
        />
        <select
          value={form.interestMethod}
          onChange={(e) => setForm({ ...form, interestMethod: e.target.value })}
          className="border px-4 py-2 rounded"
        >
          <option value="flat">Flat</option>
          <option value="reducing">Reducing Balance</option>
        </select>
        <select
          value={form.borrowerId}
          onChange={(e) => setForm({ ...form, borrowerId: e.target.value })}
          required
          className="border px-4 py-2 rounded"
        >
          <option value="">Select Borrower</option>
          {borrowers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          value={form.branchId}
          onChange={(e) => setForm({ ...form, branchId: e.target.value })}
          className="border px-4 py-2 rounded"
        >
          <option value="">Select Branch</option>
          {branches.map((br) => (
            <option key={br.id} value={br.id}>
              {br.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={form.startDate}
          onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          required
          className="border px-4 py-2 rounded"
        />
        <input
          type="date"
          value={form.endDate}
          onChange={(e) => setForm({ ...form, endDate: e.target.value })}
          className="border px-4 py-2 rounded"
        />
        <button
          type="submit"
          className="col-span-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          {editingId ? "Update Loan" : "Create Loan"}
        </button>
      </form>

      {/* FILTERS */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <input
          type="text"
          placeholder="Search borrower..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-4 py-2 rounded"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border px-4 py-2 rounded"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="disbursed">Disbursed</option>
          <option value="active">Active</option>
          <option value="rejected">Rejected</option>
          <option value="closed">Closed</option>
        </select>
        <div className="flex gap-2">
          <CSVLink
            data={filteredLoans}
            filename={"loans.csv"}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Export CSV
          </CSVLink>
          <button
            onClick={handleExportPDF}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* LOANS TABLE */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded shadow border">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2 border">Amount</th>
              <th className="p-2 border">Rate (%)</th>
              <th className="p-2 border">Term</th>
              <th className="p-2 border">Borrower</th>
              <th className="p-2 border">Branch</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLoans.map((loan) => (
              <tr key={loan.id}>
                <td className="border px-2">{loan.amount}</td>
                <td className="border px-2">{loan.interestRate}</td>
                <td className="border px-2">{loan.termMonths}</td>
                <td className="border px-2">{loan.Borrower?.name}</td>
                <td className="border px-2">{loan.branch?.name}</td>
                <td className="border px-2">
                  <span className={getStatusBadge(loan.status)}>
                    {loan.status}
                  </span>
                </td>
                <td className="border px-2 text-center space-x-2">
                  <button
                    onClick={() => setShowDetails(loan)}
                    className="text-indigo-600 hover:underline"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleEdit(loan)}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(loan.id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                  {loan.status === "pending" && (
                    <>
                      <button
                        onClick={() =>
                          handleStatusUpdate(loan.id, "approve")
                        }
                        className="text-green-600 hover:underline"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(loan.id, "reject")}
                        className="text-yellow-600 hover:underline"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {loan.status === "approved" && (
                    <button
                      onClick={() => handleStatusUpdate(loan.id, "disburse")}
                      className="text-indigo-600 hover:underline"
                    >
                      Disburse
                    </button>
                  )}
                  <button
                    onClick={() => viewSchedule(loan.id)}
                    className="text-purple-600 hover:underline"
                  >
                    Schedule
                  </button>
                </td>
              </tr>
            ))}
            {filteredLoans.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center p-4">
                  No loans found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: Loan Details */}
      {showDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full shadow-lg">
            <h3 className="text-xl font-bold mb-4">Loan Details</h3>
            <p><strong>Amount:</strong> {showDetails.amount}</p>
            <p><strong>Borrower:</strong> {showDetails.Borrower?.name}</p>
            <p><strong>Branch:</strong> {showDetails.branch?.name}</p>
            <p><strong>Status:</strong> {showDetails.status}</p>
            <p><strong>Start Date:</strong> {showDetails.startDate}</p>
            <p><strong>End Date:</strong> {showDetails.endDate}</p>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowDetails(null)}
                className="bg-gray-500 text-white px-4 py-2 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Loan Schedule */}
      {showSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full shadow-lg">
            <h3 className="text-xl font-bold mb-4">Repayment Schedule</h3>
            <table className="min-w-full border">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border px-2">Installment</th>
                  <th className="border px-2">Due Date</th>
                  <th className="border px-2">Principal</th>
                  <th className="border px-2">Interest</th>
                  <th className="border px-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {scheduleData.map((row, idx) => (
                  <tr key={idx}>
                    <td className="border px-2">{row.installment}</td>
                    <td className="border px-2">{row.dueDate}</td>
                    <td className="border px-2">{row.principal}</td>
                    <td className="border px-2">{row.interest}</td>
                    <td className="border px-2">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowSchedule(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Loan;
