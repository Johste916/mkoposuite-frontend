import React from 'react';
import { useNavigate } from 'react-router-dom';
import { listCashAccounts } from '../../api/cash';

export default function CashAccountsList() {
  const nav = useNavigate();
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const rows = await listCashAccounts();
        if (alive) setItems(rows || []);
      } catch (e) {
        setError(e?.response?.data?.error || e.message);
      } finally {
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Cash Accounts</h2>
        <button onClick={() => nav('/banking/cash-accounts/new')} className="btn btn-primary px-4 py-2 rounded bg-blue-600 text-white">
          Add Cash Account
        </button>
      </div>

      {loading && <div>Loading…</div>}
      {error && <div className="text-red-600">{error}</div>}

      {!loading && !items.length && <div className="text-slate-500">No cash accounts yet.</div>}

      {!!items.length && (
        <div className="overflow-x-auto rounded border">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left">
                <th className="p-3">Name</th>
                <th className="p-3">Currency</th>
                <th className="p-3">Opening</th>
                <th className="p-3">Current</th>
                <th className="p-3">Active</th>
              </tr>
            </thead>
            <tbody>
              {items.map(a => (
                <tr key={a.id} className="border-t">
                  <td className="p-3">{a.name}</td>
                  <td className="p-3">{a.currency}</td>
                  <td className="p-3">{Number(a.openingBalance || 0).toLocaleString()}</td>
                  <td className="p-3">{Number(a.currentBalance ?? a.openingBalance ?? 0).toLocaleString()}</td>
                  <td className="p-3">{a.isActive ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
