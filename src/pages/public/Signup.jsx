// src/pages/public/Signup.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api'; // ✅ fixed path + default import
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Signup() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [status, setStatus] = useState({
    enabled: true,
    defaultTrialDays: 14,
    requireEmailVerification: false,
  });
  const [form, setForm] = useState({
    companyName: '',
    adminName: '',
    email: '',
    phone: '',
    password: '',
    planCode: 'basic',
  });

  useEffect(() => {
    let mounted = true;
    api
      .get('/signup/status')
      .then(({ data }) => {
        if (!mounted) return;
        setStatus({
          enabled: !!data.enabled,
          defaultTrialDays: data.defaultTrialDays ?? 14,
          requireEmailVerification: !!data.requireEmailVerification,
        });
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (!status.enabled) {
      toast.error('Self-signup is disabled');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/signup', form);

      // If your backend chooses to require email verification and indicates it
      if (data.requireEmailVerification) {
        toast.success('Check your email to verify your account.');
        nav('/login');
        return;
      }

      // Success: default to login
      toast.success('Account created! Redirecting to login…');
      const next = data?.next?.loginUrl || '/login';
      window.location.href = next;
    } catch (err) {
      const status = err?.response?.status;
      const payload = err?.response?.data || {};
      // Duplicate email case (backend sends code + redirect)
      if (status === 409 && payload?.code === 'ALREADY_REGISTERED') {
        const msg = payload?.error || 'User already registered in the system.';
        toast.warning(msg);
        const redirect = payload?.redirectTo || `/login?email=${encodeURIComponent(form.email)}`;
        // Prefer a hard redirect so the login page sees the prefilled email even in non-SPA loads
        window.location.href = redirect;
        return;
      }

      const msg = payload?.error || err.message || 'Failed to sign up';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6">
        <h1 className="text-2xl font-semibold mb-1">Create your organization</h1>
        <p className="text-sm text-gray-500 mb-6">
          {status.enabled
            ? `Start a ${status.defaultTrialDays}-day trial. No card required.`
            : 'Self-signup is currently disabled.'}
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Company/Organization Name
            </label>
            <input
              name="companyName"
              value={form.companyName}
              onChange={onChange}
              required
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Acme Finance"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Your Name (optional)
            </label>
            <input
              name="adminName"
              value={form.adminName}
              onChange={onChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Jane Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={onChange}
              required
              className="w-full border rounded-lg px-3 py-2"
              placeholder="owner@acme.test"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Phone (optional)
            </label>
            <input
              name="phone"
              value={form.phone}
              onChange={onChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="+2557..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <div className="relative">
              <input
                name="password"
                type={showPwd ? 'text' : 'password'}
                value={form.password}
                onChange={onChange}
                required
                minLength={8}
                className="w-full border rounded-lg px-3 py-2 pr-12"
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPwd(s => !s)}
                className="absolute inset-y-0 right-0 px-3 text-sm text-gray-500 hover:text-gray-700"
                aria-label={showPwd ? 'Hide password' : 'Show password'}
              >
                {showPwd ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Plan</label>
            <select
              name="planCode"
              value={form.planCode}
              onChange={onChange}
              className="w-full border rounded-lg px-3 py-2 bg-white"
            >
              <option value="basic">Basic (trial)</option>
              <option value="pro">Pro (trial)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || !status.enabled}
            className="w-full rounded-xl bg-black text-white py-2.5 disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <p className="text-xs text-gray-500 mt-4">
          By continuing you agree to the Terms and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
