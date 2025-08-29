import React, { useEffect, useMemo, useState } from "react";
import api from "../../api";

const emptyLine = () => ({ accountId: "", debit: "", credit: "", description: "" });

export default function ManualJournal() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10));
  const [memo, setMemo] = useState("");
  const [lines, setLines] = useState([emptyLine(), emptyLine()]);
  const [accounts, setAccounts] = useState([]);
  const [posting, setPosting] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/accounting/chart-of-accounts");
        setAccounts(Array.isArray(data) ? data : []);
      } catch (e) {
        setMsg({ type: "error", text: e?.response?.data?.error || e.message });
      }
    })();
  }, []);

  const totals = useMemo(() => lines.reduce((a, l) => {
    a.debit += Number(l.debit || 0);
    a.credit += Number(l.credit || 0);
    return a;
  }, { debit: 0, credit: 0 }), [lines]);

  const balanced = Number(totals.debit.toFixed(2)) === Number(totals.credit.toFixed(2));

  const setLine = (idx, patch) => {
    setLines((prev) => prev.map((l, i) => i === idx ? { ...l, ...patch } : l));
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const post = async () => {
    setMsg({ type: "", text: "" });
    if (!balanced) {
      setMsg({ type: "error", text: "Debits must equal credits." });
      return;
    }
    const payload = {
      date,
      memo,
      lines: lines
        .filter(l => l.accountId && (Number(l.debit||0) > 0 || Number(l.credit||0) > 0))
        .map(l => ({
          accountId: l.accountId,
          debit: Number(l.debit || 0),
          credit: Number(l.credit || 0),
          description: l.description || undefined
        }))
    };
    if (!payload.lines.length) {
      setMsg({ type: "error", text: "Add at least one non-zero line." });
      return;
    }
    try {
      setPosting(true);
      const { data } = await api.post("/accounting/manual-journal", payload);
      setMsg({ type: "ok", text: `Journal posted (ID ${data?.journalId}).` });
      setLines([emptyLine(), emptyLine()]);
      setMemo("");
    } catch (e) {
      setMsg({ type: "error", text: e?.response?.data?.error || e.message });
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <h3 className="text-lg font-semibold">Manual Journal</h3>
          <div className="text-xs text-slate-500">Post balanced debits and credits</div>
        </div>
      </div>

      {msg.text && (
        <div className={`text-sm px-3 py-2 rounded ${msg.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
          {msg.text}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="text-sm">
          <label className="block text-xs opacity-70">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                 className="border rounded px-2 py-1 dark:bg-gray-700" />
        </div>
        <div className="flex-1 text-sm min-w-[280px]">
          <label className="block text-xs opacity-70">Memo</label>
          <input value={memo} onChange={(e) => setMemo(e.target.value)}
                 placeholder="e.g. Adjusting entry"
                 className="w-full border rounded px-2 py-1 dark:bg-gray-700" />
        </div>
      </div>

      <div className="overflow-auto border rounded">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700">
            <tr className="text-left">
              <th className="px-3 py-2 w-64">Account</th>
              <th className="px-3 py-2 w-32">Debit</th>
              <th className="px-3 py-2 w-32">Credit</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-t">
                <td className="px-3 py-2">
                  <select value={l.accountId} onChange={(e) => setLine(i, { accountId: e.target.value })}
                          className="w-full border rounded px-2 py-1 dark:bg-gray-700">
                    <option value="">Select account…</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>
                        {(a.code || a.accountCode || a.number) ?? "—"} — {(a.name || a.accountName || a.title) ?? "—"}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input type="number" step="0.01" min="0" value={l.debit}
                         onChange={(e) => setLine(i, { debit: e.target.value, credit: "" })}
                         className="w-full border rounded px-2 py-1 text-right dark:bg-gray-700" />
                </td>
                <td className="px-3 py-2">
                  <input type="number" step="0.01" min="0" value={l.credit}
                         onChange={(e) => setLine(i, { credit: e.target.value, debit: "" })}
                         className="w-full border rounded px-2 py-1 text-right dark:bg-gray-700" />
                </td>
                <td className="px-3 py-2">
                  <input value={l.description}
                         onChange={(e) => setLine(i, { description: e.target.value })}
                         className="w-full border rounded px-2 py-1 dark:bg-gray-700" />
                </td>
                <td className="px-3 py-2">
                  <button onClick={() => removeLine(i)} className="px-2 py-1 rounded border">×</button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold border-t">
              <td className="px-3 py-2 text-right">Totals</td>
              <td className="px-3 py-2 text-right">{totals.debit.toLocaleString()}</td>
              <td className="px-3 py-2 text-right">{totals.credit.toLocaleString()}</td>
              <td className="px-3 py-2" colSpan={2}>
                {balanced ? <span className="text-emerald-600">Balanced</span> : <span className="text-red-600">Not balanced</span>}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={addLine} className="px-3 py-2 rounded border">Add line</button>
        <button disabled={posting} onClick={post} className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-60">
          {posting ? "Posting…" : "Post Journal"}
        </button>
      </div>
    </div>
  );
}
