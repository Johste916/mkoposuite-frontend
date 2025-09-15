// src/services/banking.js
import api from "../api";

/* ============================================================================
 * BANK ACCOUNTS
 * ========================================================================== */
export const listBanks = () => api.getJSON("/banks");
export const getBank = (id) => api.getJSON(`/banks/${id}`);
export const createBank = (data) => api.postJSON("/banks", data);
export const updateBank = (id, data) => api.patchJSON(`/banks/${id}`, data);
export const deleteBank = (id) => api.deleteJSON(`/banks/${id}`);

/* ============================================================================
 * BANK TRANSACTIONS (aggregate + per bank)
 * ========================================================================== */
export const listAllBankTransactions = (params = {}) =>
  api.getJSON("/banks/transactions", { params });

export const listBankTransactions = (bankId, params = {}) =>
  api.getJSON(`/banks/${bankId}/transactions`, { params });

export const createBankTransaction = (bankId, data) =>
  api.postJSON(`/banks/${bankId}/transactions`, data);

export const repayLoanViaBank = (bankId, data) =>
  api.postJSON(`/banks/${bankId}/repayments`, data);

export const reconcileBankTx = (txId, data = {}) =>
  api.postJSON(`/banks/transactions/${txId}/reconcile`, data);

export const unreconcileBankTx = (txId, data = {}) =>
  api.postJSON(`/banks/transactions/${txId}/unreconcile`, data);

/* ============================================================================
 * TRANSFERS
 * ========================================================================== */
export const transferBetweenBanks = (fromBankId, data /* { toBankId, amount, ... } */) =>
  api.postJSON(`/banks/${fromBankId}/transfer`, data);

export const transferBankToCash = (fromBankId, data /* { cashAccountId, amount, ... } */) =>
  api.postJSON(`/banks/${fromBankId}/transfer-to-cash`, data);

/* ============================================================================
 * STATEMENTS / BALANCES
 * ========================================================================== */
export const getBankBalanceAsOf = (bankId, { asOf } = {}) =>
  api.getJSON(`/banks/${bankId}/balance`, { params: { asOf } });

export const getBankStatement = (bankId, { from, to, includeOpening = true } = {}) =>
  api.getJSON(`/banks/${bankId}/statement`, {
    params: { from, to, includeOpening },
  });

/* ============================================================================
 * INTERNAL OVERVIEW / STATS
 * ========================================================================== */
export const getBanksOverview = () =>
  api.getJSON("/banks/__internal/overview");

export const getPaymentStats = ({ from, to } = {}) =>
  api.getJSON("/banks/__internal/stats/payments", { params: { from, to } });

/* ============================================================================
 * CODES (types/status/channels)
 * ========================================================================== */
export const getBankingCodes = () => api.getJSON("/banks/codes");
export const getBankingCodesGroup = (group) => api.getJSON(`/banks/codes/${group}`);

/* =============================================================================
 * CASH SUB-ROUTES  (mounted under /banks/cash/*)
 * ========================================================================== */
export const listCashAccounts = () => api.getJSON("/banks/cash/accounts");
export const createCashAccount = (data) => api.postJSON("/banks/cash/accounts", data);

export const listCashTransactions = (cashAccountId, params = {}) =>
  api.getJSON(`/banks/cash/accounts/${cashAccountId}/transactions`, { params });

export const createCashTransaction = (cashAccountId, data) =>
  api.postJSON(`/banks/cash/accounts/${cashAccountId}/transactions`, data);

/** Cash Statement (mirror bank statement shape) */
export const getCashStatement = (
  cashAccountId,
  { from, to, includeOpening = true } = {}
) =>
  api.getJSON(`/banks/cash/accounts/${cashAccountId}/statement`, {
    params: { from, to, includeOpening },
  });

/** Cash Reconciliation (maker/checker parity) */
export const reconcileCashTx = (txId, data = {}) =>
  api.postFirst(
    [
      `/banks/cash/transactions/${txId}/reconcile`,
      `/cash/transactions/${txId}/reconcile`,
    ],
    data
  );

export const unreconcileCashTx = (txId, data = {}) =>
  api.postFirst(
    [
      `/banks/cash/transactions/${txId}/unreconcile`,
      `/cash/transactions/${txId}/unreconcile`,
    ],
    data
  );

