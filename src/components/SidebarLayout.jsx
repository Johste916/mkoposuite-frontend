// src/layouts/SidebarLayout.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
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
} from "react-icons/fi";
import { BsBank } from "react-icons/bs";
import api from "../api";
import { useFeatureConfig, filterNavByFeatures } from "../context/FeatureConfigContext";

/* -------------------------------- helpers --------------------------------- */
const isUuid = (v) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v || ""));
const isNumericId = (v) => /^\d+$/.test(String(v || ""));

/* ------------------------------- NAV CONFIG --------------------------------
   NOTE: “Account” items live in the avatar dropdown to avoid duplication. */
const NAV = () => [
  { label: "Dashboard", icon: <FiHome />, to: "/" },
  {
    label: "Borrowers", icon: <FiUsers />, to: "/borrowers", children: [
      { label: "View Borrowers", to: "/borrowers" },
      { label: "Add Borrower", to: "/borrowers/add" },
      { label: "KYC Queue", to: "/borrowers/kyc" },
      { label: "Blacklist", to: "/borrowers/blacklist" },
      { label: "Imports", to: "/borrowers/imports" },
      { label: "Reports", to: "/borrowers/reports" },

      // Borrower Groups
      { label: "View Borrower Groups", to: "/borrowers/groups" },
      { label: "Add Borrower Group", to: "/borrowers/groups/add" },
      { label: "Group Reports", to: "/borrowers/groups/reports" },
      { label: "Group Imports", to: "/borrowers/groups/imports" },

      { label: "Send SMS to All", to: "/borrowers/sms" },
      { label: "Send Email to All", to: "/borrowers/email" },
      { label: "Invite Borrowers", to: "/borrowers/invite" },
    ]
  },
  {
    label: "Loans", icon: <FiCreditCard />, to: "/loans", children: [
      { label: "View All Loans", to: "/loans" },
      { label: "Add Loan", to: "/loans/applications" },

      // ✅ Loan Products module
      { label: "Loan Products", to: "/loans/products" },
      { label: "Add Loan Product", to: "/loans/products/new" },

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
    ]
  },
  {
    label: "Repayments", icon: <FiDollarSign />, to: "/repayments", children: [
      { label: "View Repayments", to: "/repayments" },
      { label: "Record Repayment", to: "/repayments/new" },
      { label: "Receipts", to: "/repayments/receipts" },
      { label: "Add Bulk Repayments", to: "/repayments/bulk" },
      { label: "Add via CSV", to: "/repayments/csv" },
      { label: "Repayment Charts", to: "/repayments/charts" },
      { label: "Approve Repayments", to: "/repayments/approve" },
    ]
  },
  { label: "Collateral Register", icon: <FiBriefcase />, to: "/collateral" },
  {
    label: "Collection Sheets", icon: <FiCreditCard />, to: "/collections", children: [
      { label: "Daily Collection Sheet", to: "/collections/daily" },
      { label: "Missed Repayment Sheet", to: "/collections/missed" },
      { label: "Past Maturity Loans", to: "/collections/past-maturity" },
      { label: "Send SMS", to: "/collections/sms" },
      { label: "Send Email", to: "/collections/email" },
    ]
  },
  {
    label: "Savings", icon: <BsBank />, to: "/savings", children: [
      { label: "View Savings", to: "/savings" },
      { label: "Transactions", to: "/savings/transactions" },
      { label: "Upload CSV", to: "/savings/transactions/csv" },
      { label: "Approve Transactions", to: "/savings/transactions/approve" },
      { label: "Savings Report", to: "/savings/report" },
    ]
  },
  /* ✅ Banking section (now includes Cash Accounts management) */
  {
    label: "Banking", icon: <BsBank />, to: "/banks", children: [
      // Banks
      { label: "View Banks", to: "/banks" },
      { label: "Add Bank", to: "/banks/add" },

      // Bank transactions
      { label: "View Bank Transactions", to: "/banks/transactions" },
      { label: "Transfers", to: "/banks/transfers" },
      { label: "Reconciliation", to: "/banks/reconciliation" },
      { label: "Statements", to: "/banks/statements" },
      { label: "Import Bank CSV", to: "/banks/import" },
      { label: "Approvals", to: "/banks/approvals" },
      { label: "Rules & GL Mapping", to: "/banks/rules" },

      // Cash management
      { label: "Cash Accounts", to: "/cash/accounts" },
      { label: "Add Cash Account", to: "/cash/accounts/new" },
      { label: "View Cash Transactions", to: "/cash/transactions" },
      { label: "Add Cash Transaction", to: "/cash/transactions/add" },
      { label: "Cash Reconciliation", to: "/cash/reconciliation" },
      { label: "Cash Statement", to: "/cash/statements" },
    ]
  },
  {
    label: "Investors", icon: <FiUsers />, to: "/investors", children: [
      { label: "View Investors", to: "/investors" },
      { label: "Add Investor", to: "/investors/add" },
    ]
  },
  {
    label: "HR & Payroll", icon: <FiUserCheck />, to: "/payroll", children: [
      { label: "View Payroll", to: "/payroll" },
      { label: "Add Payroll", to: "/payroll/add" },
      { label: "Payroll Report", to: "/payroll/report" },
      { label: "Employees", to: "/hr/employees" },
      { label: "Attendance", to: "/hr/attendance" },
      { label: "Leave Management", to: "/hr/leave" },
      { label: "Contracts", to: "/hr/contracts" },
    ]
  },
  {
    label: "Expenses", icon: <FiCreditCard />, to: "/expenses", children: [
      { label: "View Expenses", to: "/expenses" },
      { label: "Add Expense", to: "/expenses/add" },
      { label: "Upload CSV", to: "/expenses/csv" },
    ]
  },
  {
    label: "Other Income", icon: <FiDollarSign />, to: "/other-income", children: [
      { label: "View Other Income", to: "/other-income" },
      { label: "Add Other Income", to: "/other-income/add" },
      { label: "Upload CSV", to: "/other-income/csv" },
    ]
  },
  {
    label: "Asset Management", icon: <FiBriefcase />, to: "/assets", children: [
      { label: "View Assets", to: "/assets" },
      { label: "Add Asset", to: "/assets/add" },
    ]
  },
  {
    label: "Accounting", icon: <FiDatabase />, to: "/accounting", children: [
      { label: "Chart of Accounts", to: "/accounting/chart-of-accounts" },
      { label: "Trial Balance", to: "/accounting/trial-balance" },
      { label: "Profit & Loss", to: "/accounting/profit-loss" },
      { label: "Cashflow", to: "/accounting/cashflow" },
    ]
  },
  {
    label: "User Management", icon: <FiUserCheck />, to: "/user-management", children: [
      { label: "Staff", to: "/user-management" },                 // ✅ all-in-one page (index)
      { label: "Users", to: "/user-management/users" },
      { label: "Roles", to: "/user-management/roles" },
      { label: "Permissions", to: "/user-management/permissions" },
    ]
  },
  { label: "Branches", icon: <FiDatabase />, to: "/branches" },
  {
    label: "Reports", icon: <FiBarChart2 />, to: "/reports", children: [
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
      { label: "Loan Officer Report", to: "/reports/loan-products" },
      { label: "MFRS Ratios", to: "/reports/mfrs" },
      { label: "Daily Report", to: "/reports/daily" },
      { label: "Monthly Report", to: "/reports/monthly" },
      { label: "Outstanding Report", to: "/reports/outstanding" },
      { label: "Portfolio At Risk (PAR)", to: "/reports/par" },
      { label: "At a Glance", to: "/reports/at-a-glance" },
      { label: "All Entries", to: "/reports/all" },
    ]
  },
];

