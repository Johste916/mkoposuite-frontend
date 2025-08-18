// src/context/FeatureConfigContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api";

/**
 * Shape expected from backend (GET /settings/sidebar):
 * {
 *   version: 3,
 *   features: {
 *     "/loans":                  { enabled: true,  label: "Loans", roles: ["admin","director","accountant"] },
 *     "/loans/applications":     { enabled: true,  label: "Add Loan", roles: ["admin","director"] },
 *     "/repayments":             { enabled: false },
 *     "/investors":              { enabled: true },
 *     "/accounting/trial-balance": { enabled: true, label: "Trial Balance" },
 *     ...
 *   }
 * }
 */

const FeatureConfigContext = createContext({
  loading: true,
  features: {},
  version: 0,
});

export const FeatureConfigProvider = ({ children }) => {
  const [state, setState] = useState({ loading: true, features: {}, version: 0 });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.get("/settings/sidebar");
        const payload = res?.data || {};
        const normalized = normalizeFeatures(payload.features || payload || {});
        if (!alive) return;
        setState({
          loading: false,
          features: Object.freeze(normalized),
          version: Number(payload.version || 0),
        });
      } catch {
        // If endpoint not ready yet, default to "allow all"
        if (!alive) return;
        setState({ loading: false, features: Object.freeze({}), version: 0 });
      }
    })();
    return () => { alive = false; };
  }, []);

  const value = useMemo(() => state, [state.loading, state.version, state.features]);
  return (
    <FeatureConfigContext.Provider value={value}>
      {children}
    </FeatureConfigContext.Provider>
  );
};

export const useFeatureConfig = () => useContext(FeatureConfigContext);

function normalizeFeatures(raw) {
  const out = {};
  Object.entries(raw).forEach(([route, cfg]) => {
    const rec = cfg || {};
    out[route] = {
      enabled: rec.enabled !== false,               // default true
      label: typeof rec.label === "string" ? rec.label : null,
      roles: Array.isArray(rec.roles)
        ? rec.roles.map((r) => String(r).toLowerCase())
        : null,                                     // null = all roles
    };
  });
  return out;
}

/**
 * Filter & relabel NAV by Admin-defined features.
 * - Hides items disabled by Admin (enabled:false)
 * - Hides items disallowed for current role (roles array)
 * - Applies Admin label overrides
 */
export function filterNavByFeatures(nav, features, userRole) {
  const role = String(userRole || "").toLowerCase();

  const filterItem = (item) => {
    const cfg = features[item.to] || {};
    const enabled = cfg.enabled !== false;
    const allowedByRole = !cfg.roles || cfg.roles.includes(role);
    if (!enabled || !allowedByRole) return null;

    const label = cfg.label || item.label;

    if (Array.isArray(item.children) && item.children.length) {
      const children = item.children
        .map((child) => filterItem({ ...child, children: child.children || [] }))
        .filter(Boolean);

      // If a section loses all its children, drop the section itself.
      if (children.length === 0) return null;
      return { ...item, label, children };
    }

    return { ...item, label };
  };

  return nav.map(filterItem).filter(Boolean);
}
