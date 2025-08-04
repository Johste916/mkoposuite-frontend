// src/components/Sidebar.jsx
import { NavLink } from 'react-router-dom';
import { FaTachometerAlt, FaUsers, FaMoneyCheck, FaFileAlt, FaUserShield } from 'react-icons/fa';

const Sidebar = () => {
  return (
    <aside className="bg-white shadow h-screen p-4 w-64 hidden md:block">
      <h2 className="text-2xl font-bold mb-6 text-blue-600">MkopoSuite</h2>
      <nav className="space-y-3">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-2 rounded hover:bg-blue-100 ${
              isActive ? 'bg-blue-200 text-blue-800 font-semibold' : 'text-gray-700'
            }`
          }
        >
          <FaTachometerAlt /> Dashboard
        </NavLink>

        <NavLink
          to="/borrowers"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-2 rounded hover:bg-blue-100 ${
              isActive ? 'bg-blue-200 text-blue-800 font-semibold' : 'text-gray-700'
            }`
          }
        >
          <FaUsers /> Borrowers
        </NavLink>

        <NavLink
          to="/loans"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-2 rounded hover:bg-blue-100 ${
              isActive ? 'bg-blue-200 text-blue-800 font-semibold' : 'text-gray-700'
            }`
          }
        >
          <FaMoneyCheck /> Loans
        </NavLink>

        <NavLink
          to="/repayments"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-2 rounded hover:bg-blue-100 ${
              isActive ? 'bg-blue-200 text-blue-800 font-semibold' : 'text-gray-700'
            }`
          }
        >
          <FaMoneyCheck /> Repayments
        </NavLink>

        <NavLink
          to="/reports"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-2 rounded hover:bg-blue-100 ${
              isActive ? 'bg-blue-200 text-blue-800 font-semibold' : 'text-gray-700'
            }`
          }
        >
          <FaFileAlt /> Reports
        </NavLink>

        <NavLink
          to="/admin"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-2 rounded hover:bg-blue-100 ${
              isActive ? 'bg-blue-200 text-blue-800 font-semibold' : 'text-gray-700'
            }`
          }
        >
          <FaUserShield /> Admin
        </NavLink>
      </nav>
    </aside>
  );
};

export default Sidebar;
