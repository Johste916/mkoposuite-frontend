// src/context/SettingsContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../api";

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(null);     // null until loaded
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/settings/app"); // <-- backend returns merged app settings
      setSettings(res.data);
    } catch (e) {
      // fallback so app still works the first time
      const fallback = {
        ui: {
          labels: { borrowers: "Borrowers" },
          sidebar: {
            hiddenModules: [], // e.g. ["investors"]
            order: [],         // optional: array to reorder module keys
          }
        },
        modules: {
          investors: { enabled: true },
          savings:   { enabled: true },
          payroll:   { enabled: true },
        },
        loans: {
          penalties: { type: "flat", value: 0 },
          fees: [],
          reminders: { enabled: true, daysBefore: 2 },
        },
        security: { twoFactorRequired: false },
        // ... anything else you need
      };
      setSettings(fallback);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateSettings = async (patch) => {
    // optimistic update
    setSettings((prev) => ({ ...prev, ...patch }));
    try {
      await api.patch("/settings/app", patch); // persist to backend
    } catch (e) {
      // reload on failure to keep in sync
      await load();
      throw e;
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, refresh: load, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
