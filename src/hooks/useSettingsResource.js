// src/hooks/useSettingsResource.js
import { useEffect, useState } from "react";

export function useSettingsResource(getter, saver, defaults) {
  const [data, setData] = useState(defaults || {});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true); setError(""); setSuccess("");
    getter()
      .then((d) => { if (mounted) setData({ ...(defaults||{}), ...(d||{}) }); })
      .catch((e) => { if (mounted) setError(e?.response?.data?.error || e.message); })
      .finally(() => mounted && setLoading(false));
    return () => (mounted = false);
  }, [getter]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    setSaving(true); setError(""); setSuccess("");
    try {
      await saver(data);
      setSuccess("Saved.");
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  return { data, setData, loading, saving, error, success, save };
}
