import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  FiLogOut, FiSun, FiMoon, FiUsers, FiHome, FiCreditCard, FiDollarSign,
  FiBarChart2, FiSearch, FiSettings, FiUserCheck, FiFileText, FiBriefcase,
  FiDatabase, FiMenu, FiX, FiChevronDown, FiChevronUp
} from "react-icons/fi";
import { BsBank } from "react-icons/bs";
import api from "../api";
import { useFeatureConfig, filterNavByFeatures } from "../context/FeatureConfigContext";

/* ---------- NAV CONFIG (Admin controls visibility via FeatureConfig) ---------- */
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
      { label: "View Borrower Groups", to: "/borrowers/groups" },
      { label: "Add Borrower Group", to: "/borrowers/groups/add" },
      { label: "Send SMS to All", to: "/borrowers/sms" },
      { label: "Send Email to All", to: "/borrowers/email" },
      { label: "Invite Borrowers", to: "/borrowers/invite" },
    ]
  },

  {
    label: "Loans", icon: <FiCreditCard />, to: "/loans", children: [
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
    label: "Collection Sheets", icon: <FiFileText />, to: "/collections", children: [
      { label: "Daily Collection Sheet", to: "/collections/daily" },
      { label: "Missed Repayment Sheet", to: "/collections/missed" },
      { label: "Past Maturity Loans", to: "/collections/past-maturity" },
      { label: "Send SMS", to: "/collections/sms" },
      { label: "Send Email", to: "/collections/email" },
    ]
  },

  /* ✅ Savings menu */
  {
    label: "Savings", icon: <BsBank />, to: "/savings", children: [
      { label: "View Savings", to: "/savings" },
      { label: "Transactions", to: "/savings/transactions" },
      { label: "Upload CSV", to: "/savings/transactions/csv" },
      { label: "Approve Transactions", to: "/savings/transactions/approve" },
      { label: "Savings Report", to: "/savings/report" },
    ]
  },

  {
    label: "Investors", icon: <FiUsers />, to: "/investors", children: [
      { label: "View Investors", to: "/investors" },
      { label: "Add Investor", to: "/investors/add" },
      { label: "Send SMS to All", to: "/investors/sms" },
      { label: "Send Email to All", to: "/investors/email" },
      { label: "Invite Investors", to: "/investors/invite" },
    ]
  },

  // ❌ E-Signatures removed from the sidebar (route still exists)

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
      { label: "Loan Officer Report", to: "/reports/loan-officer" },
      { label: "Loan Products Report", to: "/reports/loan-products" },
      { label: "MFRS Ratios", to: "/reports/mfrs" },
      { label: "Daily Report", to: "/reports/daily" },
      { label: "Monthly Report", to: "/reports/monthly" },
      { label: "Outstanding Report", to: "/reports/outstanding" },
      { label: "Portfolio At Risk (PAR)", to: "/reports/par" },
      { label: "At a Glance", to: "/reports/at-a-glance" },
      { label: "All Entries", to: "/reports/all" },
    ]
  },

  // ❌ Legacy removed from the sidebar (routes still exist)
];

/* ---------- Helpers ---------- */
const pathIsIn = (pathname, base) => pathname === base || pathname.startsWith(base + "/");

