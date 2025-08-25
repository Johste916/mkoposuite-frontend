// src/context/FeatureConfigContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api";

/**
 * We combine two sources:
 * 1) Admin feature config (per-route):   GET /settings/sidebar
 *    {
 *      version: 3,
 *      features: {
 *        "/loans": { enabled: true,  label: "Loans", roles: ["admin","director"] },
 *        "/expenses": { enabled: true, roles: ["admin","accountant"] },
 *        ...
 *      }
 *    }
 *
 * 2) Tenant entitlements (per module):   GET /api/tenants/me/entitlements
 *    {
 *      tenantId: "uuid",
 *      subscription: { planName, startsAt, endsAt },
 *      modules: ["loans","repayments","expenses", ...]   // module keys enabled for this tenant
 *    }
 *
 * We gate nav items by BOTH:
 *   - Admin has not disabled it (features[route].enabled !== false)
 *   - Current user role is allowed by Admin (if roles[] specified)
 *   - Tenant has the module entitlement (module mapped from route)
 */

/* ---------- Context Shape ---------- */
const FeatureConfigContext = createContext({
  loading: true,
  features: {},          // normalized per-route config
  version: 0,
  // Tenant entitlements:
  entitlementsLoaded: false,
  modules: new Set(),    // Set<string> of module keys
  subEndsAt: null,       // Date string or null
  hasModule: () => false // (key) => boolean
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

    // fetch admin sidebar flags
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
        // default to "no admin overrides" (allow all routes unless tenant blocks)
        setSidebarState({ loading: false, features: Object.freeze({}), version: 0 });
      }
    };

    // fetch tenant entitlements
    const loadEntitlements = async () => {
      try {
        const res = await api.get("/api/tenants/me/entitlements");
        const mods = new Set(res?.data?.modules || []);
        const subEndsAt = res?.data?.subscription?.endsAt || null;
        if (!alive) return;
        setEntState({ entitlementsLoaded: true, modules: mods, subEndsAt });
      } catch {
        if (!alive) return;
        // If entitlements endpoint isn’t ready, don’t block; we’ll treat as “unknown”
        setEntState({ entitlementsLoaded: false, modules: new Set(), subEndsAt: null });
      }
    };

    loadSidebar();
    loadEntitlements();

    return () => { alive = false; };
  }, []);

  const value = useMemo(() => {
    const hasModule = (key) => entState.modules.has(String(key || "").trim());
    return {
      loading: sidebarState.loading, // UI can still render while entitlements load separately
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
// alias, if you prefer shorter name elsewhere
export const useFeatures = () => useContext(FeatureConfigContext);

/* ---------- Normalizers & Helpers ---------- */

function normalizeFeatures(raw) {
  const out = {};
  Object.entries(raw).forEach(([route, cfg]) => {
    const rec = cfg || {};
    out[cleanRoute(route)] = {
      enabled: rec.enabled !== false,               // default true
      label: typeof rec.label === "string" ? rec.label : null,
      roles: Array.isArray(rec.roles)
        ? rec.roles.map((r) => String(r).toLowerCase())
        : null,                                     // null = all roles
    };
  });
  return out;
}

function cleanRoute(r) {
  if (!r) return "/";
  const s = String(r).trim();
  return s.endsWith("/") && s !== "/" ? s.slice(0, -1) : s;
}

/**
 * Map top-level route prefixes to module keys used in entitlements.
 * Adjust freely to match your IA.
 */
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
  // Longest prefix match wins
  const prefixes = Object.keys(routeModuleMap).sort((a, b) => b.length - a.length);
  for (const p of prefixes) {
    if (path === p || path.startsWith(p + "/")) return routeModuleMap[p];
  }
  return null;
}

/**
 * Filter & relabel NAV by:
 *  - Admin feature flags (enabled + roles)
 *  - Tenant entitlements (module must be active)
 *
 * If entitlements have NOT loaded yet, we only apply Admin flags,
 * then later when entitlements arrive you can re-render (provider value changes).
 */
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

    // Tenant gating
    const modKey = resolveModuleForRoute(to);
    if (entLoaded && modKey && !hasModule(modKey)) {
      // Module not in tenant subscription → hide from nav
      return null;
    }

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

/**
 * Quick check for a route’s availability at render time.
 * Useful for guarding individual buttons/links.
 */
export function isRouteEnabled(route, userRole, ctx) {
  const { features } = ctx || {};
  const role = String(userRole || "").toLowerCase();
  const to = cleanRoute(route || "");
  const cfg = features?.[to] || {};
  const enabledByAdmin = cfg.enabled !== false;
  const allowedByRole = !cfg.roles || cfg.roles.includes(role);
  if (!enabledByAdmin || !allowedByRole) return false;

  // Tenant module gate (if entitlements are known)
  if (ctx?.entitlementsLoaded) {
    const modKey = resolveModuleForRoute(to);
    if (modKey && !ctx.hasModule(modKey)) return false;
  }
  return true;
}
