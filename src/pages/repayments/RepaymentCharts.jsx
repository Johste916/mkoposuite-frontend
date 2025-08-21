import React, { useEffect, useMemo, useState } from "react";
import api from "../../api";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from "recharts";

const fmt = (n) => Number(n || 0).toLocaleString();
const toISO = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,10);

const startDefault = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return toISO(d);
};

export default function RepaymentCharts() {
  const [dateFrom, setDateFrom] = useState(startDefault());
  const [dateTo, setDateTo] = useState(toISO(new Date()));
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);

  const fetchRows = async () => {
    setLoading(true);
    try {
      // Pull many rows and aggregate on client
      const { data } = await api.get("/repayments", {
        params: { dateFrom, dateTo, page: 1, pageSize: 2000 },
      });
      const items = Array.isArray(data) ? data : data?.items || [];
      setRows(items);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byDay = useMemo(() => {
    const m = {};
    for (const r of rows) {
      const d = (r.date || r.paymentDate || r.paidAt || r.createdAt || "").slice(0,10);
      const amt = Number(r.amount ?? r.amountPaid ?? 0);
      if (!d || !amt) continue;
      m[d] = (m[d] || 0) + amt;
    }
    return Object.entries(m)
      .sort(([a],[b]) => (a < b ? -1 : 1))
      .map(([date, total]) => ({ date, total: Number(total.toFixed(2)) }));
  }, [rows]);

  const byMethod = useMemo(() => {
    const m = {};
    for (const r of rows) {
      const key = (r.method || "other").toLowerCase();
      const amt = Number(r.amount ?? r.amountPaid ?? 0);
      if (!amt) continue;
      m[key] = (m[key] || 0) + amt;
    }
    return Object.entries(m).map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }));
  }, [rows]);

  const topBorrowers = useMemo(() => {
    const m = {};
    for (const r of rows) {
      const b = r.Loan?.Borrower?.name || r.borrowerName || "Unknown";
      const amt = Number(r.amount ?? r.amountPaid ?? 0);
      m[b] = (m[b] || 0) + amt;
    }
    return Object.entries(m)
      .map(([name, total]) => ({ name, total: Number(total.toFixed(2)) }))
      .sort((a,b) => b.total - a.total)
      .slice(0, 10);
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg border shadow p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Repayment Charts</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Daily totals, method split, and top borrowers.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />
            <span className="text-sm self-center">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />
            <button
              onClick={fetchRows}
              disabled={loading}
              className="px-3 py-2 rounded border hover:bg-gray-50 text-sm disabled:opacity-60"
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mt-6">
          <div className="h-80 border rounded-lg p-2">
            <h3 className="font-medium px-2 pt-2">Daily Collections</h3>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={byDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend />
                <Line type="monotone" dataKey="total" name="TZS" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="h-80 border rounded-lg p-2">
            <h3 className="font-medium px-2 pt-2">By Method</h3>
            <ResponsiveContainer width="100%" height="90%">
              <PieChart>
                <Pie data={byMethod} dataKey="value" nameKey="name" outerRadius={100} label />
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend />
                {byMethod.map((_, i) => <Cell key={i} />)}
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="h-80 border rounded-lg p-2 lg:col-span-2">
            <h3 className="font-medium px-2 pt-2">Top Borrowers (by Amount)</h3>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={topBorrowers}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend />
                <Bar dataKey="total" name="TZS" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
