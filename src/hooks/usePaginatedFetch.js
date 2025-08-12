import { useEffect, useMemo, useState } from "react";
import api from "../api";

export default function usePaginatedFetch({ url, params = {}, initialPage = 1, initialLimit = 20 }) {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [q, setQ] = useState(params.q || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const query = useMemo(() => ({ ...params, page, limit, q: q || undefined }), [params, page, limit, q]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    api
      .get(url, { params: query })
      .then((res) => {
        if (cancelled) return;
        const { data = [], pagination = {} } = res.data || {};
        setRows(Array.isArray(data) ? data : res.data || []);
        setTotal(pagination.total ?? (Array.isArray(res.data) ? res.data.length : 0));
      })
      .catch((e) => !cancelled && setError(e?.response?.data?.error || e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [url, JSON.stringify(query)]); // eslint-disable-line

  return { rows, total, page, setPage, limit, setLimit, q, setQ, loading, error, refresh: () => api.get(url, { params: query }) };
}
