import { useEffect, useMemo, useRef, useState } from "react";

/**
 * useSettingsResource(getFn, saveFn, initialData?)
 * - getFn: () => Promise<data | { data: any }>
 * - saveFn: (payload) => Promise<any>
 * - initialData: object used until GET resolves
 *
 * Behavior: no breaking changes; safer guards + cancellation.
 */
export function useSettingsResource(getFn, saveFn, initialData = {}) {
  const [data, setData] = useState(initialData || {});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Freeze references so deps don’t retrigger unnecessarily
  const getRef = useRef(getFn);
  const saveRef = useRef(saveFn);

  // Developer-friendly argument checks (once)
  const argProblem = useMemo(() => {
    const probs = [];
    if (typeof getRef.current !== "function") probs.push("getFn");
    if (typeof saveRef.current !== "function") probs.push("saveFn");
    return probs.length ? probs.join(" & ") : null;
  }, []);

  useEffect(() => {
    setError("");
    setSuccess("");

    if (argProblem) {
      const msg =
        `useSettingsResource: ${argProblem} is not a function.\n` +
        `Pass the function itself, not the result of calling it.\n` +
        `Example: useSettingsResource(SettingsAPI.getX, SettingsAPI.saveX, defaults)`;
      console.error(msg, { getFn, saveFn });
      setError(msg);
      setLoading(false);
      return;
    }

    const ac = new AbortController();

    (async () => {
      setLoading(true);
      try {
        const result = await getRef.current({ signal: ac.signal });
        if (ac.signal.aborted) return;
        const value = result?.data !== undefined ? result.data : result;
        setData(value ?? initialData ?? {});
      } catch (e) {
        if (ac.signal.aborted) return;
        const msg =
          e?.response?.data?.error || e?.message || "Failed to load settings";
        setError(msg);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();

    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argProblem]);

  const save = async (overridePayload) => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = overridePayload ?? data ?? {};
      if (typeof saveRef.current !== "function") {
        throw new Error("useSettingsResource: saveFn is not a function.");
      }
      const res = await saveRef.current(payload);
      const value = res?.data !== undefined ? res.data : res;
      if (value && typeof value === "object") setData(value);
      setSuccess("Saved.");
    } catch (e) {
      const msg =
        e?.response?.data?.error || e?.message || "Failed to save settings";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return { data, setData, loading, saving, error, success, save };
}
