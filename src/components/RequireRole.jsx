// src/components/RequireRole.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function RequireRole({ roles = [], children }) {
  const location = useLocation();
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const role = String(user.role || "").toLowerCase();
    if (roles.map((r) => r.toLowerCase()).includes(role)) return children;
  } catch {}
  return <Navigate to="/403" state={{ from: location }} replace />;
}
