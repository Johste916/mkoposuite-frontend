import { createContext, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // persisted user/token (tolerant JSON parse)
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      localStorage.removeItem("user");
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  // bootstrap state (app-wide)
  const [loading, setLoading] = useState(true);
  const [entitlements, setEntitlements] = useState(null);
  const [tenant, setTenant] = useState(null);

  const login = (jwt, usr, { tenantId } = {}) => {
    // persist
    localStorage.setItem("token", jwt);
    localStorage.setItem("user", JSON.stringify(usr || {}));
    if (tenantId) localStorage.setItem("activeTenantId", String(tenantId));
    else if (usr?.tenantId) localStorage.setItem("activeTenantId", String(usr.tenantId));

    // state
    setToken(jwt);
    setUser(usr || {});
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    // keep activeTenantId if you support multi-tenant switching; otherwise clear it:
    // localStorage.removeItem("activeTenantId");
    setToken(null);
    setUser(null);
    setEntitlements(null);
    setTenant(null);
  };

  const value = useMemo(
    () => ({
      // session
      user,
      token,
      login,
      logout,
      // bootstrap/shared
      loading,
      setLoading,
      entitlements,
      setEntitlements,
      tenant,
      setTenant,
    }),
    [user, token, loading, entitlements, tenant]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};
