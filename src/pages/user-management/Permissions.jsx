import React, { useEffect, useMemo, useState } from "react";
import api from "../../api";

const ui = {
  page: "w-full px-4 md:px-6 lg:px-10 py-6 text-slate-900 dark:text-slate-100",
  h1: "text-3xl font-extrabold tracking-tight",
  card: "rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow",
  th: "bg-slate-50 dark:bg-slate-800 text-left text-[12px] uppercase tracking-wide text-slate-700 dark:text-slate-300 font-semibold px-3 py-2 border-b border-slate-200 dark:border-slate-700",
  td: "px-3 py-2 border-b border-slate-200 dark:border-slate-700 text-sm",
  btn: "inline-flex items-center rounded-lg border-2 border-slate-300 dark:border-slate-700 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold",
};

export default function PermissionsMatrix() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [catalog, setCatalog] = useState([]); // [{group, actions:[{key,label}]}]
  const [roles, setRoles] = useState([]); // [{id,name}]
  const [matrix, setMatrix] = useState({}); // { [actionKey]: roleId[] }
  const [q, setQ] = useState("");

  /* ------------------------- Load permission data ------------------------- */
  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/permissions/matrix");
      const rolesList = Array.isArray(data?.roles) ? data.roles : [];
      const catalogList = Array.isArray(data?.catalog) ? data.catalog : [];
      const matrixRaw = typeof data?.matrix === "object" && data?.matrix ? data.matrix : {};

      // Normalize: convert role names in matrix to role IDs for UI toggling
      const mapByName = Object.fromEntries(rolesList.map((r) => [String(r.name).toLowerCase(), r.id]));
      const normalized = {};
      for (const [key, roleNames] of Object.entries(matrixRaw)) {
        const arr = Array.isArray(roleNames) ? roleNames : [];
        normalized[key] = arr
          .map((n) => mapByName[String(n).toLowerCase()])
          .filter(Boolean);
      }

      setRoles(rolesList);
      setCatalog(catalogList);
      setMatrix(normalized);
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.error || "Failed to load permission matrix");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /* -------------------------- Filtering and UI -------------------------- */
  const filteredCatalog = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return catalog;
    return catalog
      .map((g) => ({
        ...g,
        actions: g.actions.filter(
          (a) =>
            a.key.toLowerCase().includes(needle) ||
            a.label.toLowerCase().includes(needle)
        ),
      }))
      .filter((g) => g.actions.length);
  }, [catalog, q]);

  /* -------------------------- Toggle single cell -------------------------- */
  const toggle = (actionKey, roleId) => {
    setMatrix((prev) => {
      const current = new Set(prev[actionKey] || []);
      if (current.has(roleId)) current.delete(roleId);
      else current.add(roleId);
      return { ...prev, [actionKey]: Array.from(current) };
    });
  };

  /* -------------------------- Toggle full column -------------------------- */
  const setColumn = (roleId, checked) => {
    setMatrix((prev) => {
      const next = { ...prev };
      for (const g of filteredCatalog) {
        for (const a of g.actions) {
          const set = new Set(next[a.key] || []);
          if (checked) set.add(roleId);
          else set.delete(roleId);
          next[a.key] = Array.from(set);
        }
      }
      return next;
    });
  };

  /* -------------------------- Save one role’s permissions -------------------------- */
  const saveRole = async (role) => {
    const actions = [];
    for (const g of catalog) {
      for (const a of g.actions) {
        const allowed = new Set(matrix[a.key] || []);
        if (allowed.has(role.id)) actions.push(a.key);
      }
    }

    if (!actions.length && !window.confirm(`You are removing all permissions for ${role.name}. Continue?`)) {
      return;
    }

    setSaving(true);
    try {
      await api.put(`/permissions/role/${role.id}`, { actions, mode: "replace" });
      alert(`Saved permissions for role: ${role.name}`);
      // reload to reflect name-based mapping if roles changed elsewhere
      await load();
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  /* -------------------------- Render -------------------------- */
  return (
    <div className={ui.page}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
        <h1 className={ui.h1}>Permission Matrix</h1>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter actions…"
            className="h-10 w-64 rounded-lg border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-600"
          />
          <button onClick={load} className={ui.btn}>Refresh</button>
        </div>
      </div>

      <div className={`${ui.card} overflow-auto`}>
        <table className="min-w-full border-separate border-spacing-0">
          <thead className="sticky top-0 z-10">
            <tr>
              <th
                className={ui.th}
                style={{ position: "sticky", left: 0, zIndex: 11 }}
              >
                Feature / Action
              </th>
              {roles.map((r) => (
                <th key={r.id} className={`${ui.th} text-center`}>
                  <div className="flex flex-col items-center gap-1">
                    <div className="font-bold">{r.name}</div>
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] opacity-70">
                        <input
                          type="checkbox"
                          onChange={(e) => setColumn(r.id, e.target.checked)}
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
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td className={ui.td} colSpan={1 + roles.length}>
                  Loading…
                </td>
              </tr>
            ) : filteredCatalog.length === 0 ? (
              <tr>
                <td className={ui.td} colSpan={1 + roles.length}>
                  No actions match your filter.
                </td>
              </tr>
            ) : (
              filteredCatalog.map((group) => (
                <React.Fragment key={group.group}>
                  <tr>
                    <td
                      className={`${ui.td} font-semibold text-slate-700 dark:text-slate-200`}
                      style={{
                        position: "sticky",
                        left: 0,
                        zIndex: 10,
                      }}
                      colSpan={1 + roles.length}
                    >
                      {group.group}
                    </td>
                  </tr>
                  {group.actions.map((a) => (
                    <tr key={a.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <td
                        className={ui.td}
                        style={{
                          position: "sticky",
                          left: 0,
                          zIndex: 9,
                        }}
                        title={a.key}
                      >
                        <div className="font-medium">{a.label}</div>
                        <div className="text-xs opacity-70">{a.key}</div>
                      </td>
                      {roles.map((r) => {
                        const allowed = new Set(matrix[a.key] || []);
                        const on = allowed.has(r.id);
                        return (
                          <td
                            key={`${a.key}:${r.id}`}
                            className={`${ui.td} text-center`}
                          >
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() => toggle(a.key, r.id)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm opacity-80">
        Tip: Use “All” under a role to toggle a whole column, then click “Save” for that role.
      </div>
    </div>
  );
}
