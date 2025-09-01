// src/pages/admin/KVPageRouter.jsx
import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { KV, ensureType } from "../../api/settings";
import { useSettingsResource } from "../../hooks/useSettingsResource";

/** Small inputs */
const TextInput = ({ value, onChange, placeholder }) => (
  <input
    className="w-full rounded border px-3 py-2 text-sm"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
  />
);
const TextArea = ({ value, onChange, rows = 8, placeholder }) => (
  <textarea
    className="w-full rounded border px-3 py-2 text-sm"
    rows={rows}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
  />
);

/* ------------------------ Editors ------------------------ */
function ListEditor({ value, onChange, itemPlaceholder = "Type name…" }) {
  const list = ensureType(value, []);
  const [draft, setDraft] = useState("");

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...list, v]);
    setDraft("");
  };
  const remove = (i) => onChange(list.filter((_, idx) => idx !== i));
  const update = (i, v) => onChange(list.map((x, idx) => (idx === i ? v : x)));

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <TextInput value={draft} onChange={setDraft} placeholder={itemPlaceholder} />
        <button className="px-3 py-1.5 rounded bg-slate-100" onClick={add}>Add</button>
      </div>
      {list.length === 0 ? (
        <div className="text-sm text-slate-500">No items yet.</div>
      ) : (
        <ul className="space-y-2">
          {list.map((item, i) => (
            <li key={i} className="flex gap-2">
              <TextInput value={item} onChange={(v) => update(i, v)} />
              <button className="px-3 py-1.5 rounded bg-rose-50 text-rose-700" onClick={() => remove(i)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MapEditor({ value, onChange, keyLabel = "Key", valLabel = "Label", valueAs = "text" }) {
  const obj = ensureType(value, {});
  const pairs = Object.entries(obj);

  const add = () => {
    const next = { ...obj };
    let i = 1;
    while (next[`field_${i}`]) i++;
    next[`field_${i}`] = "";
    onChange(next);
  };
  const updateKey = (oldKey, newKey) => {
    if (!newKey || newKey === oldKey) return;
    const next = { ...obj };
    const val = next[oldKey];
    delete next[oldKey];
    next[newKey] = val;
    onChange(next);
  };
  const updateVal = (k, v) => onChange({ ...obj, [k]: v });
  const remove = (k) => {
    const next = { ...obj };
    delete next[k];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button className="px-3 py-1.5 rounded bg-slate-100" onClick={add}>Add Row</button>
      </div>
      {pairs.length === 0 ? (
        <div className="text-sm text-slate-500">No mappings yet.</div>
      ) : (
        <div className="space-y-2">
          {pairs.map(([k, v]) => (
            <div key={k} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start">
              <div>
                <label className="text-xs text-slate-500">{keyLabel}</label>
                <TextInput value={k} onChange={(newK) => updateKey(k, newK)} />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-slate-500">{valLabel}</label>
                {valueAs === "textarea" ? (
                  <TextArea value={v ?? ""} onChange={(nv) => updateVal(k, nv)} rows={5} />
                ) : (
                  <TextInput value={v ?? ""} onChange={(nv) => updateVal(k, nv)} />
                )}
              </div>
              <div className="md:col-span-3">
                <button className="px-3 py-1.5 rounded bg-rose-50 text-rose-700" onClick={() => remove(k)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function JSONEditor({ value, onChange, placeholder = "{\n  \"example\": true\n}" }) {
  const [text, setText] = useState(() => JSON.stringify(ensureType(value, {}), null, 2));
  const [err, setErr] = useState("");

  const apply = () => {
    try {
      const parsed = text.trim() ? JSON.parse(text) : {};
      onChange(parsed);
      setErr("");
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className="space-y-2">
      <TextArea value={text} onChange={setText} rows={14} placeholder={placeholder} />
      <div className="flex gap-2 items-center">
        <button className="px-3 py-1.5 rounded bg-slate-100" onClick={apply}>Apply</button>
        {err && <span className="text-xs text-rose-600">{err}</span>}
      </div>
    </div>
  );
}

/* ------------------------ Spec map ------------------------ */
/** Map each admin slug -> { title, key, editor, defaults, ... } */
const SPECS = {
  // Borrowers
  "format-borrower-reports": {
    title: "Format Borrower Reports",
    key: "format-borrower-reports",
    editor: "map",
    defaults: { dateFormat: "dd/mm/yyyy", showTotals: "true" },
    help: "Configure simple format flags or name→value pairs the reports will honor.",
  },
  "rename-borrower-reports": {
    title: "Rename Borrower Reports",
    key: "rename-borrower-reports",
    editor: "map",
    defaults: { "Borrowers Report": "Clients", "At a Glance": "Overview" },
    help: "Map default report titles to your preferred names.",
  },
  "rename-collection-sheet-headings": {
    title: "Rename Collection Sheet Headings",
    key: "collection-sheet-headings",
    editor: "map",
    defaults: { amount: "Amount", due_date: "Due Date", client: "Borrower" },
    help: "Rename column headings in collection sheets.",
  },
  "invite-borrowers-settings": {
    title: "Invite Borrowers Settings",
    key: "invite-borrowers",
    editor: "map",
    defaults: { subject: "Welcome to MkopoSuite", message: "Hello {{name}}, …" },
    help: "Simple subject/message pair for borrower invites. Use {{name}} in templates.",
    valueAs: "textarea",
  },
  "modify-add-borrower-fields": {
    title: "Modify Add Borrower Fields",
    key: "borrower-fields",
    editor: "json",
    defaults: { required: ["firstName", "lastName"], optional: ["middleName"] },
    help: "Define required/optional/custom borrower fields.",
  },

  // Repayments
  "loan-repayment-methods": {
    title: "Loan Repayment Methods",
    key: "repayment-methods",
    editor: "list",
    defaults: ["Cash", "Bank Transfer", "Mobile Money"],
    help: "Add the repayment methods you accept.",
  },
  "manage-collectors": {
    title: "Manage Collectors",
    key: "collectors",
    editor: "list",
    defaults: [],
    help: "Manage collector labels used in sheets and reports.",
  },

  // Collateral
  "collateral-types": {
    title: "Collateral Types",
    key: "collateral-types",
    editor: "list",
    defaults: ["Vehicle", "Land Title", "Electronics"],
  },

  // Payroll
  "payroll-templates": {
    title: "Payroll Templates",
    key: "payroll-templates",
    editor: "list",
    defaults: ["Standard", "Contractors"],
  },

  // Other Income / Expenses / Assets
  "other-income-types": {
    title: "Other Income Types",
    key: "other-income-types",
    editor: "list",
    defaults: ["Training Fees", "Asset Sale"],
  },
  "expense-types": {
    title: "Expense Types",
    key: "expense-types",
    editor: "list",
    defaults: ["Rent", "Fuel", "Utilities"],
  },
  "asset-management-types": {
    title: "Asset Management Types",
    key: "asset-management-types",
    editor: "list",
    defaults: ["Vehicle", "Electronics", "Furniture"],
  },

  // Savings
  "savings-products": {
    title: "Savings Products",
    key: "savings-products",
    editor: "list",
    defaults: ["Voluntary", "Compulsory"],
  },
  "savings-fees": {
    title: "Savings Fees",
    key: "savings-fees",
    editor: "list",
    defaults: ["Withdrawal Fee", "Dormancy Fee"],
  },
  "savings-transaction-types": {
    title: "Savings Transaction Types",
    key: "savings-transaction-types",
    editor: "list",
    defaults: ["Deposit", "Withdrawal", "Interest"],
  },

  // SMS
  "sms-credits": {
    title: "SMS Credits",
    key: "sms-credits",
    editor: "json",
    defaults: { balance: 0, provider: "n/a" },
    help: "If you integrate a provider, this can be populated automatically.",
  },
  "sender-id": {
    title: "Sender ID",
    key: "sms-sender-id",
    editor: "map",
    defaults: { senderId: "" },
  },
  "sms-templates": {
    title: "SMS Templates",
    key: "sms-templates",
    editor: "map",
    defaults: { repayment_reminder: "Dear {{name}}, your loan is due on {{due_date}}." },
    valueAs: "textarea",
    help: "Use {{var}} placeholders. Common vars: {{name}}, {{amount}}, {{due_date}}.",
  },
  "auto-send-sms": {
    title: "Auto Send SMS",
    key: "sms-auto",
    editor: "json",
    defaults: { enabled: false, events: { repayment_due: true, missed_payment: true } },
  },
  "collection-sheets-sms-template": {
    title: "Collection Sheets - SMS Template",
    key: "collection-sheets-sms",
    editor: "map",
    defaults: { template: "Hello {{name}}, you owe {{amount}} due {{due_date}}." },
    valueAs: "textarea",
  },

  // Email
  "email-templates": {
    title: "Email Templates",
    key: "email-templates",
    editor: "map",
    defaults: { borrower_invite: "Hello {{name}}, welcome to MkopoSuite." },
    valueAs: "textarea",
  },
  "auto-send-emails": {
    title: "Auto Send Emails",
    key: "email-auto",
    editor: "json",
    defaults: { enabled: false, events: { new_loan: true, repayment_receipt: true } },
  },
  "collection-sheets-email-template": {
    title: "Collection Sheets - Email Template",
    key: "collection-sheets-email",
    editor: "map",
    defaults: { subject: "Collection Reminder", body: "Dear {{name}}, …" },
    valueAs: "textarea",
  },

  // E-Signature
  "e-signature-settings": {
    title: "E-Signature Settings",
    key: "esign-settings",
    editor: "json",
    defaults: { provider: "manual", webhooks: false },
  },
  "email-templates-for-e-signature": {
    title: "E-Signature Email Templates",
    key: "esign-email-templates",
    editor: "map",
    defaults: { request_signature: "Please review and e-sign your document." },
    valueAs: "textarea",
  },

  // Investors
  "investor-products": {
    title: "Investor Products",
    key: "investor-products",
    editor: "list",
    defaults: ["Term Note", "Revenue Share"],
  },
  "loan-investment-products": {
    title: "Loan Investment Products",
    key: "loan-investment-products",
    editor: "list",
    defaults: ["Co-lending", "Participation"],
  },
  "investor-fees": {
    title: "Investor Fees",
    key: "investor-fees",
    editor: "list",
    defaults: ["Management Fee", "Performance Fee"],
  },
  "format-investor-report": {
    title: "Format Investor Report",
    key: "format-investor-report",
    editor: "map",
    defaults: { dateFormat: "dd/mm/yyyy" },
  },
  "rename-investor-report": {
    title: "Rename Investor Report",
    key: "rename-investor-report",
    editor: "map",
    defaults: { "Investor Report": "Investors Overview" },
  },
  "invite-investors-settings": {
    title: "Invite Investors Settings",
    key: "invite-investors",
    editor: "map",
    defaults: { subject: "Invest with us", message: "Hello {{name}}, …" },
    valueAs: "textarea",
  },
  "investor-transaction-types": {
    title: "Investor Transaction Types",
    key: "investor-transaction-types",
    editor: "list",
    defaults: ["Contribution", "Distribution", "Fee"],
  },

  // Accounting
  "settings": {
    title: "Accounting Settings",
    key: "accounting-settings",
    editor: "map",
    defaults: { basis: "cash" },
  },
  "bank-accounts": {
    title: "Bank Accounts",
    key: "bank-accounts",
    editor: "list",
    defaults: [],
  },
  "taxes": {
    title: "Taxes",
    key: "taxes",
    editor: "list",
    defaults: ["VAT 18%"],
  },
  "opening-balances": {
    title: "Opening Balances",
    key: "opening-balances",
    editor: "json",
    defaults: {},
    help: "Record opening balances from the Accounting module; this is a simple placeholder.",
  },

  // Backups
  "backup-settings": {
    title: "Backup Settings",
    key: "backup-settings",
    editor: "json",
    defaults: { schedule: "0 3 * * *", retentionDays: 30, offsite: false },
  },
  "download-backups": {
    title: "Download Backups",
    key: "download-backups",
    editor: "json",
    defaults: {},
    help: "Use your infrastructure/DB tooling to download backups. This page stores optional notes.",
  },
};

/* ------------------------ Page ------------------------ */
export default function KVPageRouter() {
  const { slug } = useParams();
  const spec = SPECS[slug];

  if (!spec) {
    return (
      <div className="bg-white dark:bg-slate-900 border rounded-2xl p-6">
        <h1 className="text-xl font-semibold">Unknown Settings</h1>
        <p className="text-sm text-slate-600 mt-1">
          No editor is registered for: <code>{slug}</code>
        </p>
      </div>
    );
  }

  const getFn = () => KV.get(spec.key);
  const saveFn = (val) => KV.save(spec.key, val);

  const { data, setData, loading, saving, error, success, save } =
    useSettingsResource(getFn, saveFn, spec.defaults);

  const title = spec.title;

  return (
    <div className="space-y-4">
      <header className="bg-white dark:bg-slate-900 border rounded-2xl p-4">
        <h1 className="text-xl font-semibold">{title}</h1>
        {spec.help && <p className="text-sm text-slate-500">{spec.help}</p>}
      </header>

      {error && (
        <div className="bg-rose-50 text-rose-700 border border-rose-200 rounded-lg p-3 text-sm">{String(error)}</div>
      )}
      {success && (
        <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg p-3 text-sm">{success}</div>
      )}

      <section className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3">
        {loading ? (
          <div className="text-sm text-slate-500">Loading…</div>
        ) : spec.editor === "list" ? (
          <ListEditor value={data} onChange={(v) => setData(v)} />
        ) : spec.editor === "map" ? (
          <MapEditor
            value={data}
            onChange={(v) => setData(v)}
            valueAs={spec.valueAs || "text"}
          />
        ) : spec.editor === "text" ? (
          <TextArea value={ensureType(data, "")} onChange={(v) => setData(v)} rows={12} />
        ) : spec.editor === "json" ? (
          <JSONEditor value={data} onChange={(v) => setData(v)} />
        ) : (
          <div className="text-sm text-slate-500">No editor available.</div>
        )}
      </section>

      <button
        className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm"
        disabled={saving}
        onClick={() => save()}
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
