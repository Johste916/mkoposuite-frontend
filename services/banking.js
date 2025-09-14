// src/services/banking.js
import api from "../api";

/** BANKS (list/search) */
export const listBanks = (q = "") =>
  api.getJSON(`/banks${q ? `?search=${encodeURIComponent(q)}` : ""}`);

/** CASH ACCOUNTS */
export const listCashAccounts = () =>
  api.getJSON(`/banks/cash/accounts`);

export const cashAccountStatement = (cashAccountId, { from, to, includeOpening = true } = {}) => {
  const qs = new URLSearchParams();
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  if (includeOpening) qs.set("includeOpening", "true");
  return api.getJSON(`/banks/cash/accounts/${cashAccountId}/statement?${qs.toString()}`);
};

export const cashAccountTransactions = (cashAccountId, params = {}) => {
  const qs = new URLSearchParams(params);
  return api.getJSON(`/banks/cash/accounts/${cashAccountId}/transactions?${qs.toString()}`);
};

export const cashReconcile = (txId, body = {}) =>
  api.postJSON(`/banks/cash/transactions/${txId}/reconcile`, body);
export const cashUnreconcile = (txId, body = {}) =>
  api.postJSON(`/banks/cash/transactions/${txId}/unreconcile`, body);

/** BANK TRANSACTIONS (import/approvals) */
export const importBankRows = (bankId, rows) =>
  api.postJSON(`/banks/${bankId}/import`, { rows });

export const listPendingBankTx = () =>
  api.getFirst(
    [
      "/banks/transactions/pending",    // preferred
      "/banks/approvals/pending",       // fallback if backend aliases
    ]
  );

export const listPendingCashTx = () =>
  api.getFirst(
    [
      "/banks/cash/transactions/pending",
      "/banks/approvals/cash/pending",
    ]
  );

export const approveBankTx = (txId) =>
  api.postFirst([`/banks/transactions/${txId}/approve`], {});
export const rejectBankTx = (txId, reason = "Rejected") =>
  api.postFirst([`/banks/transactions/${txId}/reject`], { reason });

export const approveCashTx = (txId) =>
  api.postFirst([`/banks/cash/transactions/${txId}/approve`], {});
export const rejectCashTx = (txId, reason = "Rejected") =>
  api.postFirst([`/banks/cash/transactions/${txId}/reject`], { reason });

/** RULES / GL MAPPING */
export const getGlMapping = () =>
  api.getFirst([
    "/banks/rules/gl-mapping",
    "/banks/rules/mapping", // permissive alias
  ]);

export const saveGlMapping = (payload) =>
  api.putFirst(
    ["/banks/rules/gl-mapping", "/banks/rules/mapping"],
    payload
  );
