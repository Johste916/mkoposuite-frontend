import React from "react";

export default function NoAccess({ reason }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-red-600">403 — Forbidden</h1>
      <p className="mt-2 text-gray-600">{reason}</p>
    </div>
  );
}
