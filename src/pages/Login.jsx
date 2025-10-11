import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { FiMail, FiUnlock, FiEye, FiEyeOff, FiLoader } from "react-icons/fi";
import BrandMark from "../components/BrandMark";
import { useAuth } from "../context/AuthContext";

/* Backend URL */
const ORIGIN =
  typeof window !== "undefined" ? window.location.origin : "http://localhost:10000";
const RAW_BASE =
  (import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_BASE ||
    `${ORIGIN}/api`).toString();
const BASE = RAW_BASE.replace(/\/+$/, "");
const LOGIN_URL = /\/api$/i.test(BASE) ? `${BASE}/login` : `${BASE}/api/login`;

const TAGLINE =
  (import.meta.env.VITE_LOGIN_TAGLINE || "Please login to continue").toString();

export default function Login() {
  const nav = useNavigate();
  const location = useLocation();
  const { login } = useAuth(); // <- use AuthContext
  const fromPath = location.state?.from?.pathname || "/";

  const emailRef = useRef(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qEmail = params.get("email");
    const saved = localStorage.getItem("lastLoginEmail");
    if (qEmail) setEmail(qEmail);
    else if (saved) setEmail(saved);
    setTimeout(() => emailRef.current?.focus(), 0);
  }, [location.search]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = { email: email.trim(), password };
      // IMPORTANT: use a raw axios call so your global api interceptor (401 redirect) doesn't interfere
      const { data } = await axios.post(LOGIN_URL, payload);
      const { token, user, tenantId } = data || {};
      if (!token) throw new Error("No token received from server");

      if (remember) localStorage.setItem("lastLoginEmail", payload.email);
      else localStorage.removeItem("lastLoginEmail");

      // persist + set in context
      login(token, user, { tenantId });

      // if backend doesn't return tenantId and user has it:
      const tid =
        tenantId ||
        user?.tenantId ||
        user?.tenant?.id ||
        import.meta.env.VITE_DEFAULT_TENANT_ID ||
        null;
      if (tid) localStorage.setItem("activeTenantId", String(tid));

      nav(fromPath, { replace: true });
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Invalid email or password";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden app-theme-bold" style={{ background: "var(--bg, #F7FAFF)" }}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 opacity-[.08] bg-[radial-gradient(900px_520px_at_10%_0%,rgba(59,130,246,.40),transparent_60%)]" />
        <div className="absolute inset-0 opacity-[.08] bg-[radial-gradient(780px_420px_at_95%_100%,rgba(45,212,191,.40),transparent_60%)]" />
      </div>

      <div className="relative z-10 min-h-screen grid place-items-center px-4 py-10">
        <section className="w-full max-w-[520px]">
          <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-[0_18px_40px_-12px_rgba(15,23,42,0.18)]">
            <div className="px-8 pt-7 pb-8">
              <div className="flex items-center justify-center">
                <BrandMark size={32} />
              </div>
              <p className="mt-2 text-center text-[13px] text-[var(--muted)]">{TAGLINE}</p>

              {error ? (
                <div role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[var(--fg)]">Email</label>
                  <div className="relative">
                    <FiMail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                    <input
                      ref={emailRef}
                      type="email"
                      inputMode="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--input-bg)]
                                 text-[var(--input-fg)] placeholder:text-[var(--input-placeholder)]
                                 !pl-10 pr-3 text-sm shadow-sm outline-none transition
                                 focus:ring-2 focus:ring-[var(--ring)]"
                      required
                      placeholder="admin@example.com"
                      autoComplete="email"
                      aria-invalid={!!error}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-[var(--fg)]">Password</label>
                  <div className="relative">
                    <FiUnlock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                    <input
                      type={showPwd ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--input-bg)]
                                 text-[var(--input-fg)] placeholder:text-[var(--input-placeholder)]
                                 !pl-10 !pr-11 text-sm shadow-sm outline-none transition
                                 focus:ring-2 focus:ring-[var(--ring)]"
                      required
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      aria-invalid={!!error}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:opacity-80"
                      aria-label={showPwd ? "Hide password" : "Show password"}
                      aria-pressed={showPwd}
                    >
                      {showPwd ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="inline-flex items-center gap-2 select-none">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[var(--border)]"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    <span className="text-[var(--muted)]">Remember me</span>
                  </label>
                  <Link to="/forgot-password" className="font-medium" style={{ color: "var(--primary)" }}>
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--primary)]
                             px-4 h-11 text-sm font-semibold text-[var(--primary-contrast)] shadow
                             hover:brightness-95 focus-visible:outline-none focus-visible:ring-2
                             focus-visible:ring-[var(--ring)] disabled:opacity-60"
                >
                  {loading ? (<><FiLoader className="mr-2 animate-spin" />Logging in…</>) : "Login"}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-[var(--muted)]">
                Don’t have an account?{" "}
                <Link to="/signup" className="font-semibold" style={{ color: "var(--primary)" }}>
                  Create one
                </Link>
              </div>

              <div className="mt-4 text-center text-[11px] text-[var(--muted)]">
                © {new Date().getFullYear()} MkopoSuite. All rights reserved.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
