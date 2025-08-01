// src/components/SidebarLayout.jsx
import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  FiLogOut, FiSun, FiMoon, FiUsers, FiHome, FiCreditCard, FiDollarSign,
  FiBarChart2, FiChevronLeft, FiChevronRight, FiSearch, FiSettings, FiMessageSquare
} from 'react-icons/fi';
import { BsBank } from 'react-icons/bs';

const SidebarLayout = () => {
  console.log('🧠 SidebarLayout mounted'); // ✅ LOG: confirms layout loaded

  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const storedDark = localStorage.getItem('darkMode');
    if (storedDark === 'true') setDarkMode(true);
    console.log('🎨 Dark mode status loaded:', storedDark);
  }, []);

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const toggleDark = () => setDarkMode(!darkMode);
  const toggleCollapse = () => setCollapsed(!collapsed);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navLinkClasses = ({ isActive }) =>
    `flex items-center space-x-2 px-4 py-2 rounded transition-all text-sm ${
      isActive
        ? 'bg-blue-100 text-blue-700 font-semibold'
        : darkMode
        ? 'text-gray-200 hover:bg-gray-700'
        : 'text-gray-700 hover:bg-gray-200'
    }`;

  const sidebarClasses = `${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'} ${
    collapsed ? 'w-20' : 'w-64'
  } shadow-md h-screen transition-all duration-300`;

  return (
    <div className={`flex ${darkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-black'} min-h-screen transition-colors duration-300`}>
      {/* Sidebar */}
      <aside className={sidebarClasses}>
        <div className="flex justify-between items-center p-4 border-b">
          {!collapsed && <h2 className="text-xl font-bold text-blue-500">MkopoSuite</h2>}
          <button onClick={toggleCollapse} className="focus:outline-none">
            {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
          </button>
        </div>

        <div className="p-4">
          {!collapsed && (
            <div className="flex flex-col items-start space-y-2 mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gray-400 rounded-full" />
                <div>
                  <p className="text-sm font-semibold">John Elipokea Meena</p>
                  <p className="text-xs text-blue-300">(Main Branch)</p>
                </div>
              </div>
              <select className="text-sm bg-gray-200 rounded px-2 py-1 w-full">
                <option>-Switch Branch-</option>
                <option>Main</option>
                <option>Dar</option>
              </select>
              <div className="relative w-full">
                <FiSearch className="absolute left-2 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search borrower..."
                  className="pl-8 pr-2 py-1 w-full text-sm rounded bg-gray-100"
                />
              </div>
            </div>
          )}

          <nav className="flex flex-col space-y-1">
            <NavLink to="/" end className={navLinkClasses}>
              <FiHome />
              {!collapsed && <span>Dashboard</span>}
            </NavLink>
            <NavLink to="/borrowers" className={navLinkClasses}>
              <FiUsers />
              {!collapsed && <span>Borrowers</span>}
            </NavLink>
            <NavLink to="/loans" className={navLinkClasses}>
              <FiCreditCard />
              {!collapsed && <span>Loans</span>}
            </NavLink>
            <NavLink to="/repayments" className={navLinkClasses}>
              <FiDollarSign />
              {!collapsed && <span>Repayments</span>}
            </NavLink>
            <NavLink to="/reports" className={navLinkClasses}>
              <FiBarChart2 />
              {!collapsed && <span>Reports</span>}
            </NavLink>
            <NavLink to="/sms" className={navLinkClasses}>
              <FiMessageSquare />
              {!collapsed && <span>SMS</span>}
            </NavLink>
            <NavLink to="/bank" className={navLinkClasses}>
              <BsBank />
              {!collapsed && <span>Cash & Bank</span>}
            </NavLink>
            <NavLink to="/settings" className={navLinkClasses}>
              <FiSettings />
              {!collapsed && <span>Settings</span>}
            </NavLink>
          </nav>
        </div>

        <div className="absolute bottom-0 w-full p-4 border-t">
          <div className="flex justify-between items-center">
            <button
              onClick={toggleDark}
              className="text-sm px-2 py-1 rounded hover:bg-gray-700"
              title="Toggle Theme"
            >
              {darkMode ? <FiSun /> : <FiMoon />}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 text-red-500 text-sm"
            >
              <FiLogOut />
              {!collapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <header className="bg-white dark:bg-gray-800 shadow px-4 py-3 flex justify-between items-center transition-colors duration-300">
          <h1 className="text-lg font-semibold">Welcome to MkopoSuite</h1>
        </header>
        <div className="p-4 flex-1 overflow-y-auto transition-all duration-300 ease-in-out">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default SidebarLayout;
