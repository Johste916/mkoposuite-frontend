import React, { useEffect, useMemo, useState } from "react";
import repaymentsApi from "../../api/repayments";
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
  const [granularity, setGranularity] = useState("day");
  const [loading, setLoading] = useState(false);

  const [summary, setSummary] = useState({ totalAmount: 0, totalCount: 0, byMethod: [] });
  const [series, setSeries] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const [s, t] = await Promise.all([
        repaymentsApi.summary({ dateFrom, dateTo }),
        repaymentsApi.timeseries({ dateFrom, dateTo, granularity }),
      ]);
      setSummary(s.data || { totalAmount: 0, totalCount: 0, byMethod: [] });
      setSeries(Array.isArray(t.data?.series) ? t.data.series : []);
    } catch {
      setSummary({ totalAmount: 0, totalCount: 0, byMethod: [] });
      setSeries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportUrl = useMemo(
    () => repaymentsApi.exportCsvUrl({ dateFrom, dateTo }),
    [dateFrom, dateTo]
  );

  // recharts expects x in a prop; map server "date" into "bucket" label
  const daily = useMemo(
    () => (series || []).map((d) => ({
      date: String(d.date).slice(0, 10),
      total: Number(d.amount || 0),
    })),
    [series]
  );

  const byMethod = useMemo(
    () => (summary.byMethod || []).map(({ method, amount }) => ({
      name: method || "unknown",
      value: Number(amount || 0),
    })),
    [summary]
  );

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg border shadow p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Repayment Charts</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Daily totals, method split, and top KPIs from server-side aggregation.
            </p>
          </div>

          <div className="flex gap-2">
            <a
              className="px-3 py-2 rounded border hover:bg-gray-50 text-sm"
              href={exportUrl}
              target="_blank"
              rel="noreferrer"
            >
              Export CSV
            </a>
          </div>
        </div>

        <div className="grid md:grid-cols-5 gap-3 mt-4">
          <div className="space-y-1 md:col-span-1">
            <label className="text-sm">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border rounded px-2 py-1 text-sm w-full"
            />
          </div>
          <div className="space-y-1 md:col-span-1">
            <label className="text-sm">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border rounded px-2 py-1 text-sm w-full"
            />
          </div>
          <div className="space-y-1 md:col-span-1">
            <label className="text-sm">Granularity</label>
            <select
              value={granularity}
              onChange={(e) => setGranularity(e.target.value)}
              className="border rounded px-2 py-1 text-sm w-full"
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
          </div>
          <div className="md:col-span-2 flex items-end justify-end">
            <button
              onClick={load}
              disabled={loading}
              className="px-3 py-2 rounded border hover:bg-gray-50 text-sm disabled:opacity-60"
            >
              {loading ? "Loading…" : "Apply"}
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          <div className="border rounded-xl p-4">
            <p className="text-sm text-gray-500">Total Collected</p>
            <p className="text-2xl font-semibold">{fmt(summary.totalAmount)}</p>
          </div>
          <div className="border rounded-xl p-4">
            <p className="text-sm text-gray-500">Payments Count</p>
            <p className="text-2xl font-semibold">{summary.totalCount || 0}</p>
          </div>
          <div className="border rounded-xl p-4">
            <p className="text-sm text-gray-500">Top Method</p>
            <p className="text-2xl font-semibold">{summary.byMethod?.[0]?.method || "—"}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mt-6">
          <div className="h-80 border rounded-lg p-2">
            <h3 className="font-medium px-2 pt-2">Collections Over Time</h3>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend />
                <Line type="monotone" dataKey="total" name="Amount" />
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
        </div>
      </div>
    </div>
  );
}
