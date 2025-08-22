import { useEffect, useMemo, useState } from "react";
import api from "../api";

/**
 * This hook now auto-avoids double `/api`:
 * - If api.defaults.baseURL already ends with /api and you pass url starting with /api,
 *   it strips the leading /api from the url to prevent /api/api.
 */
export default function usePaginatedFetch({ url, params = {}, initialPage = 1, initialLimit = 20 }) {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [q, setQ] = useState(params.q || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const query = useMemo(() => ({ ...params, page, limit, q: q || undefined }), [params, page, limit, q]);

  const normalizedUrl = useMemo(() => {
    const base = api?.defaults?.baseURL || "";
    const hasApiInBase = /\/api\/?$/.test(base);
    if (hasApiInBase && url.startsWith("/api/")) {
      // strip leading /api to avoid /api/api
      return url.slice(4); // "/collections" from "/api/collections"
    }
    return url;
  }, [url]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    api
      .get(normalizedUrl, { params: query })
      .then((res) => {
        if (cancelled) return;
        const { data = [], pagination = {} } = res.data || {};
        setRows(Array.isArray(data) ? data : res.data || []);
        setTotal(pagination.total ?? (Array.isArray(res.data) ? res.data.length : 0));
      })
      .catch((e) => !cancelled && setError(e?.response?.data?.error || e.message))
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
  }, [normalizedUrl, JSON.stringify(query)]); // eslint-disable-line

  return { rows, total, page, setPage, limit, setLimit, q, setQ, loading, error, refresh: () => api.get(normalizedUrl, { params: query }) };
}
