// src/context/FeatureConfigContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api";

const FeatureConfigContext = createContext({
  loading: true,
  features: {},
  version: 0,
  entitlementsLoaded: false,
  modules: new Set(),
  subEndsAt: null,
  hasModule: () => false
});

export const FeatureConfigProvider = ({ children }) => {
  const [sidebarState, setSidebarState] = useState({ loading: true, features: {}, version: 0 });
  const [entState, setEntState] = useState({
    entitlementsLoaded: false,
    modules: new Set(),
    subEndsAt: null
  });

  useEffect(() => {
    let alive = true;

    const loadSidebar = async () => {
      try {
        const res = await api.get("/settings/sidebar");
        const payload = res?.data || {};
        const normalized = normalizeFeatures(payload.features || payload || {});
        if (!alive) return;
        setSidebarState({
          loading: false,
          features: Object.freeze(normalized),
          version: Number(payload.version || 0)
        });
      } catch {
        if (!alive) return;
        setSidebarState({ loading: false, features: Object.freeze({}), version: 0 });
      }
    };

    const loadEntitlements = async () => {
      try {
        const res = await api.get("/tenants/me/entitlements"); // base has /api
        const mods = new Set(res?.data?.modules || []);
        const subEndsAt = res?.data?.subscription?.endsAt || null;
        if (!alive) return;
        setEntState({ entitlementsLoaded: true, modules: mods, subEndsAt });
      } catch {
        if (!alive) return;
        // stay non-fatal; UI can still render behind admin flags
        setEntState((s) => ({ ...s, entitlementsLoaded: false }));
      }
    };

    loadSidebar();
    loadEntitlements();

    return () => { alive = false; };
  }, []);

  const value = useMemo(() => {
    const hasModule = (key) => entState.modules.has(String(key || "").trim());
    return {
      loading: sidebarState.loading,
      features: sidebarState.features,
      version: sidebarState.version,
      entitlementsLoaded: entState.entitlementsLoaded,
      modules: entState.modules,
      subEndsAt: entState.subEndsAt,
      hasModule
    };
  }, [sidebarState.loading, sidebarState.features, sidebarState.version, entState]);

  return (
    <FeatureConfigContext.Provider value={value}>
      {children}
    </FeatureConfigContext.Provider>
  );
};

export const useFeatureConfig = () => useContext(FeatureConfigContext);
export const useFeatures = () => useContext(FeatureConfigContext);

/* ---------- Helpers ---------- */
function normalizeFeatures(raw) {
  const out = {};
  Object.entries(raw).forEach(([route, cfg]) => {
    const rec = cfg || {};
    out[cleanRoute(route)] = {
      enabled: rec.enabled !== false,
      label: typeof rec.label === "string" ? rec.label : null,
      roles: Array.isArray(rec.roles)
        ? rec.roles.map((r) => String(r).toLowerCase())
        : null,
    };
  });
  return out;
}

function cleanRoute(r) {
  if (!r) return "/";
  const s = String(r).trim();
  return s.endsWith("/") && s !== "/" ? s.slice(0, -1) : s;
}

export const routeModuleMap = {
  "/borrowers": "borrowers",
  "/loans": "loans",
  "/repayments": "repayments",
  "/collections": "collections",
  "/collateral": "collateral",
  "/savings": "savings",
  "/savings-transactions": "savings",
  "/investors": "investors",
  "/payroll": "payroll",
  "/expenses": "expenses",
  "/other-income": "other_income",
  "/assets": "assets",
  "/accounting": "accounting",
  "/reports": "reports",
  "/admin": "admin",
  "/settings": "settings",
  "/user-management": "admin",
  "/branches": "admin",
};

export function resolveModuleForRoute(routePath) {
  const path = cleanRoute(routePath || "/");
  const prefixes = Object.keys(routeModuleMap).sort((a, b) => b.length - a.length);
  for (const p of prefixes) {
    if (path === p || path.startsWith(p + "/")) return routeModuleMap[p];
  }
  return null;
}

export function filterNavByFeatures(nav, features, userRole, ctx) {
  const role = String(userRole || "").toLowerCase();
  const entLoaded = !!ctx?.entitlementsLoaded;
  const hasModule = (key) => !!ctx?.hasModule?.(key);

  const filterItem = (item) => {
    const to = cleanRoute(item.to || "");
    const cfg = features[to] || {};
    const enabledByAdmin = cfg.enabled !== false;
    const allowedByRole = !cfg.roles || cfg.roles.includes(role);
    if (!enabledByAdmin || !allowedByRole) return null;

    const modKey = resolveModuleForRoute(to);
    if (entLoaded && modKey && !hasModule(modKey)) return null;

    const label = cfg.label || item.label;

    if (Array.isArray(item.children) && item.children.length) {
      const children = item.children
        .map((child) => filterItem({ ...child, children: child.children || [] }))
        .filter(Boolean);
      if (children.length === 0) return null;
      return { ...item, label, children };
    }
    return { ...item, label };
  };

  return nav.map(filterItem).filter(Boolean);
}

export function isRouteEnabled(route, userRole, ctx) {
  const { features } = ctx || {};
  const role = String(userRole || "").toLowerCase();
  const to = cleanRoute(route || "");
  const cfg = features?.[to] || {};
  const enabledByAdmin = cfg.enabled !== false;
  const allowedByRole = !cfg.roles || cfg.roles.includes(role);
  if (!enabledByAdmin || !allowedByRole) return false;

  if (ctx?.entitlementsLoaded) {
    const modKey = resolveModuleForRoute(to);
    if (modKey && !ctx.hasModule(modKey)) return false;
  }
  return true;
}
