import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../api";
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  ArrowRightLeft,
  Download,
  Plus,
  BadgeCheck,
} from "lucide-react";

const card =
  "bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-5 md:p-7";
const clsInput =
  "w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all";
const clsBtn =
  "inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50";
const clsPrimary =
  "inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700";

export default function BankDetails() {
  const { id } = useParams();
  const [bank, setBank] = useState(null);
  const [balance, setBalance] = useState(null);
  const [codes, setCodes] = useState({
    transactionTypes: [],
    statuses: [],
    channels: [],
  });
  const [txs, setTxs] = useState([]);
  const [filters, setFilters] = useState({
    type: "",
    status: "",
    reconciled: "",
    from: "",
    to: "",
  });

  const [newTx, setNewTx] = useState({
    type: "deposit",
    direction: "in",
    amount: "",
    occurredAt: "",
    reference: "",
    description: "",
  });

  const [repay, setRepay] = useState({
    loanId: "",
    amount: "",
    occurredAt: "",
    reference: "",
  });

  const [transfer, setTransfer] = useState({
    toBankId: "",
    amount: "",
    occurredAt: "",
    reference: "",
  });

  const [cash, setCash] = useState({
    cashAccountId: "",
    amount: "",
    occurredAt: "",
    reference: "",
  });

  const [cashAccounts, setCashAccounts] = useState([]);
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [b, bal, c, list, allBanks] = await Promise.all([
        api.get(`/banks/${id}`),
        api.get(`/banks/${id}/balance`),
        api.get(`/banks/codes`),
        api.get(`/banks/${id}/transactions`, { params: cleanFilters(filters) }),
        api.get(`/banks`),
      ]);
      setBank(b.data);
      setBalance(bal.data);
      setCodes({
        transactionTypes: Array.isArray(c.data?.transactionTypes)
          ? c.data.transactionTypes
          : [],
        statuses: Array.isArray(c.data?.statuses) ? c.data.statuses : [],
        channels: Array.isArray(c.data?.channels) ? c.data.channels : [],
      });
      setTxs(list.data || []);
      setBanks((allBanks.data || []).filter((x) => String(x.id) !== String(id)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadCash = async () => {
    try {
      const r = await api.get(`/banks/cash/accounts`);
      setCashAccounts(r.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    load();
    loadCash();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get(`/banks/${id}/transactions`, {
          params: cleanFilters(filters),
        });
        setTxs(r.data || []);
      } catch (e) {
        console.error(e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const onCreateTx = async (e) => {
    e.preventDefault();
    if (!newTx.amount) return alert("Amount is required");
    try {
      await api.post(`/banks/${id}/transactions`, {
        ...newTx,
        amount: Number(newTx.amount),
        occurredAt: newTx.occurredAt || undefined,
        direction: inferDirection(newTx.type),
      });
      setNewTx({
        type: "deposit",
        direction: "in",
        amount: "",
        occurredAt: "",
        reference: "",
        description: "",
      });
      await load();
    } catch (e) {
      console.error(e);
      alert("Failed to create transaction");
    }
  };

  const onRepay = async (e) => {
    e.preventDefault();
    if (!repay.loanId || !repay.amount)
      return alert("Loan ID and amount are required");
    try {
      await api.post(`/banks/${id}/repayments`, {
        ...repay,
        amount: Number(repay.amount),
        occurredAt: repay.occurredAt || undefined,
      });
      setRepay({ loanId: "", amount: "", occurredAt: "", reference: "" });
      await load();
    } catch (e) {
      console.error(e);
      alert("Failed to record repayment");
    }
  };

  const onTransfer = async (e) => {
    e.preventDefault();
    if (!transfer.toBankId || !transfer.amount)
      return alert("Target bank and amount are required");
    try {
      await api.post(`/banks/${id}/transfer`, {
        ...transfer,
        amount: Number(transfer.amount),
        occurredAt: transfer.occurredAt || undefined,
      });
      setTransfer({ toBankId: "", amount: "", occurredAt: "", reference: "" });
      await load();
    } catch (e) {
      console.error(e);
      alert("Failed to transfer");
    }
  };

  const onTransferToCash = async (e) => {
    e.preventDefault();
    if (!cash.cashAccountId || !cash.amount)
      return alert("Cash account and amount are required");
    try {
      await api.post(`/banks/${id}/transfer-to-cash`, {
        ...cash,
        amount: Number(cash.amount),
        occurredAt: cash.occurredAt || undefined,
      });
      setCash({ cashAccountId: "", amount: "", occurredAt: "", reference: "" });
      await load();
    } catch (e) {
      console.error(e);
      alert("Failed to transfer to cash");
    }
  };

  const toggleReconcile = async (tx) => {
    try {
      if (tx.reconciled) {
        await api.post(`/banks/transactions/${tx.id}/unreconcile`);
      } else {
        await api.post(`/banks/transactions/${tx.id}/reconcile`, {
          bankRef: tx.bankRef || "",
          note: tx.note || "",
        });
      }
      await load();
    } catch (e) {
      console.error(e);
      alert("Failed to toggle reconciliation");
    }
  };

  const downloadStatement = async () => {
    try {
      const r = await api.get(`/banks/${id}/statement`, {
        params: cleanFilters({ ...filters, includeOpening: 1 }),
      });
      const blob = new Blob([JSON.stringify(r.data, null, 2)], {
        type: "application/json",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `bank-statement-${bank?.name || id}.json`;
      a.click();
    } catch (e) {
      console.error(e);
      alert("Failed to download statement");
    }
  };

  const txList = useMemo(() => (Array.isArray(txs) ? txs : []), [txs]);

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {bank?.name || "Bank"}
          </h1>
          <p className="text-sm text-gray-500">
            Manage transactions, repayments, transfers and reconciliation.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/banks" className={clsBtn}>
            Back
          </Link>
          <Link to={`/banks/${id}/edit`} className={clsBtn}>
            Edit
          </Link>
          <button onClick={downloadStatement} className={clsBtn}>
            <Download className="h-4 w-4" /> Statement
          </button>
          <button onClick={load} className={clsBtn}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Overview */}
        <section className={card}>
          <h2 className="font-semibold mb-3">Balances</h2>
          <div className="text-sm grid grid-cols-2 gap-2">
            <div className="text-gray-500">Opening</div>
            <div className="text-right font-medium">{fmt(balance?.opening)}</div>
            <div className="text-gray-500">Inflow</div>
            <div className="text-right font-medium">{fmt(balance?.inflow)}</div>
            <div className="text-gray-500">Outflow</div>
            <div className="text-right font-medium">{fmt(balance?.outflow)}</div>
            <div className="text-gray-500">Closing</div>
            <div className="text-right font-semibold">
              {fmt(balance?.closing)}
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-500">
            As of {balance?.asOf ? new Date(balance.asOf).toLocaleString() : "—"}
          </div>
        </section>

        {/* New Transaction */}
        <section className={card}>
          <h2 className="font-semibold mb-3">New Transaction</h2>
          <form onSubmit={onCreateTx} className="space-y-2">
            <div>
              <label className="text-xs text-gray-600">Type</label>
              <select
                className={clsInput}
                value={newTx.type}
                onChange={(e) =>
                  setNewTx({
                    ...newTx,
                    type: e.target.value,
                    direction: inferDirection(e.target.value),
                  })
                }
              >
                {codes.transactionTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">Amount</label>
              <input
                type="number"
                step="0.01"
                className={clsInput}
                value={newTx.amount}
                onChange={(e) =>
                  setNewTx({ ...newTx, amount: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">
                Occurred At (optional)
              </label>
              <input
                type="datetime-local"
                className={clsInput}
                value={newTx.occurredAt}
                onChange={(e) =>
                  setNewTx({ ...newTx, occurredAt: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">
                Reference (optional)
              </label>
              <input
                className={clsInput}
                value={newTx.reference}
                onChange={(e) =>
                  setNewTx({ ...newTx, reference: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">
                Description (optional)
              </label>
              <input
                className={clsInput}
                value={newTx.description}
                onChange={(e) =>
                  setNewTx({ ...newTx, description: e.target.value })
                }
              />
            </div>
            <button className={clsPrimary}>
              <Plus className="h-4 w-4" /> Create
            </button>
          </form>
        </section>

        {/* Repayment */}
        <section className={card}>
          <h2 className="font-semibold mb-3">Loan Repayment (Bank)</h2>
          <form onSubmit={onRepay} className="space-y-2">
            <div>
              <label className="text-xs text-gray-600">Loan ID</label>
              <input
                className={clsInput}
                value={repay.loanId}
                onChange={(e) =>
                  setRepay({ ...repay, loanId: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Amount</label>
              <input
                type="number"
                step="0.01"
                className={clsInput}
                value={repay.amount}
                onChange={(e) =>
                  setRepay({ ...repay, amount: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">
                Occurred At (optional)
              </label>
              <input
                type="datetime-local"
                className={clsInput}
                value={repay.occurredAt}
                onChange={(e) =>
                  setRepay({ ...repay, occurredAt: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">
                Reference (optional)
              </label>
              <input
                className={clsInput}
                value={repay.reference}
                onChange={(e) =>
                  setRepay({ ...repay, reference: e.target.value })
                }
              />
            </div>
            <button className={clsPrimary}>
              <BadgeCheck className="h-4 w-4" /> Record Repayment
            </button>
          </form>
        </section>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        {/* Transfer to bank */}
        <section className={card}>
          <h2 className="font-semibold mb-3">Transfer to Another Bank</h2>
          <form onSubmit={onTransfer} className="space-y-2">
            <div>
              <label className="text-xs text-gray-600">Target Bank</label>
              <select
                className={clsInput}
                value={transfer.toBankId}
                onChange={(e) =>
                  setTransfer({ ...transfer, toBankId: e.target.value })
                }
              >
                <option value="">— Select —</option>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">Amount</label>
              <input
                type="number"
                step="0.01"
                className={clsInput}
                value={transfer.amount}
                onChange={(e) =>
                  setTransfer({ ...transfer, amount: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Occurred At</label>
              <input
                type="datetime-local"
                className={clsInput}
                value={transfer.occurredAt}
                onChange={(e) =>
                  setTransfer({ ...transfer, occurredAt: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">
                Reference (optional)
              </label>
              <input
                className={clsInput}
                value={transfer.reference}
                onChange={(e) =>
                  setTransfer({ ...transfer, reference: e.target.value })
                }
              />
            </div>
            <button className={clsBtn}>
              <ArrowRightLeft className="h-4 w-4" /> Transfer
            </button>
          </form>
        </section>

        {/* Transfer to cash */}
        <section className={card}>
          <h2 className="font-semibold mb-3">Transfer to Cash</h2>
          <form onSubmit={onTransferToCash} className="space-y-2">
            <div>
              <label className="text-xs text-gray-600">Cash Account</label>
              <select
                className={clsInput}
                value={cash.cashAccountId}
                onChange={(e) =>
                  setCash({ ...cash, cashAccountId: e.target.value })
                }
              >
                <option value="">— Select —</option>
                {cashAccounts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">Amount</label>
              <input
                type="number"
                step="0.01"
                className={clsInput}
                value={cash.amount}
                onChange={(e) => setCash({ ...cash, amount: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Occurred At</label>
              <input
                type="datetime-local"
                className={clsInput}
                value={cash.occurredAt}
                onChange={(e) =>
                  setCash({ ...cash, occurredAt: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">
                Reference (optional)
              </label>
              <input
                className={clsInput}
                value={cash.reference}
                onChange={(e) =>
                  setCash({ ...cash, reference: e.target.value })
                }
              />
            </div>
            <button className={clsBtn}>
              <ArrowRightLeft className="h-4 w-4" /> Transfer
            </button>
          </form>
        </section>

        {/* Filters */}
        <section className={card}>
          <h2 className="font-semibold mb-3">Filter Transactions</h2>
          <div className="grid md:grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-600">Type</label>
              <select
                className={clsInput}
                value={filters.type}
                onChange={(e) =>
                  setFilters({ ...filters, type: e.target.value })
                }
              >
                <option value="">Any</option>
                {codes.transactionTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">Status</label>
              <select
                className={clsInput}
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
              >
                <option value="">Any</option>
                {codes.statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">Reconciled</label>
              <select
                className={clsInput}
                value={filters.reconciled}
                onChange={(e) =>
                  setFilters({ ...filters, reconciled: e.target.value })
                }
              >
                <option value="">Any</option>
                <option value="1">Reconciled</option>
                <option value="0">Not Reconciled</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">From</label>
              <input
                type="date"
                className={clsInput}
                value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">To</label>
              <input
                type="date"
                className={clsInput}
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              />
            </div>
          </div>
        </section>
      </div>

      {/* Transactions table */}
      <section className={`${card} mt-6`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Transactions</h2>
          <div className="text-xs text-gray-500">Showing {txList.length} row(s)</div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Direction</th>
                <th className="py-2 pr-4 text-right">Amount</th>
                <th className="py-2 pr-4">Reference</th>
                <th className="py-2 pr-4">Loan</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Reconciled</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {txList.map((tx) => (
                <tr key={tx.id} className="border-t">
                  <td className="py-2 pr-4">{fmtDate(tx.occurredAt)}</td>
                  <td className="py-2 pr-4">{tx.type}</td>
                  <td className="py-2 pr-4">{tx.direction}</td>
                  <td className="py-2 pr-4 text-right font-medium">
                    {fmt(tx.amount)}
                  </td>
                  <td className="py-2 pr-4">{tx.reference || "—"}</td>
                  <td className="py-2 pr-4">
                    {tx.loanId ? String(tx.loanId).slice(0, 8) : "—"}
                  </td>
                  <td className="py-2 pr-4">{tx.status}</td>
                  <td className="py-2 pr-4">
                    {tx.reconciled ? (
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-4 w-4" /> Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-gray-500">
                        <XCircle className="h-4 w-4" /> No
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <button
                      onClick={() => toggleReconcile(tx)}
                      className={clsBtn}
                    >
                      {tx.reconciled ? <>Unreconcile</> : <>Reconcile</>}
                    </button>
                  </td>
                </tr>
              ))}
              {txList.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-gray-500">
                    No transactions
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function fmt(n) {
  if (n == null) return "—";
  const x = Number(n);
  if (Number.isNaN(x)) return String(n);
  return x.toLocaleString();
}
function fmtDate(s) {
  return s ? new Date(s).toLocaleString() : "—";
}
function inferDirection(type) {
  return ["withdrawal", "disbursement", "fee", "transfer_out"].includes(type)
    ? "out"
    : "in";
}
function cleanFilters(f) {
  const out = {};
  if (f.type) out.type = f.type;
  if (f.status) out.status = f.status;
  if (f.reconciled !== "") out.reconciled = f.reconciled;
  if (f.from) out.from = f.from;
  if (f.to) out.to = f.to;
  return out;
}