const pathIsIn = (pathname, base) =>
  pathname === base || pathname.startsWith(base + "/");

/* --------------------------- Header Global Search -------------------------- */
const HeaderGlobalSearch = ({ branchId }) => {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState([]);
  const [sel, setSel] = useState(0);
  const debounceRef = useRef(null);

  // Map backend "type" to destination + URL builder
  const ENTITY_ROUTES = useMemo(() => ({
    borrower: (h) => ({ to: `/borrowers/${h.id}` }),
    borrowers: (h) => ({ to: `/borrowers/${h.id}` }),
    loan: (h) => ({ to: `/loans/${h.id}` }),
    loans: (h) => ({ to: `/loans/${h.id}` }),
    repayment: (h) => ({ to: `/repayments/${h.id}` }),
    repayments: (h) => ({ to: `/repayments?q=${encodeURIComponent(h.meta?.receiptNo || h.id)}` }),
    deposit: (h) => ({ to: `/deposits?q=${encodeURIComponent(h.id)}` }),
    withdrawal: (h) => ({ to: `/withdrawals?q=${encodeURIComponent(h.id)}` }),
    saving: (h) => ({ to: `/savings?q=${encodeURIComponent(h.meta?.accountNo || h.id)}` }),
    user: (h) => ({ to: `/users/${h.id}` }),
    branch: (h) => ({ to: `/branches/${h.id}` }),
    default: (h) => ({ to: `/?q=${encodeURIComponent(h.title || q)}` }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [q]);

  const fetchHits = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setHits([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get("/search", {
        params: {
          q: query.trim(),
          branchId: branchId || undefined,
          limit: 12,
        },
      });
      const arr = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.items) ? res.data.items : []);
      const norm = arr.map((h) => ({
        id: h.id ?? h._id ?? h.uuid,
        type: (h.type || h.entity || h.module || "default").toString().toLowerCase(),
        title: h.title || h.name || h.fullName || h.borrowerName || h.loanNo || h.receiptNo || h.accountNo || String(h.id ?? ""),
        subtitle: h.subtitle || h.email || h.phone || h.meta?.loanNo || h.meta?.receiptNo || h.meta?.branchName || "",
        amount: h.amount ?? h.total ?? h.balance ?? h.value,
        meta: h.meta || h,
        routeHint: h.routeHint,
      })).filter(x => x.id);
      setHits(norm);
      setSel(0);
    } catch {
      setHits([]);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchHits(q), 220);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [q, fetchHits]);

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

  // Group hits by type for headers
  const grouped = useMemo(() => {
    const g = {};
    hits.forEach((h) => {
      const k = (h.type || "other").toString();
      (g[k] ||= []).push(h);
    });
    return g;
  }, [hits]);

  return (
    <div className="relative w-full">
      <div className="relative">
        <FiSearch className="absolute left-3 top-3 text-slate-400" />
        <input
          type="text"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search borrowers, loans, receipts…"
          className="w-full pl-9 pr-8 py-2 text-sm rounded-md border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
          aria-label="Global search"
        />
        {q && (
          <button
            onClick={() => { setQ(""); setHits([]); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
            aria-label="Clear search"
          >
            <FiX />
          </button>
        )}
      </div>

      {open && (q?.length >= 2) && (
        <div
          className="absolute z-[60] mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden"
          onMouseDown={(e) => e.preventDefault()}
        >
          {loading ? (
            <div className="p-3 text-sm text-slate-600 dark:text-slate-300">Searching…</div>
          ) : hits.length === 0 ? (
            <div className="p-3 text-sm text-slate-600 dark:text-slate-300">No results.</div>
          ) : (
            <div className="max-h-80 overflow-auto">
              {Object.entries(grouped).map(([type, list]) => (
                <div key={type}>
                  <div className="px-3 py-1 text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60">
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
                        className={`w-full text-left px-3 py-2 text-sm border-b border-slate-100 dark:border-slate-800 ${active ? "bg-blue-50 dark:bg-slate-800/70" : "bg-transparent"}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                              {h.title}
                            </div>
                            {h.subtitle && (
                              <div className="text-xs text-slate-600 dark:text-slate-300 truncate">
                                {h.subtitle}
                              </div>
                            )}
                          </div>
                          {Number.isFinite(h.amount) && (
                            <div className="text-xs text-slate-700 dark:text-slate-200 whitespace-nowrap">
                              TZS {new Intl.NumberFormat().format(h.amount)}
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

  const baseItem =
    "flex items-center gap-2 px-3 py-2 rounded-md text-[13px] leading-5 transition";

  if (!hasChildren) {
    return (
      <NavLink
        to={item.to}
        className={({ isActive }) =>
          `${baseItem} ${
            isActive
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          }`
        }
        onClick={onNavigate}
      >
        <span className="shrink-0">{item.icon}</span>
        <span className="truncate">{item.label}</span>
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
    <div className="rounded-md">
      <button
        type="button"
        onClick={toggle}
        onKeyDown={onKeyDown}
        className={`${baseItem} ${
          isActiveSection
            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200"
            : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
        } w-full justify-between`}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className="inline-flex items-center gap-2">
          <span className="shrink-0">{item.icon}</span>
          <span className="truncate">{item.label}</span>
        </span>
        {open ? <FiChevronUp /> : <FiChevronDown />}
      </button>

      <div
        id={panelId}
        hidden={!open}
        className="mt-1 ml-2 border-l border-slate-200 dark:border-slate-700"
      >
        <div className="pl-3 py-1 space-y-1">
          {item.children.map((c) => (
            <NavLink
              key={c.to}
              to={c.to}
              className={({ isActive }) =>
                `block px-2 py-1.5 rounded text-[13px] ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                }`
              }
              onClick={onNavigate}
            >
              {c.label}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
});
Section.displayName = "Section";

/* --------------------------------- Layout ---------------------------------- */
const SidebarLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState(null);

  // tenant for multi-tenant header + API header
  const [tenant, setTenant] = useState(null); // { id, name }

  const [branches, setBranches] = useState([]);
  const [activeBranchId, setActiveBranchId] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  // Feature flags (admin-controlled)
  const featureCtx = useFeatureConfig();
  const { loading: featuresLoading, features } = featureCtx;

  // Avatar menu
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef(null);
  useEffect(() => {
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
        "token","jwt","authToken","accessToken","access_token",
        "user","tenant","tenantId","tenantName","activeBranchId",
      ].forEach((k) => localStorage.removeItem(k));
      if (typeof sessionStorage !== "undefined") {
        try { sessionStorage.clear(); } catch {}
      }
      delete api.defaults.headers.common["x-tenant-id"];
      delete api.defaults.headers.common["x-branch-id"];
    } catch {}
    navigate("/login", { replace: true });
  }, [navigate]);

  const lower = (s) => String(s || "").toLowerCase();
  const hasAnyRole = (...allowed) => {
    const primary = lower(user?.role);
    const list =
      Array.isArray(user?.roles)
        ? user.roles.map(lower)
        : Array.isArray(user?.Roles)
        ? user.Roles.map((r) => lower(r?.name || r))
        : [];
    return allowed.some((r) => r === primary || list.includes(r));
  };

  /* theme + user + tenant load */
  useEffect(() => {
    const storedDark = localStorage.getItem("darkMode");
    setDarkMode(storedDark === "true");

    // inject Authorization header from local storage
    const tok =
      localStorage.getItem("token") ||
      localStorage.getItem("jwt") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("accessToken");
    if (tok) api.defaults.headers.common.Authorization = `Bearer ${tok.replace(/^Bearer /i, "")}`;

    // load tenant from localStorage (set header only if UUID)
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

  // sync API headers with tenant & branch changes
  useEffect(() => {
    if (tenant?.id && isUuid(tenant.id)) {
      api.defaults.headers.common["x-tenant-id"] = tenant.id;
    } else {
      delete api.defaults.headers.common["x-tenant-id"];
    }
  }, [tenant?.id]);

  useEffect(() => {
    if (activeBranchId && isNumericId(activeBranchId)) {
      api.defaults.headers.common["x-branch-id"] = String(activeBranchId);
      localStorage.setItem("activeBranchId", String(activeBranchId));
    } else {
      delete api.defaults.headers.common["x-branch-id"];
      localStorage.removeItem("activeBranchId");
    }
  }, [activeBranchId]);

  useEffect(() => {
    localStorage.setItem("darkMode", darkMode ? "true" : "false");
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // Branch changes triggered by external pages (optional)
  useEffect(() => {
    const onBranch = (e) => {
      const id = String(e?.detail?.id || "");
      if (id && isNumericId(id)) setActiveBranchId(id);
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

  // Branch list
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/branches");
        const list =
          Array.isArray(res.data) ? res.data :
          Array.isArray(res.data?.items) ? res.data.items :
          res.data?.data || [];
        setBranches(list);
        if (list.length && !activeBranchId) {
          const firstId = String(list[0]?.id ?? "");
          if (isNumericId(firstId)) setActiveBranchId(firstId);
        }
      } catch (e) {
        if (e?.response?.status === 401) logoutAndGo();
      }
    })();
  }, [activeBranchId, logoutAndGo]);

  const userRole = (user?.role || "").toLowerCase();

  // Build full NAV, then apply feature filters
  const computedNav = useMemo(() => {
    const base = NAV();
    return filterNavByFeatures(base, features, userRole, featureCtx);
  }, [features, userRole, featureCtx]);

  /* close mobile + avatar when route changes */
  useEffect(() => {
    setMobileOpen(false);
    setAvatarOpen(false);
  }, [location.pathname]);

  const initial =
    (user?.displayName || user?.name || user?.email || "").charAt(0)?.toUpperCase() || "U";

  const toggleDark = useCallback(() => setDarkMode((v) => !v), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <div className={`min-h-screen ${darkMode ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"}`}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur">
        <div className="px-3 md:px-4">
          <div className="h-14 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                className="lg:hidden p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
              >
                {mobileOpen ? <FiX /> : <FiMenu />}
              </button>
              <span className="text-lg font-extrabold tracking-tight">
                <span className="text-blue-600">Mkopo</span>
                <span className="text-slate-800 dark:text-slate-200">Suite</span>
              </span>

              {/* Tenant badge */}
              {tenant?.name && (
                <span className="ml-2 px-2 py-0.5 text-[11px] rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                  {tenant.name}
                </span>
              )}
            </div>

            <div className="hidden md:flex items-center gap-2 min-w-[280px] max-w-[640px] w-full">
              {/* ✅ Functional global search (uses active branch) */}
              <HeaderGlobalSearch branchId={activeBranchId} />
            </div>

            <div className="flex items-center gap-2">
              <select
                className="hidden md:block px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 dark:text-slate-200 text-sm border border-slate-200 dark:border-slate-700"
                value={activeBranchId}
                onChange={(e) => setActiveBranchId(e.target.value)}
                aria-label="Active branch"
              >
                <option value="">Branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={String(b.id)}>{b.name}</option>
                ))}
              </select>

              <button
                onClick={toggleDark}
                className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Toggle dark mode"
              >
                {darkMode ? <FiSun /> : <FiMoon />}
              </button>

              {/* Avatar dropdown */}
              <div className="relative" ref={avatarRef}>
                <button
                  onClick={() => setAvatarOpen((v) => !v)}
                  className="inline-flex items-center gap-2 h-9 px-2 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-expanded={avatarOpen}
                  title="Account"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                    {initial}
                  </div>
                  <FiChevronDown className="opacity-70" />
                </button>
                {avatarOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 z-[60] p-2">
                    <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <FiUser />
                      <div className="truncate">
                        <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {user?.displayName || user?.name || user?.email || "User"}
                        </div>
                        <div className="truncate opacity-70">{(user?.role || "user").toLowerCase()}</div>
                      </div>
                    </div>
                    <hr className="my-2 border-slate-200 dark:border-slate-700" />
                    {/* Always available */}
                    <NavLink
                      to="/account/settings"
                      className="block px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-sm"
                      onClick={() => setAvatarOpen(false)}
                    >
                      <span className="inline-flex items-center gap-2"><FiSettings /> Profile &amp; Settings</span>
                    </NavLink>
                    <NavLink
                      to="/billing"
                      className="block px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-sm"
                      onClick={() => setAvatarOpen(false)}
                    >
                      <span className="inline-flex items-center gap-2"><FiCreditCard /> Billing</span>
                    </NavLink>
                    <NavLink
                      to="/sms-console"
                      className="block px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-sm"
                      onClick={() => setAvatarOpen(false)}
                    >
                      <span className="inline-flex items-center gap-2"><FiMessageSquare /> SMS Console</span>
                    </NavLink>
                    <NavLink
                      to="/billing-by-phone"
                      className="block px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-sm"
                      onClick={() => setAvatarOpen(false)}
                    >
                      <span className="inline-flex items-center gap-2"><FiPhone /> Billing by Phone</span>
                    </NavLink>

                    {/* Admin/gated items */}
                    {hasAnyRole("system_admin","super_admin","admin","director","developer") && (
                      <>
                        <NavLink
                          to="/subscription"
                          className="block px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-sm"
                          onClick={() => setAvatarOpen(false)}
                        >
                          <span className="inline-flex items-center gap-2"><FiSettings /> Subscription</span>
                        </NavLink>
                        <NavLink
                          to="/support-tickets"
                          className="block px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-sm"
                          onClick={() => setAvatarOpen(false)}
                        >
                          <span className="inline-flex items-center gap-2"><FiSettings /> Support Tickets</span>
                        </NavLink>
                        <NavLink
                          to="/impersonate-tenant"
                          className="block px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-sm"
                          onClick={() => setAvatarOpen(false)}
                        >
                          <span className="inline-flex items-center gap-2"><FiUsers /> Impersonate</span>
                        </NavLink>
                        <NavLink
                          to="/tenants-admin"
                          className="block px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-sm"
                          onClick={() => setAvatarOpen(false)}
                        >
                          <span className="inline-flex items-center gap-2"><FiUsers /> Tenants (New)</span>
                        </NavLink>
                        <NavLink
                          to="/account/organization"
                          className="block px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-sm"
                          onClick={() => setAvatarOpen(false)}
                        >
                          <span className="inline-flex items-center gap-2"><FiSettings /> Organization</span>
                        </NavLink>
                        <NavLink
                          to="/admin/tenants"
                          className="block px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-sm"
                          onClick={() => setAvatarOpen(false)}
                        >
                          <span className="inline-flex items-center gap-2"><FiUsers /> Tenants (SysAdmin)</span>
                        </NavLink>
                      </>
                    )}
                    <NavLink
                      to="/admin"
                      className="block px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-sm"
                      onClick={() => setAvatarOpen(false)}
                    >
                      <span className="inline-flex items-center gap-2"><FiSettings /> Admin</span>
                    </NavLink>
                    <button
                      onClick={logoutAndGo}
                      className="w-full text-left px-3 py-2 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20 text-sm text-rose-600 dark:text-rose-300"
                    >
                      <span className="inline-flex items-center gap-2"><FiLogOut /> Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Shell: left sidebar + main content */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <aside className="hidden lg:block border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="h-[calc(100vh-56px)] sticky top[56px] lg:top-[56px] overflow-y-auto px-2 py-3">
            <div className="px-3 pb-2 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Navigation
            </div>
            <nav className="space-y-1" aria-label="Primary">
              {featuresLoading ? (
                <div className="px-3 py-2 text-xs text-slate-500">Loading menu…</div>
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

        {/* Main content */}
        <main className="min-h[calc(100vh-56px)] lg:min-h-[calc(100vh-56px)] px-3 md:px-6 py-4">
          <Outlet />
        </main>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z[70] lg:z-[70] flex">
          <div className="w-72 max-w-[80vw] h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-xl flex flex-col">
            <div className="h-14 flex items-center justify-between px-3 border-b border-slate-200 dark:border-slate-800">
              <span className="font-semibold">Menu</span>
              <button
                className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={closeMobile}
                aria-label="Close"
              >
                <FiX />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-3">
              {featuresLoading ? (
                <div className="px-3 py-2 text-xs text-slate-500">Loading menu…</div>
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
          <button
            className="flex-1 bg-black/40"
            aria-label="Close overlay"
            onClick={closeMobile}
          />
        </div>
      )}
    </div>
  );
};

export default SidebarLayout;
