// src/pages/admin/KVPageRouter.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../api";

// Map the admin slugs to a single KV key each.
// (Feel free to tweak the right-hand keys; these go to /api/settings/kv/:key)
const SLUG_TO_KV_KEY = {
  // Borrowers
  "format-borrower-reports": "borrowers.formatReports",
  "rename-borrower-reports": "borrowers.renameReports",
  "rename-collection-sheet-headings": "collections.renameHeadings",
  "invite-borrowers-settings": "borrowers.inviteSettings",
  "modify-add-borrower-fields": "borrowers.customFields",

  // Repayments
  "loan-repayment-methods": "repayments.methods",
  "manage-collectors": "repayments.collectors",

  // Collateral
  "collateral-types": "collateral.types",

  // Payroll
  "payroll-templates": "payroll.templates",

  // Bulk uploads (these are mostly info schemas/templates)
  "upload-borrowers-from-csv-file": "uploads.borrowers",
  "upload-loans-from-csv-file": "uploads.loans",
  "upload-repayments-from-csv-file": "uploads.repayments",
  "upload-expenses-from-csv-file": "uploads.expenses",
  "upload-other-income-from-csv-file": "uploads.otherIncome",
  "upload-savings-accounts-from-csv-file": "uploads.savingsAccounts",
  "upload-savings-transactions-from-csv-file": "uploads.savingsTransactions",
  "upload-loan-schedule-from-csv-file": "uploads.loanSchedule",
  "upload-inter-bank-transfer-from-csv-file": "uploads.interBankTransfer",

  // Income/Expense/Assets
  "other-income-types": "otherIncome.types",
  "expense-types": "expenses.types",
  "asset-management-types": "assets.types",

  // SMS
  "sms-credits": "sms.credits",
  "sender-id": "sms.senderId",
  "sms-templates": "sms.templates",
  "auto-send-sms": "sms.autoSend",
  "collection-sheets-sms-template": "collections.smsTemplate",

  // Email
  "email-templates": "email.templates",
  "auto-send-emails": "email.autoSend",
  "collection-sheets-email-template": "collections.emailTemplate",

  // Savings
  "savings-products": "savings.products",
  "savings-fees": "savings.fees",
  "savings-transaction-types": "savings.transactionTypes",

  // E-signature
  "e-signature-settings": "esign.settings",
  "email-templates-for-e-signature": "esign.emailTemplates",

  // Investors
  "investor-products": "investors.products",
  "loan-investment-products": "investors.loanInvestmentProducts",
  "investor-fees": "investors.fees",
  "format-investor-report": "investors.formatReport",
  "rename-investor-report": "investors.renameReport",
  "invite-investors-settings": "investors.inviteSettings",
  "investor-transaction-types": "investors.transactionTypes",

  // Accounting
  "settings": "accounting.settings",
  "bank-accounts": "accounting.bankAccounts",
  "taxes": "accounting.taxes",
  "opening-balances": "accounting.openingBalances",

  // Backups
  "backup-settings": "backups.settings",
  "download-backups": "backups.downloads",
};

export default function KVPageRouter() {
  const { slug } = useParams();
  const key = SLUG_TO_KV_KEY[slug];

  const [val, setVal] = useState("{}");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    let mounted = true;
    setErr("");
    setOk("");
    setLoading(true);
    if (!key) {
      setErr("This settings page is not mapped to a KV key yet.");
      setLoading(false);
      return;
    }
    api
      .get(`/api/settings/kv/${encodeURIComponent(key)}`)
      .then(({ data }) => {
        if (!mounted) return;
        const pretty = JSON.stringify(data ?? {}, null, 2);
        setVal(pretty);
      })
      .catch((e) => setErr(e?.response?.data?.error || e.message))
      .finally(() => mounted && setLoading(false));
    return () => (mounted = false);
  }, [key, slug]);

  const parsed = useMemo(() => {
    try {
      return JSON.parse(val || "{}");
    } catch {
      return null;
    }
  }, [val]);

  const save = async () => {
    if (!key) return;
    setErr("");
    setOk("");
    if (parsed == null) {
      setErr("Invalid JSON — please fix before saving.");
      return;
    }
    setSaving(true);
    try {
      await api.put(`/api/settings/kv/${encodeURIComponent(key)}`, { value: parsed });
      setOk("Saved.");
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  const title =
    (slug || "")
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ") || "Settings";

  if (loading) return <div className="p-6 text-sm text-slate-500">Loading…</div>;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{title}</h1>
        <button
          onClick={save}
          disabled={saving || parsed == null}
          className="px-3 py-2 border rounded bg-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      {err && <div className="text-sm text-rose-600">{err}</div>}
      {ok && <div className="text-sm text-emerald-600">{ok}</div>}
      {!key && (
        <div className="text-sm text-slate-600">
          Add this slug to <code>SLUG_TO_KV_KEY</code> to enable it.
        </div>
      )}
      {key && (
        <>
          <div className="text-xs text-slate-500">KV key: <code>{key}</code></div>
          <textarea
            className="w-full border rounded p-3 text-sm font-mono min-h-[320px]"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            spellCheck={false}
          />
          {parsed == null && (
            <div className="text-xs text-rose-600">JSON is invalid — fix before saving.</div>
          )}
        </>
      )}
    </div>
  );
}
