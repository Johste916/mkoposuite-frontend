// frontend/src/hooks/usePaginatedFetch.js
import { useEffect, useMemo, useRef, useState } from "react";
import api from "../api";

/**
 * Paginated fetch hook (behavior-safe)
 * Supports:
 *   payload = []  OR  { data: [], pagination: { page, limit, total }, summary? }
 * Exposes summary + refresh().
 */
export default function usePaginatedFetch({
  url,
  params = {},
  initialPage = 1,
  initialLimit = 20,
}) {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [q, setQ] = useState(params.q || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState(null);

  const query = useMemo(
    () => ({ ...params, page, limit, q: q || undefined }),
    // params may be stable object from caller; stringify safely as last resort
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, limit, q, JSON.stringify(params)]
  );

  const normalizedUrl = useMemo(() => {
    // api.path may not exist in some setups; fallback gracefully
    const pathFn = typeof api.path === "function"
      ? api.path
      : (p) => {
          const base = (api?.defaults?.baseURL || "").replace(/\/+$/, "");
          const rel = (p || "/").replace(/^\/+/, "");
          return `${base}/${rel}`;
        };
    return pathFn(url || "/");
  }, [url]);

  const inFlight = useRef(null);

  const fetchNow = async (signal) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(normalizedUrl, { params: query, signal });
      const payload = res?.data;

      if (Array.isArray(payload)) {
        setRows(payload);
        setTotal(payload.length);
        setSummary(null);
      } else if (payload && Array.isArray(payload.data)) {
        setRows(payload.data);
        setTotal(payload.pagination?.total ?? payload.data.length ?? 0);
        setSummary(payload.summary ?? null);
      } else {
        setRows([]);
        setTotal(0);
        setSummary(null);
      }
    } catch (e) {
      if (e?.name !== "CanceledError" && e?.message !== "canceled") {
        setError(e?.response?.data?.error || e.message || "Request failed");
      }
    } finally {
      if (!signal || !signal.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const ac = new AbortController();
    inFlight.current?.abort?.();
    inFlight.current = ac;
    fetchNow(ac.signal);
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedUrl, JSON.stringify(query)]);

  const refresh = () => {
    const ac = new AbortController();
    inFlight.current?.abort?.();
    inFlight.current = ac;
    fetchNow(ac.signal);
    return () => ac.abort();
  };

  return {
    rows,
    total,
    page,
    setPage,
    limit,
    setLimit,
    q,
    setQ,
    loading,
    error,
    summary,
    refresh,
  };
}
