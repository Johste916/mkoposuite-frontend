// src/hooks/useSettingsResource.js
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Small state machine for settings editors.
 * - getter(): Promise<obj>
 * - saver(obj): Promise<any>
 * - defaults: initial shape to use if GET returns empty
 */
export default function useSettingsResource(getter, saver, defaults = {}) {
  const [data, setData] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    (async () => {
      setLoading(true); setError("");
      try {
        const res = await getter();
        if (isMounted.current) setData(res && Object.keys(res).length ? res : defaults);
      } catch (e) {
        if (isMounted.current) setError(e?.response?.data?.error || e.message);
      } finally {
        if (isMounted.current) setLoading(false);
      }
    })();
    return () => { isMounted.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = useCallback((patch) => {
    setData((prev) => ({ ...prev, ...(typeof patch === "function" ? patch(prev) : patch) }));
  }, []);

  const toast = useCallback((message, type = "info") => {
    try {
      window.dispatchEvent(new CustomEvent("app:toast", { detail: { type, message } }));
    } catch {}
    if (type === "error") console.error(message);
    else console.log(message);
  }, []);

  const save = useCallback(async (patch) => {
    setSaving(true); setError("");
    try {
      const next = patch ? { ...data, ...patch } : data;
      await saver(next);
      toast("Saved", "success");
      return true;
    } catch (e) {
      const msg = e?.response?.data?.error || e.message;
      setError(msg);
      toast(msg || "Save failed", "error");
      return false;
    } finally {
      setSaving(false);
    }
  }, [data, saver, toast]);

  const reload = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await getter();
      setData(res && Object.keys(res).length ? res : defaults);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [getter, defaults]);

  return { data, set, loading, saving, error, save, reload, toast };
}
