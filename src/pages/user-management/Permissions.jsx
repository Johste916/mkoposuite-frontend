import React, { useEffect, useMemo, useState } from "react";
import api from "../../api";

/** UI tokens */
const ui = {
  page: "w-full px-4 md:px-6 lg:px-10 py-6 text-slate-900",
  h1: "text-3xl font-extrabold tracking-tight",
  sub: "text-sm text-slate-600",
  card: "rounded-2xl border border-slate-200 bg-white shadow-sm",
  thBase:
    "text-left text-[11px] uppercase tracking-wide text-slate-700 font-semibold px-3 py-2 border-b border-slate-200 bg-slate-50",
  td: "px-3 py-2 border-b border-slate-200 text-sm",
  btn: "inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 hover:bg-slate-50 font-semibold text-slate-800",
  btnPrimary:
    "inline-flex items-center rounded-lg bg-indigo-600 text-white px-3 py-2 font-semibold hover:bg-indigo-700",
  subtle: "text-xs text-slate-500",
  stickyCell: "sticky left-0 z-10 bg-white",
  stickyHead: "sticky left-0 z-20 bg-white",
  moduleRow: "bg-gradient-to-r from-slate-50 to-white border-y border-slate-200",
  moduleTitle: "text-[13px] font-bold tracking-wide text-slate-800",
  moduleBadge:
    "inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 border border-slate-200",
  collapseBtn:
    "inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900",
  actionLabel: "font-medium text-slate-800",
  actionKey: "font-mono text-[11px] text-slate-500",
  chip: "inline-flex items-center rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700",
  roleTh: "text-center align-bottom",
  roleThInner: "flex flex-col items-center gap-1",
  densityToggle: "inline-flex items-center rounded-md border border-slate-300 bg-white p-1 text-xs",
};

/** Endpoints (smart fallback tries with/without /api) */
const PATHS = {
  matrix: "/permissions/matrix",
  matrixApi: "/api/permissions/matrix",
  role: (id) => `/permissions/role/${id}`,
  roleApi: (id) => `/api/permissions/role/${id}`,
  // Optional (only if you implemented it server-side):
  saveAll: "/permissions/matrix",
  saveAllApi: "/api/permissions/matrix",
};

