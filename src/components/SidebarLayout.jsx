import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  FiLogOut, FiSun, FiMoon, FiUsers, FiHome, FiCreditCard, FiDollarSign,
  FiBarChart2, FiChevronLeft, FiChevronRight, FiSearch, FiSettings, FiMessageSquare,
  FiUserCheck, FiMapPin, FiSend
} from 'react-icons/fi';
import { BsBank } from 'react-icons/bs';

const SidebarLayout = () => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedDark = localStorage.getItem('darkMode');
    if (storedDark === 'true') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const toggleDark = () => setDarkMode(!darkMode);
  const toggleCollapse = () => setCollapsed(!collapsed);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navLinkClasses = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition ${
      isActive
        ? 'bg-blue-100 text-blue-700 font-medium'
        : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
    }`;

  const sidebarClasses = `${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'} ${
    collapsed ? 'w-20' : 'w-64'
  } fixed h-screen z-30 shadow transition-all duration-300 flex flex-col`;

  const userRole = user?.role?.toLowerCase();
  const isAdmin = userRole === 'admin';
  const canViewDisbursements = ['admin', 'director', 'accountant'].includes(userRole);

  return (
    <div className={`flex min-h-screen ${darkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-black'}`}>
      {/* Sidebar */}
      <aside className={sidebarClasses}>
        <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
          {!collapsed && <h1 className="text-xl font-bold text-blue-600">MkopoSuite</h1>}
          <button onClick={toggleCollapse} className="p-1">{collapsed ? <FiChevronRight /> : <FiChevronLeft />}</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
          {!collapsed && user && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-400 flex items-center justify-center text-white font-bold">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-300">Branch: {user.branch || 'Main'}</p>
                </div>
              </div>

              <select className="w-full px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-sm">
                <option>Switch Branch</option>
                <option>Main</option>
                <option>Dar</option>
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

          {/* Navigation */}
          <nav className="flex flex-col space-y-2">
            <NavLink to="/" end className={navLinkClasses}><FiHome /> {!collapsed && 'Dashboard'}</NavLink>
            <NavLink to="/borrowers" className={navLinkClasses}><FiUsers /> {!collapsed && 'Borrowers'}</NavLink>
            <NavLink to="/loans" className={navLinkClasses}><FiCreditCard /> {!collapsed && 'Loans'}</NavLink>
            <NavLink to="/repayments" className={navLinkClasses}><FiDollarSign /> {!collapsed && 'Repayments'}</NavLink>
            <NavLink to="/reports" className={navLinkClasses}><FiBarChart2 /> {!collapsed && 'Reports'}</NavLink>
            <NavLink to="/sms" className={navLinkClasses}><FiMessageSquare /> {!collapsed && 'SMS'}</NavLink>
            <NavLink to="/bank" className={navLinkClasses}><BsBank /> {!collapsed && 'Cash & Bank'}</NavLink>

            {canViewDisbursements && (
              <NavLink to="/disbursements" className={navLinkClasses}><FiSend /> {!collapsed && 'Disbursements'}</NavLink>
            )}

            {isAdmin && (
              <>
                <NavLink to="/users" className={navLinkClasses}><FiUserCheck /> {!collapsed && 'Users'}</NavLink>
                <NavLink to="/roles" className={navLinkClasses}><FiSettings /> {!collapsed && 'Roles'}</NavLink>
                <NavLink to="/branches" className={navLinkClasses}><FiMapPin /> {!collapsed && 'Branches'}</NavLink>

                {/* Settings Dropdown */}
                <div>
                  <button
                    onClick={() => setSettingsExpanded(prev => !prev)}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition ${
                      settingsExpanded
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    <FiSettings /> {!collapsed && 'Settings'}
                  </button>

                  {!collapsed && settingsExpanded && (
                    <div className="ml-6 mt-1 flex flex-col space-y-1">
                      <NavLink to="/settings/loan" className={navLinkClasses}>Loan Settings</NavLink>
                      <NavLink to="/settings/categories" className={navLinkClasses}>Loan Categories</NavLink>
                      <NavLink to="/settings/penalty" className={navLinkClasses}>Penalty Settings</NavLink>
                      <NavLink to="/settings/system" className={navLinkClasses}>System Settings</NavLink>
                      <NavLink to="/settings/integration" className={navLinkClasses}>Integration Settings</NavLink>
                      <NavLink to="/settings/branches" className={navLinkClasses}>Branch Settings</NavLink>
                      <NavLink to="/settings/borrower" className={navLinkClasses}>Borrower Settings</NavLink>
                      <NavLink to="/settings/users" className={navLinkClasses}>User Management</NavLink>
                      <NavLink to="/settings/bulk-sms" className={navLinkClasses}>Bulk SMS Settings</NavLink>
                      <NavLink to="/settings/saving" className={navLinkClasses}>Saving Account Settings</NavLink>
                    </div>
                  )}
                </div>
              </>
            )}
          </nav>
        </div>

        {/* Footer Controls */}
        <div className="absolute bottom-0 w-full px-4 py-3 border-t dark:border-gray-700 bg-inherit">
          <div className="flex justify-between items-center">
            <button onClick={toggleDark} className="text-sm">
              {darkMode ? <FiSun /> : <FiMoon />}
            </button>
            <button onClick={handleLogout} className="flex items-center gap-1 text-sm text-red-500">
              <FiLogOut /> {!collapsed && 'Logout'}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-64'}`}>
        <header className="bg-white dark:bg-gray-800 px-6 py-4 shadow flex justify-between items-center">
          <h2 className="text-lg font-semibold">Welcome to MkopoSuite</h2>
          <span className="text-sm text-gray-400 dark:text-gray-300">{user?.role || 'User'}</span>
        </header>

        <main className="p-4 overflow-y-auto h-[calc(100vh-4rem)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SidebarLayout;
