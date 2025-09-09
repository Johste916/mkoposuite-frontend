// src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function tryLogin() {
    // 1) Candidate endpoints (we’ll try in this order)
    const paths = ['/login', '/auth/login', '/auth/signin'];

    // 2) Candidate payloads (some backends want username or login)
    const payloads = [
      { email, password },
      { username: email, password },
      { login: email, password },
    ];

    // 3) Attempt each combination until one succeeds
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

      // Accept common token field names
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

      // Optional: set activeTenantId if your API returns one on login
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
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring focus:ring-blue-300"
              required
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

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
