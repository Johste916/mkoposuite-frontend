import React, { useState, useMemo } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { FiMail, FiUnlock, FiEye, FiEyeOff, FiLoader } from "react-icons/fi";

/** --- API config --------------------------------------------------------- */
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
const LOGIN_URL = `${API_BASE}/login`;

/** --- Brand colors (tweak if needed) ------------------------------------ */
const BRAND_GREEN = "#0b7a3a";
const BRAND_GREEN_HOVER = "#096a33";
const BRAND_GOLD = "#f2a42b";

/** --- Logo resolver (tries env, then common public paths) ---------------- */
function useLogoSrc() {
  const candidates = useMemo(
    () =>
      [
        import.meta.env.VITE_LOGIN_LOGO,  // e.g. /brand/logo.png
        "/logo.svg",
        "/logo.png",
        "/Johsta Icon 1.png",             // your uploaded file name
      ].filter(Boolean),
    []
  );

  const [index, setIndex] = useState(0);
  const src = candidates[index] || "";

  const onError = () => {
    if (index < candidates.length - 1) setIndex(index + 1);
  };
  return { src, onError };
}

const Login = () => {
  const navigate = useNavigate();
  const { src: logoSrc, onError: onLogoError } = useLogoSrc();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-amber-50">
      {/* subtle corners glow */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-64 w-64 rounded-full bg-emerald-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-amber-200/30 blur-3xl" />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="rounded-2xl bg-white/95 backdrop-blur shadow-xl ring-1 ring-black/5">
            <div className="px-8 pt-8 pb-6">
              {/* Brand header */}
              <div className="flex flex-col items-center text-center">
                {logoSrc ? (
                  <img
                    src={logoSrc}
                    onError={onLogoError}
                    alt="MkopoSuite"
                    className="h-12 w-12 object-contain"
                    draggable={false}
                  />
                ) : null}
                <h1 className="mt-3 text-2xl font-semibold text-slate-800">
                  Welcome to MkopoSuite
                </h1>
                <p className="mt-1 text-sm text-slate-500">
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
                      className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-2 text-sm shadow-sm outline-none transition focus:border-[var(--brand-green)] focus:ring-2 focus:ring-[var(--brand-green)]/15"
                      required
                      placeholder="admin@example.com"
                      autoComplete="email"
                      style={{ ["--brand-green"]: BRAND_GREEN }}
                    />
                  </div>
                </div>

                {/* Password */}
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
                      className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-10 py-2 text-sm shadow-sm outline-none transition focus:border-[var(--brand-green)] focus:ring-2 focus:ring-[var(--brand-green)]/15"
                      required
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      style={{ ["--brand-green"]: BRAND_GREEN }}
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
                    className="text-[var(--brand-green)] hover:text-[var(--brand-green-hover)]"
                    style={{
                      ["--brand-green"]: BRAND_GREEN,
                      ["--brand-green-hover"]: BRAND_GREEN_HOVER,
                    }}
                  >
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--brand-green)] px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-[var(--brand-green-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-green)]/30 disabled:opacity-60"
                  style={{
                    ["--brand-green"]: BRAND_GREEN,
                    ["--brand-green-hover"]: BRAND_GREEN_HOVER,
                  }}
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
                  className="font-medium text-[var(--brand-green)] hover:text-[var(--brand-green-hover)]"
                  style={{
                    ["--brand-green"]: BRAND_GREEN,
                    ["--brand-green-hover"]: BRAND_GREEN_HOVER,
                  }}
                >
                  Create one
                </Link>
              </div>

              <div className="mt-4 text-center text-[11px] text-slate-400">
                © {new Date().getFullYear()} MkopoSuite. All rights reserved.
              </div>
            </div>

            {/* gold accent bar */}
            <div
              className="h-1.5 w-full rounded-b-2xl"
              style={{ backgroundColor: BRAND_GOLD }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
