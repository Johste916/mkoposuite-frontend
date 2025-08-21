// src/pages/repayments/RepaymentCharts.jsx
import React, { useEffect, useMemo, useState } from "react";
import { listRepayments } from "../../api/repayments";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, subDays } from "date-fns";

const money = (v) => Number(v || 0);

export default function RepaymentCharts() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const dateTo = new Date();
  const dateFrom = subDays(dateTo, 60);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const data = await listRepayments({
          dateFrom: format(dateFrom, "yyyy-MM-dd"),
          dateTo: format(dateTo, "yyyy-MM-dd"),
          pageSize: 1000,
          page: 1,
        });
        const arr = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        setItems(arr);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []); // eslint-disable-line

  const perDay = useMemo(() => {
    const m = new Map();
    for (const r of items) {
      const d = (r.date || r.paymentDate || r.createdAt || "").slice(0, 10);
      const amt = Number(r.amount ?? r.amountPaid ?? 0);
      m.set(d, (m.get(d) || 0) + amt);
    }
    return Array.from(m.entries())
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [items]);

  const byMethod = useMemo(() => {
    const m = new Map();
    for (const r of items) {
      const key = (r.method || "cash").toLowerCase();
      const amt = Number(r.amount ?? r.amountPaid ?? 0);
      m.set(key, (m.get(key) || 0) + amt);
    }
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold">Repayment Charts</h2>
        <p className="text-sm text-gray-500">Last 60 days</p>

        {loading ? (
          <div className="mt-6">Loading…</div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6 mt-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={perDay}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="total" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byMethod} dataKey="value" nameKey="name" label>
                    {byMethod.map((_, i) => <Cell key={i} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