const Section = ({ item, currentPath, onNavigate }) => {
  const hasChildren = !!item.children?.length;
  const isActiveSection = pathIsIn(currentPath, item.to);
  const [open, setOpen] = useState(isActiveSection || !hasChildren);

  React.useEffect(() => {
    if (isActiveSection) setOpen(true);
  }, [isActiveSection]);

  const baseItem = "flex items-center gap-2 px-3 py-2 rounded-md text-[13px] leading-5 transition";

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

  return (
    <div className="rounded-md">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${baseItem} ${
          isActiveSection
            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200"
            : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
        } w-full justify-between`}
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2">
          <span className="shrink-0">{item.icon}</span>
          <span className="truncate">{item.label}</span>
        </span>
        {open ? <FiChevronUp /> : <FiChevronDown />}
      </button>

      {open && (
        <div className="mt-1 ml-2 border-l border-slate-200 dark:border-slate-700">
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
      )}
    </div>
  );
};

const SidebarLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState(null);

  // ✅ NEW: tenant state (for multi-tenant header + API header)
  const [tenant, setTenant] = useState(null);  // { id, name } recommended

  const [branches, setBranches] = useState([]);
  const [activeBranchId, setActiveBranchId] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  // Admin-driven feature config (authoritative)
  const featureCtx = useFeatureConfig();
  const { loading: featuresLoading, features } = featureCtx;

  // Settings dropdown
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef(null);
  React.useEffect(() => {
    const onDoc = (e) => {
      if (!settingsRef.current) return;
      if (!settingsRef.current.contains(e.target)) setSettingsOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  /* theme + user + tenant load */
  useEffect(() => {
    const storedDark = localStorage.getItem("darkMode");
    if (storedDark === "true") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    }
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) setUser(JSON.parse(storedUser));
    } catch {
      localStorage.removeItem("user");
    }

    // ✅ load tenant from localStorage
    try {
      const rawTenant = localStorage.getItem("tenant");
      if (rawTenant) {
        const t = JSON.parse(rawTenant);
        setTenant(t);
        if (t?.id) api.defaults.headers.common["x-tenant-id"] = t.id;
      } else {
        const tenantId = localStorage.getItem("tenantId");
        const tenantName = localStorage.getItem("tenantName");
        if (tenantId || tenantName) {
          const t = { id: tenantId || null, name: tenantName || "" };
          setTenant(t);
          if (tenantId) api.defaults.headers.common["x-tenant-id"] = tenantId;
        }
      }
    } catch {}

    const storedBranch = localStorage.getItem("activeBranchId");
    if (storedBranch) setActiveBranchId(storedBranch);
  }, []);

  // keep API headers in sync with tenant & branch changes
  useEffect(() => {
    if (tenant?.id) {
      api.defaults.headers.common["x-tenant-id"] = tenant.id;
    } else {
      delete api.defaults.headers.common["x-tenant-id"];
    }
  }, [tenant?.id]);

  useEffect(() => {
    if (activeBranchId) {
      api.defaults.headers.common["x-branch-id"] = activeBranchId;
      localStorage.setItem("activeBranchId", activeBranchId);
    } else {
      delete api.defaults.headers.common["x-branch-id"];
    }
  }, [activeBranchId]);

  useEffect(() => {
    localStorage.setItem("darkMode", darkMode);
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/branches");
        const list = Array.isArray(res.data) ? res.data : [];
        setBranches(list);
        if (list.length && !activeBranchId) setActiveBranchId(String(list[0].id));
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const userRole = (user?.role || "").toLowerCase();

  // Build full NAV, then apply Admin filters/labels (authoritative + tenant entitlements)
  const computedNav = useMemo(() => {
    const base = NAV();
    return filterNavByFeatures(base, features, userRole, featureCtx);
  }, [features, userRole, featureCtx]);

  /* close mobile when route changes & close settings */
  useEffect(() => {
    setMobileOpen(false);
    setSettingsOpen(false);
  }, [location.pathname]);

  return (
    <div className={`min-h-screen ${darkMode ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"}`}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/90 dark:bg-slate-900/90 backdrop-blur">
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

              {/* ✅ subtle tenant badge */}
              {tenant?.name && (
                <span className="ml-2 px-2 py-0.5 text-[11px] rounded-full border bg-slate-50 dark:bg-slate-800">
                  {tenant.name}
                </span>
              )}
            </div>

            <div className="hidden md:flex items-center gap-2 min-w={[280]} max-w-[640px] w-full">
              <div className="relative w-full">
                <FiSearch className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search borrowers, loans, receipts…"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                className="hidden md:block px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-sm border border-slate-200 dark:border-slate-700"
                value={activeBranchId}
                onChange={(e) => setActiveBranchId(e.target.value)}
              >
                <option value="">Branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>

              <button
                onClick={() => setDarkMode((v) => !v)}
                className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Toggle dark mode"
              >
                {darkMode ? <FiSun /> : <FiMoon />}
              </button>

              {/* Admin hub button */}
              <button
                onClick={() => navigate("/admin")}
                className="hidden md:inline-flex items-center gap-2 h-9 px-3 rounded bg-blue-600 text-white hover:bg-blue-700"
                title="Admin"
              >
                <FiSettings /> Admin
              </button>

              {/* Settings dropdown */}
              <div className="relative" ref={settingsRef}>
                <button
                  onClick={() => setSettingsOpen((v) => !v)}
                  className="inline-flex items-center gap-2 h-9 px-3 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Settings"
                  aria-expanded={settingsOpen}
                >
                  <FiSettings /> Settings <FiChevronDown className="opacity-70" />
                </button>
                {settingsOpen && (
                  <div className="absolute right-0 mt-2 w-60 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 z-[60] p-2">
                    <NavLink
                      to="/settings/billing"
                      className="block px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-sm"
                      onClick={() => setSettingsOpen(false)}
                    >
                      Billing
                    </NavLink>
                    <NavLink
                      to="/settings/change-password"
                      className="block px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-sm"
                      onClick={() => setSettingsOpen(false)}
                    >
                      Change Password
                    </NavLink>
                    <NavLink
                      to="/settings/2fa"
                      className="block px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-sm"
                      onClick={() => setSettingsOpen(false)}
                    >
                      Two-Factor Authentication
                    </NavLink>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20 text-sm text-rose-600 dark:text-rose-300"
                    >
                      <span className="inline-flex items-center gap-2"><FiLogOut /> Logout</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Avatar */}
              <div className="flex items-center gap-2 pl-1">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                  {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <span className="hidden md:block text-xs opacity-70">{(user?.role || "user").toLowerCase()}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Shell: left sidebar + main content */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <aside className="hidden lg:block border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="h-[calc(100vh-56px)] sticky top-[56px] overflow-y-auto px-2 py-3">
            <div className="px-3 pb-2 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Navigation
            </div>
            <nav className="space-y-1">
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
        <main className="min-h-[calc(100vh-56px)] px-3 md:px-6 py-4">
          <Outlet />
        </main>
      </div>

      {/* Mobile drawer (unchanged) */}
    </div>
  );
};

export default SidebarLayout;
