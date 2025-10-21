// src/pages/borrowers/AddBorrower.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../api";
import {
  Camera, Upload, Save, X, User, IdCard, Phone, Calendar,
  MapPin, UserPlus, Building2, UserCog, Info
} from "lucide-react";

/* ---------------- Utilities & helpers ---------------- */
const today = () => new Date().toISOString().slice(0, 10);
const firstFilled = (...vals) => {
  for (const v of vals.flat()) {
    if (v === 0) return 0;
    if (v === false) continue;
    if (v == null) continue;
    const s = typeof v === "string" ? v.trim() : v;
    if (Array.isArray(s)) {
      if (s.filter(Boolean).length) return s;
    } else if (s !== "" && s !== "null" && s !== "undefined") {
      return s;
    }
  }
  return "";
};
const withTenant = (tenantId) =>
  tenantId ? { headers: { "x-tenant-id": tenantId } } : {};
const effectiveTenantId = (explicitTenant) =>
  explicitTenant || (typeof api.getTenantId === "function" ? api.getTenantId() : null);
/* GET with graceful fallbacks (uses api.getFirst which also tries /api variants) */
const tryGET = async (paths = [], opts = {}) => api.getFirst(paths, opts);
/** Label helper like in details */
const placeholderFrom = (status, okText, emptyText = "No options") => {
  switch (status) {
    case "loading":
      return "Loading…";
    case "error":
      return "Failed to load — Retry";
    case "empty":
      return emptyText;
    default:
      return okText;
  }
};
/* Per-tenant cache (only cache non-empty) */
const _tenantCache = {
  officers: new Map(), // key: tenantId or "__no_tenant__" -> [{id,name}]
  branches: new Map(), // key: tenantId -> [{id,name}]
  groups: new Map(),   // key: tenantId -> [{id,name}]
};

/* ---------------- UI theme ---------------- */
const ui = {
  page: "w-full px-4 md:px-6 lg:px-8 py-6 min-h-screen bg-[var(--bg)] text-[var(--fg)]",
  section: "rounded-2xl border-2 border-[var(--border-strong)] bg-[var(--card)] shadow p-4 md:p-6",
  input:
    "w-full text-sm rounded-lg px-3 py-2 border-2 " +
    "bg-[var(--input-bg)] text-[var(--input-fg)] border-[var(--input-border)] " +
    "placeholder:text-[var(--input-placeholder)] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
  btn:
    "inline-flex items-center gap-2 px-3 py-2 rounded-lg font-semibold " +
    "border-2 border-[var(--border-strong)] bg-[var(--card)] text-[var(--fg)] " +
    "hover:bg-[var(--kpi-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
  primary:
    "inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold shadow-sm " +
    "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
  link:
    "inline-flex items-center gap-1 font-bold underline decoration-2 underline-offset-4 rounded " +
    "text-[var(--ring)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
  label: "text-[12px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1",
  iconAccent: "h-5 w-5 text-[var(--ring)]",
  iconMuted: "h-3.5 w-3.5 text-[var(--muted)]",
  muted: "text-[var(--muted)]",
};

