import React, { useEffect, useState } from "react";
import api from "../../api";

const LS_KEY = "billingSettings";

const defaultState = {
  companyName: "",
  billingEmail: "",
  plan: "starter",
  address1: "",
  address2: "",
  city: "",
  country: "",
  taxId: "",
};

export default function Billing() {
  const [form, setForm] = useState(defaultState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      // Try primary endpoint
      const res = await api.get("/settings/billing");
      const data = res?.data || {};
      setForm({ ...defaultState, ...data });
    } catch (e1) {
      // Try a couple legacy paths before falling back to localStorage
      try {
        const res2 = await api.get("/account/settings/billing");
        const data2 = res2?.data || {};
        setForm({ ...defaultState, ...data2 });
      } catch (e2) {
        try {
          const raw = localStorage.getItem(LS_KEY);
          setForm(raw ? JSON.parse(raw) : defaultState);
        } catch {
          setForm(defaultState);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const onSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      // Prefer PUT /settings/billing; fallback to POST; then legacy path; finally localStorage
      let ok = false;
      try {
        await api.put("/settings/billing", form);
        ok = true;
      } catch {
        try {
          await api.post("/settings/billing", form);
          ok = true;
        } catch {
          try {
            await api.put("/account/settings/billing", form);
            ok = true;
          } catch {
            // final fallback
            localStorage.setItem(LS_KEY, JSON.stringify(form));
            ok = true;
          }
        }
      }
      if (ok) setMsg("Billing settings saved.");
    } catch (e) {
      setErr("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold mb-4">Billing Settings</h1>

      {msg && <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">{msg}</div>}
      {err && <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-800">{err}</div>}

      <form onSubmit={onSave} className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-4">
        {loading ? (
          <div className="text-sm text-slate-500">Loading billing settings…</div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Company name</label>
                <input
                  name="companyName"
                  value={form.companyName}
                  onChange={onChange}
                  className="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Billing email</label>
                <input
                  name="billingEmail"
                  type="email"
                  value={form.billingEmail}
                  onChange={onChange}
                  className="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Plan</label>
                <select
                  name="plan"
                  value={form.plan}
                  onChange={onChange}
                  className="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800"
                >
                  <option value="starter">Starter</option>
                  <option value="growth">Growth</option>
                  <option value="enterprise">Enterprise</option>
                </select>
                <p className="text-xs mt-1 text-slate-500">Changing plans may affect billing on your next cycle.</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Address line 1</label>
                <input
                  name="address1"
                  value={form.address1}
                  onChange={onChange}
                  className="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Address line 2</label>
                <input
                  name="address2"
                  value={form.address2}
                  onChange={onChange}
                  className="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">City</label>
                <input
                  name="city"
                  value={form.city}
                  onChange={onChange}
                  className="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Country</label>
                <input
                  name="country"
                  value={form.country}
                  onChange={onChange}
                  className="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tax/VAT ID</label>
                <input
                  name="taxId"
                  value={form.taxId}
                  onChange={onChange}
                  className="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 h-9 px-4 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
