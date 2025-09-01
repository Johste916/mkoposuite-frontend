// src/hooks/useSettingsResource.js
import { useEffect, useRef, useState } from "react";

export function useSettingsResource(getFn, putFn, initialDefault = {}) {
  const [data, setData] = useState(() => ({ ...initialDefault }));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const mounted = useRef(true);

  const unwrap = (res) => {
    if (res == null) return {};
    if (typeof res === "object" && "value" in res) return res.value ?? {};
    if (typeof res === "object" && "data" in res) return res.data ?? {};
    return res;
  };

  useEffect(() => {
    mounted.current = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getFn();
        if (!mounted.current) return;
        const val = unwrap(res);
        setData({ ...initialDefault, ...(val && typeof val === "object" ? val : {}) });
      } catch (e) {
        if (!mounted.current) return;
        setError(e?.response?.data?.error || e.message || "Failed to load");
        setData({ ...initialDefault });
      } finally {
        if (mounted.current) setLoading(false);
      }
    })();
    return () => { mounted.current = false; };
  }, [getFn]);

  const save = async (body) => {
    setSaving(true); setError(""); setSuccess("");
    try {
      const toSave = body ?? data;
      const res = await putFn(toSave);
      const val = unwrap(res);
      setData({ ...initialDefault, ...(val && typeof val === "object" ? val : toSave) });
      setSuccess("Saved.");
      return { ok: true };
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Failed to save");
      return { ok: false, error: e };
    } finally {
      setSaving(false);
    }
  };

  return { data, setData, loading, saving, error, success, save };
}
