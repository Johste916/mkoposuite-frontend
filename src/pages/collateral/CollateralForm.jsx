import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api";

function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-sm font-medium mb-1">{label}</span>
      {children}
    </label>
  );
}

// Avoid /api/api if baseURL already has /api
const normalize = (u) => {
  const base = api?.defaults?.baseURL || "";
  const hasApiInBase = /\/api\/?$/.test(base);
  return hasApiInBase && u.startsWith("/api/") ? u.slice(4) : u;
};

export default function CollateralForm({ mode = "create" }) {
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const safeId = routeId && routeId !== "new" ? routeId : null;
  const isEdit = mode === "edit" || Boolean(safeId);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // form state
  const [borrowerQuery, setBorrowerQuery] = useState("");
  const [borrowerOptions, setBorrowerOptions] = useState([]);
  const [borrowerId, setBorrowerId] = useState("");

  const [loanOptions, setLoanOptions] = useState([]);
  const [loanId, setLoanId] = useState("");

  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [estValue, setEstValue] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("ACTIVE");

  // Load existing row when editing (only if we truly have an id)
  useEffect(() => {
    if (!isEdit || !safeId) return;
    setLoading(true);
    api
      .get(normalize(`/api/collateral/${safeId}`))
      .then((res) => {
        const r = res.data || {};
        setBorrowerId(r.borrowerId || "");
        setLoanId(r.loanId || "");
        setItemName(r.itemName || "");
        setCategory(r.category || "");
        setModel(r.model || "");
        setSerialNumber(r.serialNumber || "");
        setEstValue(r.estValue ?? "");
        setLocation(r.location || "");
        setNotes(r.notes || "");
        setStatus(r.status || "ACTIVE");
      })
      .catch((e) => setErr(e?.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [isEdit, safeId]);

  // Borrower search
  useEffect(() => {
    if (!borrowerQuery || borrowerQuery.length < 2) {
      setBorrowerOptions([]);
      return;
    }
    let cancel = false;
    api
      .get(normalize(`/api/collateral/helpers/borrower-search`), {
        params: { q: borrowerQuery },
      })
      .then((res) => {
        if (cancel) return;
        setBorrowerOptions(Array.isArray(res.data?.data) ? res.data.data : []);
      })
      .catch(() => {})
      .finally(() => {});
    return () => {
      cancel = true;
    };
  }, [borrowerQuery]);

  // When borrower changes, load open loans
  useEffect(() => {
    if (!borrowerId) {
      setLoanOptions([]);
      setLoanId("");
      return;
    }
    let cancel = false;
    api
      .get(normalize(`/api/collateral/helpers/open-loans`), {
        params: { borrowerId },
      })
      .then((res) => {
        if (cancel) return;
        const data = Array.isArray(res.data?.data) ? res.data.data : [];
        setLoanOptions(data);
        if (data.length === 1) setLoanId(data[0].id); // auto-select single open loan
      })
      .catch(() => {})
      .finally(() => {});
    return () => {
      cancel = true;
    };
  }, [borrowerId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    const payload = {
      borrowerId: borrowerId || null,
      loanId: loanId || null,
      itemName,
      category,
      model,
      serialNumber,
      estValue: estValue === "" ? null : Number(estValue),
      location,
      notes,
      status: isEdit ? status : "ACTIVE",
      autoDetectLoan: true, // server will auto-attach if only one open loan
    };

    const req = isEdit
      ? api.put(normalize(`/api/collateral/${safeId}`), payload)
      : api.post(normalize(`/api/collateral`), payload);

    req
      .then(() => navigate("/collateral"))
      .catch((e) => setErr(e?.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  };

  const canSubmit = useMemo(() => {
    return itemName.trim().length > 0 && borrowerId;
  }, [itemName, borrowerId]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 max-w-3xl">
      <h2 className="text-lg font-semibold mb-4">
        {isEdit ? "Edit Collateral" : "Register Collateral"}
      </h2>

      {err && <div className="text-red-600 text-sm mb-3">Error: {err}</div>}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Borrower autocomplete */}
        <div className="sm:col-span-2">
          <Field label="Borrower">
            <input
              className="w-full border rounded px-3 py-2"
              placeholder="Search borrower by name or phone…"
              value={borrowerQuery}
              onChange={(e) => setBorrowerQuery(e.target.value)}
            />
          </Field>
          {borrowerOptions.length > 0 && (
            <div className="border rounded mb-2 max-h-48 overflow-auto">
              {borrowerOptions.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setBorrowerId(b.id);
                    setBorrowerQuery(`${b.name}${b.phone ? ` — ${b.phone}` : ""}`);
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${
                    borrowerId === b.id ? "bg-gray-50" : ""
                  }`}
                >
                  <div className="font-medium">{b.name}</div>
                  <div className="text-xs text-gray-500">{b.phone}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Loan (populated after borrower selected) */}
        <Field label="Loan (open)">
          <select
            className="w-full border rounded px-3 py-2"
            value={loanId || ""}
            onChange={(e) => setLoanId(e.target.value || "")}
            disabled={!borrowerId}
          >
            <option value="">— {loanOptions.length ? "Select" : "No open loans"} —</option>
            {loanOptions.map((l) => (
              <option key={l.id} value={l.id}>
                {l.id} • {l.status || "open"}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Item Name *">
          <input
            className="w-full border rounded px-3 py-2"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
          />
        </Field>

        <Field label="Category">
          <input
            className="w-full border rounded px-3 py-2"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Electronics / Vehicle…"
          />
        </Field>

        <Field label="Model">
          <input className="w-full border rounded px-3 py-2" value={model} onChange={(e) => setModel(e.target.value)} />
        </Field>

        <Field label="Serial #">
          <input
            className="w-full border rounded px-3 py-2"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
          />
        </Field>

        <Field label="Est. Value">
          <input
            className="w-full border rounded px-3 py-2"
            value={estValue}
            onChange={(e) => setEstValue(e.target.value)}
            type="number"
            step="0.01"
          />
        </Field>

        <Field label="Location">
          <input className="w-full border rounded px-3 py-2" value={location} onChange={(e) => setLocation(e.target.value)} />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Notes">
            <textarea className="w-full border rounded px-3 py-2" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>

        {isEdit && (
          <Field label="Status">
            <select className="w-full border rounded px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="RELEASED">RELEASED</option>
              <option value="DISPOSED">DISPOSED</option>
            </select>
          </Field>
        )}

        <div className="sm:col-span-2 flex gap-2 pt-2">
          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
          >
            {isEdit ? "Save Changes" : "Register Collateral"}
          </button>
          <button type="button" className="px-4 py-2 rounded border" onClick={() => navigate("/collateral")}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
