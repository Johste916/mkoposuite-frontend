// src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { Eye, EyeOff, Phone, Mail } from 'lucide-react';

const Login = () => {
  // login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // forgot password state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotMethod, setForgotMethod] = useState('email'); // 'email' | 'phone'
  const [forgotValue, setForgotValue] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotErr, setForgotErr] = useState('');

  const navigate = useNavigate();

  async function tryLogin() {
    // candidate endpoints in preferred order
    const paths = ['/login', '/auth/login', '/auth/signin'];
    // candidate payload shapes (email/username/login)
    const payloads = [
      { email, password },
      { username: email, password },
      { login: email, password },
    ];

    let lastErr;
    for (const body of payloads) {
      try {
        const data = await api.postFirst(paths, body);
        return data; // success
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await tryLogin();

      // accept common token field names
      const token =
        data?.token ||
        data?.accessToken ||
        data?.access_token ||
        data?.jwt ||
        null;

      const user =
        data?.user ||
        data?.profile ||
        data?.account ||
        null;

      if (!token) throw new Error('No token received');

      localStorage.setItem('token', token);
      if (user) localStorage.setItem('user', JSON.stringify(user));

      // Optional: set activeTenantId if returned
      const tenantId =
        user?.tenantId || user?.tenant?.id || data?.tenantId || null;
      if (tenantId) localStorage.setItem('activeTenantId', tenantId);

      navigate('/');
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.normalizedMessage ||
        'Invalid email or password';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  async function handleForgot(e) {
    e?.preventDefault?.();
    setForgotErr('');
    setForgotMsg('');
    setForgotLoading(true);

    try {
      // common endpoints you might have on the backend
      const paths = [
        '/password/forgot',
        '/auth/password/forgot',
        '/auth/forgot-password',
        '/users/password/forgot',
      ];

      // payload variations (some backends accept `emailOrPhone`)
      const candidates =
        forgotMethod === 'email'
          ? [
              { email: forgotValue },
              { username: forgotValue },
              { login: forgotValue },
              { emailOrPhone: forgotValue },
            ]
          : [
              { phone: forgotValue },
              { msisdn: forgotValue },
              { emailOrPhone: forgotValue },
            ];

      let lastErr;
      for (const body of candidates) {
        try {
          await api.postFirst(paths, body);
          // we don't need the response shape — just assume success if 2xx
          setForgotMsg(
            forgotMethod === 'email'
              ? 'If an account exists for that email, a reset link has been sent.'
              : 'If an account exists for that phone, a reset code/link has been sent by SMS.'
          );
          return;
        } catch (e) {
          lastErr = e;
        }
      }
      throw lastErr;
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.normalizedMessage ||
        'Failed to request password reset';
      setForgotErr(msg);
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-blue-300 flex items-center justify-center px-4">
      <div className="bg-white shadow-lg rounded-2xl w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <img
            src="/logo.png"
            alt="MkopoSuite"
            className="h-12 mx-auto mb-2"
          />
          <h1 className="text-2xl font-semibold text-gray-700">Welcome to MkopoSuite</h1>
          <p className="text-sm text-gray-500">Please login to continue</p>
        </div>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring focus:ring-blue-300"
              required
              placeholder="admin@example.com"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 pr-10 rounded-md shadow-sm focus:outline-none focus:ring focus:ring-blue-300"
                required
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-2 flex items-center px-2 text-gray-500 hover:text-gray-700"
                tabIndex={-1}
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="mt-2 text-right">
              <button
                type="button"
                onClick={() => {
                  setForgotOpen((o) => !o);
                  setForgotMsg('');
                  setForgotErr('');
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                {forgotOpen ? 'Close reset panel' : 'Forgot password?'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Forgot password panel */}
        {forgotOpen && (
          <div className="mt-6 border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Reset your password</h2>
            <p className="text-xs text-gray-600 mb-3">
              We’ll send a reset link (email) or code/link (SMS) if the account exists.
            </p>

            <div className="flex gap-3 mb-3">
              <button
                type="button"
                onClick={() => {
                  setForgotMethod('email');
                  setForgotValue('');
                  setForgotMsg('');
                  setForgotErr('');
                }}
                className={`flex-1 inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm border ${
                  forgotMethod === 'email'
                    ? 'border-blue-600 text-blue-700 bg-white'
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-100'
                }`}
              >
                <Mail size={16} /> Email
              </button>
              <button
                type="button"
                onClick={() => {
                  setForgotMethod('phone');
                  setForgotValue('');
                  setForgotMsg('');
                  setForgotErr('');
                }}
                className={`flex-1 inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm border ${
                  forgotMethod === 'phone'
                    ? 'border-blue-600 text-blue-700 bg-white'
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-100'
                }`}
              >
                <Phone size={16} /> Phone
              </button>
            </div>

            <form onSubmit={handleForgot} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {forgotMethod === 'email' ? 'Email address' : 'Phone number'}
                </label>
                <input
                  type={forgotMethod === 'email' ? 'email' : 'tel'}
                  value={forgotValue}
                  onChange={(e) => setForgotValue(e.target.value)}
                  required
                  placeholder={
                    forgotMethod === 'email' ? 'owner@acme.test' : '+2557...'
                  }
                  className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring focus:ring-blue-300"
                />
              </div>

              {forgotErr && (
                <div className="text-xs text-red-600">{forgotErr}</div>
              )}
              {forgotMsg && (
                <div className="text-xs text-green-700">{forgotMsg}</div>
              )}

              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full bg-gray-900 text-white py-2 rounded-md hover:bg-black transition disabled:opacity-50"
              >
                {forgotLoading ? 'Sending…' : 'Send reset instructions'}
              </button>
            </form>
          </div>
        )}

        {/* Self-service signup entry point */}
        <p className="mt-6 text-center text-sm text-gray-600">
          Don’t have an account?{' '}
          <Link to="/signup" className="text-blue-600 hover:underline font-medium">
            Create one
          </Link>
        </p>

        <p className="mt-4 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} MkopoSuite. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;
