// src/layouts/SidebarLayout.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  FiBarChart2,
  FiBriefcase,
  FiChevronDown,
  FiChevronUp,
  FiCreditCard,
  FiDatabase,
  FiDollarSign,
  FiHome,
  FiLogOut,
  FiMenu,
  FiMessageSquare,
  FiMoon,
  FiPhone,
  FiSearch,
  FiSettings,
  FiSun,
  FiUser,
  FiUserCheck,
  FiUsers,
  FiX,
  FiInfo,
} from "react-icons/fi";
import { BsBank } from "react-icons/bs";
import api from "../api";
import {
  useFeatureConfig,
  filterNavByFeatures,
} from "../context/FeatureConfigContext";
import { useTheme } from "../providers/ThemeProvider";
import BrandMark from "../components/BrandMark";
import { can, getPermissions } from "../utils/permissions"; // ✅ permission helpers

/* -------------------------------- helpers --------------------------------- */
const isUuid = (v) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(v || "")
  );
const isEditableTarget = (el) => {
  if (!el) return false;
  const tag = (el.tagName || "").toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    el.isContentEditable ||
    ((el.getAttribute && el.getAttribute("role")) === "textbox")
  );
};

/** ===== Helpers aligned with Dashboard ===== */
const apiVariants = (p) => {
  const clean = p.startsWith("/") ? p : `/${p}`;
  const noApi = clean.replace(/^\/api\//, "/");
  const withApi = noApi.startsWith("/api/") ? noApi : `/api${noApi}`;
  return Array.from(new Set([noApi, withApi]));
};
const isAbort = (err) =>
  err?.name === "CanceledError" ||
  err?.code === "ERR_CANCELED" ||
  /abort|cancell?ed/i.test(err?.message || "");

/* ------------------------------- NAV CONFIG -------------------------------- */
const NAV = () => [
  { label: "Dashboard", icon: <FiHome />, to: "/" }, // keep visible; gate widgets inside page with `can(...)`
  {
    label: "Borrowers",
    icon: <FiUsers />,
    to: "/borrowers",
    children: [
      { label: "View Borrowers", to: "/borrowers" },
      { label: "Add Borrower", to: "/borrowers/add" },
      { label: "KYC Queue", to: "/borrowers/kyc" },
      { label: "Blacklist", to: "/borrowers/blacklist" },
      { label: "Imports", to: "/borrowers/imports" },
      { label: "Reports", to: "/borrowers/reports" },
      { label: "View Borrower Groups", to: "/borrowers/groups" },
      { label: "Add Borrower Group", to: "/borrowers/groups/add" },
      { label: "Group Reports", to: "/borrowers/groups/reports" },
      { label: "Group Imports", to: "/borrowers/groups/imports" },
      { label: "Send SMS to All", to: "/borrowers/sms" },
      { label: "Send Email to All", to: "/borrowers/email" },
      { label: "Invite Borrowers", to: "/borrowers/invite" },
    ],
  },
  {
    label: "Loans",
    icon: <FiCreditCard />,
    to: "/loans",
    children: [
      { label: "Loan Products", to: "/loans/products" },
      { label: "View All Loans", to: "/loans" },
      { label: "Add Loan", to: "/loans/applications" },
      { label: "Review Queue", to: "/loans/review-queue" },
      { label: "Disbursement Queue", to: "/loans/disbursement-queue" },
      { label: "Disbursed Loans", to: "/loans/status/disbursed" },
      { label: "Due Loans", to: "/loans/status/due" },
      { label: "Missed Repayments", to: "/loans/status/missed" },
      { label: "Loans in Arrears", to: "/loans/status/arrears" },
      { label: "No Repayments", to: "/loans/status/no-repayments" },
      { label: "Past Maturity Date", to: "/loans/status/past-maturity" },
      { label: "Principal Outstanding", to: "/loans/status/principal-outstanding" },
      { label: "1 Month Late", to: "/loans/status/1-month-late" },
      { label: "3 Months Late", to: "/loans/status/3-months-late" },
    ],
  },
  {
    label: "Repayments",
    icon: <FiDollarSign />,
    to: "/repayments",
    children: [
      { label: "View Repayments", to: "/repayments" },
      { label: "Record Repayment", to: "/repayments/new" },
      { label: "Receipts", to: "/repayments/receipts" },
      { label: "Add Bulk Repayments", to: "/repayments/bulk" },
      { label: "Add via CSV", to: "/repayments/csv" },
      { label: "Repayment Charts", to: "/repayments/charts" },
      { label: "Approve Repayments", to: "/repayments/approve" },
    ],
  },
  { label: "Collateral Register", icon: <FiBriefcase />, to: "/collateral", perm: ["collateral.view", "collateral.read"] }, // ✅ permission-gated
  {
    label: "Collection Sheets",
    icon: <FiCreditCard />,
    to: "/collections",
    children: [
      { label: "Daily Collection Sheet", to: "/collections/daily" },
      { label: "Missed Repayment Sheet", to: "/collections/missed" },
      { label: "Past Maturity Loans", to: "/collections/past-maturity" },
      { label: "Send SMS", to: "/collections/sms" },
      { label: "Send Email", to: "/collections/email" },
    ],
  },
  {
    label: "Savings",
    icon: <BsBank />,
    to: "/savings",
    children: [
      { label: "View Savings", to: "/savings" },
      { label: "Transactions", to: "/savings/transactions" },
      { label: "Upload CSV", to: "/savings/transactions/csv" },
      { label: "Approve Transactions", to: "/savings/transactions/approve" },
      { label: "Savings Report", to: "/savings/report" },
    ],
  },
  {
    label: "Banking",
    icon: <BsBank />,
    to: "/banks",
    children: [
      { label: "View Banks", to: "/banks" },
      { label: "Add Bank", to: "/banks/add" },
      { label: "View Bank Transactions", to: "/banks/transactions" },
      { label: "Transfers", to: "/banks/transfers" },
      { label: "Reconciliation", to: "/banks/reconciliation" },
      { label: "Statements", to: "/banks/statements" },
      { label: "Import Bank CSV", to: "/banks/import" },
      { label: "Approvals", to: "/banks/approvals" },
      { label: "Rules & GL Mapping", to: "/banks/rules" },
      { label: "Cash Accounts", to: "/cash/accounts" },
      { label: "Add Cash Account", to: "/cash/accounts/new" },
      { label: "View Cash Transactions", to: "/cash/transactions" },
      { label: "Add Cash Transaction", to: "/cash/transactions/add" },
      { label: "Cash Reconciliation", to: "/cash/reconciliation" },
      { label: "Cash Statement", to: "/cash/statements" },
    ],
  },
  {
    label: "Investors",
    icon: <FiUsers />,
    to: "/investors",
    children: [
      { label: "View Investors", to: "/investors" },
      { label: "Add Investor", to: "/investors/add" },
    ],
  },
  {
    label: "HR & Payroll",
    icon: <FiUserCheck />,
    to: "/payroll",
    children: [
      { label: "View Payroll", to: "/payroll" },
      { label: "Add Payroll", to: "/payroll/add" },
      { label: "Payroll Report", to: "/payroll/report" },
      { label: "Employees", to: "/hr/employees" },
      { label: "Attendance", to: "/hr/attendance" },
      { label: "Leave Management", to: "/hr/leave" },
      { label: "Contracts", to: "/hr/contracts" },
    ],
  },
  {
    label: "Expenses",
    icon: <FiCreditCard />,
    to: "/expenses",
    children: [
      { label: "View Expenses", to: "/expenses" },
      { label: "Add Expense", to: "/expenses/add" },
      { label: "Upload CSV", to: "/expenses/csv" },
    ],
  },
  {
    label: "Other Income",
    icon: <FiDollarSign />,
    to: "/other-income",
    children: [
      { label: "View Other Income", to: "/other-income" },
      { label: "Add Other Income", to: "/other-income/add" },
      { label: "Upload CSV", to: "/other-income/csv" },
    ],
  },
  {
    label: "Asset Management",
    icon: <FiBriefcase />,
    to: "/assets",
    children: [
      { label: "View Assets", to: "/assets" },
      { label: "Add Asset", to: "/assets/add" },
    ],
  },
  {
    label: "Accounting",
    icon: <FiDatabase />,
    to: "/accounting",
    children: [
      { label: "Chart Of Accounts", to: "/accounting/chart-of-accounts" },
      { label: "Trial Balance", to: "/accounting/trial-balance" },
      { label: "Profit & Loss", to: "/accounting/profit-loss" },
      { label: "Cashflow", to: "/accounting/cashflow" },
    ],
  },
  {
    label: "User Management",
    icon: <FiUserCheck />,
    to: "/user-management",
    children: [
      { label: "Staff", to: "/user-management" },
      { label: "Users", to: "/user-management/users" },
      { label: "Roles", to: "/user-management/roles" },
      { label: "Permissions", to: "/user-management/permissions" },
    ],
  },
  { label: "Branches", icon: <FiDatabase />, to: "/branches", perm: ["branches.view", "branch.view"] }, // ✅ permission-gated
  {
    label: "Reports",
    icon: <FiBarChart2 />,
    to: "/reports",
    children: [
      { label: "Borrowers Report", to: "/reports/borrowers" },
      { label: "Loan Report", to: "/reports/loans" },
      { label: "Loan Arrears Aging", to: "/reports/arrears-aging" },
      { label: "Collections Report", to: "/reports/collections" },
      { label: "Collector Report", to: "/reports/collector" },
      { label: "Deferred Income", to: "/reports/deferred-income" },
      { label: "Deferred Income Monthly", to: "/reports/deferred-income-monthly" },
      { label: "Pro-Rata Collections", to: "/reports/pro-rata" },
      { label: "Disbursement Report", to: "/reports/disbursement" },
      { label: "Fees Report", to: "/reports/fees" },
      { label: "Loan Officer Report", to: "/reports/loan-officer" },
      { label: "MFRS Ratios", to: "/reports/mfrs" },
      { label: "Daily Report", to: "/reports/daily" },
      { label: "Monthly Report", to: "/reports/monthly" },
      { label: "Outstanding Report", to: "/reports/outstanding" },
      { label: "Portfolio At Risk (PAR)", to: "/reports/par" },
      { label: "At a Glance", to: "/reports/at-a-glance" },
      { label: "All Entries", to: "/reports/all" },
    ],
  },
];

const pathIsIn = (pathname, base) =>
  pathname === base || pathname.startsWith(base + "/");

/* --------------------------- Header Global Search -------------------------- */
const CURRENCY = new Intl.NumberFormat();

const HeaderGlobalSearch = ({ branchId }) => {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState([]);
  const [sel, setSel] = useState(0);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);
  const rootRef = useRef(null);

  const ENTITY_ROUTES = useMemo(
    () => ({
      borrower: (h) => ({ to: `/borrowers/${h.id}` }),
      borrowers: (h) => ({ to: `/borrowers/${h.id}` }),
      group: (h) => ({ to: `/borrowers/groups/${h.id}` }),
      borrower_group: (h) => ({ to: `/borrowers/groups/${h.id}` }),
      loan: (h) => ({ to: `/loans/${h.id}` }),
      loans: (h) => ({ to: `/loans/${h.id}` }),
      repayment: (h) => ({ to: `/repayments/${h.id}` }),
      repayments: (h) => ({ to: `/repayments?q=${encodeURIComponent(h.meta?.receiptNo || h.id)}` }),
      receipt: (h) => ({ to: `/repayments/receipts?q=${encodeURIComponent(h.meta?.receiptNo || h.id)}` }),
      saving: (h) => ({ to: `/savings?q=${encodeURIComponent(h.meta?.accountNo || h.id)}` }),
      deposit: (h) => ({ to: `/deposits?q=${encodeURIComponent(h.id)}` }),
      withdrawal: (h) => ({ to: `/withdrawals?q=${encodeURIComponent(h.id)}` }),
      bank: (h) => ({ to: `/banks/${h.id}` }),
      bank_transaction: (h) => ({ to: `/banks/transactions?q=${encodeURIComponent(h.id)}` }),
      cash_transaction: (h) => ({ to: `/cash/transactions?q=${encodeURIComponent(h.id)}` }),
      collateral: (h) => ({ to: `/collateral?q=${encodeURIComponent(h.id)}` }),
      expense: (h) => ({ to: `/expenses?q=${encodeURIComponent(h.id)}` }),
      income: (h) => ({ to: `/other-income?q=${encodeURIComponent(h.id)}` }),
      asset: (h) => ({ to: `/assets/${h.id}` }),
      user: (h) => ({ to: `/users/${h.id}` }),
      staff: (h) => ({ to: `/user-management?userId=${encodeURIComponent(h.id)}` }),
      role: (h) => ({ to: `/user-management/roles?q=${encodeURIComponent(h.title || h.id)}` }),
      permission: (h) => ({ to: `/user-management/permissions?q=${encodeURIComponent(h.title || h.id)}` }),
      investor: (h) => ({ to: `/investors/${h.id}` }),
      employee: (h) => ({ to: `/hr/employees/${h.id}` }),
      payroll: (h) => ({ to: `/payroll?q=${encodeURIComponent(h.id)}` }),
      branch: (h) => ({ to: `/branches/${h.id}` }),
      default: (h) => ({ to: `/?q=${encodeURIComponent(h.title || q)}` }),
    }),
    [q]
  );

  const fetchHits = useCallback(
    async (query) => {
      if (!query || query.trim().length < 2) {
        setHits([]);
        return;
      }
      setLoading(true);
      try {
        const res = await api.get("/search", {
          params: { q: query.trim(), branchId: branchId || undefined, limit: 12 },
        });
        const arr = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.items)
          ? res.data.items
          : [];
        const norm = arr
          .map((h) => ({
            id: h.id ?? h._id ?? h.uuid,
            type: (h.type || h.entity || h.module || "default").toString().toLowerCase(),
            title:
              h.title ||
              h.name ||
              h.fullName ||
              h.borrowerName ||
              h.loanNo ||
              h.receiptNo ||
              h.accountNo ||
              String(h.id ?? ""),
            subtitle:
              h.subtitle ||
              h.email ||
              h.phone ||
              h.meta?.loanNo ||
              h.meta?.receiptNo ||
              h.meta?.branchName ||
              "",
            amount: h.amount ?? h.total ?? h.balance ?? h.value,
            meta: h.meta || h,
            routeHint: h.routeHint,
          }))
          .filter((x) => x.id);
        setHits(norm);
        setSel(0);
      } catch {
        setHits([]);
      } finally {
        setLoading(false);
      }
    },
    [branchId]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchHits(q), 220);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [q, fetchHits]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const onDoc = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onKey = (e) => {
      if (isEditableTarget(e.target)) return;
      if (e.key === "/") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      const plat = (typeof navigator !== "undefined" && navigator.platform) || "";
      const isMac = /mac/i.test(plat);
      if ((isMac && e.metaKey && e.key.toLowerCase() === "k") || (!isMac && e.ctrlKey && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (hit) => {
    const build = ENTITY_ROUTES[hit.type] || ENTITY_ROUTES.default;
    const dest = hit.routeHint ? { to: hit.routeHint } : build(hit);
    setOpen(false);
    setQ("");
    setHits([]);
    navigate(dest.to);
  };

  const onKeyDown = (e) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) setOpen(true);
    if (!hits.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => (s + 1) % hits.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => (s - 1 + hits.length) % hits.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(hits[sel] || hits[0]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const grouped = useMemo(() => {
    const g = {};
    hits.forEach((h) => {
      const k = (h.type || "other").toString();
      if (!g[k]) g[k] = [];
      g[k].push(h);
    });
    return g;
  }, [hits]);

  const onSearchClick = async () => {
    if (q.trim().length < 2) {
      inputRef.current?.focus();
      setOpen(true);
      return;
    }
    if (!hits.length) {
      await fetchHits(q);
      setOpen(true);
      return;
    }
    go(hits[0]);
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <FiSearch className="w-4 h-4 text-[var(--muted)]" aria-hidden="true" />
        </span>

        <input
          ref={inputRef}
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search everything…  (/ or ⌘K / Ctrl+K)"
          className="w-full !h-11 !pl-10 !pr-12 text-sm rounded-md border
                     bg-[var(--input-bg)] border-[var(--border)]
                     text-[var(--input-fg)] placeholder:text-[var(--input-placeholder)]
                     focus:outline-none focus:ring-2 focus:ring-[var(--ring)]
                     appearance-none"
          aria-label="Global search"
        />

        {q && (
          <button
            onClick={() => {
              setQ("");
              setHits([]);
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:opacity-80 opacity-70"
            aria-label="Clear search"
            type="button"
          >
            <FiX className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && q?.length >= 2 && (
        <div
          className="absolute z-[60] mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-lg overflow-hidden"
          onMouseDown={(e) => e.preventDefault()}
          role="listbox"
        >
          {loading ? (
            <div className="p-3 text-sm opacity-80">Searching…</div>
          ) : hits.length === 0 ? (
            <div className="p-3 text-sm opacity-80">No results.</div>
          ) : (
            <div className="max-h-80 overflow-auto">
              {Object.entries(grouped).map(([type, list]) => (
                <div key={type}>
                  <div className="px-3 py-1 text-[11px] uppercase tracking-wide opacity-70 bg-[color:transparent]">
                    {type}
                  </div>
                  {list.map((h, idx) => {
                    const flatIndex = hits.indexOf(h);
                    const active = flatIndex === sel;
                    return (
                      <button
                        key={`${type}-${h.id}-${idx}`}
                        onMouseEnter={() => setSel(flatIndex)}
                        onClick={() => go(h)}
                        className={`w-full text-left px-3 py-2 text-sm border-b border-[var(--border)] ${
                          active ? "bg-[var(--chip-soft)]" : "bg-transparent"
                        }`}
                        role="option"
                        aria-selected={active}
                        type="button"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{h.title}</div>
                            {h.subtitle && (
                              <div className="text-xs opacity-80 truncate">
                                {h.subtitle}
                              </div>
                            )}
                          </div>
                          {Number.isFinite(h.amount) && (
                            <div className="text-xs opacity-80 whitespace-nowrap">
                              TZS {CURRENCY.format(h.amount)}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onSearchClick}
        className="absolute -right-[108px] top-0 h-11 inline-flex items-center gap-2 px-3 rounded-md
                   border-2 border-[var(--border)] bg-[var(--panel)] text-[var(--fg)]
                   hover:bg-[var(--chip-soft)]"
        title="Search"
      >
        <FiSearch className="w-4 h-4" />
        <span className="text-sm">Search</span>
      </button>
    </div>
  );
};

/* ------------------------------- Section item ------------------------------ */
const Section = memo(({ item, currentPath, onNavigate }) => {
  const hasChildren = !!item.children?.length;
  const isActiveSection = pathIsIn(currentPath, item.to);
  const [open, setOpen] = useState(isActiveSection || !hasChildren);

  useEffect(() => {
    if (isActiveSection) setOpen(true);
  }, [isActiveSection]);

  if (!hasChildren) {
    return (
      <NavLink
        to={item.to}
        className={({ isActive }) => `ms-item ${isActive ? "is-active" : ""}`}
        onClick={onNavigate}
      >
        <span className="inline-flex items-center gap-2 min-w-0">
          <span className="shrink-0 ms-icon">{item.icon}</span>
          <span className="truncate text-sm font-medium">{item.label}</span>
        </span>
      </NavLink>
    );
  }

  const panelId = `nav-${item.to.replace(/[^\w-]/g, "_")}`;
  const toggle = useCallback(() => setOpen((v) => !v), []);
  const onKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    },
    [toggle]
  );

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        onKeyDown={onKeyDown}
        className={`ms-item w-full justify-between ${isActiveSection ? "is-active" : ""}`}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className="inline-flex items-center gap-2 min-w-0">
          <span className="shrink-0 ms-icon">{item.icon}</span>
          <span className="truncate text-sm font-medium">{item.label}</span>
        </span>
        <FiChevronDown className={`ms-caret ${open ? "open" : ""}`} />
      </button>

      {open && (
        <div
          id={panelId}
          className="ms-sub"
          role="region"
          aria-label={`${item.label} submenu`}
        >
          {item.children.map((c) => (
            <NavLink
              key={c.to}
              to={c.to}
              className={({ isActive }) =>
                `block px-2 py-1.5 rounded text-[13px] ${
                  isActive
                    ? "bg-[var(--nav-item-active-bg)] text-[var(--nav-item-active-fg)] font-semibold"
                    : "text-[var(--nav-item)] hover:bg-[var(--nav-item-hover-bg)]"
                }`
              }
              onClick={onNavigate}
            >
              {c.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
});
Section.displayName = "Section";

/* --------------------------------- Layout ---------------------------------- */
const SidebarLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { isDark, toggleTheme } = useTheme();
  const [user, setUser] = useState(null);

  const [tenant, setTenant] = useState(null); // { id, name }
  const [branches, setBranches] = useState([]);
  const [activeBranchId, setActiveBranchId] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const featureCtx = useFeatureConfig();
  const { loading: featuresLoading, features } = featureCtx;

  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef(null);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onDoc = (e) => {
      if (!avatarRef.current) return;
      if (!avatarRef.current.contains(e.target)) setAvatarOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const logoutAndGo = useCallback(() => {
    try {
      delete api.defaults.headers.common.Authorization;
      [
        "token",
        "jwt",
        "authToken",
        "accessToken",
        "access_token",
        "user",
        "tenant",
        "tenantId",
        "tenantName",
        "activeBranchId",
      ].forEach((k) => localStorage.removeItem(k));
      if (typeof sessionStorage !== "undefined") {
        try {
          sessionStorage.clear();
        } catch {}
      }
      delete api.defaults.headers.common["x-tenant-id"];
      delete api.defaults.headers.common["x-branch-id"];
    } catch {}
    navigate("/login", { replace: true });
  }, [navigate]);

  const lower = (s) => String(s || "").toLowerCase();
  const hasAnyRole = (...allowed) => {
    const primary = lower(user?.role);
    const list = Array.isArray(user?.roles)
      ? user.roles.map((r) => lower(r?.name || r))
      : Array.isArray(user?.Roles)
      ? user.Roles.map((r) => lower(r?.name || r))
      : [];
    return allowed.some((r) => r === primary || list.includes(r));
  };

  /* user + tenant load */
  useEffect(() => {
    const tok =
      localStorage.getItem("token") ||
      localStorage.getItem("jwt") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("accessToken");
    if (tok)
      api.defaults.headers.common.Authorization = `Bearer ${tok.replace(
        /^Bearer /i,
        ""
      )}`;

    try {
      const rawTenant = localStorage.getItem("tenant");
      if (rawTenant) {
        const t = JSON.parse(rawTenant);
        setTenant(t);
        if (t?.id && isUuid(t.id)) {
          api.defaults.headers.common["x-tenant-id"] = t.id;
        } else {
          delete api.defaults.headers.common["x-tenant-id"];
        }
      } else {
        const tenantId = localStorage.getItem("tenantId");
        const tenantName = localStorage.getItem("tenantName");
        const t = { id: tenantId || null, name: tenantName || "" };
        setTenant(t);
        if (tenantId && isUuid(tenantId)) {
          api.defaults.headers.common["x-tenant-id"] = tenantId;
        } else {
          delete api.defaults.headers.common["x-tenant-id"];
        }
      }
    } catch {
      delete api.defaults.headers.common["x-tenant-id"];
    }

    const storedBranch = localStorage.getItem("activeBranchId");
    if (storedBranch) setActiveBranchId(String(storedBranch));
  }, []);

  // sync API headers with tenant & branch changes (accept UUIDs or any string)
  useEffect(() => {
    if (tenant?.id && isUuid(tenant.id)) {
      api.defaults.headers.common["x-tenant-id"] = tenant.id;
    } else {
      delete api.defaults.headers.common["x-tenant-id"];
    }
  }, [tenant?.id]);

  useEffect(() => {
    if (activeBranchId) {
      api.defaults.headers.common["x-branch-id"] = String(activeBranchId);
      localStorage.setItem("activeBranchId", String(activeBranchId));
    } else {
      delete api.defaults.headers.common["x-branch-id"];
      localStorage.removeItem("activeBranchId");
    }
  }, [activeBranchId]);

  // Branch changes fired elsewhere
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onBranch = (e) => {
      const id = String(e?.detail?.id || "");
      if (id) setActiveBranchId(id);
    };
    window.addEventListener("ms:branch-changed", onBranch);
    return () => window.removeEventListener("ms:branch-changed", onBranch);
  }, []);

  // Fetch current user
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/auth/me");
        setUser(data);
        localStorage.setItem("user", JSON.stringify(data));
      } catch (e) {
        if (e?.response?.status === 401) logoutAndGo();
      }
    })();
  }, [logoutAndGo]);

  // Branch list (first branch auto-select if none; allow any ID shape)
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/branches");
        const list = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.items)
          ? res.data.items
          : res.data?.data || [];
        setBranches(list);
        if (list.length && !activeBranchId) {
          const firstId = String(list[0]?.id ?? "");
          if (firstId) setActiveBranchId(firstId);
        }
      } catch (e) {
        if (e?.response?.status === 401) logoutAndGo();
      }
    })();
  }, [activeBranchId, logoutAndGo]);

  // ------------------------ Communications ticker -------------------------
  const [ticker, setTicker] = useState([]);
  const [loadingTicker, setLoadingTicker] = useState(false);

  const normalizeTicker = useCallback(
    (raw) => {
      const arr = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.items)
        ? raw.items
        : Array.isArray(raw?.rows)
        ? raw.rows
        : Array.isArray(raw?.data)
        ? raw.data
        : [];

      const now = Date.now();

      const roleNames = (() => {
        const primary = (user?.role || "").toString().toLowerCase();
        the: {
        }
        const extras = Array.isArray(user?.roles)
          ? user.roles.map((r) => (r?.name || r || "").toString().toLowerCase())
          : Array.isArray(user?.Roles)
          ? user.Roles.map((r) => (r?.name || r || "").toString().toLowerCase())
          : [];
        return Array.from(new Set([primary, ...extras].filter(Boolean)));
      })();

      const toArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);

      return arr
        .map((c) => {
          const type = (c.type || "notice").toString().toLowerCase();
          const priority = (c.priority || c.severity || "normal").toString().toLowerCase();
          const channel = (c.channel || "inapp").toString().toLowerCase();
          const audienceRoles = toArray(c.audienceRoles || c.roles || c.role)
            .map((r) => (r ?? "").toString().toLowerCase())
            .filter(Boolean);
          const audienceBranchIds = toArray(
            c.audienceBranchIds || c.branchIds || c.audienceBranchId || c.branchId
          )
            .map((b) => (b != null ? String(b) : null))
            .filter(Boolean);

          return {
            id: c.id ?? c._id ?? Math.random().toString(36).slice(2),
            title: c.title ?? "",
            text: c.text ?? c.body ?? c.message ?? "",
            type,
            priority,
            channel,
            isActive: Boolean(c.isActive ?? c.active ?? c.enabled ?? true),
            showInTicker: Boolean(c.showInTicker ?? c.ticker ?? c.showTicker ?? false),
            startAt: c.startAt ? new Date(c.startAt).getTime() : null,
            endAt: c.endAt ? new Date(c.endAt).getTime() : null,
            audienceRoles,
            audienceBranchIds,
          };
        })
        .filter((c) => c.isActive && c.channel === "inapp" && c.showInTicker)
        .filter((c) => (c.startAt ? now >= c.startAt : true))
        .filter((c) => (c.endAt ? now <= c.endAt : true))
        .filter((c) =>
          c.audienceRoles?.length ? c.audienceRoles.some((r) => roleNames.includes(r)) : true
        )
        .filter((c) =>
          activeBranchId && c.audienceBranchIds?.length
            ? c.audienceBranchIds.map(String).includes(String(activeBranchId))
            : true
        )
        .sort((a, b) => {
          const rank = { critical: 4, high: 3, normal: 2, low: 1 };
          const ra = rank[a.priority] || 0;
          const rb = rank[b.priority] || 0;
          if (ra !== rb) return rb - ra;
          return 0;
        });
    },
    [activeBranchId, user]
  );

  const fetchTicker = useCallback(
    async (signal) => {
      setLoadingTicker(true);
      try {
        const data = await api.getFirst(
          [
            ...apiVariants("dashboard/communications"),
            ...apiVariants("admin/communications?activeOnly=1&channel=inapp&showInTicker=1"),
            ...apiVariants("admin/communications?activeOnly=1&channel=inapp"),
          ],
          { signal }
        );
        setTicker(normalizeTicker(data));
      } catch (err) {
        if (!isAbort(err)) {
          // console.error("Ticker fetch error:", err?.message || err);
        }
        setTicker([]);
      } finally {
        setLoadingTicker(false);
      }
    },
    [normalizeTicker]
  );

  useEffect(() => {
    const ac = new AbortController();
    fetchTicker(ac.signal);
    const id = setInterval(() => {
      const ac2 = new AbortController();
      fetchTicker(ac2.signal).finally(() => ac2.abort());
    }, 60_000);
    return () => {
      clearInterval(id);
      ac.abort();
    };
  }, [fetchTicker]);

  useEffect(() => {
    const ac = new AbortController();
    fetchTicker(ac.signal).finally(() => ac.abort());
  }, [activeBranchId, fetchTicker]);

  const userRole = (user?.role || "").toLowerCase();

  const computedNav = useMemo(() => {
    const base = NAV();
    const featureFiltered = filterNavByFeatures(base, features, userRole, featureCtx);

    // 🔐 Permission-aware filtering (supports string OR string[])
    const isSuper =
      ["system_admin", "super_admin", "admin", "director", "developer"].includes(userRole);

    if (isSuper) return featureFiltered;

    let perms = [];
    try {
      perms = getPermissions ? getPermissions() : [];
    } catch {
      perms = [];
    }
    const hasPerm = (p) => {
      if (!p) return true;
      const keys = Array.isArray(p) ? p : [p];
      try {
        if (typeof can === "function") return keys.some((k) => !!can(k));
      } catch {}
      if (Array.isArray(perms)) return keys.some((k) => perms.includes(k));
      return true;
    };

    const filterByPerm = (items) =>
      items
        .filter((i) => !i.perm || hasPerm(i.perm))
        .map((i) =>
          i.children ? { ...i, children: filterByPerm(i.children) } : i
        )
        .filter((i) => !i.children || i.children.length > 0);

    return filterByPerm(featureFiltered);
  }, [features, userRole, featureCtx]);

  useEffect(() => {
    setMobileOpen(false);
    setAvatarOpen(false);
  }, [location.pathname]);

  const initial =
    (user?.displayName || user?.name || user?.email || "").charAt(0)?.toUpperCase() || "U";
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const orgName =
    (tenant?.name || "").trim() ||
    (user?.tenant?.name || "").trim() ||
    (user?.organization?.name || "").trim() ||
    (user?.companyName || "").trim() ||
    (user?.displayName || user?.name || user?.email || "").trim() ||
    "Workspace";

  return (
    <div className="app-theme-bold min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-[var(--panel)] border-[var(--border)]">
        <div className="px-3 md:px-4">
          <div className="h-14 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                className="lg:hidden p-2 rounded hover:bg-[var(--nav-item-hover-bg)]"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
              >
                {mobileOpen ? <FiX /> : <FiMenu />}
              </button>
              <BrandMark size={28} />
            </div>

            <div className="hidden md:flex flex-1 justify-center">
              <div className="relative w-full max-w-[720px]">
                <HeaderGlobalSearch branchId={activeBranchId} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                className="hidden md:block px-2 py-1 rounded text-sm border bg-[var(--input-bg)] border-[var(--border)] text-[var(--input-fg)]"
                value={activeBranchId || ""} // avoid controlled/uncontrolled warning
                onChange={(e) => setActiveBranchId(e.target.value)}
                aria-label="Active branch"
              >
                <option value="">Branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={String(b.id)}>
                    {b.name}
                  </option>
                ))}
              </select>

              <button
                onClick={toggleTheme}
                className="p-2 rounded hover:bg-[var(--nav-item-hover-bg)]"
                aria-label="Toggle dark mode"
                title="Toggle theme"
              >
                {isDark ? <FiSun /> : <FiMoon />}
              </button>

              {/* Avatar */}
              <div className="relative" ref={avatarRef}>
                <button
                  onClick={() => setAvatarOpen((v) => !v)}
                  className="inline-flex items-center gap-2 h-9 px-2 rounded border border-[var(--border)] hover:bg-[var(--nav-item-hover-bg)]"
                  aria-expanded={avatarOpen}
                  title="Account"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                    {initial}
                  </div>
                  <FiChevronDown className="opacity-70" />
                </button>
                {avatarOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl shadow-xl border border-[var(--border)] bg-[var(--panel)] z-[60] p-2">
                    <div className="px-3 py-2 text-xs opacity-80 flex items-center gap-2">
                      <FiUser />
                      <div className="truncate">
                        <div className="font-medium truncate">
                          {user?.displayName || user?.name || user?.email || "User"}
                        </div>
                        <div className="truncate opacity-70">
                          {(user?.role || "user").toLowerCase()}
                        </div>
                      </div>
                    </div>
                    <hr className="my-2 border-[var(--border)]" />
                    <NavLink
                      to="/account/settings"
                      className="block px-3 py-2 rounded hover:bg-[var(--nav-item-hover-bg)] text-sm"
                      onClick={() => setAvatarOpen(false)}
                    >
                      <span className="inline-flex items-center gap-2">
                        <FiSettings /> Profile &amp; Settings
                      </span>
                    </NavLink>
                    <NavLink
                      to="/billing"
                      className="block px-3 py-2 rounded hover:bg-[var(--nav-item-hover-bg)] text-sm"
                      onClick={() => setAvatarOpen(false)}
                    >
                      <span className="inline-flex items-center gap-2">
                        <FiCreditCard /> Billing
                      </span>
                    </NavLink>
                    <NavLink
                      to="/sms-console"
                      className="block px-3 py-2 rounded hover:bg-[var(--nav-item-hover-bg)] text-sm"
                      onClick={() => setAvatarOpen(false)}
                    >
                      <span className="inline-flex items-center gap-2">
                        <FiMessageSquare /> SMS Console
                      </span>
                    </NavLink>
                    <NavLink
                      to="/billing-by-phone"
                      className="block px-3 py-2 rounded hover:bg-[var(--nav-item-hover-bg)] text-sm"
                      onClick={() => setAvatarOpen(false)}
                    >
                      <span className="inline-flex items-center gap-2">
                        <FiPhone /> Billing by Phone
                      </span>
                    </NavLink>

                    {hasAnyRole("system_admin", "super_admin", "admin", "director", "developer") && (
                      <>
                        <NavLink to="/subscription" className="block px-3 py-2 rounded hover:bg-[var(--nav-item-hover-bg)] text-sm" onClick={() => setAvatarOpen(false)}>
                          <span className="inline-flex items-center gap-2"><FiSettings /> Subscription</span>
                        </NavLink>
                        <NavLink to="/support-tickets" className="block px-3 py-2 rounded hover:bg-[var(--nav-item-hover-bg)] text-sm" onClick={() => setAvatarOpen(false)}>
                          <span className="inline-flex items-center gap-2"><FiSettings /> Support Tickets</span>
                        </NavLink>
                        <NavLink to="/impersonate-tenant" className="block px-3 py-2 rounded hover:bg-[var(--nav-item-hover-bg)] text-sm" onClick={() => setAvatarOpen(false)}>
                          <span className="inline-flex items-center gap-2"><FiUsers /> Impersonate</span>
                        </NavLink>
                        <NavLink to="/tenants-admin" className="block px-3 py-2 rounded hover:bg-[var(--nav-item-hover-bg)] text-sm" onClick={() => setAvatarOpen(false)}>
                          <span className="inline-flex items-center gap-2"><FiUsers /> Tenants (New)</span>
                        </NavLink>
                        <NavLink to="/account/organization" className="block px-3 py-2 rounded hover:bg-[var(--nav-item-hover-bg)] text-sm" onClick={() => setAvatarOpen(false)}>
                          <span className="inline-flex items-center gap-2"><FiSettings /> Organization</span>
                        </NavLink>
                        <NavLink to="/admin/tenants" className="block px-3 py-2 rounded hover:bg-[var(--nav-item-hover-bg)] text-sm" onClick={() => setAvatarOpen(false)}>
                          <span className="inline-flex items-center gap-2"><FiUsers /> Tenants (SysAdmin)</span>
                        </NavLink>
                      </>
                    )}
                    <NavLink to="/admin" className="block px-3 py-2 rounded hover:bg-[var(--nav-item-hover-bg)] text-sm" onClick={() => setAvatarOpen(false)}>
                      <span className="inline-flex items-center gap-2"><FiSettings /> Admin</span>
                    </NavLink>
                    <button onClick={logoutAndGo} className="w-full text-left px-3 py-2 rounded hover:bg-[var(--nav-item-hover-bg)] text-sm text-rose-400">
                      <span className="inline-flex items-center gap-2"><FiLogOut /> Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Global communications ticker (aligned with Dashboard rules) */}
        {!loadingTicker && ticker.length > 0 && (
          <>
            <style>{`@keyframes ms-marquee{0%{transform:translateX(100%)}100%{transform:translateX(-100%)}}`}</style>
            <div
              className="border-t border-[var(--border)]"
              style={{ background: "var(--table-head-bg)" }}
              aria-live="polite"
              aria-label="Organization announcements"
            >
              <div className="relative h-9 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 flex items-center pl-2 text-[11px] font-semibold opacity-70"
                  style={{ color: "var(--muted)" }}
                >
                  <FiInfo className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> Announcements
                </div>
                <div
                  className="absolute whitespace-nowrap will-change-transform flex items-center gap-8 h-9"
                  style={{ animation: "ms-marquee 18s linear infinite", left: "120px", color: "var(--fg)" }}
                >
                  {ticker.map((c) => (
                    <span key={c.id} className="inline-flex items-center gap-2 text-xs">
                      <span className="px-1.5 py-0.5 rounded border" style={{ borderColor: "var(--border)", background: "var(--card)" }} title={c.priority}>
                        {c.type}
                      </span>
                      {c.priority !== "normal" && (
                        <span className="px-1.5 py-0.5 rounded border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                          {c.priority}
                        </span>
                      )}
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-600" />
                      <span className="inline-block truncate max-w-[56rem]">{c.text || c.title}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </header>

      {/* Shell */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr]">
        {/* DESKTOP SIDEBAR */}
        <aside className="ms-sidebar app-sidebar sidebar-soft hidden lg:block">
          <div className="sidebar-scroll h-[calc(100vh-56px)] sticky top-[56px] overflow-y-auto px-2 py-3">
            <div
              className="ms-heading truncate"
              title={orgName}
            >
              {orgName}
            </div>

            <nav className="space-y-1" aria-label="Primary">
              {featuresLoading ? (
                <div className="px-3 py-2 text-xs opacity-70">Loading menu…</div>
              ) : (
                computedNav.map((item) => (
                  <Section
                    key={item.label + item.to}
                    item={item}
                    currentPath={location.pathname}
                    onNavigate={() => {}}
                  />
                ))
              )}
            </nav>
            <div className="h-6" />
          </div>
        </aside>

        <main className="legacy-compat min-h-[calc(100vh-56px)]">
          <div className="ms-page">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[70] flex">
          <div className="ms-sidebar app-sidebar sidebar-soft w-72 max-w-[80vw] h-full shadow-xl flex flex-col">
            <div className="h-14 flex items-center justify-between px-3 border-b border-[var(--border)]">
              <BrandMark size={24} />
              <button className="p-2 rounded hover:bg-[var(--nav-item-hover-bg)]" onClick={closeMobile} aria-label="Close">
                <FiX />
              </button>
            </div>
            <div className="ms-heading truncate" title={orgName}>
              {orgName}
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2">
              {featuresLoading ? (
                <div className="px-3 py-2 text-xs opacity-70">Loading menu…</div>
              ) : (
                <nav className="space-y-1" aria-label="Mobile primary">
                  {computedNav.map((item) => (
                    <Section
                      key={item.label + item.to}
                      item={item}
                      currentPath={location.pathname}
                      onNavigate={closeMobile}
                    />
                  ))}
                </nav>
              )}
            </div>
          </div>
          <button className="flex-1 bg-black/40" aria-label="Close overlay" onClick={closeMobile} />
        </div>
      )}
    </div>
  );
};

export default SidebarLayout;
