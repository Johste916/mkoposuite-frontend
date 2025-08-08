import axios from 'axios';

// Use env if set, otherwise fallback to local dev API
const baseURL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:10000/api').replace(/\/+$/, '');

const api = axios.create({
  baseURL,
  timeout: 20000,
});

// Attach JWT automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle auth errors globally (optional redirect)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401 || status === 403) {
      console.warn('Auth error (401/403). Check token / login.');
      // Optionally:
      // localStorage.removeItem('token');
      // window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
