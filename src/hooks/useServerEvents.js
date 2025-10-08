import { useEffect } from "react";

export default function useServerEvents({ onAny, map = {} } = {}) {
  useEffect(() => {
    const base = import.meta.env.VITE_API_BASE || '/api';
    const url = `${base.replace(/\/+$/, "")}/events`;

    const es = new EventSource(url, { withCredentials: true });
    es.onmessage = (e) => {
      try {
        const { type, payload } = JSON.parse(e.data);
        if (onAny) onAny(type, payload);
        const fn = map[type];
        if (typeof fn === 'function') fn(payload);
      } catch {}
    };
    return () => es.close();
  }, [onAny, map]);
}
