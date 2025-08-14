import { useEffect, useState } from "react";

export function useSettingsResource(getFn, saveFn, initial = {}) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setError(""); setSuccess("");
      try {
        const d = await getFn();
        if (alive) setData(d || initial);
      } catch (e) {
        if (alive) setError(e?.response?.data?.message || e.message || "Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [getFn]);

  const save = async (payload = data) => {
    setSaving(true); setError(""); setSuccess("");
    try {
      await saveFn(payload);
      setSuccess("Saved!");
      return true;
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to save");
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { data, setData, loading, saving, error, success, save };
}
