import React, { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../api";
import {
  Camera,
  Upload,
  Save,
  X,
  User,
  IdCard,
  Phone,
  Calendar,
  MapPin,
  Building2,
  UserPlus,
} from "lucide-react";

const today = () => new Date().toISOString().slice(0, 10);

// Use shared themed classes
const classInput = "input";
const sectionCard = "card p-4 md:p-6";

export default function AddBorrower() {
  const navigate = useNavigate();

  const genderOptions = [
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: "other", label: "Other" },
  ];
  const employmentOptions = [
    { value: "employed_private", label: "Employed (Private)" },
    { value: "employed_public", label: "Employed (Public)" },
    { value: "self_employed", label: "Self-Employed" },
    { value: "business_owner", label: "Business Owner" },
    { value: "student", label: "Student" },
    { value: "pensioner", label: "Pensioner" },
    { value: "unemployed", label: "Unemployed" },
  ];
  const idTypeOptions = [
    { value: "national_id", label: "National ID" },
    { value: "passport", label: "Passport" },
    { value: "driver_license", label: "Driver License" },
    { value: "voter_id", label: "Voter ID" },
    { value: "other", label: "Other" },
  ];
  const loanTypeOptions = [
    { value: "individual", label: "Individual" },
    { value: "group", label: "Group" },
  ];

  const [branches, setBranches] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    secondaryPhone: "",
    email: "",
    occupation: "",
    gender: "",
    birthDate: "",
    addressLine: "",
    city: "",
    district: "",
    ward: "",
    street: "",
    houseNumber: "",
    employmentStatus: "",
    idType: "",
    idNumber: "",
    idIssuedDate: "",
    idExpiryDate: "",
    loanOfficerId: "",
    branchId: "",
    loanType: "individual",
    groupId: "",
    nextKinName: "",
    nextKinPhone: "",
    regDate: today(),
  });

  useEffect(() => {
    (async () => {
      try {
        const [b, u] = await Promise.all([
          api.get("/branches"),
          api.get("/users", { params: { role: "loan_officer" } }).catch(() => ({ data: [] })),
        ]);
        setBranches(Array.isArray(b.data) ? b.data : []);
        setOfficers(Array.isArray(u.data) ? u.data : []);
      } catch (e) {
        console.warn("Failed to fetch branches/officers", e);
        setBranches([]);
        setOfficers([]);
      }
    })();
  }, []);

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(f);
  };
  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const validate = () => {
    if (!form.firstName.trim() || !form.lastName.trim()) return alert("First & last name are required"), false;
    if (!form.phone.trim()) return alert("Primary phone is required"), false;
    if (!form.gender) return alert("Gender is required"), false;
    if (!form.branchId) return alert("Branch is required"), false;
    return true;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      const payload = {
        name: `${form.firstName} ${form.lastName}`.trim(),
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        secondaryPhone: form.secondaryPhone,
        email: form.email,
        occupation: form.occupation,
        gender: form.gender,
        birthDate: form.birthDate || null,
        addressLine: form.addressLine,
        city: form.city,
        district: form.district,
        ward: form.ward,
        street: form.street,
        houseNumber: form.houseNumber,
        employmentStatus: form.employmentStatus,
        idType: form.idType,
        idNumber: form.idNumber,
        idIssuedDate: form.idIssuedDate || null,
        idExpiryDate: form.idExpiryDate || null,
        loanOfficerId: form.loanOfficerId || null,
        branchId: form.branchId,
        loanType: form.loanType,
        groupId: form.loanType === "group" ? form.groupId || null : null,
        nextKinName: form.nextKinName,
        nextKinPhone: form.nextKinPhone,
        regDate: form.regDate || today(),
      };
      Object.entries(payload).forEach(([k, v]) => fd.append(k, v ?? ""));
      if (photoFile) fd.append("photo", photoFile);

      const res = await api.post("/borrowers", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("Borrower saved successfully");
      navigate(`/borrowers/${res.data?.id || ""}`);
    } catch (e) {
      console.error(e);
      alert("Failed to save borrower");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 bg-[var(--bg)] text-[var(--fg)]">
      {/* header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Add Borrower</h1>
          <p className="text-sm text-[var(--muted)]">
            Capture full KYC & assign the borrower to a branch/officer.
          </p>
        </div>
        <Link
          to="/borrowers"
          className="text-indigo-600 hover:underline text-sm dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          Back to Borrowers
        </Link>
      </div>

      {/* form */}
      <form onSubmit={onSubmit} className="grid grid-cols-1 xl:grid-cols-3 gap-6 relative">
        {/* LEFT: identity + address + ID + kin */}
        <div className="xl:col-span-2 space-y-6">
          {/* Profile photo */}
          <section className={sectionCard}>
            <div className="flex items-center gap-2 mb-4">
              <Camera className="h-5 w-5 text-indigo-600" />
              <h2 className="font-semibold text-lg">Profile Photo</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-28 h-28 rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--card)] flex items-center justify-center">
                {photoPreview ? (
                  <img src={photoPreview} alt="Profile preview" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-10 w-10 text-[var(--muted)]" />
                )}
              </div>
              <div className="space-x-2">
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer">
                  <Upload className="h-4 w-4" />
                  <span>Upload</span>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
                </label>
                {photoFile && (
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    <X className="h-4 w-4" />
                    Remove
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* identity */}
          <section className={sectionCard}>
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-indigo-600" />
              <h2 className="font-semibold text-lg">Identity</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="First Name">
                <input className={classInput} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
              </Field>
              <Field label="Last Name">
                <input className={classInput} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
              </Field>
              <Field label={<LabelWithIcon Icon={Phone} text="Phone" />}>
                <input className={classInput} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="e.g. +2557…" required />
              </Field>
              <Field label="Secondary #">
                <input className={classInput} value={form.secondaryPhone} onChange={(e) => setForm({ ...form, secondaryPhone: e.target.value })} placeholder="Optional" />
              </Field>
              <Field label="Email">
                <input type="email" className={classInput} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@email.com" />
              </Field>
              <Field label="Business / Occupation">
                <input className={classInput} value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} placeholder="e.g. Retail shop" />
              </Field>
              <Field label="Gender">
                <select className={classInput} value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} required>
                  <option value="">Select…</option>
                  {genderOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={<LabelWithIcon Icon={Calendar} text="Birth date" />}>
                <input type="date" className={classInput} value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
              </Field>
              <div className="md:col-span-2">
                <Field label="Employment / Working Status">
                  <select className={classInput} value={form.employmentStatus} onChange={(e) => setForm({ ...form, employmentStatus: e.target.value })}>
                    <option value="">Select…</option>
                    {employmentOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          </section>

          {/* address */}
          <section className={sectionCard}>
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-indigo-600" />
              <h2 className="font-semibold text-lg">Address</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Field label="Address Line">
                  <input className={classInput} value={form.addressLine} onChange={(e) => setForm({ ...form, addressLine: e.target.value })} />
                </Field>
              </div>
              <Field label="City">
                <input className={classInput} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </Field>
              <Field label="District">
                <input className={classInput} value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
              </Field>
              <Field label="Ward">
                <input className={classInput} value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value })} />
              </Field>
              <Field label="Street">
                <input className={classInput} value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
              </Field>
              <Field label="House #">
                <input className={classInput} value={form.houseNumber} onChange={(e) => setForm({ ...form, houseNumber: e.target.value })} />
              </Field>
            </div>
          </section>

          {/* identity docs */}
          <section className={sectionCard}>
            <div className="flex items-center gap-2 mb-4">
              <IdCard className="h-5 w-5 text-indigo-600" />
              <h2 className="font-semibold text-lg">ID Document</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="ID Type">
                <select className={classInput} value={form.idType} onChange={(e) => setForm({ ...form, idType: e.target.value })}>
                  <option value="">Select…</option>
                  {idTypeOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="ID Number">
                <input className={classInput} value={form.idNumber} onChange={(e) => setForm({ ...form, idNumber: e.target.value })} />
              </Field>
              <Field label="Issued on">
                <input type="date" className={classInput} value={form.idIssuedDate} onChange={(e) => setForm({ ...form, idIssuedDate: e.target.value })} />
              </Field>
              <Field label="Expiry date">
                <input type="date" className={classInput} value={form.idExpiryDate} onChange={(e) => setForm({ ...form, idExpiryDate: e.target.value })} />
              </Field>
            </div>
          </section>

          {/* next of kin */}
          <section className={sectionCard}>
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="h-5 w-5 text-indigo-600" />
              <h2 className="font-semibold text-lg">Next of Kin</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Full Name">
                <input className={classInput} value={form.nextKinName} onChange={(e) => setForm({ ...form, nextKinName: e.target.value })} />
              </Field>
              <Field label="Phone">
                <input className={classInput} value={form.nextKinPhone} onChange={(e) => setForm({ ...form, nextKinPhone: e.target.value })} />
              </Field>
            </div>
          </section>
        </div>

        {/* RIGHT: assignment */}
        <div className="space-y-6">
          <section className={sectionCard}>
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-5 w-5 text-indigo-600" />
              <h2 className="font-semibold text-lg">Assignment & Loan Type</h2>
            </div>
            <div className="grid gap-4">
              <Field label="Branch">
                <select
                  className={classInput}
                  value={form.branchId}
                  onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                  required
                >
                  <option value="">Select branch…</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Loan Officer">
                <select
                  className={classInput}
                  value={form.loanOfficerId}
                  onChange={(e) => setForm({ ...form, loanOfficerId: e.target.value })}
                >
                  <option value="">Select officer… (optional)</option>
                  {officers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name || `${o.firstName || ""} ${o.lastName || ""}`}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Loan Type">
                <select
                  className={classInput}
                  value={form.loanType}
                  onChange={(e) => setForm({ ...form, loanType: e.target.value })}
                >
                  {loanTypeOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>

              {form.loanType === "group" && (
                <Field label="Group ID">
                  <input
                    className={classInput}
                    value={form.groupId}
                    onChange={(e) => setForm({ ...form, groupId: e.target.value })}
                    placeholder="Enter group identifier"
                  />
                </Field>
              )}

              <Field label={<LabelWithIcon Icon={Calendar} text="Registration Date" />}>
                <input
                  type="date"
                  className={classInput}
                  value={form.regDate}
                  onChange={(e) => setForm({ ...form, regDate: e.target.value })}
                />
              </Field>
            </div>
          </section>
        </div>

        {/* sticky bottom action bar */}
        <div className="col-span-full">
          <div className="sticky bottom-0 inset-x-0 z-20 border-t bg-[var(--card)]/90 backdrop-blur supports-[backdrop-filter]:bg-[var(--card)]/70 border-[var(--border)]">
            <div className="max-w-screen-2xl mx-auto px-4 py-3 flex justify-end gap-3">
              <Link
                to="/borrowers"
                className="px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                Cancel
              </Link>
              <button
                disabled={submitting}
                type="submit"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
              >
                <Save className="h-4 w-4" />
                {submitting ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

/* ---------- tiny helpers for consistent labels ---------- */
function Field({ label, children }) {
  return (
    <div>
      <div className="text-xs font-medium tracking-wide text-[var(--muted)] mb-1">{label}</div>
      {children}
    </div>
  );
}

function LabelWithIcon({ Icon, text }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="h-3.5 w-3.5 text-[var(--muted)]" />
      {text}
    </span>
  );
}
