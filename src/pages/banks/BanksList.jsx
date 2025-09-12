import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api";
import { PlusCircle, Pencil, Trash2 } from "lucide-react";

const card = "bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-5 md:p-7";
const clsInput = "w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all";

export default function BanksList() {
  const navigate = useNavigate();
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/banks", { params: { search } });
      const items = Array.isArray(r.data) ? r.data
        : Array.isArray(r.data?.items) ? r.data.items
        : Array.isArray(r.data?.rows) ? r.data.rows
        : [];
      setBanks(items);
    } catch (e) {
      console.error(e);
      setBanks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const onDelete = async (id) => {
    if (!window.confirm("Delete this bank?")) return;
    try {
      await api.delete(`/banks/${id}`);
      await load();
    } catch (e) {
      console.error(e);
      alert("Failed to delete bank");
    }
  };

  const list = useMemo(() => (Array.isArray(banks) ? banks : []), [banks]);

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Banks</h1>
          <p className="text-sm text-gray-500">Tenant-scoped list of banks used for loan disbursements.</p>
        </div>
        <Link to="/banks/add" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50">
          <PlusCircle className="h-4 w-4" /> Add Bank
        </Link>
      </div>

      <section className={card}>
        <div className="mb-3">
          <input
            className={clsInput}
            placeholder="Search by name, code, account…"
            value={search}
            onChange={(e)=>setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-gray-500">No banks found. Click “Add Bank” to create one.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Code</th>
                  <th className="py-2 pr-4">Branch</th>
                  <th className="py-2 pr-4">Account Name</th>
                  <th className="py-2 pr-4">Account #</th>
                  <th className="py-2 pr-4">SWIFT</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {list.map((b) => (
                  <tr key={b.id} className="border-t">
                    <td className="py-2 pr-4">{b.name}</td>
                    <td className="py-2 pr-4">{b.code || "—"}</td>
                    <td className="py-2 pr-4">{b.branch || "—"}</td>
                    <td className="py-2 pr-4">{b.accountName || "—"}</td>
                    <td className="py-2 pr-4">{b.accountNumber || "—"}</td>
                    <td className="py-2 pr-4">{b.swift || "—"}</td>
                    <td className="py-2 pr-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/banks/${b.id}/edit`)}
                          className="px-2 py-1 rounded border hover:bg-gray-50 inline-flex items-center gap-1"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" /> Edit
                        </button>
                        <button
                          onClick={() => onDelete(b.id)}
                          className="px-2 py-1 rounded border hover:bg-gray-50 inline-flex items-center gap-1"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
