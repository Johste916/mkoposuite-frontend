// src/pages/ProtectedRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { can } from "../utils/permissions"; // ✅ NEW

/**
 * Usage:
 *   <ProtectedRoute>...children...</ProtectedRoute>
 *   <ProtectedRoute action="loans.view">...children...</ProtectedRoute>
 */
const ProtectedRoute = ({ children, action }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("token");
      setAuthenticated(!!token);
      setLoading(false);
    };

    checkAuth();
    window.addEventListener("storage", checkAuth);
    return () => window.removeEventListener("storage", checkAuth);
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;

  if (!authenticated) return <Navigate to="/login" replace />;

  // ✅ permission guard
  if (action && !can(action)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
