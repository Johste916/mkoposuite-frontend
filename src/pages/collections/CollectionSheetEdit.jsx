import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
// ⬇️ fix the path — same folder
import CollectionSheetForm from "./CollectionSheetForm";

export default function CollectionSheetEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [value, setValue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/collections/${id}`);
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        const date = data.date ? new Date(data.date).toISOString().slice(0, 10) : "";
        setValue({ ...data, date });
      } catch (err) {
        alert(err.message || "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const onChange = (patch) => setValue((v) => ({ ...v, ...patch }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/collections/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });
      if (!res.ok) throw new Error("Failed to update");
      navigate("/collections");
    } catch (err) {
      alert(err.message || "Error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !value) return <div className="p-4">Loading…</div>;

  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold mb-4">Edit Collection Sheet</h1>
      <CollectionSheetForm value={value} onChange={onChange} onSubmit={onSubmit} submitting={submitting} />
    </div>
  );
}
