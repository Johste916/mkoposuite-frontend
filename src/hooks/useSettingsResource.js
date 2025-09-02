import { useEffect, useMemo, useRef, useState } from "react";

/**
 * useSettingsResource(getFn, saveFn, initialData?)
 * - getFn: () => Promise<data>
 * - saveFn: (payload) => Promise<any>
 * - initialData: object used until GET resolves
 */
export function useSettingsResource(getFn, saveFn, initialData = {}) {
  const [data, setData] = useState(initialData || {});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const [success, setSuccess] = useState("");

  // Freeze references so deps don’t retrigger unnecessarily
  const getRef  = useRef(getFn);
  const saveRef = useRef(saveFn);

  // Developer-friendly argument checks
  const argProblem = useMemo(() => {
    const probs = [];
    if (typeof getRef.current !== "function") probs.push("getFn");
    if (typeof saveRef.current !== "function") probs.push("saveFn");
    return probs.length ? probs.join(" & ") : null;
  }, []);

  useEffect(() => {
    setError(""); setSuccess("");

    if (argProblem) {
      const msg = `useSettingsResource: ${argProblem} is not a function. 
Pass the function itself, not the result of calling it. 
Example: useSettingsResource(SettingsAPI.getX, SettingsAPI.saveX, defaults)`;
      console.error(msg, { getFn, saveFn });
      setError(msg);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const result = await getRef.current();
        if (!cancelled) {
          // Accept either raw data or axios response.data
          const value = result?.data !== undefined ? result.data : result;
          setData(value ?? initialData ?? {});
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e?.response?.data?.error || e?.message || "Failed to load settings";
          setError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argProblem]);

  const save = async (overridePayload) => {
    setSaving(true); setError(""); setSuccess("");
    try {
      const payload = overridePayload ?? data ?? {};
      if (typeof saveRef.current !== "function") {
        throw new Error("useSettingsResource: saveFn is not a function.");
      }
      const res = await saveRef.current(payload);
      // Some APIs return updated object — reflect it if present
      const value = res?.data !== undefined ? res.data : res;
      if (value && typeof value === "object") setData(value);
      setSuccess("Saved.");
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || "Failed to save settings";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return { data, setData, loading, saving, error, success, save };
}
