// src/api/client.js
import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") ||
  `${window.location.origin}/api`;

const client = axios.create({
  baseURL,
  withCredentials: false,
  headers: { "Content-Type": "application/json" },
});

// Try a few common token keys
const TOKEN_KEYS = ["token", "authToken", "accessToken", "jwt"];

client.interceptors.request.use((config) => {
  for (const k of TOKEN_KEYS) {
    const v = localStorage.getItem(k);
    if (v) {
      config.headers.Authorization = `Bearer ${v.replace(/^Bearer /i, "")}`;
      break;
    }
  }
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      err?.response?.data?.error ||
      err?.response?.data?.message ||
      err?.message ||
      "Request failed";
    console.error("API error:", msg, err?.response || err);
    return Promise.reject(err);
  }
);

export default client;
