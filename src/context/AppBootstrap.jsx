import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "./AuthContext";

/**
 * Runs once at app start:
 *  - If no token: stop loading; redirect to /login (unless already on a public route)
 *  - If token: try /users/me (tolerant), then /tenants/me/entitlements
 *  - On 401 anywhere: clear session and go to /login
 */
export default function AppBootstrap({ children }) {
  const nav = useNavigate();
  const loc = useLocation();
  const { token, setLoading, setUser, setEntitlements, setTenant, logout } = useAuth();

  useEffect(() => {
    let mounted = true;

    const isPublic = (p) =>
      p.startsWith("/login") || p.startsWith("/signup") || p.startsWith("/forgot-password");

    async function run() {
      setLoading(true);

      // Unauthed: do not fetch anything; keep user on login
      if (!token) {
        if (!isPublic(loc.pathname)) nav("/login", { replace: true });
        setLoading(false);
        return;
      }

      try {
        // Optional: /users/me (tolerate 404/501)
        try {
          const me = await api.getJSON("/users/me");
          if (mounted && me) setUser(me);
        } catch {
          /* keep localStorage user */
        }

        // Required for features/menus
        const ent = await api.getJSON("/tenants/me/entitlements");
        if (mounted) setEntitlements(ent || null);

        // Optional: tenant summary
        try {
          const t = await api.getJSON("/tenants/me");
          if (mounted) setTenant(t || null);
        } catch {
          /* ignore */
        }
      } catch (e) {
        if (e?.response?.status === 401) {
          logout();
          if (!isPublic(loc.pathname)) nav("/login", { replace: true });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    run();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  return <>{children}</>;
}
