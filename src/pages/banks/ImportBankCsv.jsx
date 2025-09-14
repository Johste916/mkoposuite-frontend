// src/pages/banking/ImportBankCsv.jsx
import { useEffect, useState } from "react";
import { listBanks, importBankRows } from "../../services/banking";

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(",").map(h => h.trim());
  return lines.slice(1).map(line => {
    const cols = line.split(",").map(c => c.trim());
    const o = {};
    headers.forEach((h, i) => o[h] = cols[i]);
    if (o.amount != null) o.amount = Number(o.amount);
    if (o.occurredAt) o.occurredAt = new Date(o.occurredAt).toISOString();
    return o;
  });
}

export default function ImportBankCsv() {
  const [banks, setBanks] = useState([]);
  const [bankId, setBankId] = useState("");
  const [rows, setRows] = useState([]);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => { listBanks().then(setBanks).catch(e=>setErr(e?.normalizedMessage || String(e))); }, []);

  const onFile = async (file) => {
    setErr(null); setResult(null); setRows([]);
    const text = await file.text();
    setRows(parseCsv(text));
  };

  const doImport = async () => {
    if (!bankId || !rows.length) return;
    try {
      const resp = await importBankRows(bankId, rows);
      setResult(resp);
    } catch (e) { setErr(e?.normalizedMessage || String(e)); }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Import Bank CSV</h1>
        <div className="text-xs text-gray-500">/api/banks/:id/import</div>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm">Bank</label>
          <select className="border px-2 py-1 rounded" value={bankId} onChange={e=>setBankId(e.target.value)}>
            <option value="">-- select --</option>
            {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <label className="bg-gray-100 px-3 py-1 rounded cursor-pointer">
          Select CSV
          <input type="file" accept=".csv" className="hidden" onChange={e=>e.target.files && onFile(e.target.files[0])}/>
        </label>
        <button className="bg-black text-white px-3 py-1 rounded" onClick={doImport} disabled={!bankId || !rows.length}>
          Import
        </button>
      </div>

      {err && <div className="text-red-600 text-sm">{err}</div>}
      {result && <div className="text-green-700 text-sm">Imported: {result.created ?? 0} rows</div>}

      <div className="text-sm text-gray-600">
        Expected columns (min):{" "}
        <code>occurredAt,amount,type,reference,description,status,currency</code>
      </div>

      <div className="max-h-72 overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {rows[0] && Object.keys(rows[0]).map(k => <th key={k} className="border px-2 py-1 text-left">{k}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {Object.keys(rows[0] || {}).map(k => <td key={k} className="border px-2 py-1">{String(r[k] ?? "")}</td>)}
              </tr>
            ))}
            {!rows.length && <tr><td className="px-2 py-2 text-sm text-gray-500">No CSV loaded</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
