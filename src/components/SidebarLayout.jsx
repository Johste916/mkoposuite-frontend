// src/components/SidebarLayout.jsx
import React, { useState, useEffect, useMemo } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  FiLogOut, FiSun, FiMoon, FiUsers, FiHome, FiCreditCard, FiDollarSign,
  FiBarChart2, FiChevronLeft, FiChevronRight, FiSearch, FiSettings, FiMessageSquare,
  FiUserCheck, FiMapPin, FiSend, FiLayout
} from "react-icons/fi";
import { BsBank } from "react-icons/bs";
import api from "../api";

const NAV = (ctx) => [
  { label: "Dashboard", icon: <FiHome />, to: "/" },

  {
    label: "Borrowers", icon: <FiUsers />, to: "/borrowers", children: [
      { label: "All Borrowers", to: "/borrowers" },
      { label: "Add Borrower", to: "/borrowers/add" },
      { label: "KYC Queue", to: "/borrowers/kyc" },
      { label: "Blacklist", to: "/borrowers/blacklist" },
      { label: "Imports", to: "/borrowers/imports" },
      { label: "Reports", to: "/borrowers/reports" },
      { label: "All Groups", to: "/borrowers/groups" },
      { label: "Add Group", to: "/borrowers/groups/add" },
      { label: "Group Imports", to: "/borrowers/groups/imports" },
      { label: "Group Reports", to: "/borrowers/groups/reports" },
    ]
  },

  {
    label: "Loans", icon: <FiCreditCard />, to: "/loans", children: [
      { label: "All Loans", to: "/loans" },
      { label: "Applications", to: "/loans/applications" },
      { label: "Pending Approval", to: "/loans/status/pending" },
      { label: "Approved Loans", to: "/loans/status/approved" },
      { label: "Rejected Loans", to: "/loans/status/rejected" },
      { label: "Disbursement Queue", to: "/loans/disbursement-queue" },
      { label: "Disbursed Loans", to: "/loans/status/disbursed" },
      { label: "Active Loans", to: "/loans/status/active" },
      { label: "Closed Loans", to: "/loans/status/closed" },
      { label: "Loan Products", to: "/loans/products" },
      { label: "Loan Schedule", to: "/loans/schedule" },
      { label: "Loan Reports", to: "/loans/reports" },
    ]
  },

  ...(ctx.canViewDisbursements ? [{
    label: "Disbursements", icon: <FiSend />, to: "/disbursements", children: [
      { label: "All Disbursements", to: "/disbursements" },
      { label: "New Disbursement", to: "/disbursements/new" },
      { label: "Batches", to: "/disbursements/batches" },
      { label: "Integrations", to: "/disbursements/integrations" },
    ]
  }] : []),

  { label: "Repayments", icon: <FiDollarSign />, to: "/repayments", children: [
    { label: "Schedule", to: "/repayments" },
    { label: "Manual Entry", to: "/repayments/new" },
    { label: "Receipts", to: "/repayments/receipts" },
  ]},

  { label: "Reports", icon: <FiBarChart2 />, to: "/reports", children: [
    { label: "Disbursed Loans", to: "/reports/disbursed-loans" },
    { label: "Payments", to: "/reports/payments" },
    { label: "Penalties", to: "/reports/penalties" },
    { label: "Performance", to: "/reports/performance" },
  ]},

  { label: "SMS", icon: <FiMessageSquare />, to: "/sms", children: [
    { label: "Bulk SMS", to: "/sms/bulk" },
    { label: "Templates", to: "/sms/templates" },
    { label: "Logs", to: "/sms/logs" },
  ]},

  { label: "Cash & Bank", icon: <BsBank />, to: "/bank", children: [
    { label: "Cashbook", to: "/bank" },
    { label: "Bank Accounts", to: "/bank/accounts" },
    { label: "Transfers", to: "/bank/transfers" },
    { label: "Reconciliation", to: "/bank/reconciliation" },
  ]},

  ...(ctx.isAdmin ? [
    {
      label: "User Management", icon: <FiUserCheck />, to: "/user-management", children: [
        { label: "Manage Users", to: "/user-management/users" },
        { label: "Roles", to: "/user-management/roles" },
        { label: "Permissions", to: "/user-management/permissions" },
      ]
    },
    { label: "Branches", icon: <FiMapPin />, to: "/branches" },
    {
      label: "Settings", icon: <FiSettings />, to: "/settings", children: [
        { label: "Loan", to: "/settings/loan" },
        { label: "Loan Categories", to: "/settings/categories" },
        { label: "Penalty", to: "/settings/penalty" },
        { label: "System", to: "/settings/system" },
        { label: "Integrations", to: "/settings/integration" },
        { label: "Dashboard", to: "/settings/dashboard" },
        { label: "Bulk SMS", to: "/settings/bulk-sms" },
        { label: "Savings", to: "/settings/saving" },
        { label: "Borrowers", to: "/settings/borrower" },
        { label: "Users", to: "/settings/users" },
        { label: "Branches", to: "/settings/branches" },
      ]
    },
  ] : []),
];

const SidebarLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState({});
  const [user, setUser] = useState(null);
  const [branches, setBranches] = useState([]);
  const [activeBranchId, setActiveBranchId] = useState("");

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
    const storedCollapsed = localStorage.getItem("sidebarCollapsed");
    if (storedCollapsed === "true") setCollapsed(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("darkMode", darkMode);
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", collapsed);
  }, [collapsed]);

  const toggleDark = () => setDarkMode((v) => !v);
  const toggleCollapse = () => setCollapsed((v) => !v);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const res = await api.get("/branches");
        const list = Array.isArray(res.data) ? res.data : [];
        setBranches(list);
        if (list.length && !activeBranchId) setActiveBranchId(String(list[0].id));
      } catch {}
    };
    loadBranches();
  }, []);

  useEffect(() => {
    if (activeBranchId) localStorage.setItem("activeBranchId", activeBranchId);
  }, [activeBranchId]);

  const userRole = (user?.role || "").toLowerCase();
  const isAdmin = userRole === "admin";
  const canViewDisbursements = ["admin", "director", "accountant"].includes(userRole);

  const nav = useMemo(() => NAV({ isAdmin, canViewDisbursements }), [isAdmin, canViewDisbursements]);

  const isPathActive = (base) => location.pathname === base || location.pathname.startsWith(base + "/");

  useEffect(() => {
    const next = {};
    nav.forEach((item) => {
      if (item.children?.length) {
        next[item.label] = isPathActive(item.to);
      }
    });
    setOpen(next);
  }, [location.pathname]);

  const navLinkClasses = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition ${
      isActive
        ? "bg-blue-100 text-blue-700 font-medium"
        : "text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
    }`;

  const sidebarClasses = `${
    darkMode ? "bg-gray-900 text-white" : "bg-white text-black"
  } ${collapsed ? "w-20" : "w-64"} fixed h-screen z-30 shadow transition-all duration-300 flex flex-col`;

  const Group = ({ item }) => {
    const hasChildren = Array.isArray(item.children) && item.children.length > 0;
    const isOpen = !!open[item.label];
    const groupActive = isPathActive(item.to);

    if (!hasChildren) {
      return (
        <NavLink to={item.to} className={navLinkClasses} end>
          {item.icon} {!collapsed && item.label}
        </NavLink>
      );
    }

    return (
      <div>
        <button
          onClick={() => setOpen((m) => ({ ...m, [item.label]: !isOpen }))}
          className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition ${
            groupActive
              ? "bg-blue-100 text-blue-700 font-medium"
              : "text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
          }`}
        >
          {item.icon} {!collapsed && <span className="flex-1">{item.label}</span>}
          {!collapsed && <span className="text-xs">{isOpen ? "▾" : "▸"}</span>}
        </button>

        {!collapsed && isOpen && (
          <div className="ml-6 mt-1 flex flex-col space-y-1">
            {item.children.map((c) => (
              <NavLink key={c.to} to={c.to} className={navLinkClasses}>
                <FiLayout className="opacity-70" /> {!collapsed && c.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`flex min-h-screen ${darkMode ? "bg-gray-800 text-white" : "bg-gray-100 text-black"}`}>
      <aside className={sidebarClasses}>
        <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
          {!collapsed && <h1 className="text-xl font-bold text-blue-600">MkopoSuite</h1>}
          <button onClick={toggleCollapse} className="p-1">
            {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
          {!collapsed && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-400 flex items-center justify-center text-white font-bold">
                  {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <div>
                  <p className="text-sm font-medium">{user?.name || user?.email || "User"}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-300">
                    Branch: {branches.find((b) => String(b.id) === String(activeBranchId))?.name || "—"}
                  </p>
                </div>
              </div>

              <select
                className="w-full px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-sm"
                value={activeBranchId}
                onChange={(e) => setActiveBranchId(e.target.value)}
              >
                <option value="">Switch Branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>

              <div className="relative">
                <FiSearch className="absolute left-2 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search borrowers"
                  className="w-full pl-8 pr-2 py-1 text-sm rounded bg-gray-100 dark:bg-gray-800"
                />
              </div>
            </div>
          )}

          <nav className="flex flex-col space-y-2">
            {nav.map((item) => <Group key={item.label} item={item} />)}
          </nav>
        </div>

        <div className="absolute bottom-0 w-full px-4 py-3 border-t dark:border-gray-700 bg-inherit">
          <div className="flex justify-between items-center">
            <button onClick={toggleDark} className="text-sm">{darkMode ? <FiSun /> : <FiMoon />}</button>
            <button onClick={handleLogout} className="flex items-center gap-1 text-sm text-red-500">
              <FiLogOut /> {!collapsed && "Logout"}
            </button>
          </div>
        </div>
      </aside>

      <div className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"}`}>
        <header className="bg-white dark:bg-gray-800 px-6 py-4 shadow flex justify-between items-center">
          <h2 className="text-lg font-semibold">Welcome to MkopoSuite</h2>
          <span className="text-sm text-gray-400 dark:text-gray-300">{(user?.role || "user").toLowerCase()}</span>
        </header>
        <main className="p-4 overflow-y-auto h-[calc(100vh-4rem)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SidebarLayout;
