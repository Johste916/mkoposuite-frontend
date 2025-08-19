// src/pages/borrowers/AddBorrower.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../api"; // axios instance
import { Camera, Upload, Save, X, User, IdCard, Phone, Calendar, MapPin, Building2, UserPlus } from "lucide-react";

// --- helpers ---
const today = () => new Date().toISOString().slice(0, 10);
const classInput =
  "w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all";
const sectionCard = "bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-4 md:p-6";

export default function AddBorrower() {
  const navigate = useNavigate();

  // ---- options ----
  const genderOptions = [
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: "other", label: "Other" },
  ];

  const employmentOptions = [
    { value: "employed_private", label: "Employed (Private)" },
    { value: "employed_public", label: "Employed (Public)" },
    { value: "self_employed", label: "Self‑Employed" },
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

  // ---- state ----
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

    // address
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
    groupId: "", // optional when loanType === 'group'

    nextKinName: "",
    nextKinPhone: "",

    regDate: today(),
  });

  // ---- fetchers ----
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

  // ---- photo handling ----
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

  // ---- validation ----
  const validate = () => {
    if (!form.firstName.trim() || !form.lastName.trim()) return alert("First & last name are required"), false;
    if (!form.phone.trim()) return alert("Primary phone is required"), false;
    if (!form.gender) return alert("Gender is required"), false;
    if (!form.branchId) return alert("Branch is required"), false;
    return true;
  };

  // ---- submit ----
  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const fd = new FormData();

      const payload = {
        // backend compatibility: some instances store combined name
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

      // success UX
      alert("Borrower saved successfully");
      navigate(`/borrowers/${res.data?.id || ""}`);
    } catch (e) {
      console.error(e);
      alert("Failed to save borrower");
    } finally {
      setSubmitting(false);
    }
  };

  // ---- UI ----
  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Add Borrower</h1>
          <p className="text-sm text-gray-500">Capture full KYC & assign the borrower to a branch/officer.</p>
        </div>
        <Link to="/borrowers" className="text-indigo-600 hover:underline text-sm">Back to Borrowers</Link>
      </div>

      <form onSubmit={onSubmit} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* left column: identity + address */}
        <div className="xl:col-span-2 space-y-6">
          {/* identity */}
          <section className={sectionCard}>
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-indigo-600"/>
              <h2 className="font-semibold text-lg">Identity</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-600">First Name</label>
                <input className={classInput} value={form.firstName} onChange={(e)=>setForm({...form, firstName:e.target.value})} required />
              </div>
              <div>
                <label className="text-xs text-gray-600">Last Name</label>
                <input className={classInput} value={form.lastName} onChange={(e)=>setForm({...form, lastName:e.target.value})} required />
              </div>

              <div>
                <label className="text-xs text-gray-600 flex items-center gap-1"><Phone className="h-3.5 w-3.5"/> Phone</label>
                <input className={classInput} value={form.phone} onChange={(e)=>setForm({...form, phone:e.target.value})} placeholder="e.g. +2557…" required />
              </div>
              <div>
                <label className="text-xs text-gray-600">Secondary #</label>
                <input className={classInput} value={form.secondaryPhone} onChange={(e)=>setForm({...form, secondaryPhone:e.target.value})} placeholder="Optional" />
              </div>

              <div>
                <label className="text-xs text-gray-600">Email</label>
                <input type="email" className={classInput} value={form.email} onChange={(e)=>setForm({...form, email:e.target.value})} placeholder="name@email.com" />
              </div>
              <div>
                <label className="text-xs text-gray-600">Business / Occupation</label>
                <input className={classInput} value={form.occupation} onChange={(e)=>setForm({...form, occupation:e.target.value})} placeholder="e.g. Retail shop" />
              </div>

              <div>
                <label className="text-xs text-gray-600">Gender</label>
                <select className={classInput} value={form.gender} onChange={(e)=>setForm({...form, gender:e.target.value})} required>
                  <option value="">Select…</option>
                  {genderOptions.map(o=> <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 flex items-center gap-1"><Calendar className="h-3.5 w-3.5"/> Birth date</label>
                <input type="date" className={classInput} value={form.birthDate} onChange={(e)=>setForm({...form, birthDate:e.target.value})} />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">Employment / Working Status</label>
                <select className={classInput} value={form.employmentStatus} onChange={(e)=>setForm({...form, employmentStatus:e.target.value})}>
                  <option value="">Select…</option>
                  {employmentOptions.map(o=> <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* address */}
          <section className={sectionCard}>
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-indigo-600"/>
              <h2 className="font-semibold text-lg">Address</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">Address Line</label>
                <input className={classInput} value={form.addressLine} onChange={(e)=>setForm({...form, addressLine:e.target.value})} />
              </div>
              <div>
                <label className="text-xs text-gray-600">City</label>
                <input className={classInput} value={form.city} onChange={(e)=>setForm({...form, city:e.target.value})} />
              </div>
              <div>
                <label className="text-xs text-gray-600">District</label>
                <input className={classInput} value={form.district} onChange={(e)=>setForm({...form, district:e.target.value})} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Ward</label>
                <input className={classInput} value={form.ward} onChange={(e)=>setForm({...form, ward:e.target.value})} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Street</label>
                <input className={classInput} value={form.street} onChange={(e)=>setForm({...form, street:e.target.value})} />
              </div>
              <div>
                <label className="text-xs text-gray-600">House #</label>
                <input className={classInput} value={form.houseNumber} onChange={(e)=>setForm({...form, houseNumber:e.target.value})} />
              </div>
            </div>
          </section>

          {/* identity docs */}
          <section className={sectionCard}>
            <div className="flex items-center gap-2 mb-4">
              <IdCard className="h-5 w-5 text-indigo-600"/>
              <h2 className="font-semibold text-lg">ID Document</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-600">ID Type</label>
                <select className={classInput} value={form.idType} onChange={(e)=>setForm({...form, idType:e.target.value})}>
                  <option value="">Select…</option>
                  {idTypeOptions.map(o=> <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600">ID Number</label>
                <input className={classInput} value={form.idNumber} onChange={(e)=>setForm({...form, idNumber:e.target.value})} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Issued on</label>
                <input type="date" className={classInput} value={form.idIssuedDate} onChange={(e)=>setForm({...form, idIssuedDate:e.target.value})} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Expiry date</label>
                <input type="date" className={classInput} value={form.idExpiryDate} onChange={(e)=>setForm({...form, idExpiryDate:e.target.value})} />
              </div>
            </div>
          </section>

          {/* next of kin */}
          <section className={sectionCard}>
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="h-5 w-5 text-indigo-600"/>
              <h2 className="font-semibold text-lg">Next of Kin</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-600">Full Name</label>
                <input className={classInput} value={form.nextKinName} onChange={(e)=>setForm({...form, nextKinName:e.target.value})} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Phone</label>
                <input className={classInput} value={form.nextKinPhone} onChange={(e)=>setForm({...form, nextKinPhone:e.target.value})} />
              </div>
            </div>
          </section>
        </div>

        {/* right column: photo + assignment */}
        <div className="space-y-6">
          {/* photo */}
          <section className={`${sectionCard} sticky top-4`}>
            <div className="flex items-center gap-2 mb-4">
              <Camera className="h-5 w-5 text-indigo-600"/>
              <h2 className="font-semibold text-lg">Profile Photo</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-28 h-28 rounded-2xl bg-gray-100 overflow-hidden ring-1 ring-black/5 flex items-center justify-center">
                {photoPreview ? (
                  // eslint-disable-next-line jsx-a11y/img-redundant-alt
                  <img src={photoPreview} alt="Profile photo preview" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-10 w-10 text-gray-400" />
                )}
              </div>
              <div className="space-x-2">
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 cursor-pointer">
                  <Upload className="h-4 w-4"/>
                  <span>Upload</span>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
                </label>
                {photoFile && (
                  <button type="button" onClick={removePhoto} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50">
                    <X className="h-4 w-4"/>
                    Remove
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* assignment & meta */}
          <section className={`${sectionCard} sticky top-[11.5rem]`}>
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-5 w-5 text-indigo-600"/>
              <h2 className="font-semibold text-lg">Assignment & Loan Type</h2>
            </div>
            <div className="grid gap-4">
              <div>
                <label className="text-xs text-gray-600">Branch</label>
                <select className={classInput} value={form.branchId} onChange={(e)=>setForm({...form, branchId:e.target.value})} required>
                  <option value="">Select branch…</option>
                  {branches.map(b=> <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600">Loan Officer</label>
                <select className={classInput} value={form.loanOfficerId} onChange={(e)=>setForm({...form, loanOfficerId:e.target.value})}>
                  <option value="">Select officer… (optional)</option>
                  {officers.map(o=> <option key={o.id} value={o.id}>{o.name || `${o.firstName || ""} ${o.lastName || ""}`}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600">Loan Type</label>
                <select className={classInput} value={form.loanType} onChange={(e)=>setForm({...form, loanType:e.target.value})}>
                  {loanTypeOptions.map(o=> <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              {form.loanType === 'group' && (
                <div>
                  <label className="text-xs text-gray-600">Group ID</label>
                  <input className={classInput} value={form.groupId} onChange={(e)=>setForm({...form, groupId:e.target.value})} placeholder="Enter group identifier" />
                </div>
              )}
              <div>
                <label className="text-xs text-gray-600 flex items-center gap-1"><Calendar className="h-3.5 w-3.5"/> Registration Date</label>
                <input type="date" className={classInput} value={form.regDate} onChange={(e)=>setForm({...form, regDate:e.target.value})} />
              </div>
            </div>
          </section>

          {/* actions */}
          <div className="flex items-center gap-3">
            <button disabled={submitting} type="submit" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm">
              <Save className="h-4 w-4"/>
              {submitting ? "Saving…" : "Save"}
            </button>
            <Link to="/borrowers" className="px-4 py-2 rounded-xl border hover:bg-gray-50">Cancel</Link>
          </div>
        </div>
      </form>
    </div>
  );
}
