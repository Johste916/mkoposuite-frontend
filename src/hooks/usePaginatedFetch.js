// frontend/src/hooks/usePaginatedFetch.js
import { useEffect, useMemo, useState } from "react";
import api from "../api";

/**
 * Paginated fetch hook
 * - Accepts either "/api/xxx" or "/xxx". If your api.baseURL already ends with "/api",
 *   we strip the leading "/api" from the url to avoid "/api/api".
 * - Understands payloads shaped as:
 *     { data: [], pagination: { page, limit, total }, summary?: any }
 *   and also gracefully handles plain arrays.
 * - Exposes `summary` and `refresh()`.
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

  // Build query params (merge with pagination + search)
  const query = useMemo(
    () => ({ ...params, page, limit, q: q || undefined }),
    [params, page, limit, q]
  );

  // Normalize endpoint to avoid duplicate /api prefix and double slashes
  const normalizedUrl = useMemo(() => {
    if (!url) return url;

    // absolute URLs bypass normalization
    if (/^https?:\/\//i.test(url)) return url;

    const base = api?.defaults?.baseURL || "";
    const baseHasApi = /\/api\/?$/.test(base);

    let endpoint = url;

    // strip leading /api if baseURL already ends with /api
    if (baseHasApi && endpoint.startsWith("/api/")) {
      endpoint = endpoint.slice(4); // "/collections" from "/api/collections"
    }

    // ensure leading slash and collapse any duplicate slashes
    if (!endpoint.startsWith("/")) endpoint = `/${endpoint}`;
    endpoint = endpoint.replace(/\/{2,}/g, "/");

    return endpoint;
  }, [url, api?.defaults?.baseURL]);

  // Core fetcher (shared by effect + refresh)
  const fetchNow = async (signal) => {
    setLoading(true);
    setError("");

    try {
      const res = await api.get(normalizedUrl, { params: query, signal });

      // Accept {data, pagination, summary} or a raw array
      const payload = res?.data;
      if (Array.isArray(payload)) {
        setRows(payload);
        setTotal(payload.length);
        setSummary(null);
      } else if (payload && Array.isArray(payload.data)) {
        setRows(payload.data);
        setTotal(
          payload.pagination?.total ??
          payload.data.length ??
          0
        );
        setSummary(payload.summary ?? null);
      } else {
        // Unexpected shape
        setRows([]);
        setTotal(0);
        setSummary(null);
      }
    } catch (e) {
      if (e?.name !== "CanceledError" && e?.message !== "canceled") {
        setError(e?.response?.data?.error || e.message || "Request failed");
      }
    } finally {
      // If using AbortController, avoid setting state after abort
      if (!signal || !signal.aborted) setLoading(false);
    }
  };

  // Auto-fetch on url/params change; cancel in-flight on re-run/unmount
  useEffect(() => {
    const ac = new AbortController();
    fetchNow(ac.signal);
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedUrl, JSON.stringify(query)]);

  const refresh = () => fetchNow(); // manual refetch

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
    summary,   // <-- new
    refresh,   // <-- manual refetch
  };
}
