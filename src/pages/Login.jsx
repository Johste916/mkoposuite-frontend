import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { FiMail, FiUnlock, FiEye, FiEyeOff, FiLoader } from "react-icons/fi";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
const LOGIN_URL = `${API_BASE}/login`;

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
    <div className="min-h-screen relative overflow-hidden bg-[linear-gradient(135deg,#ecf9f1_0%,#fff7e8_100%)]">
      {/* soft vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_30%,rgba(255,255,255,0.85),rgba(255,255,255,0)_70%)]" />
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="rounded-2xl bg-white/95 backdrop-blur shadow-xl ring-1 ring-black/5">
            <div className="px-8 pt-8 pb-6">
              {/* Brand */}
              <div className="flex flex-col items-center text-center">
                <img
                  src="/logo.png"
                  alt="MkopoSuite"
                  className="h-12 w-12 object-contain"
                  draggable={false}
                />
                <div className="mt-3 text-sm font-medium text-slate-500">
                  MkopoSuite
                </div>
                <h1 className="mt-2 text-xl sm:text-2xl font-semibold text-slate-800">
                  Welcome to MkopoSuite
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">
                  Please login to continue
                </p>
              </div>

              {/* Error */}
              {error ? (
                <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
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
                      className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-2 text-sm shadow-sm outline-none transition focus:border-[#0b7a3a] focus:ring-2 focus:ring-[#0b7a3a]/15"
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
                      className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-10 py-2 text-sm shadow-sm outline-none transition focus:border-[#0b7a3a] focus:ring-2 focus:ring-[#0b7a3a]/15"
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
                <div className="flex items-center justify-between text-sm">
                  <div />
                  <div className="space-x-3">
                    <Link
                      to="/forgot-password"
                      className="text-[#0b7a3a] hover:text-[#096a33]"
                    >
                      Forgot password?
                    </Link>
                    <span className="text-slate-400">·</span>
                    <Link
                      to="/forgot-password?via=phone"
                      className="text-[#0b7a3a] hover:text-[#096a33]"
                    >
                      Via phone
                    </Link>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-[#0b7a3a] px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-[#096a33] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b7a3a]/30 disabled:opacity-60"
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
                  className="font-medium text-[#0b7a3a] hover:text-[#096a33]"
                >
                  Create one
                </Link>
              </div>

              <div className="mt-4 text-center text-[11px] text-slate-400">
                © {new Date().getFullYear()} MkopoSuite. All rights reserved.
              </div>
            </div>

            {/* gold accent bar */}
            <div className="h-1.5 w-full rounded-b-2xl bg-[#f2a42b]" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