/* =============================================================================
 * APPROVALS (Maker-Checker)
 * ========================================================================== */
/**
 * We provide both generic and specific helpers.
 * If backend only exposes /banks/approvals, we filter client-side.
 */
export const listBankingApprovals = (params = {}) =>
  api.getFirst(["/banks/approvals", "/banking/approvals"], { params });

export const listPendingBankTx = async () => {
  const data = await listBankingApprovals();
  const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
  // Heuristic: treat non-cash as bank.
  return items.filter((x) => (x?.channel || x?.kind || "bank") !== "cash");
};

export const listPendingCashTx = async () => {
  const data = await listBankingApprovals();
  const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
  return items.filter((x) => (x?.channel || x?.kind) === "cash");
};

export const approveBankingItem = (id, data = {}) =>
  api.postFirst(
    [`/banks/approvals/${id}/approve`, `/banking/approvals/${id}/approve`],
    data
  );

export const rejectBankingItem = (id, data = {}) =>
  api.postFirst(
    [`/banks/approvals/${id}/reject`, `/banking/approvals/${id}/reject`],
    data
  );

// Specific shims expected by your pages:
export const approveBankTx  = (id)         => approveBankingItem(id);
export const rejectBankTx   = (id, note)   => rejectBankingItem(id, { note });
export const approveCashTx  = (id)         => approveBankingItem(id);
export const rejectCashTx   = (id, note)   => rejectBankingItem(id, { note });

/* =============================================================================
 * RULES & GL MAPPING
 * ========================================================================== */
export const listRules = () =>
  api.getFirst(["/banks/rules", "/banking/rules"]);

export const createRule = (data) =>
  api.postFirst(["/banks/rules", "/banking/rules"], data);

export const updateRule = (id, data) =>
  api.patchFirst([`/banks/rules/${id}`, `/banking/rules/${id}`], data);

export const deleteRule = (id) =>
  api.deleteFirst([`/banks/rules/${id}`, `/banking/rules/${id}`]);

// Missing in your original service but required by the page:
export const getGlMapping = () =>
  api.getFirst([
    "/banks/rules/gl-mapping",
    "/banking/rules/gl-mapping",
  ]);

export const saveGlMapping = (payload) =>
  api.postFirst(
    ["/banks/rules/gl-mapping", "/banking/rules/gl-mapping"],
    payload
  );

/* =============================================================================
 * IMPORT (CSV → POST rows)
 * ========================================================================== */
export const importBankCsvRows = async (bankId, rows) => {
  const results = [];
  for (const row of rows) {
    // eslint-disable-next-line no-await-in-loop
    const created = await createBankTransaction(bankId, row);
    results.push(created);
  }
  return results;
};

/* =============================================================================
 * Utilities
 * ========================================================================== */
export function computeRunningBalance(opening, txs = []) {
  let bal = Number(opening || 0);
  return txs.map((t) => {
    const delta = (t.direction === "out" ? -1 : 1) * Number(t.amount || 0);
    bal += delta;
    return { ...t, runningBalance: bal };
  });
}

export default {
  // banks
  listBanks,
  getBank,
  createBank,
  updateBank,
  deleteBank,
  listAllBankTransactions,
  listBankTransactions,
  createBankTransaction,
  repayLoanViaBank,
  reconcileBankTx,
  unreconcileBankTx,
  transferBetweenBanks,
  transferBankToCash,
  getBankBalanceAsOf,
  getBankStatement,
  getBanksOverview,
  getPaymentStats,
  getBankingCodes,
  getBankingCodesGroup,

  // cash
  listCashAccounts,
  createCashAccount,
  listCashTransactions,
  createCashTransaction,
  getCashStatement,
  reconcileCashTx,
  unreconcileCashTx,

  // approvals / rules / mapping / import
  listBankingApprovals,
  listPendingBankTx,
  listPendingCashTx,
  approveBankTx,
  rejectBankTx,
  approveCashTx,
  rejectCashTx,
  listRules,
  createRule,
  updateRule,
  deleteRule,
  getGlMapping,
  saveGlMapping,
  importBankCsvRows,

  // utils
  computeRunningBalance,
};
