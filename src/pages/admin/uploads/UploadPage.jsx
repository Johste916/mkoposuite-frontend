// src/pages/admin/uploads/UploadPage.jsx
import React, { useState } from "react";
import api from "../../../api";
export default function UploadPage({ title, endpoint }) {
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const submit = async () => {
    if (!file) return setErr("Choose a file");
    setErr(""); setMsg("");
    const fd = new FormData(); fd.append("file", file);
    try {
      const { data } = await api.post(endpoint, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setMsg(data?.message || "Uploaded successfully");
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    }
  };
  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 space-y-3">
      <h1 className="text-xl font-semibold">{title}</h1>
      {err && <div className="text-sm text-rose-600">{err}</div>}
      {msg && <div className="text-sm text-emerald-600">{msg}</div>}
      <input type="file" onChange={(e)=>setFile(e.target.files[0]||null)} />
      <button className="px-3 py-2 border rounded bg-white" onClick={submit}>Upload</button>
    </div>
  );
}
