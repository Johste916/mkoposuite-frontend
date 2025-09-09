// src/pages/public/Signup.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api'; // ✅ fixed path + default import
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Signup() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
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
      if (data.requireEmailVerification) {
        toast.success('Check your email to verify your account.');
        nav('/login'); // or show a “verify sent” page
        return;
      }
      toast.success('Account created! Redirecting to login…');
      const next = data?.next?.loginUrl || '/login';
      // Don’t persist token here; follow your existing login flow
      window.location.href = next;
    } catch (err) {
      const msg =
        err?.response?.data?.error || err.message || 'Failed to sign up';
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
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={onChange}
              required
              minLength={8}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="At least 8 characters"
            />
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
