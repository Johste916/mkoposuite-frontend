// frontend/src/api/index.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:10000/api", // <-- your backend port
  withCredentials: true,                  // keep if you use cookies/sessions
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
