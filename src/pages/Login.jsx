// src/pages/Login.jsx
import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { FiMail, FiUnlock, FiEye, FiEyeOff, FiLoader } from "react-icons/fi";

/**
 * Backend URL:
 * - Uses VITE_API_BASE_URL or VITE_API_BASE if provided
 * - Falls back to same-origin + /api
 * - Ensures final POST goes to .../api/login
 */
const ORIGIN =
  typeof window !== "undefined" ? window.location.origin : "http://localhost:10000";
const RAW_BASE =
  (import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_BASE ||
    `${ORIGIN}/api`).toString();
const BASE = RAW_BASE.replace(/\/+$/, "");
const LOGIN_URL = /\/api$/i.test(BASE) ? `${BASE}/login` : `${BASE}/api/login`;

// Public asset placed at: public/brand/mkoposuite-logo.png
const BRAND_LOGO = "/brand/mkoposuite-logo.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await axios.post(LOGIN_URL, { email, password });
      const { token, user } = data || {};
      if (!token) throw new Error("No token received from server");

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user || {}));
      navigate("/");
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Invalid email or password";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[radial-gradient(1200px_600px_at_50%_-10%,#ffffff_0%,#f3faf6_50%,#f8fbff_100%)]">
      {/* soft vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_40%_at_50%_0%,rgba(255,255,255,.9),rgba(255,255,255,0)_70%)]" />
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="rounded-2xl bg-white/95 backdrop-blur-sm shadow-xl ring-1 ring-black/5">
            <div className="px-8 pt-8 pb-6">
              {/* Brand header: “Welcome to” + BIG logo */}
              <div className="flex flex-col items-center text-center">
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <span className="text-[28px] sm:text-[32px] font-extrabold tracking-tight text-slate-800">
                    Welcome to
                  </span>
                  {/* scale ensures visual size even if PNG has whitespace */}
                  <div className="origin-left scale-[1.35] sm:scale-[1.6]">
                    <img
                      src={BRAND_LOGO}
                      alt="Mkopo Suite"
                      className="h-16 sm:h-20 md:h-24 w-auto object-contain drop-shadow-sm select-none"
                      draggable={false}
                      loading="eager"
                      fetchpriority="high"
                    />
                  </div>
                </div>
                <p className="mt-2 text-xs sm:text-sm text-slate-500">
                  Please login to continue
                </p>
              </div>

              {/* Error */}
              {error ? (
                <div
                  role="alert"
                  className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
                >
                  {error}
                </div>
              ) : null}

              {/* Form */}
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                {/* Email */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Email
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <FiMail />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-2 text-sm shadow-sm outline-none transition focus:border-emerald-500/70 focus:ring-2 focus:ring-emerald-100"
                      required
                      placeholder="admin@example.com"
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password with eye toggle */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <FiUnlock />
                    </span>
                    <input
                      type={showPwd ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-10 py-2 text-sm shadow-sm outline-none transition focus:border-emerald-500/70 focus:ring-2 focus:ring-emerald-100"
                      required
                      placeholder="Enter your password"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((s) => !s)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                      aria-label={showPwd ? "Hide password" : "Show password"}
                    >
                      {showPwd ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end text-sm">
                  <Link
                    to="/forgot-password"
                    className="text-emerald-700 hover:text-emerald-800"
                  >
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <FiLoader className="mr-2 animate-spin" />
                      Logging in…
                    </>
                  ) : (
                    "Login"
                  )}
                </button>
              </form>

              {/* Footer */}
              <div className="mt-5 text-center text-sm text-slate-500">
                Don’t have an account?{" "}
                <Link
                  to="/signup"
                  className="font-medium text-emerald-700 hover:text-emerald-800"
                >
                  Create one
                </Link>
              </div>

              <div className="mt-4 text-center text-[11px] text-slate-400">
                © {new Date().getFullYear()} MkopoSuite. All rights reserved.
              </div>
            </div>
          </div>

          {/* Bottom accent shadow */}
          <div className="mx-auto mt-2 h-2 w-56 rounded-full bg-gradient-to-r from-amber-300/60 via-amber-400/60 to-amber-300/60 blur-md" />
        </div>
      </div>
    </div>
  );
};

export default Login;