/* ---------------- Component ---------------- */
export default function AddBorrower() {
  const navigate = useNavigate();

  /* Options to match the details page */
  const genderOptions = [
    { value: "", label: "—" },
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: "other", label: "Other" },
  ];
  const employmentOptions = [
    { value: "", label: "—" },
    { value: "employed", label: "Employed" },
    { value: "self_employed", label: "Self-employed" },
    { value: "unemployed", label: "Unemployed" },
    { value: "student", label: "Student" },
    { value: "retired", label: "Retired" },
  ];
  const idTypeOptions = [
    { value: "", label: "—" },
    { value: "national_id", label: "National ID" },
    { value: "passport", label: "Passport" },
    { value: "driver_license", label: "Driver’s License" },
    { value: "voter_id", label: "Voter ID" },
  ];
  const loanTypeOptions = [
    { value: "individual", label: "Individual" },
    { value: "group", label: "Group" },
  ];
  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "pending_kyc", label: "Pending KYC" },
    { value: "inactive", label: "Inactive" },
    { value: "blacklisted", label: "Blacklisted" },
    { value: "disabled", label: "Disabled" },
  ];

  /* Photo */
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileRef = useRef(null);

  /* Assignment data */
  const [officers, setOfficers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [groups, setGroups] = useState([]);

  const [officersStatus, setOfficersStatus] = useState("loading"); // loading|ok|empty|error
  const [branchesStatus, setBranchesStatus] = useState("loading");
  const [groupsStatus, setGroupsStatus] = useState("loading");

  const [reloadOfficersKey, setReloadOfficersKey] = useState(0);
  const [reloadBranchesKey, setReloadBranchesKey] = useState(0);
  const [reloadGroupsKey, setReloadGroupsKey] = useState(0);

  /* Form */
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    // Identity
    firstName: "",
    lastName: "",
    phone: "",
    secondaryPhone: "",
    email: "",
    occupation: "",
    gender: "",
    birthDate: "",
    // Extra KYC (new)
    nationality: "",
    maritalStatus: "",
    educationLevel: "",
    customerNumber: "",
    tin: "",
    status: "active",

    // Address
    addressLine: "",
    city: "",
    district: "",
    ward: "",
    street: "",
    houseNumber: "",

    // ID doc
    idType: "",
    idNumber: "",
    idIssuedDate: "",
    idExpiryDate: "",

    // Next of kin
    nextKinName: "",
    nextKinPhone: "",
    nextOfKinRelationship: "",

    // Assignment & registration
    loanType: "individual",
    groupId: "",
    branchId: "",
    loanOfficerId: "",
    regDate: today(),
  });

  /* ---------- Loaders (tenant-aware, cached) ---------- */
  // Branches
  useEffect(() => {
    const t = effectiveTenantId();
    if (!t) {
      setBranchesStatus("error");
      return;
    }
    const cached = _tenantCache.branches.get(t);
    if (cached) {
      setBranches(cached);
      setBranchesStatus(cached.length ? "ok" : "empty");
      return;
    }

    let ignore = false;
    setBranchesStatus("loading");
    (async () => {
      try {
        const opt = withTenant(t);
        const data = await tryGET(
          [
            "/branches",
            "/v1/branches",
            "/loan-branches",
            "/v1/loan-branches",
            `/tenants/${t}/branches`,
            `/v1/tenants/${t}/branches`,
          ],
          opt
        );
        const arr =
          (Array.isArray(data) && data) ||
          data?.items || data?.data || data?.rows || [];

        const mapped = (arr || []).map((br) => ({
          id: br.id ?? br.code ?? br.uuid ?? br.branchId ?? br.slug,
          name: br.name ?? br.branchName ?? br.title ?? (br.code ? String(br.code) : "—"),
        }));

        if (!ignore) {
          setBranches(mapped);
          setBranchesStatus(mapped.length ? "ok" : "empty");
          if (mapped.length) _tenantCache.branches.set(t, mapped);
        }
      } catch (e) {
        if (!ignore) {
          setBranches([]);
          setBranchesStatus("error");
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [reloadBranchesKey]);

  // Officers
  useEffect(() => {
    const t = effectiveTenantId();
    const cacheKey = t || "__no_tenant__";
    const cached = _tenantCache.officers.get(cacheKey);
    if (cached && cached.length && reloadOfficersKey === 0) {
      setOfficers(cached);
      setOfficersStatus("ok");
      return;
    }
    if (cached && !cached.length) _tenantCache.officers.delete(cacheKey);

    let ignore = false;
    setOfficersStatus("loading");
    (async () => {
      try {
        const opt = withTenant(t);
        const paths = [
          t ? `/tenants/${t}/officers` : null,
          "/v1/officers",
          "/officers",
          "/loan-officers",
          "/users?role=loan_officer",
          "/users?role=officer",
          "/v1/users?role=officer",
        ].filter(Boolean);

        const pickList = (d) =>
          (Array.isArray(d) && d) ||
          d?.items || d?.data || d?.rows || d?.results || d?.officers || d?.users || [];

        let arr = [];
        for (const p of paths) {
          const d = await tryGET([p], opt).catch(() => null);
          const list = pickList(d);
          if (list && list.length) {
            arr = list;
            break;
          }
        }

        const mapped = (arr || []).map((o) => ({
          id: o.loanOfficerId ?? o.id ?? o.userId ?? o.uuid ?? o.code ?? o.employeeId,
          name: firstFilled(
            o.name,
            o.fullName,
            [o.firstName, o.lastName].filter(Boolean).join(" "),
            o.email,
            String(o.id ?? o.userId ?? "")
          ),
        }));

        if (!ignore) {
          setOfficers(mapped);
          setOfficersStatus(mapped.length ? "ok" : "empty");
          if (mapped.length) _tenantCache.officers.set(cacheKey, mapped);
        }
      } catch (e) {
        if (!ignore) {
          setOfficers([]);
          setOfficersStatus("error");
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [reloadOfficersKey]);

  // Groups (load when needed)
  useEffect(() => {
    const t = effectiveTenantId();
    if (form.loanType !== "group") {
      setGroupsStatus("empty");
      return;
    }
    const cached = t ? _tenantCache.groups.get(t) : null;
    if (cached) {
      setGroups(cached);
      setGroupsStatus(cached.length ? "ok" : "empty");
      return;
    }

    let ignore = false;
    setGroupsStatus("loading");
    (async () => {
      try {
        const opt = withTenant(t);
        const data = await tryGET(
          [
            "/groups",
            "/v1/groups",
            "/borrowers/groups",
            "/v1/borrowers/groups",
            "/loan-groups",
            "/v1/loan-groups",
            t ? `/tenants/${t}/groups` : null,
            t ? `/v1/tenants/${t}/groups` : null,
          ].filter(Boolean),
          opt
        );
        const arr =
          (Array.isArray(data) && data) ||
          data?.items || data?.data || data?.rows || [];
        const mapped = (arr || []).map((g) => ({
          id: g.id ?? g.code ?? g.uuid ?? g.groupId ?? g.slug,
          name: g.name ?? g.title ?? g.groupName ?? (g.code ? String(g.code) : "—"),
        }));

        if (!ignore) {
          setGroups(mapped);
          setGroupsStatus(mapped.length ? "ok" : "empty");
          if (t && mapped.length) _tenantCache.groups.set(t, mapped);
        }
      } catch (e) {
        if (!ignore) {
          setGroups([]);
          setGroupsStatus("error");
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [form.loanType, reloadGroupsKey]);

  /* ---------- Handlers ---------- */
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
    if (!form.firstName.trim() || !form.lastName.trim())
      return alert("First & last name are required"), false;
    if (!form.phone.trim()) return alert("Primary phone is required"), false;
    if (!form.gender) return alert("Gender is required"), false;
    if (form.loanType === "group" && !form.groupId)
      return alert("Please select a group."), false;
    return true;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) return;
    setSubmitting(true);

    try {
      const t = effectiveTenantId();
      const fd = new FormData();

      // Build payload mirroring BorrowerDetails fields
      const payload = {
        // Identity
        name: `${form.firstName} ${form.lastName}`.trim(),
        firstName: form.firstName || null,
        lastName: form.lastName || null,
        phone: form.phone || null,
        secondaryPhone: form.secondaryPhone || null,
        email: form.email || null,
        occupation: form.occupation || null,
        gender: form.gender || null,
        birthDate: form.birthDate || null,

        // Extra KYC
        nationality: form.nationality || null,
        maritalStatus: form.maritalStatus || null,
        educationLevel: form.educationLevel || null,
        customerNumber: form.customerNumber || null,
        tin: form.tin || null,
        status: form.status || "active",

        // Address
        addressLine: [
          form.addressLine, form.street, form.houseNumber,
          form.ward, form.district, form.city
        ].filter(Boolean).join(", ") || null,
        city: form.city || null,
        district: form.district || null,
        ward: form.ward || null,
        street: form.street || null,
        houseNumber: form.houseNumber || null,

        // ID doc
        idType: form.idType || null,
        idNumber: form.idNumber || null,
        idIssuedDate: form.idIssuedDate || null,
        idExpiryDate: form.idExpiryDate || null,

        // Next of kin
        nextKinName: form.nextKinName || null,
        nextKinPhone: form.nextKinPhone || null,
        nextOfKinRelationship: form.nextOfKinRelationship || null,

        // Assignment / registration
        branchId: form.branchId || null,
        loanOfficerId: form.loanOfficerId || null,
        loanType: form.loanType || null,
        groupId: form.loanType === "group" ? (form.groupId || null) : null,
        regDate: form.regDate || today(),
      };

      Object.entries(payload).forEach(([k, v]) => fd.append(k, v ?? ""));
      if (photoFile) fd.append("photo", photoFile);

      // Create borrower
      const res = await api.post("/borrowers", fd, withTenant(t));
      const created = res?.data?.borrower || res?.data || {};
      const borrowerId = created?.id;
      const tenantId = created?.tenantId || t;

      // Best-effort post-assign if API ignored branch/officer in multipart
      const opt = withTenant(tenantId);
      if (borrowerId && form.branchId) {
        await api
          .post(`/borrowers/${borrowerId}/branch`, { branchId: form.branchId }, opt)
          .catch(() => api.post(`/borrowers/${borrowerId}/assign-branch`, { branchId: form.branchId }, opt))
          .catch(() => api.patch(`/borrowers/${borrowerId}`, { branchId: form.branchId }, opt))
          .catch(() => {}); // swallow
      }
      if (borrowerId && form.loanOfficerId) {
        await api
          .post(`/borrowers/${borrowerId}/officer`, { loanOfficerId: form.loanOfficerId }, opt)
          .catch(() => api.post(`/borrowers/${borrowerId}/assign-officer`, { officerId: form.loanOfficerId }, opt))
          .catch(() => api.patch(`/borrowers/${borrowerId}`, { loanOfficerId: form.loanOfficerId }, opt))
          .catch(() => {}); // swallow
      }

      alert("Borrower saved successfully");
      if (borrowerId) {
        const suffix = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
        navigate(`/borrowers/${encodeURIComponent(borrowerId)}${suffix}`);
      } else {
        navigate("/borrowers");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to save borrower");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- UI helpers ---------- */
  const officerPlaceholder = placeholderFrom(officersStatus, "Select loan officer…", "No officers");
  const branchPlaceholder = placeholderFrom(branchesStatus, "Select branch…", "No branches");
  const groupPlaceholder = placeholderFrom(groupsStatus, "Select group…", "No groups");

  return (
    <div className={ui.page}>
      <div className="mb-6 flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold tracking-tight">Add Borrower</h1>
          <p className={`text-sm ${ui.muted}`}>
            Fill out KYC. You can also set{" "}
            <strong>Branch</strong> and <strong>Loan Officer</strong> below.
          </p>
        </div>
        <Link to="/borrowers" className={ui.link}>← Back to Borrowers</Link>
      </div>

      <form onSubmit={onSubmit} className="grid grid-cols-1 xl:grid-cols-3 gap-6 relative" noValidate>
        {/* LEFT */}
        <div className="xl:col-span-2 space-y-6 min-w-0">
          {/* Photo */}
          <section className={ui.section}>
            <div className="flex items-center gap-2 mb-4">
              <Camera className={ui.iconAccent} />
              <h2 className="font-extrabold text-lg tracking-tight">Profile Photo</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-28 h-28 rounded-2xl overflow-hidden border-2 border-[var(--border-strong)] bg-[var(--card)] flex items-center justify-center">
                {photoPreview ? (
                  <img src={photoPreview} alt="Profile preview" className="w-full h-full object-cover" />
                ) : (<User className="h-10 w-10 text-[var(--muted)]" />)}
              </div>
              <div className="flex flex-wrap gap-2">
                <label className={`${ui.btn} cursor-pointer`}>
                  <Upload className="h-4 w-4" />
                  <span>Upload</span>
                  <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPickFile} />
                </label>
                {photoFile && (
                  <button type="button" onClick={removePhoto} className={ui.btn}>
                    <X className="h-4 w-4" /> Remove
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Identity + Extra KYC + Status */}
          <section className={ui.section}>
            <div className="flex items-center gap-2 mb-4">
              <User className={ui.iconAccent} />
              <h2 className="font-extrabold text-lg tracking-tight">Identity</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="First Name">
                <input className={ui.input} value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
              </Field>
              <Field label="Last Name">
                <input className={ui.input} value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
              </Field>
              <Field label={<LabelWithIcon Icon={Phone} text="Phone" />}>
                <input className={ui.input} value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="e.g. +2557…" required />
              </Field>
              <Field label="Secondary #">
                <input className={ui.input} value={form.secondaryPhone}
                  onChange={(e) => setForm({ ...form, secondaryPhone: e.target.value })} placeholder="Optional" />
              </Field>
              <Field label="Email">
                <input type="email" className={ui.input} value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@email.com" />
              </Field>
              <Field label="Business / Occupation">
                <input className={ui.input} value={form.occupation}
                  onChange={(e) => setForm({ ...form, occupation: e.target.value })} placeholder="e.g. Retail shop" />
              </Field>
              <Field label="Gender">
                <select className={ui.input} value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })} required>
                  {genderOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                </select>
              </Field>
              <Field label={<LabelWithIcon Icon={Calendar} text="Birth date" />}>
                <input type="date" className={ui.input} value={form.birthDate}
                  onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
              </Field>

              {/* Extra KYC */}
              <Field label="Nationality">
                <input className={ui.input} value={form.nationality}
                  onChange={(e) => setForm({ ...form, nationality: e.target.value })} />
              </Field>
              <Field label="Marital Status">
                <input className={ui.input} value={form.maritalStatus}
                  onChange={(e) => setForm({ ...form, maritalStatus: e.target.value })} />
              </Field>
              <Field label="Education Level">
                <input className={ui.input} value={form.educationLevel}
                  onChange={(e) => setForm({ ...form, educationLevel: e.target.value })} />
              </Field>
              <Field label="Customer Number">
                <input className={ui.input} value={form.customerNumber}
                  onChange={(e) => setForm({ ...form, customerNumber: e.target.value })} />
              </Field>
              <Field label="TIN">
                <input className={ui.input} value={form.tin}
                  onChange={(e) => setForm({ ...form, tin: e.target.value })} />
              </Field>
              <Field label={<LabelWithIcon Icon={Info} text="Status" />}>
                <select className={ui.input} value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {statusOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                </select>
              </Field>

              {/* Employment (full-width) */}
              <div className="md:col-span-2">
                <Field label="Employment / Working Status">
                  <select className={ui.input} value={form.employmentStatus}
                    onChange={(e) => setForm({ ...form, employmentStatus: e.target.value })}>
                    {employmentOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                  </select>
                </Field>
              </div>
            </div>
          </section>

          {/* Address */}
          <section className={ui.section}>
            <div className="flex items-center gap-2 mb-4">
              <MapPin className={ui.iconAccent} />
              <h2 className="font-extrabold text-lg tracking-tight">Address</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Field label="Address Line">
                  <input className={ui.input} value={form.addressLine}
                    onChange={(e) => setForm({ ...form, addressLine: e.target.value })} />
                </Field>
              </div>
              <Field label="City"><input className={ui.input} value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
              <Field label="District"><input className={ui.input} value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })} /></Field>
              <Field label="Ward"><input className={ui.input} value={form.ward}
                onChange={(e) => setForm({ ...form, ward: e.target.value })} /></Field>
              <Field label="Street"><input className={ui.input} value={form.street}
                onChange={(e) => setForm({ ...form, street: e.target.value })} /></Field>
              <Field label="House #"><input className={ui.input} value={form.houseNumber}
                onChange={(e) => setForm({ ...form, houseNumber: e.target.value })} /></Field>
            </div>
          </section>

          {/* ID docs */}
          <section className={ui.section}>
            <div className="flex items-center gap-2 mb-4">
              <IdCard className={ui.iconAccent} />
              <h2 className="font-extrabold text-lg tracking-tight">ID Document</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="ID Type">
                <select className={ui.input} value={form.idType}
                  onChange={(e) => setForm({ ...form, idType: e.target.value })}>
                  {idTypeOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                </select>
              </Field>
              <Field label="ID Number">
                <input className={ui.input} value={form.idNumber}
                  onChange={(e) => setForm({ ...form, idNumber: e.target.value })} />
              </Field>
              <Field label="Issued on">
                <input type="date" className={ui.input} value={form.idIssuedDate}
                  onChange={(e) => setForm({ ...form, idIssuedDate: e.target.value })} />
              </Field>
              <Field label="Expiry date">
                <input type="date" className={ui.input} value={form.idExpiryDate}
                  onChange={(e) => setForm({ ...form, idExpiryDate: e.target.value })} />
              </Field>
            </div>
          </section>

          {/* Next of kin */}
          <section className={ui.section}>
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className={ui.iconAccent} />
              <h2 className="font-extrabold text-lg tracking-tight">Next of Kin</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <Field label="Full Name">
                <input className={ui.input} value={form.nextKinName}
                  onChange={(e) => setForm({ ...form, nextKinName: e.target.value })} />
              </Field>
              <Field label="Phone">
                <input className={ui.input} value={form.nextKinPhone}
                  onChange={(e) => setForm({ ...form, nextKinPhone: e.target.value })} />
              </Field>
              <Field label="Relationship">
                <input className={ui.input} value={form.nextOfKinRelationship}
                  onChange={(e) => setForm({ ...form, nextOfKinRelationship: e.target.value })} />
              </Field>
            </div>
          </section>
        </div>

        {/* RIGHT */}
        <div className="space-y-6 min-w-0">
          <section className={ui.section}>
            <div className="flex items-center gap-2 mb-4">
              <Building2 className={ui.iconAccent} />
              <h2 className="font-extrabold text-lg tracking-tight">Assignment & Registration</h2>
            </div>

            <div className="flex justify-between items-start mb-2">
              <span className="text-[12px] font-semibold uppercase tracking-wider text-[var(--muted)]">&nbsp;</span>
              <div className="flex gap-2">
                {officersStatus === "error" && (
                  <button type="button" className={ui.btn} onClick={() => setReloadOfficersKey((k) => k + 1)}>Retry officers</button>
                )}
                {branchesStatus === "error" && (
                  <button type="button" className={ui.btn} onClick={() => setReloadBranchesKey((k) => k + 1)}>Retry branches</button>
                )}
                {form.loanType === "group" && groupsStatus === "error" && (
                  <button type="button" className={ui.btn} onClick={() => setReloadGroupsKey((k) => k + 1)}>Retry groups</button>
                )}
              </div>
            </div>

            <div className="grid gap-4">
              <Field label="Loan Type">
                <select className={ui.input} value={form.loanType}
                  onChange={(e) => setForm({ ...form, loanType: e.target.value, groupId: "" })}>
                  {loanTypeOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                </select>
              </Field>

              {form.loanType === "group" && (
                <Field label="Group">
                  <select className={ui.input} value={form.groupId}
                    onChange={(e) => setForm({ ...form, groupId: e.target.value })} required>
                    <option value="">{groupPlaceholder}</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.id})
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              <Field label="Branch">
                <select className={ui.input} value={form.branchId}
                  onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
                  <option value="">{branchPlaceholder}</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.id})</option>
                  ))}
                </select>
              </Field>

              <Field label="Loan Officer">
                <select className={ui.input} value={form.loanOfficerId}
                  onChange={(e) => setForm({ ...form, loanOfficerId: e.target.value })}>
                  <option value="">{officerPlaceholder}</option>
                  {officers.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </Field>

              <Field label={<LabelWithIcon Icon={Calendar} text="Registration Date" />}>
                <input type="date" className={ui.input} value={form.regDate}
                  onChange={(e) => setForm({ ...form, regDate: e.target.value })} />
              </Field>

              <div className="rounded-lg border-2 border-[var(--border-strong)] p-3 text-[13px] text-[var(--muted)]">
                If your API ignores branch/officer in the initial request, this page will assign them right after creating the borrower.
              </div>
            </div>
          </section>
        </div>

        {/* Sticky actions */}
        <div className="col-span-full">
          <div className="sticky bottom-0 inset-x-0 z-20 border-t-2 backdrop-blur"
               style={{ borderColor: "var(--border-strong)", background: "var(--card)" }}>
            <div className="max-w-screen-2xl mx-auto px-4 py-3 flex justify-end gap-3">
              <Link to="/borrowers" className={ui.btn}>Cancel</Link>
              <button disabled={submitting} type="submit" className={ui.primary}>
                <Save className="h-4 w-4" /> {submitting ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

/* ---------- Small UI primitives ---------- */
function Field({ label, children }) {
  return (
    <div className="min-w-0">
      <div className={ui.label}>{label}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
function LabelWithIcon({ Icon, text }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className={ui.iconMuted} />
      {text}
    </span>
  );
}
