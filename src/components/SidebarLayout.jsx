import React, { useMemo, useRef, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  FiLogOut, FiSun, FiMoon, FiUsers, FiHome, FiCreditCard, FiDollarSign,
  FiBarChart2, FiSearch, FiSettings, FiUserCheck, FiFileText, FiBriefcase,
  FiDatabase, FiMenu, FiX, FiChevronDown, FiChevronUp, FiUser,
  FiMessageSquare, FiPhone
} from "react-icons/fi";
import { BsBank } from "react-icons/bs";
import api from "../api";
import { useFeatureConfig, filterNavByFeatures } from "../context/FeatureConfigContext";

/* ---------- NAV CONFIG (Admin controls visibility via FeatureConfig) ---------- */
/* NOTE: The "Account" section has been removed to avoid duplication with the avatar dropdown */
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
];

const pathIsIn = (pathname, base) => pathname === base || pathname.startsWith(base + "/");

const Section = ({ item, currentPath, onNavigate }) => {
  const hasChildren = !!item.children?.length;
  const isActiveSection = pathIsIn(currentPath, item.to);
  const [open, setOpen] = useState(isActiveSection || !hasChildren);

  useEffect(() => { if (isActiveSection) setOpen(true); }, [isActiveSection]);

  const baseItem = "flex items-center gap-2 px-3 py-2 rounded-md text-[13px] leading-5 transition";

  if (!hasChildren) {
    return (
      <NavLink
        to={item.to}
        className={({ isActive }) =>
          `${baseItem} ${isActive ? "bg-blue-600 text-white shadow-sm"
            : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"}`}
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
        className={`${baseItem} ${isActiveSection
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
                  `block px-2 py-1.5 rounded text-[13px] ${isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"}`}
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

  // tenant state (for multi-tenant header + API header)
  const [tenant, setTenant] = useState(null); // { id, name } recommended

  const [branches, setBranches] = useState([]);
  const [activeBranchId, setActiveBranchId] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  // Admin-driven feature config (authoritative)
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

  const logoutAndGo = () => {
    try {
      delete api.defaults.headers.common.Authorization;
      [
        "token","jwt","authToken","accessToken","access_token",
        "user","tenant","tenantId","tenantName","activeBranchId",
      ].forEach((k) => localStorage.removeItem(k));
      sessionStorage?.clear?.();
    } catch {}
    navigate("/login", { replace: true });
  };

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
    if (storedDark === "true") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    }

    // inject Authorization header from local storage (works even if api.ts forgets)
    const tok =
      localStorage.getItem("token") ||
      localStorage.getItem("jwt") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("accessToken");
    if (tok) api.defaults.headers.common.Authorization = `Bearer ${tok.replace(/^Bearer /i, "")}`;

    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) setUser(JSON.parse(storedUser));
    } catch {
      localStorage.removeItem("user");
    }

    // load tenant from localStorage
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

  // React to branch changes triggered by Profile page (optional)
  useEffect(() => {
    const onBranch = (e) => {
      const id = String(e?.detail?.id || "");
      if (id) setActiveBranchId(id);
    };
    window.addEventListener("ms:branch-changed", onBranch);
    return () => window.removeEventListener("ms:branch-changed", onBranch);
  }, []);

  // Fetch current user from API and keep localStorage in sync
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Branch list
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/branches");
        const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setBranches(list);
        if (list.length && !activeBranchId) setActiveBranchId(String(list[0].id));
      } catch (e) {
        if (e?.response?.status === 401) logoutAndGo();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const userRole = (user?.role || "").toLowerCase();

  // Build full NAV, then apply Admin filters/labels
  const computedNav = useMemo(() => {
    const base = NAV();
    return filterNavByFeatures(base, features, userRole, featureCtx);
  }, [features, userRole, featureCtx]);

  /* close mobile when route changes & close avatar menu */
  useEffect(() => {
    setMobileOpen(false);
    setAvatarOpen(false);
  }, [location.pathname]);

  const initial =
    (user?.displayName || user?.name || user?.email || "").charAt(0)?.toUpperCase() || "U";

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

              {/* subtle tenant badge */}
              {tenant?.name && (
                <span className="ml-2 px-2 py-0.5 text-[11px] rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                  {tenant.name}
                </span>
              )}
            </div>

            <div className="hidden md:flex items-center gap-2 min-w-[280px] max-w-[640px] w-full">
              <div className="relative w-full">
                <FiSearch className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search borrowers, loans, receipts…"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
                  aria-label="Global search"
                />
              </div>
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

                    {/* Admin/gated items unchanged */}
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
                          to="/admin/tenants"     // existing admin path
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
          <div className="h-[calc(100vh-56px)] sticky top-[56px] overflow-y-auto px-2 py-3">
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
        <main className="min-h-[calc(100vh-56px)] px-3 md:px-6 py-4">
          <Outlet />
        </main>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[70] flex">
          <div className="w-72 max-w-[80vw] h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-xl flex flex-col">
            <div className="h-14 flex items-center justify-between px-3 border-b border-slate-200 dark:border-slate-800">
              <span className="font-semibold">Menu</span>
              <button className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setMobileOpen(false)} aria-label="Close">
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
                      onNavigate={() => setMobileOpen(false)}
                    />
                  ))}
                </nav>
              )}
            </div>
          </div>
          <button className="flex-1 bg-black/40" aria-label="Close overlay" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </div>
  );
};

export default SidebarLayout;
