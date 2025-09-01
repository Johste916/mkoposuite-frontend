// src/hooks/useSettingsResource.js
'use strict';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../api';

/**
 * Flexible settings data hook.
 *
 * Usage:
 *   const s = useSettingsResource('/settings/general');                // GET+PUT same URL
 *   const s = useSettingsResource('/settings/general', '/settings/general');
 *   const s = useSettingsResource({ getUrl: '/settings/x', putUrl: '/settings/x', initial: {} });
 */
export function useSettingsResource(arg1, arg2, arg3) {
  // Normalize arguments
  let getUrl, putUrl, initial;
  if (typeof arg1 === 'string') {
    getUrl = arg1;
    putUrl = arg2 || arg1;
    initial = arg3 || {};
  } else if (arg1 && typeof arg1 === 'object') {
    getUrl = arg1.getUrl;
    putUrl = arg1.putUrl || arg1.getUrl;
    initial = arg1.initial || {};
  }

  const mounted = useRef(true);
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(!!getUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const parsePayload = useCallback((res) => {
    // Accept {data}, array, or plain object
    const raw = res?.data ?? res;
    if (raw && typeof raw === 'object' && 'data' in raw && raw.data != null) return raw.data;
    return raw;
  }, []);

  const load = useCallback(async () => {
    if (!getUrl) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(getUrl);
      const payload = parsePayload(res);
      if (mounted.current) setData(payload ?? {});
    } catch (e) {
      if (mounted.current) setError(e?.response?.data?.error || e?.message || 'Failed to load settings');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [getUrl, parsePayload]);

  const save = useCallback(
    async (patch) => {
      setSaving(true);
      setError('');
      try {
        const body = patch ? { ...data, ...patch } : data;
        const res = await api.put(putUrl || getUrl, body);
        const payload = parsePayload(res);
        if (mounted.current) setData(payload ?? body ?? {});
        return payload ?? body ?? {};
      } catch (e) {
        const msg = e?.response?.data?.error || e?.message || 'Failed to save settings';
        if (mounted.current) setError(msg);
        throw new Error(msg);
      } finally {
        if (mounted.current) setSaving(false);
      }
    },
    [data, getUrl, putUrl, parsePayload]
  );

  const reset = useCallback(() => setData(initial), [initial]);

  useEffect(() => {
    mounted.current = true;
    if (getUrl) load();
    return () => {
      mounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getUrl]);

  return useMemo(
    () => ({ data, setData, loading, saving, error, load, reload: load, save, reset }),
    [data, loading, saving, error, load, save, reset]
  );
}

// Optional default export for convenience (some pages may import default)
export default useSettingsResource;
