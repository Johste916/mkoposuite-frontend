import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
// ⬇️ fix the path — same folder
import CollectionSheetForm from "./CollectionSheetForm";

export default function CollectionSheetCreate() {
  const navigate = useNavigate();
  const [value, setValue] = useState({ date: "", type: "", status: "" });
  const [submitting, setSubmitting] = useState(false);

  const onChange = (patch) => setValue((v) => ({ ...v, ...patch }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });
      if (!res.ok) throw new Error("Failed to create");
      navigate("/collections");
    } catch (err) {
      alert(err.message || "Error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold mb-4">New Collection Sheet</h1>
      <CollectionSheetForm value={value} onChange={onChange} onSubmit={onSubmit} submitting={submitting} />
    </div>
  );
}
