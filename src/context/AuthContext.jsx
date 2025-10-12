// src/context/AuthContext.jsx
import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('token'));

  // Helper: extract a tenant id from various shapes
  const pickTenantId = (u) => {
    if (!u) return null;
    return (
      u.tenantId ||
      u?.tenant?.id ||
      u?.activeMembership?.tenant_id ||
      u?.memberships?.[0]?.tenant_id ||
      u?.tenants?.[0]?.id ||
      null
    );
  };

  const login = (jwt, usr) => {
    localStorage.setItem('token', jwt);
    localStorage.setItem('user', JSON.stringify(usr));
    const tid = pickTenantId(usr);
    if (tid) localStorage.setItem('tenantId', tid);
    setToken(jwt);
    setUser(usr);
  };

  const logout = () => {
    [
      'token',
      'user',
      'tenantId',
      'activeTenantId',
      'activeBranchId',
      'jwt',
      'authToken',
      'accessToken',
      'access_token',
    ].forEach((k) => {
      try {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
      } catch {}
    });
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
