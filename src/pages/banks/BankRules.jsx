import React, { useEffect, useState } from "react";
import { getGlMapping, saveGlMapping } from "../../services/banking";

const card = "bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-5 md:p-7";

export default function BankRules() {
  const [raw, setRaw] = useState("{\n  \"bank\": {},\n  \"cash\": {}\n}");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    setLoading(true);
    getGlMapping()
      .then((v) => setRaw(JSON.stringify(v || { bank: {}, cash: {} }, null, 2)))
      .catch((e) => setMsg(e?.normalizedMessage || String(e)))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setMsg(null);
    try {
      setSaving(true);
      const parsed = JSON.parse(raw);
      await saveGlMapping(parsed);
      setMsg("Saved!");
    } catch (e) {
      setMsg("Invalid JSON or save error: " + (e?.normalizedMessage || e?.message || String(e)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <h1 className="text-2xl font-bold mb-4">Rules & GL Mapping</h1>
      <section className={card}>
        {loading ? (
          <div>Loading…</div>
        ) : (
          <>
            {msg && <div className="text-sm mb-2">{msg}</div>}
            <p className="text-sm text-gray-600 mb-2">
              Map tx types to GL accounts. Example:{" "}
              <code className="bg-gray-100 px-1 rounded">
                {'{ "bank": { "deposit": "1000" }, "cash": { "withdrawal": "2000" } }'}
              </code>
            </p>
            <textarea
              className="w-full h-80 border rounded p-2 font-mono text-sm"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
            />
            <div className="mt-3">
              <button className="bg-black text-white px-3 py-1 rounded" onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
