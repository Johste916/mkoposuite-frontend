// src/components/common/ToastProvider.jsx
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

const ToastContext = createContext(null);

let idCounter = 1;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((variant, message) => {
    const id = idCounter++;
    setToasts((list) => [...list, { id, variant, message }]);
    setTimeout(() => remove(id), 3500);
  }, [remove]);

  const api = useMemo(
    () => ({
      success: (m) => push("success", m),
      error: (m) => push("error", m),
      info: (m) => push("info", m),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed z-[100] top-3 right-3 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={
              "max-w-sm rounded-lg shadow-lg px-4 py-3 text-sm text-white " +
              (t.variant === "success"
                ? "bg-emerald-600"
                : t.variant === "error"
                ? "bg-rose-600"
                : "bg-slate-800")
            }
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Silently no-op in case provider is missing
    return { success: () => {}, error: () => {}, info: () => {} };
  }
  return ctx;
};