/** Small chevron icon */
function Chevron({ open }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`}
      fill="currentColor"
    >
      <path d="M7 6l6 4-6 4V6z" />
    </svg>
  );
}

export default function PermissionsMatrix() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [catalog, setCatalog] = useState([]); // [{ group, actions:[{key,label}] }]
  const [roles, setRoles] = useState([]); // [{id,name,isSystem}]
  const [matrix, setMatrix] = useState({}); // { [actionKey]: string[]roleNames }
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  // Visual hierarchy controls
  const [collapsed, setCollapsed] = useState(new Set()); // groups collapsed
  const [hoverRole, setHoverRole] = useState(null); // highlight a column on hover
  const [density, setDensity] = useState("comfortable"); // "comfortable" | "compact"
  const [showKeys, setShowKeys] = useState(true); // show action key under label
  const hasSaveAll = false; // backend doesn't expose PUT /permissions/matrix by default

  const rowPad = density === "compact" ? "py-1.5" : "py-2.5";

  /** Utility: GET with fallback (/x then /api/x) */
  const getWithFallback = async (p1, p2) => {
    try {
      return await api.get(p1);
    } catch (e) {
      if (e?.response?.status === 404) {
        return await api.get(p2);
      }
      throw e;
    }
  };

  /** Utility: PUT with fallback (/x then /api/x) */
  const putWithFallback = async (p1, p2, body) => {
    try {
      return await api.put(p1, body);
    } catch (e) {
      if (e?.response?.status === 404) {
        return await api.put(p2, body);
      }
      throw e;
    }
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getWithFallback(PATHS.matrix, PATHS.matrixApi);
      setCatalog(Array.isArray(data?.catalog) ? data.catalog : []);
      setRoles(Array.isArray(data?.roles) ? data.roles : []);
      setMatrix(typeof data?.matrix === "object" && data?.matrix ? data.matrix : {});
    } catch (e) {
      console.error(e);
      const msg =
        e?.response?.status === 404
          ? "Endpoint not found. Ensure your backend route is GET /api/permissions/matrix (or set api.baseURL='/api')."
          : e?.response?.data?.error || "Failed to load permission matrix";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const roleNames = useMemo(() => roles.map((r) => r.name), [roles]);

  const filteredCatalog = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return catalog;
    return catalog
      .map((g) => ({
        ...g,
        actions: g.actions.filter(
          (a) => a.key.toLowerCase().includes(needle) || a.label.toLowerCase().includes(needle)
        ),
      }))
      .filter((g) => g.actions.length);
  }, [catalog, q]);

  const toggle = (actionKey, roleName) => {
    setMatrix((prev) => {
      const current = new Set(prev[actionKey] || []);
      current.has(roleName) ? current.delete(roleName) : current.add(roleName);
      return { ...prev, [actionKey]: Array.from(current) };
    });
  };

  const setColumn = (roleName, checked, groups = filteredCatalog) => {
    setMatrix((prev) => {
      const next = { ...prev };
      for (const g of groups) {
        for (const a of g.actions) {
          const set = new Set(next[a.key] || []);
          checked ? set.add(roleName) : set.delete(roleName);
          next[a.key] = Array.from(set);
        }
      }
      return next;
    });
  };

  const setRow = (actionKey, checked) => {
    setMatrix((prev) => {
      const set = new Set(prev[actionKey] || []);
      for (const rn of roleNames) (checked ? set.add(rn) : set.delete(rn));
      return { ...prev, [actionKey]: Array.from(set) };
    });
  };

  const setGroupAll = (group, checked) => {
    setMatrix((prev) => {
      const next = { ...prev };
      for (const a of group.actions) {
        const set = new Set(next[a.key] || []);
        for (const rn of roleNames) (checked ? set.add(rn) : set.delete(rn));
        next[a.key] = Array.from(set);
      }
      return next;
    });
  };

  const saveRole = async (role) => {
    const actions = [];
    for (const g of catalog) {
      for (const a of g.actions) {
        const allowed = new Set(matrix[a.key] || []);
        if (allowed.has(role.name)) actions.push(a.key);
      }
    }
    setSaving(true);
    setError("");
    try {
      await putWithFallback(PATHS.role(role.id), PATHS.roleApi(role.id), { actions, mode: "replace" });
      alert(`Saved permissions for role: ${role.name}`);
    } catch (e) {
      console.error(e);
      const msg =
        e?.response?.status === 404
          ? "Save endpoint not found. Backend should expose PUT /api/permissions/role/:roleId."
          : e?.response?.data?.error || "Failed to save this role";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const saveAll = async () => {
    if (!hasSaveAll) {
      setError(
        "Bulk save is disabled: backend route PUT /api/permissions/matrix is not implemented. Use per-role Save, or add the route."
      );
      return;
    }
    setSaving(true);
    setError("");
    try {
      await putWithFallback(PATHS.saveAll, PATHS.saveAllApi, { matrix });
      alert("Saved permissions for all roles.");
    } catch (e) {
      console.error(e);
      const msg =
        e?.response?.status === 404
          ? "Bulk save endpoint not found. Implement PUT /api/permissions/matrix on the server."
          : e?.response?.data?.error || "Failed to save all";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const toggleGroup = (groupKey) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(groupKey) ? next.delete(groupKey) : next.add(groupKey);
      return next;
    });
  };

  return (
    <div className={ui.page}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
        <div>
          <h1 className={ui.h1}>Permission Matrix</h1>
          <div className={ui.sub}>
            Differentiate modules and actions at a glance. Search, collapse, bulk-toggle, then save.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className={ui.densityToggle}>
            <button
              className={`px-2 py-1 rounded ${density === "comfortable" ? "bg-slate-100" : ""}`}
              onClick={() => setDensity("comfortable")}
              title="Comfortable density"
            >
              Comfy
            </button>
            <button
              className={`px-2 py-1 rounded ${density === "compact" ? "bg-slate-100" : ""}`}
              onClick={() => setDensity("compact")}
              title="Compact density"
            >
              Compact
            </button>
          </div>

          <label className={ui.chip}>
            <input
              type="checkbox"
              className="mr-2"
              checked={showKeys}
              onChange={(e) => setShowKeys(e.target.checked)}
            />
            Show action keys
          </label>

          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter actions…"
            className="h-10 w-64 rounded-lg border border-slate-300 bg-white text-sm px-3 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-600"
          />
          <button onClick={load} className={ui.btn}>
            Refresh
          </button>
          {hasSaveAll && (
            <button onClick={saveAll} disabled={saving} className={ui.btnPrimary}>
              Save All
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className={`${ui.card} overflow-auto`}>
        <table className="min-w-full border-separate border-spacing-0">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className={`${ui.thBase} ${ui.stickyHead}`} style={{ minWidth: 280 }}>
                Module / Action
              </th>

              {roles.map((r) => (
                <th
                  key={r.id}
                  className={`${ui.thBase} ${ui.roleTh}`}
                  onMouseEnter={() => setHoverRole(r.name)}
                  onMouseLeave={() => setHoverRole(null)}
                >
                  <div className={ui.roleThInner}>
                    <div className="font-bold text-[12px]">{r.name}</div>
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] text-slate-500">
                        <input
                          type="checkbox"
                          onChange={(e) => setColumn(r.name, e.target.checked)}
                        />{" "}
                        All
                      </label>
                      <button
                        className="text-[11px] underline"
                        onClick={() => saveRole(r)}
                        disabled={saving}
                        title="Save only this role"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </th>
              ))}

              <th className={ui.thBase} style={{ minWidth: 120 }}>
                Row Tools
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td className={ui.td} colSpan={2 + roles.length}>
                  Loading…
                </td>
              </tr>
            ) : filteredCatalog.length === 0 ? (
              <tr>
                <td className={ui.td} colSpan={2 + roles.length}>
                  No actions match your filter.
                </td>
              </tr>
            ) : (
              filteredCatalog.map((group) => {
                const isCollapsed = collapsed.has(group.group);
                return (
                  <React.Fragment key={group.group}>
                    {/* MODULE ROW */}
                    <tr className={ui.moduleRow}>
                      <td className={`${ui.td} ${ui.stickyCell}`} colSpan={2 + roles.length}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={ui.moduleBadge}>MODULE</span>
                            <button className={ui.collapseBtn} onClick={() => toggleGroup(group.group)}>
                              <Chevron open={!isCollapsed} />
                              <span className={ui.moduleTitle}>{group.group}</span>
                            </button>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className={ui.subtle}>
                              <input
                                type="checkbox"
                                onChange={(e) => setGroupAll(group, e.target.checked)}
                              />{" "}
                              All roles in module
                            </label>
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* ACTION ROWS */}
                    {!isCollapsed &&
                      group.actions.map((a, idx) => (
                        <tr key={a.key} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}>
                          <td className={`${ui.td} ${ui.stickyCell} ${rowPad}`} title={a.key}>
                            <div className="flex items-start gap-2">
                              <span className="mt-1 inline-block h-2 w-2 rounded-full bg-slate-300" />
                              <div>
                                <div className={ui.actionLabel}>{a.label}</div>
                                {showKeys && <div className={ui.actionKey}>{a.key}</div>}
                              </div>
                            </div>
                          </td>

                          {roles.map((r) => {
                            const allowed = new Set(matrix[a.key] || []);
                            const on = allowed.has(r.name);
                            const hi = hoverRole === r.name ? "bg-indigo-50" : "";
                            return (
                              <td
                                key={`${a.key}:${r.id}`}
                                className={`${ui.td} text-center ${rowPad} ${hi}`}
                                onMouseEnter={() => setHoverRole(r.name)}
                                onMouseLeave={() => setHoverRole(null)}
                              >
                                <input type="checkbox" checked={on} onChange={() => toggle(a.key, r.name)} />
                              </td>
                            );
                          })}

                          <td className={`${ui.td} text-center ${rowPad}`}>
                            <label className="text-[11px] text-slate-500">
                              <input
                                type="checkbox"
                                onChange={(e) => setRow(a.key, e.target.checked)}
                                checked={(matrix[a.key] || []).length === roleNames.length && roleNames.length > 0}
                              />{" "}
                              All roles
                            </label>
                          </td>
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-600">
          Tip: Collapse modules to focus, hover a column header to preview a role’s column, use density & “show keys” to
          declutter.
        </span>
      </div>
    </div>
  );
}
