import React, { useEffect, useState } from "react";
import { listBanks, importBankCsvRows } from "../../services/banking";

const card = "bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-5 md:p-7";
const cls = "border rounded px-3 py-2";

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(",").map(h => h.trim());
  return lines.slice(1).map(line => {
    const cols = line.split(",").map(c => c.trim());
    const o = {};
    headers.forEach((h, i) => (o[h] = cols[i]));
    if (o.amount != null) o.amount = Number(o.amount);
    if (o.occurredAt) {
      const d = new Date(o.occurredAt);
      if (!isNaN(d)) o.occurredAt = d.toISOString();
    }
    return o;
  });
}

export default function BankImport() {
  const [banks, setBanks] = useState([]);
  const [bankId, setBankId] = useState("");
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listBanks()
      .then(setBanks)
      .catch(e => setErr(e?.normalizedMessage || String(e)));
  }, []);

  const onFile = async (file) => {
    setErr(null);
    setResult(null);
    setRows([]);
    const text = await file.text();
    setRows(parseCsv(text));
  };

  const doImport = async () => {
    if (!bankId || !rows.length) return;
    try {
      setLoading(true);
      const created = await importBankCsvRows(bankId, rows);
      setResult({ created: Array.isArray(created) ? created.length : 0 });
    } catch (e) {
      setErr(e?.normalizedMessage || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <h1 className="text-2xl font-bold mb-4">Import Bank CSV</h1>
      <section className={card}>
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className="block text-sm">Bank</label>
            <select className={cls} value={bankId} onChange={(e)=>setBankId(e.target.value)}>
              <option value="">— select —</option>
              {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <label className="bg-gray-100 px-3 py-2 rounded cursor-pointer">
            Select CSV
            <input className="hidden" type="file" accept=".csv" onChange={e=>e.target.files && onFile(e.target.files[0])}/>
          </label>
          <button className="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-60"
                  onClick={doImport} disabled={!bankId || !rows.length || loading}>
            {loading ? "Importing…" : "Import"}
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-2">
          Expected columns (min): <code>occurredAt,amount,type,reference,description,status,currency</code>
        </p>

        {err && <div className="text-sm text-red-600 mb-2">{err}</div>}
        {result && <div className="text-sm text-green-700 mb-2">Imported: {result.created ?? 0} row(s)</div>}

        <div className="max-h-72 overflow-auto border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {rows[0] && Object.keys(rows[0]).map(k => (
                  <th key={k} className="border px-2 py-1 text-left">{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r,i)=>(
                <tr key={i}>
                  {Object.keys(rows[0] || {}).map(k => (
                    <td key={k} className="border px-2 py-1">{String(r[k] ?? "")}</td>
                  ))}
                </tr>
              ))}
              {!rows.length && (
                <tr><td className="px-2 py-2 text-sm text-gray-500">No CSV loaded</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
